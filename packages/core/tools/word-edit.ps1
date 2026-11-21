# (UTF-8 with BOM: Windows PowerShell 5.1 reads it as ANSI otherwise.)
# Plays a co-author's edits on a DOCX exported by SciDesk, with desktop Word through COM
# (Windows only; local test, CI has no Word). Word's user name is never changed: tracked
# changes carry the name configured in this Word, so the output stays out of the repository.
#   powershell -File tools/word-edit.ps1 <in.docx> <out.docx> [edits.json]
# Without edits.json it plays the demo project's edits (scidesk demo). An edits file is a
# list of { "find": text, "tracked": bool, and one of "insertAfter": text, "replaceWith":
# text, "delete": true, "newParagraphAfter": text }. The file is copied first and saved in
# place (SaveAs2 froze a hidden Word in prototype 3).
param([Parameter(Mandatory = $true, Position = 0)][string]$In, [Parameter(Mandatory = $true, Position = 1)][string]$Out, [Parameter(Position = 2)][string]$Edits = "")
$ErrorActionPreference = "Stop"
if ($Edits) {
  $list = Get-Content -LiteralPath $Edits -Raw -Encoding UTF8 | ConvertFrom-Json
} else {
  $list = @(
    [pscustomobject]@{ find = "de la población adulta"; tracked = $true; insertAfter = " española" },
    [pscustomobject]@{ find = " con índices compuestos"; tracked = $true; delete = $true },
    [pscustomobject]@{ find = "describir"; tracked = $false; replaceWith = "analizar" },
    [pscustomobject]@{ find = "primer año de tratamiento"; tracked = $false; newParagraphAfter = "Se incluyeron 120 pacientes de dos centros." }
  )
}
Copy-Item -LiteralPath $In -Destination $Out -Force
$path = (Resolve-Path -LiteralPath $Out).Path
$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0
foreach ($a in $word.AddIns) { if ($a.Name -like "Zotero*" -and $a.Installed) { $a.Installed = $false } }
function Find-Range($doc, [string]$text) {
  $r = $doc.Content
  $f = $r.Find
  $f.ClearFormatting()
  if (-not $f.Execute($text)) { throw "not found: $text" }
  return $r
}
$doc = $null
try {
  $doc = $word.Documents.Open($path, $false, $false)
  foreach ($e in $list) {
    $doc.TrackRevisions = [bool]$e.tracked
    $r = Find-Range $doc $e.find
    if ($e.insertAfter) { $r.InsertAfter($e.insertAfter) }
    elseif ($e.replaceWith) { $r.Text = $e.replaceWith }
    elseif ($e.delete) { $r.Delete() | Out-Null }
    elseif ($e.newParagraphAfter) {
      $p = $r.Paragraphs(1).Range
      $p.InsertParagraphAfter()
      $p.Paragraphs(1).Next(1).Range.InsertBefore($e.newParagraphAfter)
    }
  }
  $doc.TrackRevisions = $false
  $doc.Save()
  $doc.Close()
  $doc = $null
  Write-Output "edited: $Out"
} finally {
  if ($doc) { try { $doc.Close(0) } catch {} }
  $word.Quit()
  [System.Runtime.InteropServices.Marshal]::ReleaseComObject($word) | Out-Null
}
