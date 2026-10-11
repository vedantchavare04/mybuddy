use std::{
    collections::HashMap,
    path::{Path, PathBuf},
    sync::{
        Arc, Mutex,
        atomic::{AtomicBool, Ordering},
    },
};

use futures_util::StreamExt;

use serde::Serialize;

use tauri::{AppHandle, Emitter, State};

use tokio::{fs, io::AsyncWriteExt};

const TASK_EVENT: &str = "tasks://updated";

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]

pub struct TaskRecord {
    pub id: String,
    pub title: String,
    pub kind: String,
    pub status: String,
    pub progress: Option<u8>,
    pub detail: Option<String>,
    pub output_path: Option<String>,
    pub created_at: i64,
    pub updated_at: i64,
}

#[derive(Default, Clone)]

pub struct TaskManager {
    records: Arc<Mutex<HashMap<String, TaskRecord>>>,
    cancellations: Arc<Mutex<HashMap<String, Arc<AtomicBool>>>>,
}

fn now_ms() -> i64 {
    chrono::Utc::now().timestamp_millis()
}

fn make_id() -> String {
    format!("task-{}-{:x}", now_ms(), rand::random::<u64>())
}

fn safe_filename(input: &str) -> String {
    let name: String = input
        .chars()
        .map(|c| {
            if c.is_ascii_alphanumeric() || matches!(c, '.' | '-' | '_' | ' ') {
                c
            } else {
                '_'
            }
        })
        .collect();
    let name = name.trim().trim_matches('.');
    if name.is_empty() || name == "." || name == ".." {
        "download.bin".into()
    } else {
        name.to_string()
    }
}

fn download_directory() -> PathBuf {
    if let Ok(profile) = std::env::var("USERPROFILE") {
        return PathBuf::from(profile).join("Downloads");
    }
    std::env::temp_dir().join("MyBuddy").join("Downloads")
}
async fn unique_download_path(directory: &Path, filename: &str) -> PathBuf {
    let original = Path::new(filename);
    let stem = original
        .file_stem()
        .and_then(|value| value.to_str())
        .unwrap_or("download");
    let extension = original.extension().and_then(|value| value.to_str());
    for index in 0_u32.. {
        let candidate_name = if index == 0 {
            filename.to_string()
        } else if let Some(extension) = extension {
            format!("{stem} ({index}).{extension}")
        } else {
            format!("{stem} ({index})")
        };
        let candidate = directory.join(candidate_name);
        if !fs::try_exists(&candidate).await.unwrap_or(false) {
            return candidate;
        }
    }
    directory.join(format!("{}-{}.bin", stem, make_id()))
}

impl TaskManager {
    fn save(&self, mut task: TaskRecord) -> TaskRecord {
        task.updated_at = now_ms();
        self.records
            .lock()
            .unwrap_or_else(|e| e.into_inner())
            .insert(task.id.clone(), task.clone());
        task
    }
    fn get(&self, id: &str) -> Option<TaskRecord> {
        self.records
            .lock()
            .unwrap_or_else(|e| e.into_inner())
            .get(id)
            .cloned()
    }
    fn publish(&self, app: &AppHandle, task: TaskRecord) {
        let task = self.save(task);
        let _ = app.emit(TASK_EVENT, task);
    }
    fn update(
        &self,
        app: &AppHandle,
        id: &str,
        status: &str,
        progress: Option<u8>,
        detail: Option<String>,
        output_path: Option<String>,
    ) {
        let Some(mut task) = self.get(id) else {
            return;
        };
        task.status = status.to_string();
        if let Some(progress) = progress {
            task.progress = Some(progress.min(100));
        }
        if let Some(detail) = detail {
            task.detail = Some(detail);
        }
        if let Some(output_path) = output_path {
            task.output_path = Some(output_path);
        }
        self.publish(app, task);
    }
}

#[tauri::command]

pub fn tasks_list(state: State<'_, TaskManager>) -> Vec<TaskRecord> {
    let mut tasks: Vec<TaskRecord> = state
        .records
        .lock()
        .unwrap_or_else(|e| e.into_inner())
        .values()
        .cloned()
        .collect();
    tasks.sort_by(|a, b| b.updated_at.cmp(&a.updated_at));
    tasks
}

#[tauri::command]

pub fn task_create(
    app: AppHandle,
    state: State<'_, TaskManager>,
    title: String,
    detail: Option<String>,
) -> Result<TaskRecord, String> {
    let title = title.trim();
    if title.is_empty() {
        return Err("A task title is required.".into());
    }
    let now = now_ms();
    let task = TaskRecord {
        id: make_id(),
        title: title.to_string(),
        kind: "task".into(),
        status: "queued".into(),
        progress: None,
        detail,
        output_path: None,
        created_at: now,
        updated_at: now,
    };
    state.publish(&app, task.clone());
    Ok(task)
}

#[tauri::command]

pub fn task_update(
    app: AppHandle,
    state: State<'_, TaskManager>,
    id: String,
    progress: Option<u8>,
    detail: Option<String>,
) -> Result<(), String> {
    let Some(mut task) = state.get(&id) else {
        return Err("Task not found.".into());
    };
    if !matches!(task.status.as_str(), "queued" | "running") {
        return Err("This task has already finished.".into());
    }
    task.status = "running".into();
    if let Some(progress) = progress {
        task.progress = Some(progress.min(100));
    }
    if detail.is_some() {
        task.detail = detail;
    }
    state.publish(&app, task);
    Ok(())
}

#[tauri::command]

pub fn task_finish(
    app: AppHandle,
    state: State<'_, TaskManager>,
    id: String,
    success: bool,
    detail: Option<String>,
) -> Result<(), String> {
    let Some(mut task) = state.get(&id) else {
        return Err("Task not found.".into());
    };
    if !matches!(task.status.as_str(), "queued" | "running") {
        return Err("This task has already finished.".into());
    }
    task.status = if success {
        "completed".into()
    } else {
        "failed".into()
    };
    if success {
        task.progress = Some(100);
    }
    if detail.is_some() {
        task.detail = detail;
    }
    state.publish(&app, task);
    Ok(())
}

#[tauri::command]

pub fn download_start(
    app: AppHandle,
    state: State<'_, TaskManager>,
    url: String,
    filename: Option<String>,
) -> Result<TaskRecord, String> {
    let parsed = url::Url::parse(&url).map_err(|_| "Enter a valid download URL.".to_string())?;
    if !matches!(parsed.scheme(), "http" | "https") {
        return Err("Only HTTP and HTTPS downloads are supported.".into());
    }
    let inferred_name = parsed
        .path_segments()
        .and_then(|segments| segments.filter(|segment| !segment.is_empty()).next_back())
        .unwrap_or("download.bin");
    let filename = safe_filename(filename.as_deref().unwrap_or(inferred_name));
    let id = make_id();
    let now = now_ms();
    let task = TaskRecord {
        id: id.clone(),
        title: filename.clone(),
        kind: "download".into(),
        status: "queued".into(),
        progress: Some(0),
        detail: Some("Waiting to start".into()),
        output_path: None,
        created_at: now,
        updated_at: now,
    };
    let cancelled = Arc::new(AtomicBool::new(false));
    state
        .cancellations
        .lock()
        .unwrap_or_else(|e| e.into_inner())
        .insert(id.clone(), cancelled.clone());
    state.publish(&app, task.clone());
    let manager = state.inner().clone();
    tauri::async_runtime::spawn(async move {
        manager.update(
            &app,
            &id,
            "running",
            Some(0),
            Some("Connecting…".into()),
            None,
        );
        let result = async {
            let response = reqwest::Client::new()
                .get(&url)
                .send()
                .await
                .map_err(|e| e.to_string())?
                .error_for_status()
                .map_err(|e| e.to_string())?;
            let total = response.content_length();
            let directory = download_directory();
            fs::create_dir_all(&directory)
                .await
                .map_err(|e| e.to_string())?;
            let path = unique_download_path(&directory, &filename).await;
            let mut file = fs::File::create(&path).await.map_err(|e| e.to_string())?;
            let mut stream = response.bytes_stream();
            let mut received: u64 = 0;
            let mut last_progress: u8 = 0;
            while let Some(chunk) = stream.next().await {
                if cancelled.load(Ordering::Relaxed) {
                    drop(file);
                    let _ = fs::remove_file(&path).await;
                    return Err("cancelled".to_string());
                }
                let chunk = match chunk {
                    Ok(chunk) => chunk,
                    Err(error) => {
                        drop(file);
                        let _ = fs::remove_file(&path).await;
                        return Err(error.to_string());
                    }
                };
                if let Err(error) = file.write_all(&chunk).await {
                    drop(file);
                    let _ = fs::remove_file(&path).await;
                    return Err(error.to_string());
                }
                received += chunk.len() as u64;
                if let Some(total) = total.filter(|value| *value > 0) {
                    let progress = ((received.saturating_mul(100) / total).min(100)) as u8;
                    if progress >= last_progress.saturating_add(2) || progress == 100 {
                        last_progress = progress;
                        manager.update(
                            &app,
                            &id,
                            "running",
                            Some(progress),
                            Some(format!("{} of {} bytes", received, total)),
                            None,
                        );
                    }
                } else {
                    manager.update(
                        &app,
                        &id,
                        "running",
                        None,
                        Some(format!("{} bytes downloaded", received)),
                        None,
                    );
                }
            }
            if cancelled.load(Ordering::Relaxed) {
                drop(file);
                let _ = fs::remove_file(&path).await;
                return Err("cancelled".to_string());
            }
            if let Err(error) = file.flush().await {
                drop(file);
                let _ = fs::remove_file(&path).await;
                return Err(error.to_string());
            }
            drop(file);
            Ok::<PathBuf, String>(path)
        }
        .await;
        match result {
            Ok(path) => {
                manager.update(
                    &app,
                    &id,
                    "completed",
                    Some(100),
                    Some("Download complete".into()),
                    Some(path.to_string_lossy().into_owned()),
                );
            }
            Err(error) if error == "cancelled" => {
                manager.update(
                    &app,
                    &id,
                    "cancelled",
                    None,
                    Some("Download cancelled".into()),
                    None,
                );
            }
            Err(error) => {
                manager.update(&app, &id, "failed", None, Some(error), None);
            }
        }
        manager
            .cancellations
            .lock()
            .unwrap_or_else(|e| e.into_inner())
            .remove(&id);
    });
    Ok(task)
}

#[tauri::command]

pub fn task_cancel(
    app: AppHandle,
    state: State<'_, TaskManager>,
    id: String,
) -> Result<(), String> {
    let cancelled = {
        let cancellations = state
            .cancellations
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        cancellations.get(&id).cloned()
    };
    let Some(cancelled) = cancelled else {
        return Err("This task cannot be cancelled.".into());
    };
    cancelled.store(true, Ordering::Relaxed);
    if let Some(mut task) = state.get(&id) {
        task.detail = Some("Cancellation requested".into());
        state.publish(&app, task);
    }
    Ok(())
}
