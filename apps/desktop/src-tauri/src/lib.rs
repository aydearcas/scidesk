//! SciDesk's Tauri side: open a project folder and read, write and list files inside it.
//! Nothing outside the folder the user chose is reachable (PLAN 6.6): paths are relative,
//! without "..", and resolved under the root. Writes are atomic: a temporary file next to
//! the target, then a rename (R25). Besides, a small store in this computer's app local
//! data folder for what never travels with the project, such as the journal of unsaved
//! changes (R25, R26, record 0039), with the same rules.
use std::fs;
use std::io::Write;
use std::path::{Component, Path, PathBuf};
use std::sync::Mutex;

use tauri::ipc::{InvokeBody, Request, Response};
use tauri::{Manager, State};
use tauri_plugin_dialog::DialogExt;

#[derive(Default)]
struct ProjectRoot(Mutex<Option<PathBuf>>);

/// Resolves a project-relative path under `root`, refusing anything that could leave it.
fn resolve(root: &Path, rel: &str) -> Result<PathBuf, String> {
    let rel = rel.trim_end_matches('/');
    if rel.is_empty() {
        return Ok(root.to_path_buf());
    }
    let p = Path::new(rel);
    for c in p.components() {
        match c {
            Component::Normal(_) => {}
            _ => return Err(format!("path outside the project: {rel}")),
        }
    }
    if rel.contains('\\') || rel.contains(':') {
        return Err(format!("path outside the project: {rel}"));
    }
    Ok(root.join(p))
}

fn root(state: &State<ProjectRoot>) -> Result<PathBuf, String> {
    state.0.lock().map_err(|e| e.to_string())?.clone().ok_or_else(|| "no project is open".to_string())
}

/// Asks for a folder and makes it the project root. Returns its name, or None if cancelled.
#[tauri::command]
async fn open_project(app: tauri::AppHandle, state: State<'_, ProjectRoot>) -> Result<Option<String>, String> {
    let Some(picked) = app.dialog().file().blocking_pick_folder() else { return Ok(None) };
    let path = picked.into_path().map_err(|e| e.to_string())?;
    let path = fs::canonicalize(&path).map_err(|e| e.to_string())?;
    let name = path.file_name().map(|n| n.to_string_lossy().to_string()).unwrap_or_default();
    *state.0.lock().map_err(|e| e.to_string())? = Some(path);
    Ok(Some(name))
}

/// The bytes of a file; the error "ENOENT" if it does not exist.
#[tauri::command]
fn read_file(state: State<ProjectRoot>, path: String) -> Result<Response, String> {
    let full = resolve(&root(&state)?, &path)?;
    match fs::read(&full) {
        Ok(bytes) => Ok(Response::new(bytes)),
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => Err("ENOENT".into()),
        Err(e) => Err(e.to_string()),
    }
}

fn write_atomic(full: &Path, bytes: &[u8]) -> Result<(), String> {
    let dir = full.parent().ok_or("no parent folder")?;
    fs::create_dir_all(dir).map_err(|e| e.to_string())?;
    let name = full.file_name().ok_or("no file name")?.to_string_lossy().to_string();
    let tmp = dir.join(format!(".{name}.{}.tmp", std::process::id()));
    let result = (|| {
        let mut f = fs::File::create(&tmp)?;
        f.write_all(bytes)?;
        f.sync_all()?;
        fs::rename(&tmp, full)
    })();
    if result.is_err() {
        let _ = fs::remove_file(&tmp);
    }
    result.map_err(|e| e.to_string())
}

/// Writes the raw request body to the file named (percent-encoded) in the x-path header.
#[tauri::command]
fn write_file(state: State<ProjectRoot>, request: Request) -> Result<(), String> {
    let InvokeBody::Raw(bytes) = request.body() else { return Err("expected raw bytes".into()) };
    let encoded = request.headers().get("x-path").ok_or("missing x-path")?.to_str().map_err(|e| e.to_string())?;
    let path = percent_encoding::percent_decode_str(encoded).decode_utf8().map_err(|e| e.to_string())?;
    let full = resolve(&root(&state)?, &path)?;
    write_atomic(&full, bytes)
}

/// Every file under a folder of the project, as project-relative paths with "/".
#[tauri::command]
fn list_files(state: State<ProjectRoot>, dir: String) -> Result<Vec<String>, String> {
    let root = root(&state)?;
    list_under(&root, &dir)
}

/// Every file under `dir` (relative to `root`), as paths relative to `root` with "/".
fn list_under(root: &Path, dir: &str) -> Result<Vec<String>, String> {
    let start = resolve(root, dir)?;
    let mut out = Vec::new();
    fn visit(root: &Path, d: &Path, out: &mut Vec<String>) -> std::io::Result<()> {
        let Ok(entries) = fs::read_dir(d) else { return Ok(()) };
        for e in entries {
            let e = e?;
            let t = e.file_type()?;
            if t.is_symlink() {
                continue; // never follow links out of the project
            }
            let p = e.path();
            if t.is_dir() {
                visit(root, &p, out)?;
            } else if !p.to_string_lossy().ends_with(".tmp") {
                let rel = p.strip_prefix(root).unwrap_or(&p);
                out.push(rel.components().map(|c| c.as_os_str().to_string_lossy()).collect::<Vec<_>>().join("/"));
            }
        }
        Ok(())
    }
    visit(root, &start, &mut out).map_err(|e| e.to_string())?;
    out.sort();
    Ok(out)
}

// ---------------------------------------------------------------- local store (app data)

/// This computer's app local data folder (never synchronised with the project).
fn local_root(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    app.path().app_local_data_dir().map_err(|e| e.to_string())
}

/// A key of the local store: a relative path of plain segments.
fn local_path(root: &Path, key: &str) -> Result<PathBuf, String> {
    let ok = !key.is_empty()
        && key.split('/').all(|s| !s.is_empty() && s != "." && s != ".." && s.chars().all(|c| c.is_ascii_alphanumeric() || "._-".contains(c)));
    if !ok {
        return Err(format!("bad local key: {key}"));
    }
    resolve(root, key)
}

#[tauri::command]
fn local_read(app: tauri::AppHandle, key: String) -> Result<Option<String>, String> {
    let full = local_path(&local_root(&app)?, &key)?;
    match fs::read_to_string(&full) {
        Ok(text) => Ok(Some(text)),
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(None),
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
fn local_write(app: tauri::AppHandle, key: String, text: String) -> Result<(), String> {
    write_atomic(&local_path(&local_root(&app)?, &key)?, text.as_bytes())
}

#[tauri::command]
fn local_remove(app: tauri::AppHandle, key: String) -> Result<(), String> {
    match fs::remove_file(local_path(&local_root(&app)?, &key)?) {
        Err(e) if e.kind() != std::io::ErrorKind::NotFound => Err(e.to_string()),
        _ => Ok(()),
    }
}

/// Keys under a prefix that is a folder ("" for all), e.g. "projects/<id>/recovery/".
#[tauri::command]
fn local_list(app: tauri::AppHandle, prefix: String) -> Result<Vec<String>, String> {
    let root = local_root(&app)?;
    let dir = prefix.trim_end_matches('/');
    if !dir.is_empty() {
        local_path(&root, dir)?;
    }
    Ok(list_under(&root, dir)?.into_iter().filter(|k| k.starts_with(&prefix)).collect())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .manage(ProjectRoot::default())
        .invoke_handler(tauri::generate_handler![open_project, read_file, write_file, list_files, local_read, local_write, local_remove, local_list])
        .run(tauri::generate_context!())
        .expect("error while running SciDesk");
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn refuses_paths_outside_the_project() {
        let root = Path::new("/project");
        for bad in ["../x", "/etc/passwd", "a/../../b", "C:/Windows", "a\\..\\b", "./x"] {
            assert!(resolve(root, bad).is_err(), "{bad}");
        }
        assert_eq!(resolve(root, "articles/main/article.json").unwrap(), root.join("articles/main/article.json"));
    }

    #[test]
    fn local_keys_stay_in_the_store() {
        let root = Path::new("/data");
        for bad in ["", "../x", "a/../b", "/abs", "C:/x", "a\\b", "a//b", "a/./b", "a b"] {
            assert!(local_path(root, bad).is_err(), "{bad}");
        }
        assert_eq!(local_path(root, "projects/p-1/recovery/main/x.scidoc.json").unwrap(), root.join("projects/p-1/recovery/main/x.scidoc.json"));
    }

    #[test]
    fn lists_relative_to_the_root() {
        let dir = tempfile::tempdir().unwrap();
        write_atomic(&dir.path().join("projects/p/recovery/main/a.json"), b"{}").unwrap();
        write_atomic(&dir.path().join("projects/q/state.json"), b"{}").unwrap();
        assert_eq!(list_under(dir.path(), "projects/p").unwrap(), vec!["projects/p/recovery/main/a.json"]);
        assert_eq!(list_under(dir.path(), "").unwrap().len(), 2);
        assert!(list_under(dir.path(), "missing").unwrap().is_empty());
    }

    #[test]
    fn writes_atomically() {
        let dir = tempfile::tempdir().unwrap();
        let f = dir.path().join("a/b.json");
        write_atomic(&f, b"{}").unwrap();
        write_atomic(&f, b"{\"x\":1}").unwrap();
        assert_eq!(fs::read_to_string(&f).unwrap(), "{\"x\":1}");
        assert_eq!(fs::read_dir(f.parent().unwrap()).unwrap().count(), 1); // no temporary left
    }
}
