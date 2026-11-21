# Copies a selection of tables from the user's report (opened read-only) into a new Word
# file in private/, each preceded by its number, so they can be pasted one by one on the
# Mac. Uses Range.FormattedText (not the clipboard). The new file starts as a copy of an
# empty DOCX and is saved in place with Save() (SaveAs2 froze a hidden Word before).
#   powershell -File tools\extract-tables.ps1 <report.docx> <blank.docx> <out.docx> 44,18,20,...
#   -Paragraphs 47,49,50  copies those paragraphs (with their EndNote citation fields) instead
param([string]$Report, [string]$Blank, [string]$Out, [string]$Indices = "", [string]$Paragraphs = "")
$ErrorActionPreference = "Stop"
if (Get-Process WINWORD -ErrorAction SilentlyContinue) { throw "Word is open: close it first" }
Copy-Item $Blank $Out -Force
$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0
foreach ($a in $word.AddIns) { if ($a.Name -like "Zotero*" -and $a.Installed) { $a.Installed = $false } }
try {
  $src = $word.Documents.Open($Report, $false, $true)
  $dst = $word.Documents.Open((Resolve-Path $Out).Path, $false, $false)
  Write-Output "report tables: $($src.Tables.Count)"
  foreach ($i in ($Paragraphs -split "," | Where-Object { $_ })) {
    $pr = $src.Paragraphs.Item([int]$i).Range
    $r = $dst.Content; $r.Collapse(0)
    $r.InsertAfter("Párrafo $i"); $r.InsertParagraphAfter()
    $r = $dst.Content; $r.Collapse(0)
    $r.FormattedText = $pr.FormattedText
    Write-Output "paragraph $i : $($pr.Fields.Count) fields"
  }
  foreach ($i in ($Indices -split "," | Where-Object { $_ })) {
    $t = $src.Tables.Item([int]$i)
    $r = $dst.Content; $r.Collapse(0)
    $r.InsertAfter("Tabla $i"); $r.InsertParagraphAfter()
    $r = $dst.Content; $r.Collapse(0)
    $r.FormattedText = $t.Range.FormattedText
    $r = $dst.Content; $r.Collapse(0); $r.InsertParagraphAfter()
    Write-Output "table $i : $($t.Rows.Count) rows x $($t.Columns.Count) columns"
  }
  $dst.Save()
  $dst.Close(0)
  $src.Close(0)
  Write-Output "saved $Out"
}
finally {
  $word.Quit()
  [System.Runtime.InteropServices.Marshal]::ReleaseComObject($word) | Out-Null
}
