# Drives desktop Word through COM for prototype 7.
#   inspect <docx...>      -> for each file, JSON with Word's revisions and the text after
#                             accepting all and after rejecting all (files are not modified)
#   edit <in.docx> <out.docx> -> opens <in>, makes tracked edits as "Revisora Word", saves <out>
# Word's UserName is restored at the end, so the user's Office settings are not changed.
param(
  [Parameter(Mandatory = $true)][ValidateSet("inspect", "edit")][string]$Mode,
  [Parameter(ValueFromRemainingArguments = $true)][string[]]$Files
)
$ErrorActionPreference = "Stop"

function Get-Paragraphs($doc) {
  $list = @()
  foreach ($p in $doc.Paragraphs) {
    $t = $p.Range.Text -replace "[\r\a]", ""
    if ($t.Length -gt 0) { $list += $t }
  }
  return , $list
}

$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0
$originalUser = $word.UserName
$originalInitials = $word.UserInitials
try {
  if ($Mode -eq "inspect") {
    $results = @()
    foreach ($f in $Files) {
      $path = (Resolve-Path $f).Path
      $doc = $word.Documents.Open($path, $false, $true)
      $revs = @()
      foreach ($r in $doc.Revisions) {
        $revs += [ordered]@{ type = $r.Type; author = $r.Author; text = ($r.Range.Text -replace "[\r\a]", [string][char]0xB6) }
      }
      $doc.Revisions.AcceptAll()
      $accepted = Get-Paragraphs $doc
      $doc.Close(0)
      $doc = $word.Documents.Open($path, $false, $true)
      $doc.Revisions.RejectAll()
      $rejected = Get-Paragraphs $doc
      $doc.Close(0)
      $results += [ordered]@{ file = (Split-Path $f -Leaf); revisions = $revs; accepted = $accepted; rejected = $rejected }
    }
    ConvertTo-Json -InputObject $results -Depth 5 -Compress
  }
  else {
    $in = (Resolve-Path $Files[0]).Path
    $out = [System.IO.Path]::GetFullPath($Files[1])
    $word.UserName = "Revisora Word"
    $word.UserInitials = "RW"
    $doc = $word.Documents.Open($in, $false, $false)
    $doc.TrackRevisions = $true
    function Find-Range($text) {
      $r = $doc.Content
      $r.Find.ClearFormatting()
      if (-not $r.Find.Execute($text)) { throw "not found: $text" }
      return $r
    }
    # 1. insertion
    $r = Find-Range "al 1 %"; $r.InsertBefore("aproximadamente ")
    # 2. deletion
    $r = Find-Range "reumatoide "; $r.Delete() | Out-Null
    # 3. replacement
    $r = Find-Range "1 %"; $r.Text = "0,5-1 %"
    # 4. paragraph split
    $r = Find-Range " de la población"; $r.Collapse(1); $r.InsertParagraphAfter()
    # 5. format change
    $r = Find-Range "artritis"; $r.Font.Bold = $true
    # 6. typing in a table cell
    $cell = $doc.Tables.Item(1).Cell(1, 2).Range
    $cell.MoveEnd(1, -1) | Out-Null; $cell.InsertAfter(" (DE 11)")
    # 7. join two paragraphs: delete the paragraph mark at the end of "...en la tabla." 's previous paragraph
    $r = Find-Range "Los resultados"; $r.Collapse(1); $r.MoveStart(1, -1) | Out-Null; $r.Delete() | Out-Null
    $doc.SaveAs2($out, 12)
    $doc.Close(0)
    Write-Output "saved $out"
  }
}
finally {
  $word.UserName = $originalUser
  $word.UserInitials = $originalInitials
  $word.Quit()
  [System.Runtime.InteropServices.Marshal]::ReleaseComObject($word) | Out-Null
}
