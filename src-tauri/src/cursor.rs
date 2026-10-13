use std::sync::OnceLock;
use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use std::thread;

use tauri::{AppHandle, Emitter};

use windows::Win32::Foundation::{LPARAM, LRESULT, WPARAM};

use windows::Win32::UI::WindowsAndMessaging::{
    CallNextHookEx, CreateCursor, GetMessageW, KBDLLHOOKSTRUCT, MSG, MSLLHOOKSTRUCT,
    OCR_APPSTARTING, OCR_CROSS, OCR_HAND, OCR_HELP, OCR_IBEAM, OCR_NO, OCR_NORMAL, OCR_SIZEALL,
    OCR_SIZENESW, OCR_SIZENS, OCR_SIZENWSE, OCR_SIZEWE, OCR_UP, OCR_WAIT, SPI_SETCURSORS,
    SPIF_SENDCHANGE, SYSTEM_CURSOR_ID, SetCursor, SetSystemCursor, SetWindowsHookExW,
    SystemParametersInfoW, UnhookWindowsHookEx, WH_KEYBOARD_LL, WH_MOUSE_LL, WM_KEYDOWN, WM_KEYUP,
    WM_LBUTTONDOWN, WM_LBUTTONUP, WM_MBUTTONDOWN, WM_MOUSEMOVE, WM_RBUTTONDOWN, WM_SYSKEYDOWN,
    WM_SYSKEYUP,
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

#[derive(Clone, serde::Serialize)]
struct CursorKeyboardPayload {
    pressed: bool,
    vk_code: u32,
}

pub fn register_app(app: AppHandle) {
    let _ = CURSOR_APP.set(app);
}

pub fn start(_app: AppHandle) {
    thread::spawn(|| unsafe {
        let mouse_hook = match SetWindowsHookExW(WH_MOUSE_LL, Some(mouse_hook), None, 0) {
            Ok(hook) => hook,
            Err(error) => {
                eprintln!("[cursor] could not install mouse hook: {error}");
                return;
            }
        };

        let keyboard_hook = match SetWindowsHookExW(WH_KEYBOARD_LL, Some(keyboard_hook), None, 0) {
            Ok(hook) => hook,
            Err(error) => {
                eprintln!("[cursor] could not install keyboard hook: {error}");

                let _ = UnhookWindowsHookEx(mouse_hook);

                return;
            }
        };

        let mut message = MSG::default();

        loop {
            let result = GetMessageW(&mut message, None, 0, 0);

            if result.0 == 0 {
                break;
            }

            if result.0 == -1 {
                eprintln!("[cursor] GetMessageW failed");
                break;
            }
        }

        let _ = UnhookWindowsHookEx(mouse_hook);

        let _ = UnhookWindowsHookEx(keyboard_hook);
    });
}

fn create_invisible_cursor() -> Result<windows::Win32::UI::WindowsAndMessaging::HCURSOR, String> {
    unsafe {
        let and_mask = [0xFFu8; 32];
        let xor_mask = [0x00u8; 32];

        CreateCursor(
            None,
            0,
            0,
            16,
            16,
            and_mask.as_ptr() as *const _,
            xor_mask.as_ptr() as *const _,
        )
        .map_err(|error| error.to_string())
    }
}

fn set_invisible_cursor(cursor_id: SYSTEM_CURSOR_ID) -> Result<(), String> {
    unsafe {
        let cursor = create_invisible_cursor()?;

        SetSystemCursor(cursor, cursor_id).map_err(|error| error.to_string())?;

        Ok(())
    }
}

fn set_invisible_system_cursors() -> Result<(), String> {
    let cursor_ids = [
        OCR_NORMAL,
        OCR_IBEAM,
        OCR_WAIT,
        OCR_CROSS,
        OCR_UP,
        OCR_SIZENWSE,
        OCR_SIZENESW,
        OCR_SIZEWE,
        OCR_SIZENS,
        OCR_SIZEALL,
        OCR_NO,
        OCR_HAND,
        OCR_APPSTARTING,
        OCR_HELP,
    ];

    for cursor_id in cursor_ids {
        set_invisible_cursor(cursor_id)?;
    }

    Ok(())
}

fn restore_system_cursors() -> Result<(), String> {
    unsafe {
        SystemParametersInfoW(SPI_SETCURSORS, 0, None, SPIF_SENDCHANGE)
            .map_err(|error| error.to_string())?;

        Ok(())
    }
}

fn remove_current_cursor() {
    unsafe {
        SetCursor(None);
    }
}

#[tauri::command]
pub fn set_special_cursor_enabled(enabled: bool) -> Result<(), String> {
    let previous = SPECIAL_CURSOR_ENABLED.swap(enabled, Ordering::SeqCst);

    if previous == enabled {
        return Ok(());
    }

    if enabled {
        set_invisible_system_cursors()?;
        remove_current_cursor();
    } else {
        restore_system_cursors()?;
    }

    Ok(())
}

#[tauri::command]
pub fn is_special_cursor_enabled() -> bool {
    SPECIAL_CURSOR_ENABLED.load(Ordering::SeqCst)
}

unsafe extern "system" fn mouse_hook(code: i32, wparam: WPARAM, lparam: LPARAM) -> LRESULT {
    if code >= 0 {
        if SPECIAL_CURSOR_ENABLED.load(Ordering::SeqCst) {
            remove_current_cursor();
        }

        let message = wparam.0 as u32;

        let mouse = unsafe { &*(lparam.0 as *const MSLLHOOKSTRUCT) };

        if message == WM_MOUSEMOVE {
            let payload = CursorMovePayload {
                x: mouse.pt.x,
                y: mouse.pt.y,
            };

            if let Some(app) = CURSOR_APP.get() {
                let _ = app.emit("cursor://move", payload);
            }
        }

        let button_down = match message {
            WM_LBUTTONDOWN => Some("left"),
            WM_RBUTTONDOWN => Some("right"),
            WM_MBUTTONDOWN => Some("middle"),
            _ => None,
        };

        if let Some(button) = button_down {
            let id = CLICK_ID.fetch_add(1, Ordering::Relaxed);

            let click_payload = CursorClickPayload {
                id: format!("cursor-click-{}", id),
                x: mouse.pt.x,
                y: mouse.pt.y,
                button: button.to_string(),
            };

            let button_payload = CursorButtonPayload {
                x: mouse.pt.x,
                y: mouse.pt.y,
                button: button.to_string(),
                pressed: true,
            };

            if let Some(app) = CURSOR_APP.get() {
                let _ = app.emit("cursor://click", click_payload);

                let _ = app.emit("cursor://button", button_payload);
            }
        }

        if message == WM_LBUTTONUP {
            let payload = CursorButtonPayload {
                x: mouse.pt.x,
                y: mouse.pt.y,
                button: "left".to_string(),
                pressed: false,
            };

            if let Some(app) = CURSOR_APP.get() {
                let _ = app.emit("cursor://button", payload);
            }
        }
    }

    unsafe { CallNextHookEx(None, code, wparam, lparam) }
}

unsafe extern "system" fn keyboard_hook(code: i32, wparam: WPARAM, lparam: LPARAM) -> LRESULT {
    if code >= 0 {
        let message = wparam.0 as u32;

        let keyboard = unsafe { &*(lparam.0 as *const KBDLLHOOKSTRUCT) };

        let is_key_down = message == WM_KEYDOWN || message == WM_SYSKEYDOWN;

        let is_key_up = message == WM_KEYUP || message == WM_SYSKEYUP;

        if is_key_down || is_key_up {
            let vk_code = keyboard.vkCode;

            if is_typing_key(vk_code) {
                let payload = CursorKeyboardPayload {
                    pressed: is_key_down,
                    vk_code,
                };

                if let Some(app) = CURSOR_APP.get() {
                    let _ = app.emit("cursor://keyboard", payload);
                }
            }
        }
    }

    unsafe { CallNextHookEx(None, code, wparam, lparam) }
}

fn is_typing_key(vk_code: u32) -> bool {
    match vk_code {
        0x08
        | 0x09
        | 0x0D
        | 0x20
        | 0x2E
        | 0x30..=0x39
        | 0x41..=0x5A
        | 0x60..=0x69
        | 0xBA..=0xC0
        | 0xDB..=0xDE => true,

        _ => false,
    }
}
