use std::{
    sync::{Mutex, OnceLock},
    thread,
    time::Duration,
};

use arboard::Clipboard;
use serde::Serialize;
use tauri::{AppHandle, Emitter};

const MAX_ENTRIES: usize = 100;

#[derive(Clone, Serialize)]
pub struct ClipboardEntry {
    pub id: u64,
    pub text: String,
}

static HISTORY: OnceLock<Mutex<Vec<ClipboardEntry>>> = OnceLock::new();
static NEXT_ID: OnceLock<Mutex<u64>> = OnceLock::new();

fn history() -> &'static Mutex<Vec<ClipboardEntry>> {
    HISTORY.get_or_init(|| Mutex::new(Vec::new()))
}

fn next_id() -> u64 {
    let mut id = NEXT_ID.get_or_init(|| Mutex::new(0)).lock().unwrap();

    *id += 1;
    *id
}

pub fn start(app: AppHandle) {
    thread::spawn(move || {
        let mut last_text = String::new();

        loop {
            if let Ok(mut clipboard) = Clipboard::new() {
                if let Ok(text) = clipboard.get_text() {
                    if !text.trim().is_empty() && text != last_text {
                        last_text = text.clone();

                        let entry = ClipboardEntry {
                            id: next_id(),
                            text,
                        };

                        if let Ok(mut entries) = history().lock() {
                            entries.retain(|item| item.text != entry.text);
                            entries.insert(0, entry.clone());
                            entries.truncate(MAX_ENTRIES);
                        }

                        if let Err(error) = app.emit("clipboard://changed", entry) {
                            eprintln!("[clipboard] Event error: {error}");
                        }
                    }
                }
            }

            thread::sleep(Duration::from_millis(500));
        }
    });
}

#[tauri::command]
pub fn clipboard_history_list() -> Result<Vec<ClipboardEntry>, String> {
    history()
        .lock()
        .map(|entries| entries.clone())
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub fn clipboard_write_text(text: String) -> Result<(), String> {
    let mut clipboard = Clipboard::new().map_err(|error| error.to_string())?;

    clipboard.set_text(text).map_err(|error| error.to_string())
}
