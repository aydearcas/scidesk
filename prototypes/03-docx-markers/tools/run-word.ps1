# Runs tools/word.ps1 in a child process with a time limit, keeping the user's clipboard
# safe: it is saved here first and restored here at the end, even when the child has to be
# stopped. If the time runs out, only the hidden Word instances started after this script
# (no window) are stopped.
#   powershell -File tools\run-word.ps1 [-Timeout 300] <arguments for word.ps1>
[CmdletBinding(PositionalBinding = $false)]
param(
  [int]$Timeout = 300,
  [Parameter(ValueFromRemainingArguments = $true)][string[]]$Rest
)
$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Windows.Forms
$started = Get-Date

$backup = New-Object System.Windows.Forms.DataObject
$saved = 0
$current = [System.Windows.Forms.Clipboard]::GetDataObject()
if ($null -ne $current) {
  foreach ($f in $current.GetFormats($false)) {
    try { $d = $current.GetData($f, $false); if ($null -ne $d) { $backup.SetData($f, $false, $d); $saved++ } } catch {}
  }
}
try {
  $quoted = ($Rest | ForEach-Object { '"' + $_ + '"' }) -join " "
  $out = [System.IO.Path]::GetTempFileName()
  $err = [System.IO.Path]::GetTempFileName()
  $p = Start-Process powershell -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File `"$PSScriptRoot\word.ps1`" $quoted" -NoNewWindow -PassThru -RedirectStandardOutput $out -RedirectStandardError $err
  if (-not $p.WaitForExit($Timeout * 1000)) {
    Stop-Process -Id $p.Id -Force
    Get-Process WINWORD -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowHandle -eq 0 -and $_.StartTime -gt $started } | ForEach-Object { Stop-Process -Id $_.Id -Force; Write-Output "stopped hidden Word $($_.Id)" }
    Write-Output "TIMEOUT after $Timeout s"
  }
  Get-Content $out -Encoding UTF8
  Get-Content $err -Encoding UTF8 | Select-Object -First 8
  Remove-Item $out, $err -ErrorAction SilentlyContinue
}
finally {
  if ($saved -gt 0) { [System.Windows.Forms.Clipboard]::SetDataObject($backup, $true) } else { [System.Windows.Forms.Clipboard]::Clear() }
  Write-Output "clipboard restored ($saved formats)"
}
