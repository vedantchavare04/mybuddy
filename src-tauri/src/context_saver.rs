use serde::{Deserialize, Serialize};
use std::{
    fs,
    path::PathBuf,
    sync::{Mutex, OnceLock},
};
use tauri::{AppHandle, Manager};

static STORE_LOCK: OnceLock<Mutex<()>> = OnceLock::new();

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Checkpoint {
    pub id: String,
    pub title: String,
    pub project_path: String,
    pub progress_note: String,
    pub next_action: String,
    pub links: Vec<String>,
    pub created_at: i64,
    pub updated_at: i64,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CheckpointInput {
    pub id: Option<String>,
    pub title: String,
    pub project_path: String,
    pub progress_note: String,
    pub next_action: String,
    pub links: Vec<String>,
}

fn store_path(app: &AppHandle) -> Result<PathBuf, String> {
    let directory = app.path().app_data_dir().map_err(|e| e.to_string())?;

    fs::create_dir_all(&directory).map_err(|e| e.to_string())?;

    Ok(directory.join("context_checkpoints.json"))
}

fn read_all(path: &PathBuf) -> Result<Vec<Checkpoint>, String> {
    if !path.exists() {
        return Ok(Vec::new());
    }

    let contents = fs::read_to_string(path).map_err(|e| e.to_string())?;

    serde_json::from_str(&contents).map_err(|e| format!("Could not read checkpoints: {e}"))
}

fn write_all(path: &PathBuf, checkpoints: &[Checkpoint]) -> Result<(), String> {
    let contents = serde_json::to_string_pretty(checkpoints).map_err(|e| e.to_string())?;

    let temporary = path.with_extension("json.tmp");

    fs::write(&temporary, contents).map_err(|e| e.to_string())?;

    fs::rename(&temporary, path).map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub fn context_list(app: AppHandle) -> Result<Vec<Checkpoint>, String> {
    let lock = STORE_LOCK.get_or_init(|| Mutex::new(()));
    let _guard = lock.lock().map_err(|e| e.to_string())?;

    let mut checkpoints = read_all(&store_path(&app)?)?;
    checkpoints.sort_by(|a, b| b.updated_at.cmp(&a.updated_at));

    Ok(checkpoints)
}

#[tauri::command]
pub fn context_save(app: AppHandle, input: CheckpointInput) -> Result<Checkpoint, String> {
    let title = input.title.trim();

    if title.is_empty() {
        return Err("Give this checkpoint a title.".into());
    }

    if title.chars().count() > 120 {
        return Err("The title must be 120 characters or fewer.".into());
    }

    if input.progress_note.chars().count() > 10_000
        || input.next_action.chars().count() > 2_000
        || input.project_path.chars().count() > 2_000
        || input.links.len() > 30
        || input.links.iter().any(|link| link.chars().count() > 2_000)
    {
        return Err("One or more checkpoint fields are too long.".into());
    }

    let lock = STORE_LOCK.get_or_init(|| Mutex::new(()));
    let _guard = lock.lock().map_err(|e| e.to_string())?;

    let path = store_path(&app)?;
    let mut checkpoints = read_all(&path)?;
    let now = chrono::Utc::now().timestamp_millis();

    let existing = input
        .id
        .as_deref()
        .and_then(|id| checkpoints.iter().find(|item| item.id == id));

    let checkpoint = Checkpoint {
        id: input
            .id
            .filter(|id| checkpoints.iter().any(|item| item.id == *id))
            .unwrap_or_else(|| format!("checkpoint-{now}")),
        title: title.to_string(),
        project_path: input.project_path.trim().to_string(),
        progress_note: input.progress_note.trim().to_string(),
        next_action: input.next_action.trim().to_string(),
        links: input
            .links
            .iter()
            .map(|link| link.trim().to_string())
            .filter(|link| !link.is_empty())
            .collect(),
        created_at: existing.map(|item| item.created_at).unwrap_or(now),
        updated_at: now,
    };

    if let Some(index) = checkpoints.iter().position(|item| item.id == checkpoint.id) {
        checkpoints[index] = checkpoint.clone();
    } else {
        checkpoints.push(checkpoint.clone());
    }

    write_all(&path, &checkpoints)?;

    Ok(checkpoint)
}

#[tauri::command]
pub fn context_delete(app: AppHandle, id: String) -> Result<(), String> {
    let lock = STORE_LOCK.get_or_init(|| Mutex::new(()));
    let _guard = lock.lock().map_err(|e| e.to_string())?;

    let path = store_path(&app)?;
    let mut checkpoints = read_all(&path)?;
    checkpoints.retain(|item| item.id != id);

    write_all(&path, &checkpoints)
}

#[tauri::command]
pub fn context_open_target(target: String) -> Result<(), String> {
    use std::process::Command;

    let target = target.trim();

    if target.is_empty() {
        return Err("No path or URL was provided.".into());
    }

    if target.starts_with("https://") || target.starts_with("http://") {
        let parsed = url::Url::parse(target).map_err(|e| format!("Invalid URL: {e}"))?;

        if parsed.scheme() != "http" && parsed.scheme() != "https" {
            return Err("Only HTTP and HTTPS links are supported.".into());
        }

        return webbrowser::open(parsed.as_str())
            .map(|_| ())
            .map_err(|e| format!("Could not open link: {e}"));
    }

    let path = std::path::PathBuf::from(target);

    if !path.exists() {
        return Err("That file or folder no longer exists.".into());
    }

    Command::new("explorer.exe")
        .arg(&path)
        .spawn()
        .map(|_| ())
        .map_err(|e| format!("Could not open the path: {e}"))
}
