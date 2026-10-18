use std::{ffi::OsStr, os::windows::ffi::OsStrExt};

use windows::Win32::Foundation::{ERROR_FILE_NOT_FOUND, WIN32_ERROR};
use windows::Win32::System::Registry::{
    HKEY, HKEY_CURRENT_USER, KEY_QUERY_VALUE, KEY_SET_VALUE, REG_SZ, RRF_RT_REG_SZ, RegCloseKey,
    RegCreateKeyW, RegDeleteValueW, RegGetValueW, RegOpenKeyExW, RegSetValueExW,
};
use windows::core::PCWSTR;

const RUN_KEY: &str = "Software\\Microsoft\\Windows\\CurrentVersion\\Run";
const VALUE_NAME: &str = "MyBuddy";

fn wide(value: &str) -> Vec<u16> {
    value.encode_utf16().chain(std::iter::once(0)).collect()
}

fn wide_os(value: &OsStr) -> Vec<u16> {
    value.encode_wide().chain(std::iter::once(0)).collect()
}

fn check(status: WIN32_ERROR, operation: &str) -> Result<(), String> {
    if status.is_ok() {
        Ok(())
    } else {
        Err(format!("{operation} failed: {}", status.0))
    }
}

#[tauri::command]
pub fn startup_is_enabled() -> Result<bool, String> {
    let key = wide(RUN_KEY);
    let name = wide(VALUE_NAME);
    let mut size = 0u32;

    let status = unsafe {
        RegGetValueW(
            HKEY_CURRENT_USER,
            PCWSTR::from_raw(key.as_ptr()),
            PCWSTR::from_raw(name.as_ptr()),
            RRF_RT_REG_SZ,
            None,
            None,
            Some(&mut size),
        )
    };

    if status.is_ok() {
        Ok(true)
    } else if status == ERROR_FILE_NOT_FOUND {
        Ok(false)
    } else {
        Err(format!(
            "Could not read Windows startup setting: {}",
            status.0
        ))
    }
}

#[tauri::command]
pub fn startup_set_enabled(enabled: bool) -> Result<(), String> {
    let key_path = wide(RUN_KEY);
    let value_name = wide(VALUE_NAME);
    let executable = if enabled {
        Some(
            std::env::current_exe()
                .map_err(|error| format!("Could not locate MyBuddy executable: {error}"))?,
        )
    } else {
        None
    };
    let mut key = HKEY::default();

    if enabled {
        let status = unsafe {
            RegCreateKeyW(
                HKEY_CURRENT_USER,
                PCWSTR::from_raw(key_path.as_ptr()),
                &mut key,
            )
        };
        check(status, "Opening Windows startup settings")?;

        let mut command_wide = vec![b'"' as u16];
        command_wide.extend(wide_os(
            executable.as_ref().expect("enabled executable").as_os_str(),
        ));
        command_wide.pop();
        command_wide.push(b'"' as u16);
        command_wide.push(0);
        let bytes = unsafe {
            std::slice::from_raw_parts(
                command_wide.as_mut_ptr().cast::<u8>(),
                command_wide.len() * std::mem::size_of::<u16>(),
            )
        };
        let status = unsafe {
            RegSetValueExW(
                key,
                PCWSTR::from_raw(value_name.as_ptr()),
                None,
                REG_SZ,
                Some(bytes),
            )
        };
        unsafe { RegCloseKey(key) };
        check(status, "Enabling MyBuddy at startup")
    } else {
        let status = unsafe {
            RegOpenKeyExW(
                HKEY_CURRENT_USER,
                PCWSTR::from_raw(key_path.as_ptr()),
                None,
                KEY_SET_VALUE | KEY_QUERY_VALUE,
                &mut key,
            )
        };
        if status == ERROR_FILE_NOT_FOUND {
            return Ok(());
        }
        check(status, "Opening Windows startup settings")?;

        let status = unsafe { RegDeleteValueW(key, PCWSTR::from_raw(value_name.as_ptr())) };
        unsafe { RegCloseKey(key) };
        if status == ERROR_FILE_NOT_FOUND {
            Ok(())
        } else {
            check(status, "Disabling MyBuddy at startup")
        }
    }
}
