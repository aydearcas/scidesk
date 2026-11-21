//! spellbook compiled to WebAssembly with a minimal C-style interface, so the checker can
//! run in the editor's web worker on both Windows (WebView2) and macOS (WKWebView).
//!
//! Strings cross the boundary as UTF-8 in buffers the host gets from `alloc`. Several
//! dictionaries can be loaded at once (one per language); each gets a handle.
use std::cell::RefCell;

thread_local! {
    static DICTS: RefCell<Vec<spellbook::Dictionary>> = RefCell::new(Vec::new());
    static OUT: RefCell<Vec<u8>> = RefCell::new(Vec::new());
}

unsafe fn text<'a>(ptr: *const u8, len: usize) -> &'a str {
    std::str::from_utf8_unchecked(std::slice::from_raw_parts(ptr, len))
}

#[no_mangle]
pub extern "C" fn alloc(len: usize) -> *mut u8 {
    let mut v = Vec::<u8>::with_capacity(len.max(1));
    let p = v.as_mut_ptr();
    std::mem::forget(v);
    p
}

#[no_mangle]
pub unsafe extern "C" fn dealloc(ptr: *mut u8, len: usize) {
    drop(Vec::from_raw_parts(ptr, 0, len.max(1)));
}

/// Parses an .aff and a .dic; returns a handle (1-based) or 0 if they do not parse.
#[no_mangle]
pub unsafe extern "C" fn dict_new(aff: *const u8, aff_len: usize, dic: *const u8, dic_len: usize) -> u32 {
    match spellbook::Dictionary::new(text(aff, aff_len), text(dic, dic_len)) {
        Ok(d) => DICTS.with(|ds| {
            let mut ds = ds.borrow_mut();
            ds.push(d);
            ds.len() as u32
        }),
        Err(_) => 0,
    }
}

/// Checks many words at once (separated by '\n'); returns a pointer to one byte per
/// word (1 = correct). The length is the number of words. One call per paragraph keeps
/// the cost of crossing into WebAssembly negligible.
#[no_mangle]
pub unsafe extern "C" fn check_many(handle: u32, ptr: *const u8, len: usize) -> *const u8 {
    let words = text(ptr, len);
    DICTS.with(|ds| {
        let ds = ds.borrow();
        let d = &ds[handle as usize - 1];
        OUT.with(|o| {
            let mut o = o.borrow_mut();
            o.clear();
            o.extend(words.split('\n').map(|w| d.check(w) as u8));
            o.as_ptr()
        })
    })
}

/// Suggestions for one word, joined by '\n'; read `out_len()` bytes from the pointer.
#[no_mangle]
pub unsafe extern "C" fn suggest(handle: u32, ptr: *const u8, len: usize) -> *const u8 {
    let word = text(ptr, len);
    let mut s = Vec::new();
    DICTS.with(|ds| ds.borrow()[handle as usize - 1].suggest(word, &mut s));
    OUT.with(|o| {
        let mut o = o.borrow_mut();
        o.clear();
        o.extend_from_slice(s.join("\n").as_bytes());
        o.as_ptr()
    })
}

#[no_mangle]
pub extern "C" fn out_len() -> usize {
    OUT.with(|o| o.borrow().len())
}

/// Adds a word (project or user dictionary). Hunspell's "word/flags" syntax is accepted.
#[no_mangle]
pub unsafe extern "C" fn add_word(handle: u32, ptr: *const u8, len: usize) -> u32 {
    let word = text(ptr, len);
    DICTS.with(|ds| ds.borrow_mut()[handle as usize - 1].add(word).is_ok() as u32)
}
