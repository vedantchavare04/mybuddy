use serde::{Deserialize, Serialize};
use std::{
    fs,
    path::PathBuf,
    sync::{Mutex, OnceLock},
    thread,
    time::Duration,
};
use tauri::{AppHandle, Emitter, Manager};

const MAX_PROMISES: usize = 10_000;
const MAX_TITLE_LENGTH: usize = 200;
const MAX_PERSON_LENGTH: usize = 200;
const MAX_NOTE_LENGTH: usize = 4_000;
const CHANGED_EVENT: &str = "promise-keeper://changed";
const DUE_EVENT: &str = "promise-keeper://due";

static STORE_LOCK: OnceLock<Mutex<()>> = OnceLock::new();

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Promise {
    pub id: String,
    pub title: String,
    pub person: String,
    pub due_ms: Option<i64>,
    pub note: String,
    pub completed: bool,
    pub created_at: i64,
    pub updated_at: i64,
    pub completed_at: Option<i64>,
    #[serde(default)]
    pub notified_at: Option<i64>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PromiseInput {
    pub title: String,
    pub person: Option<String>,
    pub due_ms: Option<i64>,
    pub note: Option<String>,
}

fn now_ms() -> i64 {
    chrono::Utc::now().timestamp_millis()
}

fn schedule_due_promises(app: AppHandle, path: PathBuf) {
    loop {
        thread::sleep(Duration::from_secs(15));
        let lock = STORE_LOCK.get_or_init(|| Mutex::new(()));
        let Ok(_guard) = lock.lock() else { continue };
        let Ok(items) = read_all(&path) else { continue };
        let now = now_ms();
        for promise in items.iter().filter(|promise| {
            !promise.completed
                && promise.notified_at.is_none()
                && promise.due_ms.is_some_and(|due_ms| due_ms <= now)
        }) {
            let _ = app.emit(DUE_EVENT, promise);
        }
    }
}

pub fn start(app: AppHandle) -> Result<(), String> {
    let path = store_path(&app)?;
    thread::spawn(move || schedule_due_promises(app, path));
    Ok(())
}

fn store_path(app: &AppHandle) -> Result<PathBuf, String> {
    let directory = app.path().app_data_dir().map_err(|e| e.to_string())?;
    fs::create_dir_all(&directory).map_err(|e| e.to_string())?;
    Ok(directory.join("promises.json"))
}

fn read_all(path: &PathBuf) -> Result<Vec<Promise>, String> {
    if !path.exists() {
        return Ok(Vec::new());
    }
    let contents = fs::read_to_string(path).map_err(|e| e.to_string())?;
    serde_json::from_str(&contents).map_err(|e| format!("Could not read promises: {e}"))
}

fn write_all(path: &PathBuf, promises: &[Promise]) -> Result<(), String> {
    let contents = serde_json::to_string_pretty(promises).map_err(|e| e.to_string())?;
    let temporary = path.with_extension("json.tmp");
    fs::write(&temporary, contents).map_err(|e| e.to_string())?;
    fs::rename(&temporary, path).map_err(|e| e.to_string())?;
    Ok(())
}

fn validate_text(value: &str, field: &str, max: usize, required: bool) -> Result<String, String> {
    let value = value.trim();
    if (required && value.is_empty())
        || value.chars().count() > max
        || value.chars().any(char::is_control)
    {
        return Err(format!("{field} is invalid or too long."));
    }
    Ok(value.to_string())
}

fn transact<T>(
    app: &AppHandle,
    change: impl FnOnce(&mut Vec<Promise>) -> Result<T, String>,
) -> Result<T, String> {
    let lock = STORE_LOCK.get_or_init(|| Mutex::new(()));
    let _guard = lock.lock().map_err(|e| e.to_string())?;
    let path = store_path(app)?;
    let mut promises = read_all(&path)?;
    let result = change(&mut promises)?;
    write_all(&path, &promises)?;
    let _ = app.emit(CHANGED_EVENT, &promises);
    Ok(result)
}

#[tauri::command]
pub fn promises_list(app: AppHandle) -> Result<Vec<Promise>, String> {
    let lock = STORE_LOCK.get_or_init(|| Mutex::new(()));
    let _guard = lock.lock().map_err(|e| e.to_string())?;
    let mut promises = read_all(&store_path(&app)?)?;
    promises.sort_by(|a, b| {
        a.completed
            .cmp(&b.completed)
            .then_with(|| {
                a.due_ms
                    .unwrap_or(i64::MAX)
                    .cmp(&b.due_ms.unwrap_or(i64::MAX))
            })
            .then_with(|| b.updated_at.cmp(&a.updated_at))
    });
    Ok(promises)
}

#[tauri::command]
pub fn promise_create(app: AppHandle, input: PromiseInput) -> Result<Promise, String> {
    let title = validate_text(&input.title, "Promise title", MAX_TITLE_LENGTH, true)?;
    let person = validate_text(
        input.person.as_deref().unwrap_or(""),
        "Person",
        MAX_PERSON_LENGTH,
        false,
    )?;
    let note = validate_text(
        input.note.as_deref().unwrap_or(""),
        "Note",
        MAX_NOTE_LENGTH,
        false,
    )?;
    let now = now_ms();
    let promise = Promise {
        id: format!("promise-{}-{:x}", now, rand::random::<u64>()),
        title,
        person,
        due_ms: input.due_ms,
        note,
        completed: false,
        created_at: now,
        updated_at: now,
        completed_at: None,
        notified_at: None,
    };
    transact(&app, |items| {
        if items.len() >= MAX_PROMISES {
            return Err("Too many promises.".into());
        }
        items.push(promise.clone());
        Ok(promise)
    })
}

#[tauri::command]
pub fn promise_update(app: AppHandle, id: String, input: PromiseInput) -> Result<Promise, String> {
    let title = validate_text(&input.title, "Promise title", MAX_TITLE_LENGTH, true)?;
    let person = validate_text(
        input.person.as_deref().unwrap_or(""),
        "Person",
        MAX_PERSON_LENGTH,
        false,
    )?;
    let note = validate_text(
        input.note.as_deref().unwrap_or(""),
        "Note",
        MAX_NOTE_LENGTH,
        false,
    )?;
    transact(&app, |items| {
        let item = items
            .iter_mut()
            .find(|item| item.id == id)
            .ok_or("Promise not found.")?;
        item.title = title;
        item.person = person;
        item.note = note;
        if item.due_ms != input.due_ms {
            item.notified_at = None;
        }
        item.due_ms = input.due_ms;
        item.updated_at = now_ms();
        Ok(item.clone())
    })
}

#[tauri::command]
pub fn promise_complete(app: AppHandle, id: String, completed: bool) -> Result<(), String> {
    transact(&app, |items| {
        let item = items
            .iter_mut()
            .find(|item| item.id == id)
            .ok_or("Promise not found.")?;
        item.completed = completed;
        item.completed_at = if completed { Some(now_ms()) } else { None };
        item.notified_at = if completed { Some(now_ms()) } else { None };
        item.updated_at = now_ms();
        Ok(())
    })
}

#[tauri::command]
pub fn promise_presented(app: AppHandle, id: String) -> Result<(), String> {
    transact(&app, |items| {
        let item = items
            .iter_mut()
            .find(|item| item.id == id)
            .ok_or("Promise not found.")?;
        if item.completed {
            return Err("Promise is already completed.".into());
        }
        item.notified_at = Some(now_ms());
        item.updated_at = now_ms();
        Ok(())
    })
}

#[tauri::command]
pub fn promise_delete(app: AppHandle, id: String) -> Result<(), String> {
    transact(&app, |items| {
        let before = items.len();
        items.retain(|item| item.id != id);
        if before == items.len() {
            return Err("Promise not found.".into());
        }
        Ok(())
    })
}
