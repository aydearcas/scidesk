# Stops the test Zotero started by start-test-zotero.ps1: only the zotero.exe whose command
# line names this prototype's test profile, and its child processes.
$root = Split-Path $PSScriptRoot -Parent
$marker = Join-Path $root "private\zotero-profile"
$procs = Get-CimInstance Win32_Process -Filter "Name='zotero.exe'"
$main = @($procs | Where-Object { $_.CommandLine -and $_.CommandLine.Contains($marker) })
if (-not $main) { Write-Output "test Zotero not running"; return }
foreach ($m in $main) {
  $p = Get-Process -Id $m.ProcessId -ErrorAction SilentlyContinue
  if ($p) { $p.CloseMainWindow() | Out-Null; if (-not $p.WaitForExit(15000)) { Stop-Process -Id $p.Id -Force } }
  # children (content processes) that are left
  $procs | Where-Object { $_.ParentProcessId -eq $m.ProcessId } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
  Write-Output "test Zotero stopped (pid $($m.ProcessId))"
}
Remove-Item (Join-Path $root "private\zotero.pid") -ErrorAction SilentlyContinue
