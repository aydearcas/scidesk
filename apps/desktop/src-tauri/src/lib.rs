//! SciDesk's Tauri side: open a project folder and read, write and list files inside it.
//! Nothing outside the folder the user chose is reachable (PLAN 6.6): paths are relative,
//! without "..", and resolved under the root. Writes are atomic: a temporary file next to
//! the target, then a rename (R25). Besides, a small store in this computer's app local
//! data folder for what never travels with the project, such as the journal of unsaved
//! changes (R25, R26, record 0039), with the same rules.
pub mod pdf;
pub mod preview;
pub mod raster;
pub mod zotero;

use std::collections::HashMap;
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

#[derive(serde::Serialize)]
struct Opened {
    name: String,
    path: String,
}

/// A path as the user knows it (without Windows' "\\?\" prefix of canonical paths).
fn shown(path: &Path) -> String {
    path.to_string_lossy().trim_start_matches(r"\\?\").to_string()
}

fn opened(path: PathBuf, state: &State<'_, ProjectRoot>) -> Result<Opened, String> {
    let name = path.file_name().map(|n| n.to_string_lossy().to_string()).unwrap_or_default();
    let out = Opened { name, path: shown(&path) };
    *state.0.lock().map_err(|e| e.to_string())? = Some(path);
    Ok(out)
}

/// Asks for a folder and makes it the project root. Returns its name and path, or None if cancelled.
#[tauri::command]
async fn open_project(app: tauri::AppHandle, state: State<'_, ProjectRoot>) -> Result<Option<Opened>, String> {
    let Some(picked) = app.dialog().file().blocking_pick_folder() else { return Ok(None) };
    let path = fs::canonicalize(picked.into_path().map_err(|e| e.to_string())?).map_err(|e| e.to_string())?;
    trust(&app, &path)?;
    opened(path, &state).map(Some)
}

// ---------------------------------------------------------------- folders the user chose (record 0048)
//
// The window can reopen a recent project, or create a project's folder, only in a folder the
// user picked in the system dialog at some point (or in their Documents folder, the wizard's
// default place). The list lives in this computer's app data under a name the local store
// cannot write ("trusted folders.json" has a space), so the web view cannot add to it.

const TRUSTED: &str = "trusted folders.json";

fn trusted_list(app: &tauri::AppHandle) -> Vec<String> {
    let Ok(root) = local_root(app) else { return Vec::new() };
    fs::read_to_string(root.join(TRUSTED)).ok().and_then(|t| serde_json::from_str(&t).ok()).unwrap_or_default()
}

fn key(path: &Path) -> String {
    shown(path).to_lowercase()
}

fn save_trusted(app: &tauri::AppHandle, list: &[String]) -> Result<(), String> {
    write_atomic(&local_root(app)?.join(TRUSTED), serde_json::to_string(list).map_err(|e| e.to_string())?.as_bytes())
}

fn trust(app: &tauri::AppHandle, path: &Path) -> Result<(), String> {
    let mut list = trusted_list(app);
    let k = key(path);
    if !list.contains(&k) {
        list.push(k);
        save_trusted(app, &list)?;
    }
    Ok(())
}

fn documents(app: &tauri::AppHandle) -> Option<PathBuf> {
    app.path().document_dir().ok().map(|d| fs::canonicalize(&d).unwrap_or(d))
}

fn is_trusted(app: &tauri::AppHandle, path: &Path) -> bool {
    let k = key(path);
    trusted_list(app).contains(&k) || documents(app).map(|d| key(&d)) == Some(k)
}

/// The canonical form of a folder path from the window, if it is there.
fn existing(path: &str) -> Option<PathBuf> {
    fs::canonicalize(path).ok().filter(|p| p.is_dir())
}

/// A folder name for a new project: one plain segment that Windows and macOS accept.
fn valid_folder_name(name: &str) -> bool {
    !name.is_empty()
        && name.len() <= 120
        && name.trim() == name
        && !name.ends_with('.')
        && !name.chars().any(|c| c.is_control() || "<>:\"/\\|?*".contains(c))
}

/// Reopens a recent project. "ENOENT" when its folder is not there (a synchronised folder not
/// yet downloaded, or moved), "not chosen" when the user never picked it.
#[tauri::command]
fn open_recent(app: tauri::AppHandle, state: State<'_, ProjectRoot>, path: String) -> Result<Opened, String> {
    let Some(p) = existing(&path) else { return Err("ENOENT".into()) };
    if !is_trusted(&app, &p) {
        return Err("not chosen".into());
    }
    opened(p, &state)
}

/// For each recent folder, whether it is there now (a folder the user never chose is "not there":
/// the window cannot probe the disk with it).
#[tauri::command]
fn recent_exists(app: tauri::AppHandle, paths: Vec<String>) -> Vec<bool> {
    paths.iter().map(|p| existing(p).is_some_and(|d| is_trusted(&app, &d))).collect()
}

/// Where the wizard proposes new projects: the user's Documents folder.
#[tauri::command]
fn default_location(app: tauri::AppHandle) -> Option<String> {
    documents(&app).map(|d| shown(&d))
}

/// Asks for the place of a new project (the folder that will hold it). None if cancelled.
#[tauri::command]
async fn pick_location(app: tauri::AppHandle) -> Result<Option<String>, String> {
    let Some(picked) = app.dialog().file().blocking_pick_folder() else { return Ok(None) };
    let path = fs::canonicalize(picked.into_path().map_err(|e| e.to_string())?).map_err(|e| e.to_string())?;
    trust(&app, &path)?;
    Ok(Some(shown(&path)))
}

/// Whether `<location>/<name>` can hold a new project: "free" (not there), "empty" or "used".
/// Only in a place the user chose.
#[tauri::command]
fn folder_state(app: tauri::AppHandle, location: String, name: String) -> Result<String, String> {
    match existing(&location) {
        Some(parent) if is_trusted(&app, &parent) => state_of(&location, &name),
        _ => Err("not chosen".into()),
    }
}

fn state_of(location: &str, name: &str) -> Result<String, String> {
    if !valid_folder_name(name) {
        return Err("bad name".into());
    }
    let p = Path::new(location).join(name);
    Ok(match fs::read_dir(&p) {
        Ok(mut entries) => if entries.next().is_none() { "empty" } else { "used" },
        Err(_) if !p.exists() => "free",
        Err(_) => "used",
    }
    .into())
}

/// Creates `<location>/<name>` (or takes it if it is empty) and makes it the project root.
#[tauri::command]
fn create_project_folder(app: tauri::AppHandle, state: State<'_, ProjectRoot>, location: String, name: String) -> Result<Opened, String> {
    if !valid_folder_name(&name) {
        return Err("bad name".into());
    }
    let Some(parent) = existing(&location) else { return Err("ENOENT".into()) };
    if !is_trusted(&app, &parent) {
        return Err("not chosen".into());
    }
    let dir = parent.join(&name);
    match fs::read_dir(&dir) {
        Ok(mut entries) => {
            if entries.next().is_some() {
                return Err("the folder is not empty".into());
            }
        }
        Err(_) => fs::create_dir(&dir).map_err(|e| e.to_string())?,
    }
    let dir = fs::canonicalize(&dir).map_err(|e| e.to_string())?;
    trust(&app, &dir)?;
    opened(dir, &state)
}

/// Takes a folder off the list of places the user chose ("Remove from the list").
#[tauri::command]
fn forget_folder(app: tauri::AppHandle, path: String) -> Result<(), String> {
    let k = existing(&path).map(|p| key(&p)).unwrap_or_else(|| path.to_lowercase());
    let list: Vec<String> = trusted_list(&app).into_iter().filter(|x| *x != k).collect();
    save_trusted(&app, &list)
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

// ---------------------------------------------------------------- PDF (record 0040)

#[derive(serde::Serialize)]
struct PdfOut {
    /// The PDF, in base64.
    pdf: String,
    pages: usize,
    warnings: Vec<String>,
}

/// Compiles the Typst source the core wrote, with its files (base64), to a PDF. It runs off
/// the window's thread; it reads nothing from the disk.
#[tauri::command]
async fn compile_pdf(source: String, files: HashMap<String, String>, standard: Option<String>) -> Result<PdfOut, String> {
    use base64::Engine;
    let b64 = base64::engine::general_purpose::STANDARD;
    let mut decoded = HashMap::new();
    for (path, data) in files {
        decoded.insert(path, b64.decode(data).map_err(|e| e.to_string())?);
    }
    let out = pdf::compile(&source, decoded, standard.as_deref()).map_err(|e| e.join("\n"))?;
    Ok(PdfOut { pdf: b64.encode(&out.pdf), pages: out.pages, warnings: out.warnings })
}

/// Record 0058: compiles the preview of the article on screen in the live World (only what
/// changed is laid out again); `files` (base64) only when the figures changed. Off the window's thread.
#[tauri::command]
async fn preview_compile(app: tauri::AppHandle, source: String, files: Option<HashMap<String, String>>) -> Result<preview::PreviewOut, String> {
    use base64::Engine;
    let decoded = match files {
        Some(files) => {
            let b64 = base64::engine::general_purpose::STANDARD;
            let mut out = HashMap::new();
            for (path, data) in files {
                out.insert(path, b64.decode(data).map_err(|e| e.to_string())?);
            }
            Some(out)
        }
        None => None,
    };
    tauri::async_runtime::spawn_blocking(move || {
        let state = app.state::<preview::PreviewState>();
        let mut live = state.0.lock().map_err(|e| e.to_string())?;
        preview::update(&mut live, source, decoded).map_err(|e| e.join("
"))
    })
    .await
    .map_err(|e| e.to_string())?
}

/// Record 0068: the PNG of an image the exports cannot take as it is (an SVG's fallback in the
/// DOCX). The image comes as the raw body; the answer is its own width and height in CSS
/// pixels (two little-endian f32) followed by the PNG.
#[tauri::command]
async fn raster_image(request: Request<'_>) -> Result<Response, String> {
    let InvokeBody::Raw(bytes) = request.body() else { return Err("expected raw bytes".into()) };
    let bytes = bytes.clone();
    tauri::async_runtime::spawn_blocking(move || {
        let r = raster::to_png(&bytes)?;
        let mut out = Vec::with_capacity(8 + r.png.len());
        out.extend_from_slice(&r.width.to_le_bytes());
        out.extend_from_slice(&r.height.to_le_bytes());
        out.extend_from_slice(&r.png);
        Ok(Response::new(out))
    })
    .await
    .map_err(|e| e.to_string())?
}

/// Record 0058: one page of the last preview as a PNG (raw bytes).
#[tauri::command]
async fn preview_page(app: tauri::AppHandle, page: usize, pixel_per_pt: f32) -> Result<Response, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let state = app.state::<preview::PreviewState>();
        let live = state.0.lock().map_err(|e| e.to_string())?;
        preview::page(&live, page, pixel_per_pt).map(Response::new).ok_or_else(|| format!("no page {page}"))
    })
    .await
    .map_err(|e| e.to_string())?
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .manage(ProjectRoot::default())
        .manage(preview::PreviewState::default())
        .invoke_handler(tauri::generate_handler![open_project, open_recent, recent_exists, default_location, pick_location, folder_state, create_project_folder, forget_folder, read_file, write_file, list_files, local_read, local_write, local_remove, local_list, compile_pdf, preview_compile, preview_page, raster_image, zotero::zotero_get])
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
    fn folder_names_are_one_plain_segment() {
        for bad in ["", " x", "x ", "a/b", "a\\b", "..", ".", "x.", "a:b", "a*b", "a?b", "a|b", "<a>", "a\"b", "a\u{1}b"] {
            assert!(!valid_folder_name(bad), "{bad:?}");
        }
        for good in ["remision-ar", "Remisión sostenida", "cohorte (2026)", "a.b"] {
            assert!(valid_folder_name(good), "{good}");
        }
    }

    #[test]
    fn the_trusted_list_is_out_of_the_local_store() {
        assert!(local_path(Path::new("/data"), TRUSTED).is_err());
    }

    #[test]
    fn a_new_folder_is_free_empty_or_used() {
        let dir = tempfile::tempdir().unwrap();
        let loc = dir.path().to_string_lossy().to_string();
        assert_eq!(state_of(&loc, "nuevo").unwrap(), "free");
        fs::create_dir(dir.path().join("nuevo")).unwrap();
        assert_eq!(state_of(&loc, "nuevo").unwrap(), "empty");
        write_atomic(&dir.path().join("nuevo/x.txt"), b"x").unwrap();
        assert_eq!(state_of(&loc, "nuevo").unwrap(), "used");
        assert!(state_of(&loc, "../x").is_err());
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
