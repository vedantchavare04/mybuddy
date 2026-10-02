//! src-tauri/src/google.rs
//!
//! Google Calendar for a desktop app, done the way Google specifies:
//!   OAuth 2.0 authorization-code flow + PKCE, loopback redirect
//!   (http://127.0.0.1:<random port>), system browser for sign-in.
//!
//! - No passwords are ever seen or stored.
//! - Only the refresh token is persisted, in Windows Credential Manager.
//! - Access tokens live in memory and are never sent to the frontend.
//! - Scope: calendar.events (view + create events; nothing else).
//!
//! CONFIGURATION (you supply these, see INTEGRATION.md):
//!   MYBUDDY_GOOGLE_CLIENT_ID      OAuth client of type "Desktop app"
//!   MYBUDDY_GOOGLE_CLIENT_SECRET  that client's secret. Google requires it
//!                                 even for desktop clients; it is not
//!                                 confidential for installed apps.
//! Read from the environment at runtime, or baked in at build time.

use std::{
    collections::HashMap,
    sync::{LazyLock, Mutex},
    time::{Duration, Instant},
};

use base64::{engine::general_purpose::URL_SAFE_NO_PAD, Engine};
use rand::RngCore;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use sha2::{Digest, Sha256};
use tokio::{
    io::{AsyncReadExt, AsyncWriteExt},
    net::TcpListener,
    sync::Notify,
};

const AUTH_URL: &str = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL: &str = "https://oauth2.googleapis.com/token";
const REVOKE_URL: &str = "https://oauth2.googleapis.com/revoke";
const EVENTS_URL: &str = "https://www.googleapis.com/calendar/v3/calendars/primary/events";
const SCOPE: &str = "https://www.googleapis.com/auth/calendar.events";
const KEY_SERVICE: &str = "MyBuddy";
const KEY_USER: &str = "google-refresh-token";

static ACCESS: Mutex<Option<(String, Instant)>> = Mutex::new(None);
static CANCEL: LazyLock<Notify> = LazyLock::new(Notify::new);

const PAGE_OK: &str = "<!doctype html><meta charset=utf-8><title>MyBuddy</title><body style=\"background:#050506;color:#fff;font:15px system-ui;display:grid;place-items:center;height:100vh;margin:0\"><div style=\"text-align:center\"><div style=\"font-size:18px;font-weight:600\">MyBuddy is connected</div><p style=\"color:#888\">You can close this tab.</p></div></body>";
const PAGE_FAIL: &str = "<!doctype html><meta charset=utf-8><title>MyBuddy</title><body style=\"background:#050506;color:#fff;font:15px system-ui;display:grid;place-items:center;height:100vh;margin:0\"><div style=\"text-align:center\"><div style=\"font-size:18px;font-weight:600\">Sign-in didn't complete</div><p style=\"color:#888\">You can close this tab and try again in MyBuddy.</p></div></body>";

/* ---------- config / storage helpers ---------- */

fn client() -> Result<(String, String), String> {
    let id = std::env::var("MYBUDDY_GOOGLE_CLIENT_ID")
        .ok()
        .or_else(|| option_env!("MYBUDDY_GOOGLE_CLIENT_ID").map(String::from))
        .filter(|s| !s.is_empty());
    let secret = std::env::var("MYBUDDY_GOOGLE_CLIENT_SECRET")
        .ok()
        .or_else(|| option_env!("MYBUDDY_GOOGLE_CLIENT_SECRET").map(String::from))
        .filter(|s| !s.is_empty());
    match (id, secret) {
        (Some(i), Some(s)) => Ok((i, s)),
        _ => Err("not_configured".into()),
    }
}

fn entry() -> Result<keyring::Entry, String> {
    keyring::Entry::new(KEY_SERVICE, KEY_USER).map_err(|_| "failed".to_string())
}

fn stored_refresh() -> Option<String> {
    entry().ok()?.get_password().ok()
}

fn forget() {
    if let Ok(e) = entry() {
        let _ = e.delete_credential();
    }
    *ACCESS.lock().unwrap() = None;
}

fn http() -> reqwest::Client {
    reqwest::Client::builder()
        .timeout(Duration::from_secs(15))
        .build()
        .unwrap_or_default()
}

fn net(e: reqwest::Error) -> String {
    if e.is_connect() || e.is_timeout() {
        "offline".to_string()
    } else {
        "api_error".to_string()
    }
}

#[derive(Deserialize)]
struct TokenResp {
    access_token: String,
    #[serde(default)]
    expires_in: u64,
    refresh_token: Option<String>,
    scope: Option<String>,
}

fn remember_access(t: &TokenResp) {
    *ACCESS.lock().unwrap() = Some((
        t.access_token.clone(),
        Instant::now() + Duration::from_secs(t.expires_in.saturating_sub(60)),
    ));
}

/* ---------- status / connect / disconnect ---------- */

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Status {
    pub configured: bool,
    pub connected: bool,
}

#[tauri::command]
pub fn google_status() -> Status {
    Status {
        configured: client().is_ok(),
        connected: stored_refresh().is_some(),
    }
}

#[tauri::command]
pub fn google_cancel() {
    CANCEL.notify_waiters();
}

#[tauri::command]
pub async fn google_disconnect() -> Status {
    if let Some(token) = stored_refresh() {
        let _ = http()
            .post(REVOKE_URL)
            .form(&[("token", token.as_str())])
            .send()
            .await;
    }
    forget();
    Status {
        configured: client().is_ok(),
        connected: false,
    }
}

async fn wait_for_code(listener: &TcpListener, state: &str) -> Result<String, String> {
    loop {
        let (mut sock, _) = listener.accept().await.map_err(|_| "failed".to_string())?;
        let mut buf = vec![0u8; 4096];
        let n = sock.read(&mut buf).await.unwrap_or(0);
        let req = String::from_utf8_lossy(&buf[..n]).to_string();
        let path = req
            .lines()
            .next()
            .and_then(|l| l.split_whitespace().nth(1))
            .unwrap_or("/");

        let params: HashMap<String, String> =
            url::Url::parse(&format!("http://127.0.0.1{path}"))
                .map(|u| u.query_pairs().into_owned().collect())
                .unwrap_or_default();

        let (status, body, outcome): (&str, &str, Option<Result<String, String>>) =
            if params.get("state").map(String::as_str) == Some(state) {
                if let Some(code) = params.get("code") {
                    ("200 OK", PAGE_OK, Some(Ok(code.clone())))
                } else {
                    let err = if params.get("error").map(String::as_str) == Some("access_denied") {
                        "cancelled"
                    } else {
                        "auth_failed"
                    };
                    ("200 OK", PAGE_FAIL, Some(Err(err.to_string())))
                }
            } else {
                // favicon requests, port scanners, stale tabs: ignore and keep waiting
                ("404 Not Found", "", None)
            };

        let resp = format!(
            "HTTP/1.1 {status}\r\nContent-Type: text/html; charset=utf-8\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{body}",
            body.len()
        );
        let _ = sock.write_all(resp.as_bytes()).await;
        let _ = sock.shutdown().await;

        if let Some(result) = outcome {
            return result;
        }
    }
}

#[tauri::command]
pub async fn google_connect() -> Result<Status, String> {
    let (client_id, client_secret) = client()?;

    let mut raw = [0u8; 48];
    rand::thread_rng().fill_bytes(&mut raw);
    let verifier = URL_SAFE_NO_PAD.encode(raw);
    let challenge = URL_SAFE_NO_PAD.encode(Sha256::digest(verifier.as_bytes()));
    let mut s = [0u8; 16];
    rand::thread_rng().fill_bytes(&mut s);
    let state = URL_SAFE_NO_PAD.encode(s);

    let listener = TcpListener::bind("127.0.0.1:0")
        .await
        .map_err(|_| "failed".to_string())?;
    let port = listener.local_addr().map_err(|_| "failed".to_string())?.port();
    let redirect = format!("http://127.0.0.1:{port}");

    let auth = url::Url::parse_with_params(
        AUTH_URL,
        &[
            ("client_id", client_id.as_str()),
            ("redirect_uri", redirect.as_str()),
            ("response_type", "code"),
            ("scope", SCOPE),
            ("code_challenge", challenge.as_str()),
            ("code_challenge_method", "S256"),
            ("state", state.as_str()),
            ("access_type", "offline"),
            ("prompt", "consent"),
        ],
    )
    .map_err(|_| "failed".to_string())?;

    webbrowser::open(auth.as_str()).map_err(|_| "failed".to_string())?;

    let code = tokio::select! {
        r = wait_for_code(&listener, &state) => r?,
        _ = CANCEL.notified() => return Err("cancelled".into()),
        _ = tokio::time::sleep(Duration::from_secs(180)) => return Err("timeout".into()),
    };

    let res = http()
        .post(TOKEN_URL)
        .form(&[
            ("client_id", client_id.as_str()),
            ("client_secret", client_secret.as_str()),
            ("code", code.as_str()),
            ("code_verifier", verifier.as_str()),
            ("grant_type", "authorization_code"),
            ("redirect_uri", redirect.as_str()),
        ])
        .send()
        .await
        .map_err(net)?;
    if !res.status().is_success() {
        return Err("auth_failed".into());
    }
    let token: TokenResp = res.json().await.map_err(|_| "auth_failed".to_string())?;

    // granular consent: the user may have unticked the calendar permission
    if !token.scope.as_deref().unwrap_or("").contains(SCOPE) {
        return Err("scope_denied".into());
    }
    let refresh = token
        .refresh_token
        .clone()
        .ok_or_else(|| "auth_failed".to_string())?;

    entry()?
        .set_password(&refresh)
        .map_err(|_| "failed".to_string())?;
    remember_access(&token);

    Ok(Status { configured: true, connected: true })
}

/* ---------- tokens ---------- */

async fn access_token() -> Result<String, String> {
    if let Some((token, expires)) = ACCESS.lock().unwrap().clone() {
        if Instant::now() < expires {
            return Ok(token);
        }
    }

    let refresh = stored_refresh().ok_or_else(|| "not_connected".to_string())?;
    let (client_id, client_secret) = client()?;

    let res = http()
        .post(TOKEN_URL)
        .form(&[
            ("client_id", client_id.as_str()),
            ("client_secret", client_secret.as_str()),
            ("refresh_token", refresh.as_str()),
            ("grant_type", "refresh_token"),
        ])
        .send()
        .await
        .map_err(net)?;

    let code = res.status().as_u16();
    if code == 400 || code == 401 {
        // invalid_grant: the user revoked access (or the token expired)
        forget();
        return Err("revoked".into());
    }
    if !res.status().is_success() {
        return Err("api_error".into());
    }
    let token: TokenResp = res.json().await.map_err(|_| "api_error".to_string())?;
    remember_access(&token);
    Ok(token.access_token)
}

/* ---------- calendar ---------- */

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CalEvent {
    pub id: String,
    pub title: String,
    pub start: String,
    pub end: String,
    pub all_day: bool,
    pub location: Option<String>,
}

fn parse_event(v: &Value) -> Option<CalEvent> {
    if v["status"].as_str() == Some("cancelled") {
        return None;
    }
    let (start, all_day) = match v["start"]["dateTime"].as_str() {
        Some(s) => (s.to_string(), false),
        None => (v["start"]["date"].as_str()?.to_string(), true),
    };
    let end = v["end"]["dateTime"]
        .as_str()
        .or_else(|| v["end"]["date"].as_str())
        .unwrap_or(&start)
        .to_string();
    Some(CalEvent {
        id: v["id"].as_str()?.to_string(),
        title: v["summary"].as_str().unwrap_or("(No title)").to_string(),
        start,
        end,
        all_day,
        location: v["location"].as_str().map(String::from),
    })
}

#[tauri::command]
pub async fn calendar_upcoming(days: Option<i64>) -> Result<Vec<CalEvent>, String> {
    let now = chrono::Utc::now();
    let max = now + chrono::Duration::days(days.unwrap_or(7));
    let query = vec![
        ("timeMin", now.to_rfc3339_opts(chrono::SecondsFormat::Secs, true)),
        ("timeMax", max.to_rfc3339_opts(chrono::SecondsFormat::Secs, true)),
        ("singleEvents", "true".to_string()),
        ("orderBy", "startTime".to_string()),
        ("maxResults", "20".to_string()),
    ];

    for attempt in 0..2 {
        let token = access_token().await?;
        let res = http()
            .get(EVENTS_URL)
            .bearer_auth(&token)
            .query(&query)
            .send()
            .await
            .map_err(net)?;

        if res.status().as_u16() == 401 && attempt == 0 {
            *ACCESS.lock().unwrap() = None; // stale access token: refresh and retry once
            continue;
        }
        if !res.status().is_success() {
            return Err("api_error".into());
        }
        let v: Value = res.json().await.map_err(|_| "api_error".to_string())?;
        return Ok(v["items"]
            .as_array()
            .map(|items| items.iter().filter_map(parse_event).collect())
            .unwrap_or_default());
    }
    Err("api_error".into())
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NewEvent {
    pub title: String,
    pub start: String,
    pub end: String,
    pub time_zone: String,
    pub location: Option<String>,
    pub description: Option<String>,
    pub attendees: Vec<String>,
}

#[tauri::command]
pub async fn calendar_create(event: NewEvent) -> Result<CalEvent, String> {
    let mut body = json!({
        "summary": event.title,
        "start": { "dateTime": event.start, "timeZone": event.time_zone },
        "end":   { "dateTime": event.end,   "timeZone": event.time_zone },
    });
    if let Some(l) = event.location.as_ref().filter(|s| !s.trim().is_empty()) {
        body["location"] = json!(l);
    }
    if let Some(d) = event.description.as_ref().filter(|s| !s.trim().is_empty()) {
        body["description"] = json!(d);
    }
    if !event.attendees.is_empty() {
        body["attendees"] = json!(event
            .attendees
            .iter()
            .map(|e| json!({ "email": e }))
            .collect::<Vec<_>>());
    }

    for attempt in 0..2 {
        let token = access_token().await?;
        let mut req = http().post(EVENTS_URL).bearer_auth(&token).json(&body);
        if !event.attendees.is_empty() {
            req = req.query(&[("sendUpdates", "all")]); // invitees get an email
        }
        let res = req.send().await.map_err(net)?;

        if res.status().as_u16() == 401 && attempt == 0 {
            *ACCESS.lock().unwrap() = None;
            continue;
        }
        if !res.status().is_success() {
            return Err("api_error".into());
        }
        let v: Value = res.json().await.map_err(|_| "api_error".to_string())?;
        return parse_event(&v).ok_or_else(|| "api_error".to_string());
    }
    Err("api_error".into())
}