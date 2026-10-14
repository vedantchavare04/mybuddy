use serde::{Deserialize, Serialize};
use std::{
    fs,
    path::PathBuf,
    sync::{Mutex, OnceLock},
};
use tauri::{AppHandle, Emitter, Manager};

static FLOW_LOCK: OnceLock<Mutex<()>> = OnceLock::new();
static EXPLAIN_LOCK: OnceLock<Mutex<()>> = OnceLock::new();

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FlowCheckpoint {
    pub id: String,
    pub title: String,
    pub progress: String,
    pub next_step: String,
    pub created_at: i64,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FlowInput {
    pub title: String,
    pub progress: String,
    pub next_step: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExplainItem {
    pub id: String,
    pub question: String,
    pub context: String,
    pub created_at: i64,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExplainInput {
    pub question: String,
    pub context: String,
}

fn path(app: &AppHandle, file: &str) -> Result<PathBuf, String> {
    let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir.join(file))
}

fn read<T: for<'de> Deserialize<'de>>(path: &PathBuf) -> Result<Vec<T>, String> {
    if !path.exists() {
        return Ok(Vec::new());
    }
    serde_json::from_str(&fs::read_to_string(path).map_err(|e| e.to_string())?)
        .map_err(|e| format!("Could not read saved items: {e}"))
}

fn write<T: Serialize>(path: &PathBuf, items: &[T]) -> Result<(), String> {
    let temp = path.with_extension("json.tmp");
    fs::write(
        &temp,
        serde_json::to_vec_pretty(items).map_err(|e| e.to_string())?,
    )
    .map_err(|e| e.to_string())?;
    fs::rename(temp, path).map_err(|e| e.to_string())
}

fn clean(value: String, field: &str, max: usize, required: bool) -> Result<String, String> {
    let value = value.trim();
    if value.chars().count() > max
        || (required && value.is_empty())
        || value.chars().any(char::is_control)
    {
        return Err(format!(
            "{field} is required and must be under {max} characters."
        ));
    }
    Ok(value.to_string())
}

#[tauri::command]
pub fn flow_list(app: AppHandle) -> Result<Vec<FlowCheckpoint>, String> {
    let _guard = FLOW_LOCK
        .get_or_init(|| Mutex::new(()))
        .lock()
        .map_err(|e| e.to_string())?;
    let mut items: Vec<FlowCheckpoint> = read(&path(&app, "flow_rescue.json")?)?;
    items.sort_by(|a, b| b.created_at.cmp(&a.created_at));
    Ok(items)
}

#[tauri::command]
pub fn flow_save(app: AppHandle, input: FlowInput) -> Result<FlowCheckpoint, String> {
    let item = FlowCheckpoint {
        id: format!(
            "flow-{}-{:x}",
            chrono::Utc::now().timestamp_millis(),
            rand::random::<u64>()
        ),
        title: clean(input.title, "Title", 160, true)?,
        progress: clean(input.progress, "Progress", 4000, false)?,
        next_step: clean(input.next_step, "Next step", 1000, false)?,
        created_at: chrono::Utc::now().timestamp_millis(),
    };
    let _guard = FLOW_LOCK
        .get_or_init(|| Mutex::new(()))
        .lock()
        .map_err(|e| e.to_string())?;
    let path = path(&app, "flow_rescue.json")?;
    let mut items: Vec<FlowCheckpoint> = read(&path)?;
    items.push(item.clone());
    write(&path, &items)?;
    let _ = app.emit("flow-rescue://changed", &items);
    Ok(item)
}

#[tauri::command]
pub fn flow_delete(app: AppHandle, id: String) -> Result<(), String> {
    let _guard = FLOW_LOCK
        .get_or_init(|| Mutex::new(()))
        .lock()
        .map_err(|e| e.to_string())?;
    let path = path(&app, "flow_rescue.json")?;
    let mut items: Vec<FlowCheckpoint> = read(&path)?;
    items.retain(|item| item.id != id);
    write(&path, &items)?;
    let _ = app.emit("flow-rescue://changed", &items);
    Ok(())
}

#[tauri::command]
pub fn explain_list(app: AppHandle) -> Result<Vec<ExplainItem>, String> {
    let _guard = EXPLAIN_LOCK
        .get_or_init(|| Mutex::new(()))
        .lock()
        .map_err(|e| e.to_string())?;
    let mut items: Vec<ExplainItem> = read(&path(&app, "explain_later.json")?)?;
    items.sort_by(|a, b| b.created_at.cmp(&a.created_at));
    Ok(items)
}

#[tauri::command]
pub fn explain_save(app: AppHandle, input: ExplainInput) -> Result<ExplainItem, String> {
    let item = ExplainItem {
        id: format!(
            "explain-{}-{:x}",
            chrono::Utc::now().timestamp_millis(),
            rand::random::<u64>()
        ),
        question: clean(input.question, "Question", 1000, true)?,
        context: clean(input.context, "Context", 4000, false)?,
        created_at: chrono::Utc::now().timestamp_millis(),
    };
    let _guard = EXPLAIN_LOCK
        .get_or_init(|| Mutex::new(()))
        .lock()
        .map_err(|e| e.to_string())?;
    let path = path(&app, "explain_later.json")?;
    let mut items: Vec<ExplainItem> = read(&path)?;
    items.push(item.clone());
    write(&path, &items)?;
    let _ = app.emit("explain-later://changed", &items);
    Ok(item)
}

#[tauri::command]
pub fn explain_delete(app: AppHandle, id: String) -> Result<(), String> {
    let _guard = EXPLAIN_LOCK
        .get_or_init(|| Mutex::new(()))
        .lock()
        .map_err(|e| e.to_string())?;
    let path = path(&app, "explain_later.json")?;
    let mut items: Vec<ExplainItem> = read(&path)?;
    items.retain(|item| item.id != id);
    write(&path, &items)?;
    let _ = app.emit("explain-later://changed", &items);
    Ok(())
}
