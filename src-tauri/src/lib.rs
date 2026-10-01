use windows::Win32::System::Power::{GetSystemPowerStatus, SYSTEM_POWER_STATUS};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![get_battery_status])
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