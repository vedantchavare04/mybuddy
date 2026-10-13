use std::{
    sync::{
        Arc, Mutex,
        atomic::{AtomicBool, AtomicU64, Ordering},
    },
    thread,
    time::{Duration, Instant},
};

use tauri::{AppHandle, Manager, State, WebviewWindow};
use windows::Win32::{Foundation::POINT, UI::WindowsAndMessaging::GetCursorPos};

#[derive(Clone, Copy, Default)]
struct Region {
    x: f64,
    y: f64,
    w: f64,
    h: f64,
}

#[derive(Clone)]
pub struct Dock {
    active: Arc<AtomicBool>,
    held: Arc<AtomicBool>,
    generation: Arc<AtomicU64>,
    region: Arc<Mutex<Region>>,
}

impl Dock {
    pub fn new() -> Self {
        Self {
            active: Arc::new(AtomicBool::new(false)),
            held: Arc::new(AtomicBool::new(false)),
            generation: Arc::new(AtomicU64::new(0)),
            region: Arc::new(Mutex::new(Region::default())),
        }
    }
}

fn main_window(app: &AppHandle) -> Option<WebviewWindow> {
    app.get_webview_window("main")
        .or_else(|| app.webview_windows().into_values().next())
}

fn cursor_inside(window: &WebviewWindow, region: Region) -> bool {
    let Ok(origin) = window.inner_position() else {
        return false;
    };
    let scale = window.scale_factor().unwrap_or(1.0);

    let mut point = POINT::default();
    if unsafe { GetCursorPos(&mut point) }.is_err() {
        return false;
    }

    let pad = 2.0;
    let left = origin.x as f64 + region.x * scale - pad;
    let top = origin.y as f64 + region.y * scale - pad;
    let right = origin.x as f64 + (region.x + region.w) * scale + pad;
    let bottom = origin.y as f64 + (region.y + region.h) * scale + pad;
    let (px, py) = (point.x as f64, point.y as f64);

    px >= left && px <= right && py >= top && py <= bottom
}

fn run(app: AppHandle, dock: Dock, id: u64) {
    let mut last: Option<bool> = None;
    let mut asserted = Instant::now();

    while dock.active.load(Ordering::Relaxed) && dock.generation.load(Ordering::Relaxed) == id {
        if let Some(window) = main_window(&app) {
            let region = *dock.region.lock().unwrap();
            let interactive = dock.held.load(Ordering::Relaxed) || cursor_inside(&window, region);
            let ignore = !interactive;

            if last != Some(ignore) || asserted.elapsed() > Duration::from_millis(250) {
                let _ = window.set_ignore_cursor_events(ignore);
                last = Some(ignore);
                asserted = Instant::now();
            }
        }
        thread::sleep(Duration::from_millis(16));
    }

    if dock.generation.load(Ordering::Relaxed) == id {
        if let Some(window) = main_window(&app) {
            let _ = window.set_ignore_cursor_events(true);
        }
    }
}

#[tauri::command]
pub fn dock_enter(app: AppHandle, dock: State<Dock>, x: f64, y: f64, w: f64, h: f64) {
    *dock.region.lock().unwrap() = Region { x, y, w, h };
    if dock.active.swap(true, Ordering::SeqCst) {
        return;
    }
    let id = dock.generation.fetch_add(1, Ordering::SeqCst) + 1;
    let shared = dock.inner().clone();
    thread::spawn(move || run(app, shared, id));
}

#[tauri::command]
pub fn dock_hold(dock: State<Dock>, on: bool) {
    dock.held.store(on, Ordering::Relaxed);
}

#[tauri::command]
pub fn dock_leave(dock: State<Dock>) {
    dock.active.store(false, Ordering::SeqCst);
    dock.held.store(false, Ordering::Relaxed);
}
