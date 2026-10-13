use std::{
    fs,
    path::{Path, PathBuf},
    sync::{Arc, Condvar, Mutex},
    time::{Duration, SystemTime, UNIX_EPOCH},
};

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter, Manager, State};

const WEEK_MS: i64 = 7 * 24 * 60 * 60 * 1000;
const MAX_WAIT: Duration = Duration::from_secs(30);

const MAX_TITLE_LENGTH: usize = 200;
const MAX_REMINDERS: usize = 10_000;
const MAX_REMINDER_AHEAD_MS: i64 = 365 * 24 * 60 * 60 * 1000;

#[derive(Serialize, Deserialize, Clone, Copy, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum Status {
    Pending,
    Fired,
    Done,
}

#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Reminder {
    pub id: String,
    pub title: String,
    pub due_ms: i64,
    pub status: Status,
    pub presented: bool,
    pub created_ms: i64,
}

pub struct Shared {
    items: Mutex<Vec<Reminder>>,
    wake: Condvar,
    path: PathBuf,
}

pub struct Reminders(Arc<Shared>);

fn now_ms() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_millis() as i64)
        .unwrap_or(0)
}

fn persist(path: &Path, items: &[Reminder]) -> Result<(), String> {
    let json = serde_json::to_vec_pretty(items).map_err(|_| "serialize_failed".to_string())?;

    let tmp = path.with_extension("json.tmp");

    fs::write(&tmp, json).map_err(|_| "write_failed".to_string())?;

    fs::rename(&tmp, path).map_err(|_| "rename_failed".to_string())?;

    Ok(())
}

fn load(path: &Path) -> Vec<Reminder> {
    let Ok(bytes) = fs::read(path) else {
        return Vec::new();
    };

    match serde_json::from_slice::<Vec<Reminder>>(&bytes) {
        Ok(mut items) => {
            let cutoff = now_ms().saturating_sub(WEEK_MS);

            items.retain(|r| !(r.status == Status::Done && r.due_ms < cutoff));

            items
        }

        Err(_) => {
            let corrupt_path = path.with_extension("json.corrupt");
            let _ = fs::rename(path, corrupt_path);

            Vec::new()
        }
    }
}

fn validate_title(title: &str) -> Result<String, String> {
    let title = title.trim();

    if title.is_empty() {
        return Err("bad_title".into());
    }

    if title.chars().count() > MAX_TITLE_LENGTH {
        return Err("bad_title".into());
    }

    if title.chars().any(|character| character.is_control()) {
        return Err("bad_title".into());
    }

    Ok(title.to_string())
}

fn validate_due_time(due_ms: i64, now: i64) -> Result<(), String> {
    if due_ms < now.saturating_sub(1000) {
        return Err("in_past".into());
    }

    if due_ms > now.saturating_add(MAX_REMINDER_AHEAD_MS) {
        return Err("too_far".into());
    }

    Ok(())
}

fn validate_id(id: &str) -> Result<(), String> {
    if id.is_empty() || id.len() > 64 {
        return Err("bad_id".into());
    }

    if !id.chars().all(|character| character.is_ascii_hexdigit()) {
        return Err("bad_id".into());
    }

    Ok(())
}

fn scheduler(app: AppHandle, shared: Arc<Shared>) {
    loop {
        let mut items = shared
            .items
            .lock()
            .unwrap_or_else(|poisoned| poisoned.into_inner());

        let now = now_ms();

        let mut due = Vec::new();

        for reminder in items.iter_mut() {
            if reminder.status == Status::Pending && reminder.due_ms <= now {
                reminder.status = Status::Fired;
                reminder.presented = false;
                due.push(reminder.clone());
            }
        }

        if !due.is_empty() {
            if let Err(error) = persist(&shared.path, &items) {
                eprintln!("Failed to persist fired reminders: {error}");
            }

            for reminder in &due {
                let _ = app.emit("reminder://due", reminder);
            }

            let _ = app.emit("reminders://changed", items.clone());
        }

        let wait = items
            .iter()
            .filter(|reminder| reminder.status == Status::Pending)
            .map(|reminder| reminder.due_ms)
            .min()
            .map(|due_ms| {
                Duration::from_millis(due_ms.saturating_sub(now).max(0) as u64).min(MAX_WAIT)
            })
            .unwrap_or(MAX_WAIT);

        let _ = shared.wake.wait_timeout(items, wait);
    }
}

pub fn start(app: AppHandle) -> Result<Reminders, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|_| "app_data_dir_failed".to_string())?;

    fs::create_dir_all(&dir).map_err(|_| "create_data_dir_failed".to_string())?;

    let path = dir.join("reminders.json");

    let shared = Arc::new(Shared {
        items: Mutex::new(load(&path)),
        wake: Condvar::new(),
        path,
    });

    let worker = shared.clone();

    std::thread::spawn(move || {
        scheduler(app, worker);
    });

    Ok(Reminders(shared))
}

fn mutate(
    app: &AppHandle,
    state: &Reminders,
    change: impl FnOnce(&mut Vec<Reminder>) -> Result<(), String>,
) -> Result<(), String> {
    let snapshot = {
        let mut items = state
            .0
            .items
            .lock()
            .map_err(|_| "failed_to_lock".to_string())?;

        change(&mut items)?;

        persist(&state.0.path, &items)?;

        items.clone()
    };

    state.0.wake.notify_all();

    let _ = app.emit("reminders://changed", snapshot);

    Ok(())
}

fn find<'a>(items: &'a mut [Reminder], id: &str) -> Result<&'a mut Reminder, String> {
    validate_id(id)?;

    items
        .iter_mut()
        .find(|reminder| reminder.id == id)
        .ok_or_else(|| "not_found".to_string())
}

#[tauri::command]
pub fn reminders_list(state: State<Reminders>) -> Vec<Reminder> {
    state
        .0
        .items
        .lock()
        .map(|items| items.clone())
        .unwrap_or_default()
}

#[tauri::command]
pub fn reminder_create(
    app: AppHandle,
    state: State<Reminders>,
    title: String,
    due_ms: i64,
) -> Result<(), String> {
    let title = validate_title(&title)?;

    let now = now_ms();

    validate_due_time(due_ms, now)?;

    let reminder = Reminder {
        id: format!("{:032x}", rand::random::<u128>()),
        title,
        due_ms,
        status: Status::Pending,
        presented: false,
        created_ms: now,
    };

    mutate(&app, &state, move |items| {
        if items.len() >= MAX_REMINDERS {
            return Err("too_many_reminders".into());
        }

        items.push(reminder);

        Ok(())
    })
}

#[tauri::command]
pub fn reminder_done(app: AppHandle, state: State<Reminders>, id: String) -> Result<(), String> {
    mutate(&app, &state, move |items| {
        let reminder = find(items, &id)?;

        reminder.status = Status::Done;
        reminder.presented = true;

        Ok(())
    })
}

#[tauri::command]
pub fn reminder_delete(app: AppHandle, state: State<Reminders>, id: String) -> Result<(), String> {
    validate_id(&id)?;

    mutate(&app, &state, move |items| {
        let before = items.len();

        items.retain(|reminder| reminder.id != id);

        if items.len() == before {
            return Err("not_found".into());
        }

        Ok(())
    })
}

#[tauri::command]
pub fn reminder_snooze(
    app: AppHandle,
    state: State<Reminders>,
    id: String,
    minutes: i64,
) -> Result<(), String> {
    if !(1..=10_080).contains(&minutes) {
        return Err("bad_args".into());
    }

    mutate(&app, &state, move |items| {
        let reminder = find(items, &id)?;

        if reminder.status == Status::Done {
            return Err("already_done".into());
        }

        let now = now_ms();

        let additional_ms = minutes
            .checked_mul(60_000)
            .ok_or_else(|| "bad_args".to_string())?;

        let due_ms = now
            .checked_add(additional_ms)
            .ok_or_else(|| "bad_args".to_string())?;

        validate_due_time(due_ms, now)?;

        reminder.due_ms = due_ms;
        reminder.status = Status::Pending;
        reminder.presented = false;

        Ok(())
    })
}

#[tauri::command]
pub fn reminder_presented(
    app: AppHandle,
    state: State<Reminders>,
    id: String,
) -> Result<(), String> {
    mutate(&app, &state, move |items| {
        let reminder = find(items, &id)?;

        if reminder.status == Status::Done {
            return Err("already_done".into());
        }

        reminder.presented = true;

        Ok(())
    })
}
