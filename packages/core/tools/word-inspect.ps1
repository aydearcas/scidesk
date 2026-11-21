# (UTF-8 with BOM: Windows PowerShell 5.1 reads it as ANSI otherwise.)
# Opens a DOCX exported by SciDesk in desktop Word through COM (local test only) and reports
# what Word sees: pages, compatibility mode, hidden SciDesk bookmarks, fields by type, the
# fields whose result changes when Word updates them all (there should be none), and PNGs
# of some pages. The document is opened read-only and never saved.
#   powershell -File tools/word-inspect.ps1 <in.docx> <outDir> [pages, e.g. 1,4,9]
param([Parameter(Mandatory = $true)][string]$In, [Parameter(Mandatory = $true)][string]$OutDir, [string]$Pages = "1")
$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Drawing
New-Item -ItemType Directory -Force -Path $OutDir | Out-Null
$path = (Resolve-Path -LiteralPath $In).Path
$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0
foreach ($a in $word.AddIns) { if ($a.Name -like "Zotero*" -and $a.Installed) { $a.Installed = $false } }
$doc = $null
function Save-PagePng($doc, [int]$page, [string]$file) {
  $bits = $doc.ActiveWindow.Panes(1).Pages($page).EnhMetaFileBits
  $ms = New-Object System.IO.MemoryStream(, [byte[]]$bits)
  $meta = New-Object System.Drawing.Imaging.Metafile($ms)
  $w = 1000; $h = [int](1000 * $meta.Height / $meta.Width)
  $bmp = New-Object System.Drawing.Bitmap $w, $h
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.Clear([System.Drawing.Color]::White); $g.DrawImage($meta, 0, 0, $w, $h)
  $bmp.Save($file, [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose(); $bmp.Dispose(); $meta.Dispose()
}
try {
  $doc = $word.Documents.Open($path, $false, $true)
  $doc.ActiveWindow.View.Type = 3
  $doc.Bookmarks.ShowHidden = $true
  $sd = 0; foreach ($b in $doc.Bookmarks) { if ($b.Name -like "_SD*") { $sd++ } }
  $before = @(); foreach ($f in $doc.Fields) { $before += $f.Result.Text }
  $types = @{}; foreach ($f in $doc.Fields) { $k = ($f.Code.Text.Trim() -split " ")[0..1] -join " "; $types[$k] = 1 + [int]$types[$k] }
  $doc.Fields.Update() | Out-Null
  $changed = @(); $i = 0
  foreach ($f in $doc.Fields) { if ($f.Result.Text -ne $before[$i]) { $changed += "$($f.Code.Text.Trim().Substring(0, [Math]::Min(40, $f.Code.Text.Trim().Length))): '$($before[$i])' -> '$($f.Result.Text)'" }; $i++ }
  $pagesCount = $doc.ComputeStatistics(2)
  foreach ($p in ($Pages -split ",")) { if ([int]$p -le $pagesCount) { Save-PagePng $doc ([int]$p) (Join-Path $OutDir "page-$p.png") } }
  [ordered]@{ pages = $pagesCount; compatibility = $doc.CompatibilityMode; scideskBookmarks = $sd; fields = $types; changedOnUpdate = $changed } | ConvertTo-Json -Depth 4
} finally {
  if ($doc) { try { $doc.Close(0) } catch {} }
  $word.Quit()
  [System.Runtime.InteropServices.Marshal]::ReleaseComObject($word) | Out-Null
}
