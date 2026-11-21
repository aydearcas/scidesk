# Runs every check of prototype 7 that needs desktop Word (Windows only).
# Usage, from prototypes/07-track-changes:  powershell -ExecutionPolicy Bypass -File tools\run-word-checks.ps1
$ErrorActionPreference = "Stop"
Set-Location (Split-Path $PSScriptRoot -Parent)
$utf8 = New-Object System.Text.UTF8Encoding($false)

node tools/build.mjs
Remove-Item out\export-*.docx -ErrorAction SilentlyContinue
node out/roundtrip.mjs export

# 1. Word opens every exported DOCX and sees the same changes, authors and texts.
$files = Get-ChildItem out\export-*.docx | ForEach-Object { $_.FullName }
$json = & powershell -NoProfile -ExecutionPolicy Bypass -File tools\word.ps1 inspect @files
[System.IO.File]::WriteAllText("$PWD\out\word-inspect.json", ($json -join ""), $utf8)
node out/roundtrip.mjs check

# 2. Word makes its own tracked changes; we import them and compare with Word.
& powershell -NoProfile -ExecutionPolicy Bypass -File tools\word.ps1 edit out\base.docx out\word-edited.docx
$json = & powershell -NoProfile -ExecutionPolicy Bypass -File tools\word.ps1 inspect out\word-edited.docx
[System.IO.File]::WriteAllText("$PWD\out\word-edited-inspect.json", ($json -join ""), $utf8)
node out/roundtrip.mjs import
