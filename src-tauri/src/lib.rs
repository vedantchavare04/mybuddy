mod ai;
mod google;
mod media;
mod notifications;
mod reminders;
mod selection;
mod speech;
mod translate;

use tauri::Manager;
use tauri_plugin_global_shortcut::GlobalShortcutExt;
use windows::Win32::System::Power::{GetSystemPowerStatus, SYSTEM_POWER_STATUS};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(selection::on_shortcut)
                .build(),
        )
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            app.manage(media::start(app.handle().clone()));
            app.manage(speech::start(app.handle().clone()));

            let reminders = reminders::start(app.handle().clone())?;
            app.manage(reminders);

            for shortcut in [
                selection::translate_shortcut(),
                selection::speak_shortcut(),
                selection::ai_shortcut(),
            ] {
                if let Err(error) = app.global_shortcut().register(shortcut) {
                    eprintln!("[shortcut] could not register: {error}");
                }
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_battery_status,

            media::media_snapshot,
            media::media_control,

            speech::speech_voices,
            speech::speech_speak,
            speech::speech_pause,
            speech::speech_resume,
            speech::speech_stop,
            speech::speech_rate,

            translate::translate,

            google::google_status,
            google::google_connect,
            google::google_cancel,
            google::google_disconnect,
            google::calendar_upcoming,
            google::calendar_create,

            notifications::notif_status,
            notifications::notif_request,
            notifications::notif_poll,

            reminders::reminders_list,
            reminders::reminder_create,
            reminders::reminder_done,
            reminders::reminder_delete,
            reminders::reminder_snooze,
            reminders::reminder_presented,

            ai::ai_connect,
            ai::ai_status,
            ai::ai_disconnect,
            ai::ai_models,
            ai::ai_ask,
        ])
        .run(tauri::generate_context!())
        .expect("error while building tauri application");
}

#[tauri::command]
fn get_battery_status() -> Result<BatteryStatus, String> {
    let mut status = SYSTEM_POWER_STATUS::default();

    unsafe {
        GetSystemPowerStatus(&mut status)
            .map_err(|error| error.to_string())?;
    }

    Ok(BatteryStatus {
        percentage: status.BatteryLifePercent,
        charging: status.ACLineStatus == 1,
    })
}

#[derive(serde::Serialize)]
struct BatteryStatus {
    percentage: u8,
    charging: bool,
}