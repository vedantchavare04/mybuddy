use std::{ptr, thread, time::Duration};

use tauri::{AppHandle, Emitter};
use tauri_plugin_global_shortcut::{Code, Modifiers, Shortcut, ShortcutEvent, ShortcutState};
use windows::Win32::{
    Foundation::{HANDLE, HGLOBAL},
    System::{
        DataExchange::{
            CloseClipboard, EmptyClipboard, EnumClipboardFormats, GetClipboardData,
            GetClipboardSequenceNumber, OpenClipboard, SetClipboardData,
        },
        Memory::{GlobalAlloc, GlobalLock, GlobalSize, GlobalUnlock, GMEM_MOVEABLE},
    },
    UI::Input::KeyboardAndMouse::{
        GetAsyncKeyState, SendInput, INPUT, INPUT_0, INPUT_KEYBOARD, KEYBDINPUT,
        KEYBD_EVENT_FLAGS, KEYEVENTF_KEYUP, VIRTUAL_KEY, VK_C, VK_CONTROL, VK_LWIN, VK_MENU,
        VK_RWIN, VK_SHIFT, VK_SPACE,
    },
};

const CF_UNICODETEXT: u32 = 13;

pub fn translate_shortcut() -> Shortcut {
    Shortcut::new(Some(Modifiers::CONTROL | Modifiers::ALT), Code::KeyT)
}

pub fn speak_shortcut() -> Shortcut {
    Shortcut::new(Some(Modifiers::CONTROL | Modifiers::ALT), Code::KeyS)
}

pub fn ai_shortcut() -> Shortcut {
    Shortcut::new(Some(Modifiers::CONTROL | Modifiers::SHIFT), Code::Space)
}

pub fn on_shortcut(app: &AppHandle, shortcut: &Shortcut, event: ShortcutEvent) {
    if event.state() != ShortcutState::Pressed {
        return;
    }
    let intent = if shortcut == &translate_shortcut() {
        "translate"
    } else if shortcut == &speak_shortcut() {
        "speak"
    } else if shortcut == &ai_shortcut() {
        "ai"
    } else {
        return;
    };

    let app = app.clone();
    thread::spawn(move || {
        let payload = match capture() {
            Ok(text) => serde_json::json!({ "intent": intent, "text": text }),
            Err("no_selection") if intent == "ai" => {
                serde_json::json!({ "intent": intent, "text": "" })
            }
            Err(code) => serde_json::json!({ "intent": intent, "text": "", "error": code }),
        };
        let _ = app.emit("selection://captured", payload);
    });
}

fn sleep(ms: u64) {
    thread::sleep(Duration::from_millis(ms));
}

fn is_down(vk: VIRTUAL_KEY) -> bool {
    unsafe { (GetAsyncKeyState(vk.0 as i32) as u16) & 0x8000 != 0 }
}

fn wait_modifiers_released() {
    let keys = [
        VK_CONTROL,
        VK_MENU,
        VK_SHIFT,
        VK_LWIN,
        VK_RWIN,
        VK_SPACE,
        VIRTUAL_KEY(b'T' as u16),
        VIRTUAL_KEY(b'S' as u16),
    ];
    for _ in 0..40 {
        if !keys.iter().any(|k| is_down(*k)) {
            break;
        }
        sleep(15);
    }
    sleep(25);
}

fn key(vk: VIRTUAL_KEY, up: bool) -> INPUT {
    INPUT {
        r#type: INPUT_KEYBOARD,
        Anonymous: INPUT_0 {
            ki: KEYBDINPUT {
                wVk: vk,
                wScan: 0,
                dwFlags: if up { KEYEVENTF_KEYUP } else { KEYBD_EVENT_FLAGS(0) },
                time: 0,
                dwExtraInfo: 0,
            },
        },
    }
}

fn send_copy() {
    let inputs = [
        key(VK_CONTROL, false),
        key(VK_C, false),
        key(VK_C, true),
        key(VK_CONTROL, true),
    ];
    unsafe {
        SendInput(&inputs, std::mem::size_of::<INPUT>() as i32);
    }
}

fn open_clipboard() -> bool {
    for _ in 0..10 {
        if unsafe { OpenClipboard(None) }.is_ok() {
            return true;
        }

        sleep(15);
    }

    false
}

struct Saved(Vec<(u32, Vec<u8>)>);

fn skip_format(f: u32) -> bool {
    matches!(f, 2 | 3 | 9 | 14 | 16)
        || (0x0080..=0x008E).contains(&f)
        || (0x0200..=0x03FF).contains(&f)
}

fn snapshot() -> Option<Saved> {
    unsafe {
        if !open_clipboard() {
            return None;
        }
        let mut items = Vec::new();
        let mut fmt = 0u32;
        loop {
            fmt = EnumClipboardFormats(fmt);
            if fmt == 0 {
                break;
            }
            if skip_format(fmt) {
                continue;
            }
            let Ok(handle) = GetClipboardData(fmt) else { continue };
            let g = HGLOBAL(handle.0);
            let size = GlobalSize(g);
            if size == 0 || size > 64 * 1024 * 1024 {
                continue;
            }
            let p = GlobalLock(g);
            if p.is_null() {
                continue;
            }
            let bytes = std::slice::from_raw_parts(p as *const u8, size).to_vec();
            let _ = GlobalUnlock(g);
            items.push((fmt, bytes));
        }
        let _ = CloseClipboard();
        Some(Saved(items))
    }
}

fn restore(saved: &Saved) {
    unsafe {
        if !open_clipboard() {
            return;
        }
        let _ = EmptyClipboard();
        for (fmt, bytes) in &saved.0 {
            let Ok(h) = GlobalAlloc(GMEM_MOVEABLE, bytes.len()) else { continue };
            let p = GlobalLock(h);
            if p.is_null() {
                continue;
            }
            ptr::copy_nonoverlapping(bytes.as_ptr(), p as *mut u8, bytes.len());
            let _ = GlobalUnlock(h);
            let _ = SetClipboardData(*fmt, Some(HANDLE(h.0)));
        }
        let _ = CloseClipboard();
    }
}

fn read_text() -> Option<String> {
    unsafe {
        if !open_clipboard() {
            return None;
        }
        let text = (|| {
            let handle = GetClipboardData(CF_UNICODETEXT).ok()?;
            let g = HGLOBAL(handle.0);
            let p = GlobalLock(g) as *const u16;
            if p.is_null() {
                return None;
            }
            let max = GlobalSize(g) / 2;
            let mut len = 0;
            while len < max && *p.add(len) != 0 {
                len += 1;
            }
            let s = String::from_utf16_lossy(std::slice::from_raw_parts(p, len));
            let _ = GlobalUnlock(g);
            Some(s)
        })();
        let _ = CloseClipboard();
        text
    }
}

fn capture() -> Result<String, &'static str> {
    wait_modifiers_released();

    let saved = snapshot().ok_or("clipboard_busy")?;
    let before = unsafe { GetClipboardSequenceNumber() };

    send_copy();

    let mut changed = false;
    for _ in 0..30 {
        sleep(20);
        if unsafe { GetClipboardSequenceNumber() } != before {
            changed = true;
            break;
        }
    }

    let text = if changed {
        sleep(30);
        read_text()
    } else {
        None
    };

    if changed {
        restore(&saved);
    }

    match text {
        Some(t) if !t.trim().is_empty() => Ok(t),
        _ => Err("no_selection"),
    }
}