use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use std::sync::OnceLock;
use std::thread;

use tauri::{AppHandle, Emitter};
use windows::Win32::Foundation::{LPARAM, LRESULT, WPARAM};
use windows::Win32::UI::WindowsAndMessaging::{
    CallNextHookEx,
    GetMessageW,
    SetWindowsHookExW,
    ShowCursor,
    UnhookWindowsHookEx,
    MSLLHOOKSTRUCT,
    MSG,
    WH_MOUSE_LL,
    WM_LBUTTONDOWN,
    WM_LBUTTONUP,
    WM_MBUTTONDOWN,
    WM_MOUSEMOVE,
    WM_RBUTTONDOWN,
};

static CLICK_ID: AtomicU64 = AtomicU64::new(1);
static CURSOR_APP: OnceLock<AppHandle> = OnceLock::new();
static SPECIAL_CURSOR_ENABLED: AtomicBool = AtomicBool::new(false);

#[derive(Clone, serde::Serialize)]
struct CursorClickPayload {
    id: String,
    x: i32,
    y: i32,
    button: String,
}

#[derive(Clone, serde::Serialize)]
struct CursorMovePayload {
    x: i32,
    y: i32,
}

#[derive(Clone, serde::Serialize)]
struct CursorButtonPayload {
    x: i32,
    y: i32,
    button: String,
    pressed: bool,
}

pub fn register_app(app: AppHandle) {
    let _ = CURSOR_APP.set(app);
}

pub fn start(_app: AppHandle) {
    thread::spawn(|| unsafe {
        let hook = match SetWindowsHookExW(
            WH_MOUSE_LL,
            Some(mouse_hook),
            None,
            0,
        ) {
            Ok(hook) => hook,
            Err(error) => {
                eprintln!(
                    "[cursor] could not install mouse hook: {error}"
                );
                return;
            }
        };

        let mut message = MSG::default();

        loop {
            let result = GetMessageW(
                &mut message,
                None,
                0,
                0,
            );

            if result.0 == 0 {
                break;
            }

            if result.0 == -1 {
                eprintln!(
                    "[cursor] GetMessageW failed"
                );
                break;
            }
        }

        let _ = UnhookWindowsHookEx(hook);
    });
}

#[tauri::command]
pub fn set_special_cursor_enabled(
    enabled: bool,
) -> Result<(), String> {
    let previous =
        SPECIAL_CURSOR_ENABLED.swap(
            enabled,
            Ordering::SeqCst,
        );

    if previous == enabled {
        return Ok(());
    }

    unsafe {
        if enabled {
            let mut count =
                ShowCursor(false);

            while count >= 0 {
                count = ShowCursor(false);
            }
        } else {
            let mut count =
                ShowCursor(true);

            while count < 0 {
                count = ShowCursor(true);
            }
        }
    }

    Ok(())
}

#[tauri::command]
pub fn is_special_cursor_enabled() -> bool {
    SPECIAL_CURSOR_ENABLED.load(
        Ordering::SeqCst,
    )
}

unsafe extern "system" fn mouse_hook(
    code: i32,
    wparam: WPARAM,
    lparam: LPARAM,
) -> LRESULT {
    if code >= 0 {
        let message = wparam.0 as u32;

        let mouse =
            unsafe {
                &*(lparam.0 as *const MSLLHOOKSTRUCT)
            };

        if message == WM_MOUSEMOVE {
            let payload = CursorMovePayload {
                x: mouse.pt.x,
                y: mouse.pt.y,
            };

            if let Some(app) = CURSOR_APP.get() {
                let _ = app.emit(
                    "cursor://move",
                    payload,
                );
            }
        }

        let button_down = match message {
            WM_LBUTTONDOWN => Some("left"),
            WM_RBUTTONDOWN => Some("right"),
            WM_MBUTTONDOWN => Some("middle"),
            _ => None,
        };

        if let Some(button) = button_down {
            let id =
                CLICK_ID.fetch_add(
                    1,
                    Ordering::Relaxed,
                );

            let click_payload =
                CursorClickPayload {
                    id: format!(
                        "cursor-click-{}",
                        id
                    ),
                    x: mouse.pt.x,
                    y: mouse.pt.y,
                    button: button.to_string(),
                };

            let button_payload =
                CursorButtonPayload {
                    x: mouse.pt.x,
                    y: mouse.pt.y,
                    button: button.to_string(),
                    pressed: true,
                };

            if let Some(app) =
                CURSOR_APP.get()
            {
                let _ = app.emit(
                    "cursor://click",
                    click_payload,
                );

                let _ = app.emit(
                    "cursor://button",
                    button_payload,
                );
            }
        }

        if message == WM_LBUTTONUP {
            let payload =
                CursorButtonPayload {
                    x: mouse.pt.x,
                    y: mouse.pt.y,
                    button: "left".to_string(),
                    pressed: false,
                };

            if let Some(app) =
                CURSOR_APP.get()
            {
                let _ = app.emit(
                    "cursor://button",
                    payload,
                );
            }
        }
    }

    unsafe {
        CallNextHookEx(
            None,
            code,
            wparam,
            lparam,
        )
    }
}