//! Zotero's local API (records 0027 and 0052): the page cannot call http://127.0.0.1:23119
//! itself (another origin), so it asks this command. Only GETs, only to that address and only
//! under /api/users/0/ (the user's own library, read-only), with nothing but the path chosen
//! by the page; an answer comes back as status, headers (lower case) and text.
use std::collections::HashMap;
use std::io::{Read, Write};
use std::net::{SocketAddr, TcpStream};
use std::time::Duration;

const ZOTERO: &str = "127.0.0.1:23119";

#[derive(serde::Serialize, Debug)]
pub struct ZoteroResponse {
    status: u16,
    headers: HashMap<String, String>,
    body: String,
}

/// A path under /api of the user's library: printable ASCII without spaces, "..", "#" or "\".
fn valid_path(path: &str) -> bool {
    path.starts_with("/users/0/")
        && path.bytes().all(|b| b.is_ascii_graphic() && b != b'#' && b != b'\\')
        && !path.split(['/', '?', '&']).any(|seg| seg == "..")
}

/// A Zotero-Server-ID: letters and digits only (it goes into a header).
fn valid_server_id(id: &str) -> bool {
    !id.is_empty() && id.len() <= 64 && id.bytes().all(|b| b.is_ascii_alphanumeric())
}

fn dechunk(mut body: &[u8]) -> Result<Vec<u8>, String> {
    let mut out = Vec::new();
    loop {
        let line_end = body.windows(2).position(|w| w == b"\r\n").ok_or("bad chunked body")?;
        let size_text = std::str::from_utf8(&body[..line_end]).map_err(|e| e.to_string())?;
        let size = usize::from_str_radix(size_text.split(';').next().unwrap_or("").trim(), 16).map_err(|e| e.to_string())?;
        body = &body[line_end + 2..];
        if size == 0 {
            return Ok(out);
        }
        if body.len() < size + 2 {
            return Err("truncated chunk".into());
        }
        out.extend_from_slice(&body[..size]);
        body = &body[size + 2..];
    }
}

fn parse(raw: &[u8]) -> Result<ZoteroResponse, String> {
    let split = raw.windows(4).position(|w| w == b"\r\n\r\n").ok_or("no HTTP header")?;
    let head = String::from_utf8_lossy(&raw[..split]);
    let mut lines = head.split("\r\n");
    let status = lines
        .next()
        .and_then(|l| l.split_whitespace().nth(1))
        .and_then(|s| s.parse::<u16>().ok())
        .ok_or("no HTTP status")?;
    let mut headers = HashMap::new();
    for l in lines {
        if let Some((k, v)) = l.split_once(':') {
            headers.insert(k.trim().to_ascii_lowercase(), v.trim().to_string());
        }
    }
    let mut body = raw[split + 4..].to_vec();
    if headers.get("transfer-encoding").is_some_and(|v| v.eq_ignore_ascii_case("chunked")) {
        body = dechunk(&body)?;
    } else if let Some(n) = headers.get("content-length").and_then(|v| v.parse::<usize>().ok()) {
        body.truncate(n);
    }
    Ok(ZoteroResponse { status, headers, body: String::from_utf8_lossy(&body).into_owned() })
}

fn get(path: &str, server_id: Option<&str>) -> Result<ZoteroResponse, String> {
    if !valid_path(path) {
        return Err(format!("refused path {path}"));
    }
    let sid = match server_id {
        Some(id) if valid_server_id(id) => format!("Zotero-Server-ID: {id}\r\n"),
        Some(_) => return Err("refused server id".into()),
        None => String::new(),
    };
    let addr: SocketAddr = ZOTERO.parse().map_err(|e| format!("{e}"))?;
    let mut s = TcpStream::connect_timeout(&addr, Duration::from_secs(2)).map_err(|e| format!("Zotero is not running: {e}"))?;
    s.set_read_timeout(Some(Duration::from_secs(60))).map_err(|e| e.to_string())?;
    write!(s, "GET /api{path} HTTP/1.1\r\nHost: {ZOTERO}\r\nZotero-API-Version: 3\r\nAccept: application/json\r\n{sid}Connection: close\r\n\r\n").map_err(|e| e.to_string())?;
    let mut raw = Vec::new();
    s.read_to_end(&mut raw).map_err(|e| e.to_string())?;
    parse(&raw)
}

#[tauri::command]
pub async fn zotero_get(path: String, server_id: Option<String>) -> Result<ZoteroResponse, String> {
    tauri::async_runtime::spawn_blocking(move || get(&path, server_id.as_deref())).await.map_err(|e| e.to_string())?
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn only_the_users_library_and_plain_paths() {
        for good in ["/users/0/collections?limit=100&start=0", "/users/0/collections/2WKHESGH/items/top?format=json&include=data%2Ccsljson"] {
            assert!(valid_path(good), "{good}");
        }
        for bad in ["/users/1/items", "/groups/5/items", "users/0/x", "/users/0/../../connector", "/users/0/a b", "/users/0/x\r\nHost: y", "/users/0/x#y", "/users/0/\\x", "/users/0/ñ"] {
            assert!(!valid_path(bad), "{bad:?}");
        }
        assert!(valid_server_id("YtkYpNy6ednQ"));
        assert!(!valid_server_id("a\r\nX: y") && !valid_server_id(""));
    }

    #[test]
    fn reads_plain_and_chunked_answers() {
        let plain = parse(b"HTTP/1.0 200 OK\r\nTotal-Results: 2\r\nZotero-Server-ID: abc\r\nContent-Length: 4\r\n\r\n[1,2]junk").unwrap();
        assert_eq!((plain.status, plain.body.as_str()), (200, "[1,2"));
        assert_eq!(plain.headers["total-results"], "2");
        assert_eq!(plain.headers["zotero-server-id"], "abc");
        let chunked = parse(b"HTTP/1.1 403 Forbidden\r\nTransfer-Encoding: chunked\r\n\r\n5\r\nLocal\r\n4\r\n API\r\n0\r\n\r\n").unwrap();
        assert_eq!((chunked.status, chunked.body.as_str()), (403, "Local API"));
        assert!(parse(b"garbage").is_err());
    }
}
