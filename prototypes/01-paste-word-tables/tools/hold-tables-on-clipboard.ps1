# For the real Ctrl+V check: puts each table on the clipboard in turn (copied by desktop
# Word) and waits until the browser side has pasted it. Creates <Signal>\ready-N when table
# N is on the clipboard and waits for <Signal>\done-N. Restores the user's clipboard at the end.
#   powershell -STA -ExecutionPolicy Bypass -File tools\hold-tables-on-clipboard.ps1 -Docx <file> -Tables "2,44,51,135" -Signal out\signal
param([Parameter(Mandatory = $true)][string]$Docx, [Parameter(Mandatory = $true)][string]$Tables, [Parameter(Mandatory = $true)][string]$Signal)
$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Windows.Forms
New-Item -ItemType Directory -Force $Signal | Out-Null
Get-ChildItem $Signal -Filter "*-*" | ForEach-Object { [System.IO.File]::Delete($_.FullName) }

$backup = New-Object System.Windows.Forms.DataObject
$saved = 0
$current = [System.Windows.Forms.Clipboard]::GetDataObject()
if ($current) {
  foreach ($f in $current.GetFormats($false)) {
    try { $d = $current.GetData($f, $false); if ($null -ne $d) { $backup.SetData($f, $false, $d); $saved++ } } catch {}
  }
}
$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0
$doc = $null
try {
  $doc = $word.Documents.Open((Resolve-Path $Docx).Path, $false, $true)
  foreach ($i in ($Tables -split "," | ForEach-Object { [int]$_ })) {
    $doc.Tables.Item($i).Range.Copy()
    New-Item -ItemType File (Join-Path $Signal "ready-$i") | Out-Null
    $deadline = (Get-Date).AddMinutes(5)
    while (-not (Test-Path (Join-Path $Signal "done-$i"))) {
      if ((Get-Date) -gt $deadline) { throw "timed out waiting for done-$i" }
      Start-Sleep -Milliseconds 300
    }
  }
}
finally {
  if ($doc) { $doc.Close(0) }
  $word.Quit()
  [System.Runtime.InteropServices.Marshal]::ReleaseComObject($word) | Out-Null
  if ($saved -gt 0) { [System.Windows.Forms.Clipboard]::SetDataObject($backup, $true) } else { [System.Windows.Forms.Clipboard]::Clear() }
  Write-Output "clipboard restored ($saved formats)"
}
