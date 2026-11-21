# (UTF-8 with BOM: Windows PowerShell 5.1 reads it as ANSI otherwise.)
# Plays a co-author's edits on a DOCX exported by SciDesk, with desktop Word through COM
# (Windows only; local test, CI has no Word). Word's user name is never changed: tracked
# changes carry the name configured in this Word, so the output stays out of the repository.
#   powershell -File tools/word-edit.ps1 <in.docx> <out.docx>
# Edits: two with track changes on (an insertion and a deletion), two with it off (a
# replacement and a new paragraph), then Save. The file is copied first and saved in place
# (SaveAs2 froze a hidden Word in prototype 3).
param([Parameter(Mandatory = $true)][string]$In, [Parameter(Mandatory = $true)][string]$Out)
$ErrorActionPreference = "Stop"
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
  $doc.TrackRevisions = $true
  $r = Find-Range $doc "de la población adulta"
  $r.InsertAfter(" española")
  $r = Find-Range $doc " con índices compuestos"
  $r.Delete() | Out-Null
  $doc.TrackRevisions = $false
  $r = Find-Range $doc "describir"
  $r.Text = "analizar"
  $r = Find-Range $doc "primer año de tratamiento"
  $p = $r.Paragraphs(1).Range
  $p.InsertParagraphAfter()
  $next = $p.Paragraphs(1).Next(1).Range
  $next.InsertBefore("Se incluyeron 120 pacientes de dos centros.")
  $doc.Save()
  $doc.Close()
  $doc = $null
  Write-Output "edited: $Out"
} finally {
  if ($doc) { try { $doc.Close(0) } catch {} }
  $word.Quit()
  [System.Runtime.InteropServices.Marshal]::ReleaseComObject($word) | Out-Null
}
