# For each DOCX given: copies it to <name>-refreshed.docx, opens the copy in Word (visible:
# Zotero's integration works on the Word window in front), runs the Zotero add-in's
# "Refresh" macro, as a co-author with Zotero would press Zotero > Refresh, and saves
# the copy in place with Save(). Needs the TEST Zotero running (tools\start-test-zotero.ps1)
# and no other Word open: Zotero acts on the active document of the Word it reaches.
# Each step is logged to out\zotero-refresh.log.
param([Parameter(ValueFromRemainingArguments = $true)][string[]]$Files)
$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent
$log = Join-Path $root "out\zotero-refresh.log"
function Log($m) { Add-Content -Path $log -Value "$(Get-Date -Format HH:mm:ss.fff) $m" -Encoding UTF8 }
if (Get-Process WINWORD -ErrorAction SilentlyContinue) { throw "Word is open: close it first" }
$word = New-Object -ComObject Word.Application
$word.Visible = $true
$word.DisplayAlerts = 0
try {
  Log "add-ins: $(@($word.AddIns | ForEach-Object { "$($_.Name)=$($_.Installed)" }) -join ', ')"
  foreach ($f in $Files) {
    $src = (Resolve-Path $f).Path
    $dst = $src -replace '\.docx$', '-refreshed.docx'
    Copy-Item $src $dst -Force
    Log "open $dst"
    $doc = $word.Documents.Open($dst, $false, $false)
    $doc.Activate()
    $t = Get-Date
    Log "  run ZoteroRefresh"
    $word.Run("ZoteroRefresh")
    Log "  macro returned after $([int]((Get-Date) - $t).TotalMilliseconds) ms"
    # The macro only hands the work to Zotero, which then edits the document through Word.
    # Wait until the document changes and then stays unchanged for 4 s (at most 90 s).
    $lastChange = $null; $sig = ""
    while (((Get-Date) - $t).TotalSeconds -lt 90) {
      Start-Sleep -Milliseconds 500
      try { $now = "$($doc.Saved)|$($doc.Content.End)|$($doc.Fields.Count)" } catch { continue }
      if ($now -ne $sig) { $sig = $now; if (-not $doc.Saved) { $lastChange = Get-Date } }
      if ($lastChange -and ((Get-Date) - $lastChange).TotalSeconds -ge 4) { break }
    }
    Log "  $(if ($lastChange) { "Zotero changed the document; settled after $([int]((Get-Date) - $t).TotalSeconds) s" } else { 'no change within 90 s' }); fields: $($doc.Fields.Count)"
    $doc.Save()
    Log "  saved"
    $doc.Close(0)
    Write-Output "refreshed $dst"
  }
}
finally {
  $word.Quit()
  [System.Runtime.InteropServices.Marshal]::ReleaseComObject($word) | Out-Null
}
