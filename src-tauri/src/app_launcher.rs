
use serde::Serialize;
use std::{
    fs,
    path::{Path, PathBuf},
    process::Command,
};

#[derive(Debug, Clone, Serialize)]
pub struct InstalledApp {
    pub id: String,
    pub name: String,
    pub path: String,
}

fn start_menu_dirs() -> Vec<PathBuf> {
    let mut dirs = Vec::new();

    if let Ok(app_data) = std::env::var("APPDATA") {
        dirs.push(
            PathBuf::from(app_data)
                .join("Microsoft")
                .join("Windows")
                .join("Start Menu")
                .join("Programs"),
        );
    }

    if let Ok(program_data) = std::env::var("PROGRAMDATA") {
        dirs.push(
            PathBuf::from(program_data)
                .join("Microsoft")
                .join("Windows")
                .join("Start Menu")
                .join("Programs"),
        );
    }

    dirs
}

fn collect_apps(dir: &Path, depth: usize, apps: &mut Vec<InstalledApp>) {
    if depth > 5 || apps.len() >= 1500 {
        return;
    }

    let Ok(entries) = fs::read_dir(dir) else {
        return;
    };

    for entry in entries.flatten() {
        if apps.len() >= 1500 {
            break;
        }

        let path = entry.path();

        if path.is_dir() {
            collect_apps(&path, depth + 1, apps);
            continue;
        }

        let Some(extension) = path.extension().and_then(|e| e.to_str()) else {
            continue;
        };

        if !extension.eq_ignore_ascii_case("lnk")
            && !extension.eq_ignore_ascii_case("exe")
        {
            continue;
        }

        let Some(name) = path.file_stem().and_then(|n| n.to_str()) else {
            continue;
        };

        let path_string = path.to_string_lossy().into_owned();

        apps.push(InstalledApp {
            id: path_string.clone(),
            name: name.to_string(),
            path: path_string,
        });
    }
}

#[tauri::command]
pub fn list_installed_apps() -> Vec<InstalledApp> {
    let mut apps = Vec::new();

    for dir in start_menu_dirs() {
        collect_apps(&dir, 0, &mut apps);
    }

    apps.sort_by_key(|app| app.name.to_lowercase());
    apps.dedup_by(|a, b| a.path.eq_ignore_ascii_case(&b.path));

    apps
}

#[tauri::command]
pub fn launch_app(path: String) -> Result<(), String> {
    let selected = PathBuf::from(&path);

    let extension = selected
        .extension()
        .and_then(|value| value.to_str())
        .ok_or_else(|| "Unsupported application path".to_string())?;

    if !extension.eq_ignore_ascii_case("lnk")
        && !extension.eq_ignore_ascii_case("exe")
    {
        return Err("Only Start Menu shortcuts and executables are supported".into());
    }

    let allowed = start_menu_dirs()
        .iter()
        .any(|dir| selected.starts_with(dir));

    if !allowed || !selected.is_file() {
        return Err("Application was not found in a supported Start Menu folder".into());
    }

    if extension.eq_ignore_ascii_case("lnk") {
        Command::new("explorer.exe")
            .arg(&selected)
            .spawn()
            .map_err(|error| format!("Could not open shortcut: {error}"))?;
    } else {
        Command::new(&selected)
            .spawn()
            .map_err(|error| format!("Could not launch application: {error}"))?;
    }

    Ok(())
}
