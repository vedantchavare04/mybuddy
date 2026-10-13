use std::time::Duration;

use serde::{Deserialize, Serialize};
use serde_json::{Value, json};

const SERVICE: &str = "MyBuddy";

const NON_CHAT: &[&str] = &[
    "embedding",
    "tts",
    "whisper",
    "dall-e",
    "moderation",
    "audio",
    "image",
    "realtime",
    "transcribe",
    "davinci",
    "babbage",
    "search",
];

#[derive(Deserialize)]
pub struct Msg {
    pub role: String,
    pub content: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Connection {
    pub verified: bool,
    pub models: Vec<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AiStatus {
    pub configured: bool,
}

#[derive(Clone, Copy, PartialEq)]
enum Kind {
    OpenAi,
    Anthropic,
    Gemini,
    OpenRouter,
    Ollama,
    Custom,
}

fn kind(provider: &str) -> Result<Kind, String> {
    match provider {
        "openai" => Ok(Kind::OpenAi),
        "anthropic" => Ok(Kind::Anthropic),
        "gemini" => Ok(Kind::Gemini),
        "openrouter" => Ok(Kind::OpenRouter),
        "ollama" => Ok(Kind::Ollama),
        "custom" => Ok(Kind::Custom),
        _ => Err("unknown_provider".into()),
    }
}

fn entry(provider: &str) -> Result<keyring::Entry, String> {
    keyring::Entry::new(SERVICE, &format!("ai-key:{provider}")).map_err(|_| "failed".to_string())
}

fn load_key(provider: &str) -> Option<String> {
    entry(provider).ok()?.get_password().ok()
}

fn save_key(provider: &str, key: &str) -> Result<(), String> {
    entry(provider)?
        .set_password(key)
        .map_err(|_| "failed".to_string())
}

fn delete_key(provider: &str) {
    if let Ok(entry) = entry(provider) {
        let _ = entry.delete_credential();
    }
}

fn client(secs: u64) -> reqwest::Client {
    reqwest::Client::builder()
        .timeout(Duration::from_secs(secs))
        .build()
        .unwrap_or_default()
}

fn normalize(raw: &str) -> Result<String, String> {
    let trimmed = raw.trim().trim_end_matches('/').to_string();

    let parsed = url::Url::parse(&trimmed).map_err(|_| "bad_endpoint".to_string())?;

    if parsed.scheme() == "http" || parsed.scheme() == "https" {
        Ok(trimmed)
    } else {
        Err("bad_endpoint".into())
    }
}

fn base_for(kind: Kind, base_url: Option<&str>) -> Result<String, String> {
    match kind {
        Kind::OpenAi => Ok("https://api.openai.com/v1".into()),

        Kind::OpenRouter => Ok("https://openrouter.ai/api/v1".into()),

        Kind::Anthropic => Ok("https://api.anthropic.com".into()),

        Kind::Gemini => Ok("https://generativelanguage.googleapis.com".into()),

        Kind::Ollama => normalize(
            base_url
                .filter(|value| !value.trim().is_empty())
                .unwrap_or("http://localhost:11434"),
        ),

        Kind::Custom => normalize(base_url.ok_or("bad_endpoint")?),
    }
}

fn is_local(base: &str) -> bool {
    url::Url::parse(base)
        .ok()
        .and_then(|url| {
            url.host_str()
                .map(|host| matches!(host, "localhost" | "127.0.0.1" | "[::1]" | "::1"))
        })
        .unwrap_or(false)
}

fn net(error: reqwest::Error, local: bool) -> String {
    let code = if error.is_timeout() {
        "timeout"
    } else if error.is_connect() {
        if local {
            "unreachable_local"
        } else {
            "offline"
        }
    } else {
        "failed"
    };

    code.to_string()
}

async fn check(res: reqwest::Response) -> Result<Value, String> {
    let status = res.status().as_u16();

    if (200..300).contains(&status) {
        return res.json::<Value>().await.map_err(|_| "failed".to_string());
    }

    let body = res.text().await.unwrap_or_default().to_lowercase();

    let code = match status {
        401 | 403 => "invalid_key",

        400 if body.contains("api key") || body.contains("api_key") => "invalid_key",

        404 => "model_unavailable",

        429 => "rate_limited",

        500..=599 => "provider_down",

        _ => "bad_request",
    };

    Err(code.to_string())
}

fn names(value: &Value, array: &str, field: &str) -> Vec<String> {
    value[array]
        .as_array()
        .map(|items| {
            items
                .iter()
                .filter_map(|item| item[field].as_str().map(String::from))
                .collect()
        })
        .unwrap_or_default()
}

async fn list_models(kind: Kind, base: &str, key: Option<&str>) -> Result<Vec<String>, String> {
    let local = is_local(base);
    let client = client(15);

    let mut models = match kind {
        Kind::OpenAi | Kind::OpenRouter | Kind::Custom => {
            let mut request = client.get(format!("{base}/models"));

            if let Some(key) = key {
                request = request.bearer_auth(key);
            }

            let response = request.send().await.map_err(|error| net(error, local))?;

            let value = check(response).await?;

            names(&value, "data", "id")
        }

        Kind::Anthropic => {
            let response = client
                .get(format!("{base}/v1/models?limit=100"))
                .header("x-api-key", key.unwrap_or_default())
                .header("anthropic-version", "2023-06-01")
                .send()
                .await
                .map_err(|error| net(error, false))?;

            names(&check(response).await?, "data", "id")
        }

        Kind::Gemini => {
            let response = client
                .get(format!("{base}/v1beta/models?pageSize=100"))
                .header("x-goog-api-key", key.unwrap_or_default())
                .send()
                .await
                .map_err(|error| net(error, false))?;

            let value = check(response).await?;

            value["models"]
                .as_array()
                .map(|items| {
                    items
                        .iter()
                        .filter(|model| {
                            model["supportedGenerationMethods"]
                                .as_array()
                                .map(|generation_methods| {
                                    generation_methods
                                        .iter()
                                        .any(|method| method.as_str() == Some("generateContent"))
                                })
                                .unwrap_or(false)
                        })
                        .filter_map(|model| model["name"].as_str())
                        .map(|name| name.trim_start_matches("models/").to_string())
                        .collect()
                })
                .unwrap_or_default()
        }

        Kind::Ollama => {
            let response = client
                .get(format!("{base}/api/tags"))
                .send()
                .await
                .map_err(|error| net(error, true))?;

            names(&check(response).await?, "models", "name")
        }
    };

    if kind == Kind::OpenAi {
        models.retain(|id| !NON_CHAT.iter().any(|name| id.contains(name)));
    }

    models.sort();
    models.dedup();

    Ok(models)
}

async fn ask_openai(
    base: &str,
    key: Option<&str>,
    model: &str,
    system: Option<&str>,
    messages: &[Msg],
) -> Result<String, String> {
    let mut request_messages = Vec::new();

    if let Some(system) = system {
        request_messages.push(json!({
            "role": "system",
            "content": system
        }));
    }

    for message in messages {
        request_messages.push(json!({
            "role": message.role,
            "content": message.content
        }));
    }

    let mut request = client(60)
        .post(format!("{base}/chat/completions"))
        .json(&json!({
            "model": model,
            "messages": request_messages
        }));

    if let Some(key) = key {
        request = request.bearer_auth(key);
    }

    let response = request
        .send()
        .await
        .map_err(|error| net(error, is_local(base)))?;

    let value = check(response).await?;

    value["choices"][0]["message"]["content"]
        .as_str()
        .map(str::to_string)
        .filter(|text| !text.trim().is_empty())
        .ok_or_else(|| "empty".to_string())
}

async fn ask_anthropic(
    base: &str,
    key: &str,
    model: &str,
    system: Option<&str>,
    messages: &[Msg],
) -> Result<String, String> {
    let mut body = json!({
        "model": model,
        "max_tokens": 2048,
        "messages": messages
            .iter()
            .map(|message| {
                json!({
                    "role": message.role,
                    "content": message.content
                })
            })
            .collect::<Vec<_>>(),
    });

    if let Some(system) = system {
        body["system"] = json!(system);
    }

    let response = client(60)
        .post(format!("{base}/v1/messages"))
        .header("x-api-key", key)
        .header("anthropic-version", "2023-06-01")
        .json(&body)
        .send()
        .await
        .map_err(|error| net(error, false))?;

    let value = check(response).await?;

    let text = value["content"]
        .as_array()
        .map(|blocks| {
            blocks
                .iter()
                .filter(|block| block["type"].as_str() == Some("text"))
                .filter_map(|block| block["text"].as_str())
                .collect::<Vec<_>>()
                .join("")
        })
        .unwrap_or_default();

    if text.trim().is_empty() {
        Err("empty".into())
    } else {
        Ok(text)
    }
}

async fn ask_gemini(
    base: &str,
    key: &str,
    model: &str,
    system: Option<&str>,
    messages: &[Msg],
) -> Result<String, String> {
    let contents: Vec<Value> = messages
        .iter()
        .map(|message| {
            json!({
                "role": if message.role == "assistant" {
                    "model"
                } else {
                    "user"
                },
                "parts": [
                    {
                        "text": message.content
                    }
                ],
            })
        })
        .collect();

    let mut body = json!({
        "contents": contents
    });

    if let Some(system) = system {
        body["systemInstruction"] = json!({
            "parts": [
                {
                    "text": system
                }
            ]
        });
    }

    let response = client(60)
        .post(format!("{base}/v1beta/models/{model}:generateContent"))
        .header("x-goog-api-key", key)
        .json(&body)
        .send()
        .await
        .map_err(|error| net(error, false))?;

    let value = check(response).await?;

    let text = value["candidates"][0]["content"]["parts"]
        .as_array()
        .map(|parts| {
            parts
                .iter()
                .filter_map(|part| part["text"].as_str())
                .collect::<Vec<_>>()
                .join("")
        })
        .unwrap_or_default();

    if text.trim().is_empty() {
        Err("empty".into())
    } else {
        Ok(text)
    }
}

async fn ask_ollama(
    base: &str,
    model: &str,
    system: Option<&str>,
    messages: &[Msg],
) -> Result<String, String> {
    let mut request_messages = Vec::new();

    if let Some(system) = system {
        request_messages.push(json!({
            "role": "system",
            "content": system
        }));
    }

    for message in messages {
        request_messages.push(json!({
            "role": message.role,
            "content": message.content
        }));
    }

    let response = client(120)
        .post(format!("{base}/api/chat"))
        .json(&json!({
            "model": model,
            "messages": request_messages,
            "stream": false
        }))
        .send()
        .await
        .map_err(|error| net(error, true))?;

    let value = check(response).await?;

    value["message"]["content"]
        .as_str()
        .map(str::to_string)
        .filter(|text| !text.trim().is_empty())
        .ok_or_else(|| "empty".to_string())
}

#[tauri::command]
pub async fn ai_connect(
    provider: String,
    api_key: Option<String>,
    base_url: Option<String>,
) -> Result<Connection, String> {
    let provider_kind = kind(&provider)?;

    let key = api_key
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty());

    match provider_kind {
        Kind::Ollama => {
            let base = base_for(provider_kind, base_url.as_deref())?;

            let models = list_models(provider_kind, &base, None).await?;

            Ok(Connection {
                verified: true,
                models,
            })
        }

        Kind::OpenAi | Kind::Anthropic | Kind::Gemini => {
            let key = key.ok_or("no_key")?;

            let base = base_for(provider_kind, None)?;

            let models = list_models(provider_kind, &base, Some(&key)).await?;

            save_key(&provider, &key)?;

            Ok(Connection {
                verified: true,
                models,
            })
        }

        Kind::OpenRouter => {
            let key = key.ok_or("no_key")?;

            save_key(&provider, &key)?;

            let base = base_for(provider_kind, None)?;

            let models = list_models(provider_kind, &base, None)
                .await
                .unwrap_or_default();

            Ok(Connection {
                verified: false,
                models,
            })
        }

        Kind::Custom => {
            let base = base_for(provider_kind, base_url.as_deref())?;

            match list_models(provider_kind, &base, key.as_deref()).await {
                Ok(models) => {
                    if let Some(key) = &key {
                        save_key(&provider, key)?;
                    }

                    Ok(Connection {
                        verified: true,
                        models,
                    })
                }

                Err(error) if error == "invalid_key" => Err(error),

                Err(_) => {
                    if let Some(key) = &key {
                        save_key(&provider, key)?;
                    }

                    Ok(Connection {
                        verified: false,
                        models: Vec::new(),
                    })
                }
            }
        }
    }
}

#[tauri::command]
pub async fn ai_status(provider: String, base_url: Option<String>) -> Result<AiStatus, String> {
    let provider_kind = kind(&provider)?;

    let configured = match provider_kind {
        Kind::Ollama => {
            let base = base_for(provider_kind, base_url.as_deref())?;

            list_models(provider_kind, &base, None).await.is_ok()
        }

        Kind::Custom => base_for(provider_kind, base_url.as_deref()).is_ok(),

        _ => load_key(&provider).is_some(),
    };

    Ok(AiStatus { configured })
}

#[tauri::command]
pub fn ai_disconnect(provider: String) -> Result<(), String> {
    kind(&provider)?;
    delete_key(&provider);
    Ok(())
}

#[tauri::command]
pub async fn ai_models(provider: String, base_url: Option<String>) -> Result<Vec<String>, String> {
    let provider_kind = kind(&provider)?;

    let base = base_for(provider_kind, base_url.as_deref())?;

    let key = load_key(&provider);

    list_models(provider_kind, &base, key.as_deref()).await
}

#[tauri::command]
pub async fn ai_ask(
    provider: String,
    model: String,
    base_url: Option<String>,
    system: Option<String>,
    messages: Vec<Msg>,
) -> Result<String, String> {
    let provider_kind = kind(&provider)?;

    let model = model.trim().trim_start_matches("models/").to_string();

    if model.is_empty() {
        return Err("no_model".into());
    }

    if messages.is_empty()
        || messages
            .iter()
            .all(|message| message.content.trim().is_empty())
    {
        return Err("empty_input".into());
    }

    if messages
        .iter()
        .map(|message| message.content.len())
        .sum::<usize>()
        > 80_000
    {
        return Err("too_long".into());
    }

    let base = base_for(provider_kind, base_url.as_deref())?;

    let key = load_key(&provider);
    let system = system.as_deref();

    match provider_kind {
        Kind::OpenAi | Kind::OpenRouter => {
            let key = key.as_deref().ok_or("no_key")?;

            ask_openai(&base, Some(key), &model, system, &messages).await
        }

        Kind::Custom => ask_openai(&base, key.as_deref(), &model, system, &messages).await,

        Kind::Anthropic => {
            let key = key.as_deref().ok_or("no_key")?;

            ask_anthropic(&base, key, &model, system, &messages).await
        }

        Kind::Gemini => {
            let key = key.as_deref().ok_or("no_key")?;

            ask_gemini(&base, key, &model, system, &messages).await
        }

        Kind::Ollama => ask_ollama(&base, &model, system, &messages).await,
    }
}
