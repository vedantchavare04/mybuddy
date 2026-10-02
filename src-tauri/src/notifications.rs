//! src-tauri/src/notifications.rs
//!
//! Reading other apps' notifications uses UserNotificationListener, which
//! Windows only allows for apps with *package identity* (MSIX or a sparse
//! package declaring the `userNotificationListener` capability). A plain
//! `cargo run` / unpackaged .exe cannot use it and the calls fail.
//!
//! So the real implementation sits behind the `win-notifications` cargo
//! feature. Without it (the default) these commands honestly report
//! "unsupported" and the UI explains why. Enable the feature once the app
//! is packaged: `cargo build --features win-notifications`.

use serde::Serialize;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WinNotification {
    pub id: u32,
    pub app: String,
    pub title: String,
    pub body: String,
    pub created_ms: i64,
}

#[cfg(feature = "win-notifications")]
mod imp {
    use super::WinNotification;
    use windows::UI::Notifications::Management::{
        UserNotificationListener as Listener, UserNotificationListenerAccessStatus as Access,
    };
    use windows::UI::Notifications::{KnownNotificationBindings, NotificationKinds};

    const EPOCH_DIFF: i64 = 116_444_736_000_000_000;

    fn map(s: Access) -> String {
        if s == Access::Allowed {
            "allowed"
        } else if s == Access::Denied {
            "denied"
        } else {
            "unspecified"
        }
        .into()
    }

    pub fn status() -> String {
        match Listener::Current().and_then(|l| l.GetAccessStatus()) {
            Ok(s) => map(s),
            Err(_) => "unsupported".into(),
        }
    }

    pub fn request() -> String {
        match Listener::Current()
            .and_then(|l| l.RequestAccessAsync())
            .and_then(|op| op.get())
        {
            Ok(s) => map(s),
            Err(_) => "unsupported".into(),
        }
    }

    pub fn poll() -> Vec<WinNotification> {
        let mut out = Vec::new();
        let Ok(listener) = Listener::Current() else { return out };
        let Ok(list) = listener
            .GetNotificationsAsync(NotificationKinds::Toast)
            .and_then(|op| op.get())
        else {
            return out;
        };

        for n in list {
            let app = n
                .AppInfo()
                .and_then(|a| a.DisplayInfo())
                .and_then(|d| d.DisplayName())
                .map(|s| s.to_string())
                .unwrap_or_default();

            let mut lines: Vec<String> = Vec::new();
            if let Ok(visual) = n.Notification().and_then(|x| x.Visual()) {
                if let Ok(generic) = KnownNotificationBindings::ToastGeneric() {
                    if let Ok(binding) = visual.GetBinding(&generic) {
                        if let Ok(texts) = binding.GetTextElements() {
                            for t in texts {
                                if let Ok(s) = t.Text() {
                                    lines.push(s.to_string());
                                }
                            }
                        }
                    }
                }
            }

            let created = n.CreationTime().map(|t| t.UniversalTime).unwrap_or(0);
            out.push(WinNotification {
                id: n.Id().unwrap_or(0),
                app,
                title: lines.first().cloned().unwrap_or_default(),
                body: lines.get(1..).map(|r| r.join(" ")).unwrap_or_default(),
                created_ms: if created > EPOCH_DIFF {
                    (created - EPOCH_DIFF) / 10_000
                } else {
                    0
                },
            });
        }
        out
    }
}

#[cfg(not(feature = "win-notifications"))]
mod imp {
    use super::WinNotification;
    pub fn status() -> String {
        "unsupported".into()
    }
    pub fn request() -> String {
        "unsupported".into()
    }
    pub fn poll() -> Vec<WinNotification> {
        Vec::new()
    }
}

#[tauri::command]
pub fn notif_status() -> String {
    imp::status()
}

#[tauri::command]
pub fn notif_request() -> String {
    imp::request()
}

#[tauri::command]
pub fn notif_poll() -> Vec<WinNotification> {
    imp::poll()
}