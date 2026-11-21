# Copies each table of a DOCX with desktop Word (Range.Copy, as Ctrl+C does) and saves
# what Word put on the clipboard: "HTML Format" (what a browser pastes) and, optionally,
# "Rich Text Format". The user's clipboard is saved first and restored at the end.
#
#   powershell -STA -ExecutionPolicy Bypass -File tools\capture-clipboard.ps1 -Docx <file> -Out private\clip [-Tables "1,2,3"] [-Paragraphs "10,11"] [-Rtf]
#
# -Paragraphs copies body paragraphs instead (to see whether citation fields survive).
param(
  [Parameter(Mandatory = $true)][string]$Docx,
  [Parameter(Mandatory = $true)][string]$Out,
  [string]$Tables,      # comma-separated; powershell -File cannot pass arrays
  [string]$Paragraphs,
  [switch]$Rtf
)
$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Windows.Forms
# .NET decodes "HTML Format" with the ANSI code page and garbles non-ASCII text, so the
# raw UTF-8 bytes are read with the Win32 clipboard API instead.
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public static class RawClipboard {
  [DllImport("user32.dll", SetLastError = true)] static extern bool OpenClipboard(IntPtr h);
  [DllImport("user32.dll")] static extern bool CloseClipboard();
  [DllImport("user32.dll")] static extern IntPtr GetClipboardData(uint f);
  [DllImport("user32.dll", CharSet = CharSet.Unicode)] static extern uint RegisterClipboardFormat(string n);
  [DllImport("kernel32.dll")] static extern IntPtr GlobalLock(IntPtr h);
  [DllImport("kernel32.dll")] static extern bool GlobalUnlock(IntPtr h);
  [DllImport("kernel32.dll")] static extern UIntPtr GlobalSize(IntPtr h);
  public static byte[] Get(string format) {
    uint f = RegisterClipboardFormat(format);
    for (int i = 0; i < 20 && !OpenClipboard(IntPtr.Zero); i++) System.Threading.Thread.Sleep(50);
    try {
      IntPtr h = GetClipboardData(f);
      if (h == IntPtr.Zero) return null;
      IntPtr p = GlobalLock(h);
      int n = (int)GlobalSize(h);
      byte[] b = new byte[n];
      Marshal.Copy(p, b, 0, n);
      GlobalUnlock(h);
      int end = Array.IndexOf(b, (byte)0);
      if (end >= 0) Array.Resize(ref b, end);
      return b;
    } finally { CloseClipboard(); }
  }
}
"@
New-Item -ItemType Directory -Force $Out | Out-Null
$utf8 = New-Object System.Text.UTF8Encoding($false)

# --- save the user's clipboard (every format that can be read now)
$backup = New-Object System.Windows.Forms.DataObject
$saved = 0
$current = [System.Windows.Forms.Clipboard]::GetDataObject()
if ($current) {
  foreach ($f in $current.GetFormats($false)) {
    try { $d = $current.GetData($f, $false); if ($null -ne $d) { $backup.SetData($f, $false, $d); $saved++ } } catch {}
  }
}

function Save-Clip($name) {
  Start-Sleep -Milliseconds 150
  $html = [RawClipboard]::Get("HTML Format")
  if ($null -eq $html) { throw "no HTML on the clipboard for $name" }
  [System.IO.File]::WriteAllBytes((Join-Path $Out "$name.html"), $html)
  if ($Rtf) {
    $rtf = [RawClipboard]::Get("Rich Text Format")
    if ($rtf) { [System.IO.File]::WriteAllBytes((Join-Path $Out "$name.rtf"), $rtf) }
  }
}

$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0
$doc = $null
try {
  $doc = $word.Documents.Open((Resolve-Path $Docx).Path, $false, $true)
  $meta = @()
  if ($Paragraphs) {
    foreach ($i in ($Paragraphs -split "," | ForEach-Object { [int]$_ })) {
      $doc.Paragraphs.Item($i).Range.Copy()
      Save-Clip ("p{0:D4}" -f $i)
    }
  } else {
    $n = $doc.Tables.Count
    $list = if ($Tables) { $Tables -split "," | ForEach-Object { [int]$_ } } else { 1..$n }
    foreach ($i in $list) {
      $t = $doc.Tables.Item($i)
      $t.Range.Copy()
      Save-Clip ("t{0:D3}" -f $i)
      $meta += [ordered]@{ index = $i; rows = $t.Rows.Count; cols = $t.Columns.Count }
    }
    ConvertTo-Json -InputObject $meta -Compress | ForEach-Object { [System.IO.File]::WriteAllText((Join-Path $Out "word-meta.json"), $_, $utf8) }
    Write-Output "copied $($list.Count) of $n tables"
  }
}
finally {
  if ($doc) { $doc.Close(0) }
  $word.Quit()
  [System.Runtime.InteropServices.Marshal]::ReleaseComObject($word) | Out-Null
  # --- restore the user's clipboard
  if ($saved -gt 0) { [System.Windows.Forms.Clipboard]::SetDataObject($backup, $true) } else { [System.Windows.Forms.Clipboard]::Clear() }
  Write-Output "clipboard restored ($saved formats)"
}
