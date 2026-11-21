# Word's own way, the one SciDesk has to beat (PLAN.md 5.11): Review > Compare > Combine,
# two documents at a time. Combines the copy that was sent with Ríos's copy, then the
# result with Soler's, labelling each copy's unmarked changes with its co-author's name
# (as the Combine dialog allows), and saves out/word-combined.docx.
# Copies the sent file first and saves in place with Save() (SaveAs2 froze a hidden Word
# in prototype 3). Each step is logged to out/word-combine.log.
$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent
$corpus = (Resolve-Path (Join-Path $root "..\corpus\synthetic-round-knee-oa")).Path
$out = Join-Path $root "out"
New-Item -ItemType Directory -Force $out | Out-Null
$log = Join-Path $out "word-combine.log"
function Log($m) { Add-Content -Path $log -Value "$(Get-Date -Format HH:mm:ss.fff) $m" -Encoding UTF8 }
$result = Join-Path $out "word-combined.docx"
Copy-Item (Join-Path $corpus "sent.docx") $result -Force

$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0
foreach ($a in $word.AddIns) { if ($a.Name -like "Zotero*" -and $a.Installed) { $a.Installed = $false } }
try {
  $orig = $word.Documents.Open($result, $false, $false)
  foreach ($c in @(@("returned-rios.docx", "Marta Ríos Navarro"), @("returned-soler.docx", "Javier Soler Benítez"))) {
    $rev = $word.Documents.Open((Join-Path $corpus $c[0]), $false, $true)
    Log "combine with $($c[0])"
    $t = Get-Date
    # MergeDocuments(Original, Revised, Destination=original(0), Granularity=word(1),
    #   CompareFormatting, CompareCaseChanges, CompareWhitespace, CompareTables, CompareHeaders,
    #   CompareFootnotes, CompareTextboxes, CompareFields, CompareComments, CompareMoves,
    #   OriginalAuthor, RevisedAuthor, FormatFrom=original(0))
    $word.MergeDocuments($orig, $rev, 0, 1, $true, $true, $true, $true, $true, $true, $true, $true, $true, $true, "", $c[1], 0) | Out-Null
    Log "  done in $([int]((Get-Date) - $t).TotalMilliseconds) ms; revisions now $($orig.Revisions.Count), comments $($orig.Comments.Count)"
    $rev.Close(0)
  }
  $orig.Save()
  Log "saved $result"
  $orig.Close(0)
  Write-Output "combined -> $result"
}
finally {
  $word.Quit()
  [System.Runtime.InteropServices.Marshal]::ReleaseComObject($word) | Out-Null
}
