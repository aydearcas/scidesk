# Regenerates the DOCX files, the ground-truth edit lists and report.md from the sources.
#   powershell -NoProfile -ExecutionPolicy Bypass -File tools\build-all.ps1 [-SkipSent]
# -SkipSent keeps the existing sent.docx (and build\sent-paragraphs.json), so the reviewers'
# anchors stay valid; rebuilding sent.docx from source is only needed if the sources change.
# Word must not be busy with another automation run; the user's own Word windows are not touched.
param([switch]$SkipSent)
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root
$env:PYTHONIOENCODING = "utf-8"
$backup = Join-Path $env:TEMP "scidesk-corpus-word-identity.json"
$ps = @("-NoProfile", "-ExecutionPolicy", "Bypass", "-File", (Join-Path $PSScriptRoot "word.ps1"))

function Invoke-Word([string[]]$argList) {
  & powershell.exe @ps @argList -IdentityBackup $backup
  if ($LASTEXITCODE -ne 0) { throw "word.ps1 failed: $argList" }
}

if (-not $SkipSent) {
  python tools\prepare.py; if ($LASTEXITCODE -ne 0) { throw "prepare failed" }
  Invoke-Word @("-Mode", "build", "-In", "build\blocks.json", "-Out", "sent.docx", "-Author", "Lucía Herrera Gil", "-Initials", "LH")
  Invoke-Word @("-Mode", "extract", "-In", "sent.docx", "-Out", "build\sent-paragraphs.json")
}
$coauthors = @(
  @{ key = "rios"; name = "Marta Ríos Navarro"; initials = "MR" },
  @{ key = "soler"; name = "Javier Soler Benítez"; initials = "JS" }
)
foreach ($c in $coauthors) {
  python tools\check_edits.py "source\review-$($c.key).json"; if ($LASTEXITCODE -ne 0) { throw "check failed: $($c.key)" }
  Invoke-Word @("-Mode", "validate", "-In", "sent.docx", "-Edits", "source\review-$($c.key).json", "-Out", "build\validate-$($c.key).json")
  Invoke-Word @("-Mode", "apply", "-In", "sent.docx", "-Edits", "source\review-$($c.key).json", "-Out", "returned-$($c.key).docx",
    "-Author", $c.name, "-Initials", $c.initials, "-Report", "build\apply-$($c.key).json")
}
Invoke-Word @("-Mode", "inspect", "-In", "sent.docx,returned-rios.docx,returned-soler.docx", "-Out", "build\inspect.json")
python tools\report.py; if ($LASTEXITCODE -ne 0) { throw "report failed" }
