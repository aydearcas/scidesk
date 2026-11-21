# Starts a TEST Zotero with its own profile and data directory under private/, so that the
# user's Zotero (library and settings) is never touched. Its local API is enabled and
# automatic updates, sync and first-run screens are off.
#   powershell -File tools\start-test-zotero.ps1   (then wait for http://127.0.0.1:23119/connector/ping)
# Stop it with tools\stop-test-zotero.ps1. Refuses to start if another Zotero is running.
#   -DebugLog writes Zotero's debug output (-ZoteroDebugText) to private\zotero-debug.log
param([switch]$DebugLog)
$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent
$profileDir = Join-Path $root "private\zotero-profile"
$dataDir = Join-Path $root "private\zotero-data"
if (Get-Process zotero -ErrorAction SilentlyContinue) { throw "A Zotero is already running: close it first (this script only starts a test instance)." }
New-Item -ItemType Directory -Force $profileDir, $dataDir | Out-Null
$esc = $dataDir.Replace("\", "\\")
@"
user_pref("extensions.zotero.dataDir", "$esc");
user_pref("extensions.zotero.useDataDir", true);
user_pref("extensions.zotero.httpServer.localAPI.enabled", true);
user_pref("extensions.zotero.firstRun2", false);
user_pref("extensions.zotero.firstRunGuidance", false);
user_pref("extensions.zotero.sync.autoSync", false);
user_pref("extensions.zotero.automaticScraperUpdates", false);
user_pref("app.update.enabled", false);
user_pref("app.update.auto", false);
"@ | Set-Content -Path (Join-Path $profileDir "user.js") -Encoding ASCII
$zargs = "--profile `"$profileDir`" --new-instance"
if ($DebugLog) {
  $p = Start-Process "C:\Program Files\Zotero\zotero.exe" -ArgumentList "$zargs -ZoteroDebugText" -PassThru -RedirectStandardOutput (Join-Path $root "private\zotero-debug.log") -RedirectStandardError (Join-Path $root "private\zotero-debug.err")
} else {
  $p = Start-Process "C:\Program Files\Zotero\zotero.exe" -ArgumentList $zargs -PassThru
}
Set-Content -Path (Join-Path $root "private\zotero.pid") -Value $p.Id
Write-Output "test Zotero started (pid $($p.Id)), profile $profileDir"
