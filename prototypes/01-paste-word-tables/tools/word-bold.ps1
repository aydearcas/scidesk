# Effective bold (direct formatting plus paragraph and table styles) of some tables, as
# Word renders it: number of non-space bold characters per table.
#   powershell -ExecutionPolicy Bypass -File tools\word-bold.ps1 -Docx <file> -Tables "2,45,99" [-Out private\word-bold.json]
# Without -Tables, every table of the document.
param([Parameter(Mandatory = $true)][string]$Docx, [string]$Tables, [string]$Out)
$ErrorActionPreference = "Stop"
$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0
$doc = $null
try {
  $doc = $word.Documents.Open((Resolve-Path $Docx).Path, $false, $true)
  $out = @()
  $list = if ($Tables) { $Tables -split "," | ForEach-Object { [int]$_ } } else { 1..$doc.Tables.Count }
  foreach ($i in $list) {
    $bold = 0
    foreach ($cell in $doc.Tables.Item($i).Range.Cells) {
      $r = $cell.Range
      $b = $r.Font.Bold
      if ($b -eq -1) { $bold += ($r.Text -replace "[\s\a]", "").Length }
      elseif ($b -ne 0) { foreach ($ch in $r.Characters) { if ($ch.Font.Bold -eq -1) { $bold += ($ch.Text -replace "[\s\a]", "").Length } } }
    }
    $out += [ordered]@{ index = $i; effectiveBold = $bold }
  }
  $json = ConvertTo-Json -InputObject $out -Compress
  if ($Out) { [System.IO.File]::WriteAllText([System.IO.Path]::GetFullPath($Out), $json, (New-Object System.Text.UTF8Encoding($false))) } else { $json }
}
finally {
  if ($doc) { $doc.Close(0) }
  $word.Quit()
  [System.Runtime.InteropServices.Marshal]::ReleaseComObject($word) | Out-Null
}
