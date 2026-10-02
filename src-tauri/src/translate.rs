//! src-tauri/src/translate.rs
//!
//! Provider-agnostic `translate` command. The frontend passes a provider id;
//! add new providers as match arms. Keys live here (env / credential store),
//! never in the frontend.
//!
//! Default provider: MyMemory, which needs no key. Anonymous use is limited
//! to ~5,000 characters/day; set MYBUDDY_MYMEMORY_EMAIL to raise it.

use std::time::Duration;

use serde::Serialize;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Translation {
    pub text: String,
    pub detected: Option<String>,
}

const CHUNK: usize = 450; // MyMemory allows 500 *bytes* per request
const MAX_CHARS: usize = 3000;

#[tauri::command]
pub async fn translate(
    text: String,
    source: String,
    target: String,
    provider: Option<String>,
) -> Result<Translation, String> {
    if text.chars().count() > MAX_CHARS {
        return Err("too_long".into());
    }
    match provider.as_deref().unwrap_or("mymemory") {
        "mymemory" => mymemory(&text, &source, &target).await,
        _ => Err("unknown_provider".into()),
    }
}

fn net_err(e: reqwest::Error) -> String {
    if e.is_connect() || e.is_timeout() {
        "offline".to_string()
    } else {
        "provider_error".to_string()
    }
}

/// split on sentence ends so each request stays under the byte limit
fn chunks(text: &str) -> Vec<String> {
    let mut out = Vec::new();
    let mut cur = String::new();
    for part in text.split_inclusive(|c| matches!(c, '.' | '!' | '?' | '\n' | '।')) {
        if !cur.is_empty() && cur.len() + part.len() > CHUNK {
            out.push(std::mem::take(&mut cur));
        }
        if part.len() > CHUNK {
            for c in part.chars() {
                if cur.len() + c.len_utf8() > CHUNK {
                    out.push(std::mem::take(&mut cur));
                }
                cur.push(c);
            }
        } else {
            cur.push_str(part);
        }
    }
    if !cur.trim().is_empty() {
        out.push(cur);
    }
    out
}

async fn mymemory(text: &str, source: &str, target: &str) -> Result<Translation, String> {
    let src = if source == "auto" { "Autodetect" } else { source };
    let email = std::env::var("MYBUDDY_MYMEMORY_EMAIL").ok();
    let client = reqwest::Client::new();

    let mut joined = String::new();
    let mut detected = None;

    for piece in chunks(text) {
        let mut query = vec![
            ("q", piece.clone()),
            ("langpair", format!("{src}|{target}")),
        ];
        if let Some(e) = &email {
            query.push(("de", e.clone()));
        }

        let res = client
            .get("https://api.mymemory.translated.net/get")
            .query(&query)
            .timeout(Duration::from_secs(10))
            .send()
            .await
            .map_err(net_err)?;
        if !res.status().is_success() {
            return Err("provider_error".into());
        }

        let v: serde_json::Value = res.json().await.map_err(|_| "provider_error".to_string())?;
        let status = v["responseStatus"]
            .as_i64()
            .or_else(|| v["responseStatus"].as_str().and_then(|s| s.parse().ok()))
            .unwrap_or(0);
        if status == 429 {
            return Err("rate_limited".into());
        }
        if status != 200 {
            return Err("provider_error".into());
        }

        let out = v["responseData"]["translatedText"]
            .as_str()
            .ok_or_else(|| "provider_error".to_string())?;
        joined.push_str(out);
        if detected.is_none() {
            detected = v["responseData"]["detectedLanguage"]
                .as_str()
                .map(String::from);
        }
    }

    Ok(Translation { text: joined, detected })
}