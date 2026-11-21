# Drives desktop Word through COM for prototype 3 (Windows only).
#   inspect <out.json> <docx...>  -> for each file: pages, compatibility mode, hidden bookmarks,
#                                   fields (type, code, result), the fields whose result changes
#                                   when Word updates them, custom properties, and PNGs of
#                                   pages 1, the first table's page and the last page
#   edit <in.docx> <outDir>       -> plays a co-author's edits, one scenario per output file
# Word's user name is never changed. Run it through tools/run-word.ps1, which saves and
# restores the user's clipboard and stops a Word that hangs.
#   -Only <prefix> runs only the scenarios whose name starts with it. Each step is logged
#   to out/word-edit.log.
[CmdletBinding(PositionalBinding = $false)]
param(
  [Parameter(Mandatory = $true, Position = 0)][ValidateSet("inspect", "edit")][string]$Mode,
  [string]$Only = "",
  [Parameter(ValueFromRemainingArguments = $true)][string[]]$Args2
)
$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Drawing
$utf8 = New-Object System.Text.UTF8Encoding($false)

$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0
# Zotero's Word add-in (loaded from Word's startup folder) is unloaded for this Word session
# only (Word loads it again next time it starts), so that it plays no part in the tests.
# Note: in this script, SaveAs2 froze the hidden Word with or without the add-in; the edit
# scenarios therefore copy the file first and save it in place with Save().
foreach ($a in $word.AddIns) { if ($a.Name -like "Zotero*" -and $a.Installed) { $a.Installed = $false } }

function Save-PagePng($doc, [int]$page, [string]$file) {
  $bits = $doc.ActiveWindow.Panes(1).Pages($page).EnhMetaFileBits
  $ms = New-Object System.IO.MemoryStream(, [byte[]]$bits)
  $meta = New-Object System.Drawing.Imaging.Metafile($ms)
  $w = 1240; $h = [int](1240 * $meta.Height / $meta.Width)
  $bmp = New-Object System.Drawing.Bitmap $w, $h
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.Clear([System.Drawing.Color]::White); $g.DrawImage($meta, 0, 0, $w, $h)
  $bmp.Save($file, [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose(); $bmp.Dispose(); $meta.Dispose()
}
function Get-Fields($doc) {
  $list = @()
  foreach ($f in $doc.Fields) {
    $code = $f.Code.Text.Trim()
    $list += [ordered]@{ type = $f.Type; code = $(if ($code.Length -gt 70) { $code.Substring(0, 70) } else { $code }); result = ($f.Result.Text -replace "[\r\a]", " ").Substring(0, [Math]::Min(40, $f.Result.Text.Length)) }
  }
  return , $list
}

try {
  if ($Mode -eq "inspect") {
    $outJson = [System.IO.Path]::GetFullPath($Args2[0])
    $results = @()
    foreach ($file in $Args2[1..($Args2.Length - 1)]) {
      $path = (Resolve-Path $file).Path
      $doc = $word.Documents.Open($path, $false, $true)
      $doc.ActiveWindow.View.Type = 3   # print layout, for the page images
      $doc.Bookmarks.ShowHidden = $true
      $names = @(); foreach ($b in $doc.Bookmarks) { $names += $b.Name }
      $before = Get-Fields $doc
      $props = @()
      $cdp = $doc.CustomDocumentProperties
      $count = [System.__ComObject].InvokeMember("Count", [System.Reflection.BindingFlags]::GetProperty, $null, $cdp, $null)
      for ($k = 1; $k -le $count; $k++) {
        $item = [System.__ComObject].InvokeMember("Item", [System.Reflection.BindingFlags]::GetProperty, $null, $cdp, @($k))
        $props += [System.__ComObject].InvokeMember("Name", [System.Reflection.BindingFlags]::GetProperty, $null, $item, $null)
      }
      $pages = $doc.ComputeStatistics(2)
      $stem = [System.IO.Path]::GetFileNameWithoutExtension($path)
      $png = Join-Path (Split-Path $outJson -Parent) "png"
      New-Item -ItemType Directory -Force $png | Out-Null
      $tablePage = 0
      if ($doc.Tables.Count -gt 0) { $tablePage = $doc.Tables.Item(1).Range.Information(3) }   # wdActiveEndPageNumber
      $shots = @(1, $tablePage, $pages) | Where-Object { $_ -gt 0 } | Select-Object -Unique
      foreach ($p in $shots) { Save-PagePng $doc $p (Join-Path $png "$stem-page$p.png") }
      # update every field as Word would (F9, printing) and see which results change
      $doc.Fields.Update() | Out-Null
      $after = Get-Fields $doc
      $changed = @()
      for ($i = 0; $i -lt [Math]::Min($before.Count, $after.Count); $i++) {
        if ($before[$i].result -ne $after[$i].result) { $changed += [ordered]@{ code = $before[$i].code; before = $before[$i].result; after = $after[$i].result } }
      }
      $types = @{}; foreach ($f in $before) { $types["$($f.type)"] = 1 + [int]$types["$($f.type)"] }
      $results += [ordered]@{
        file = (Split-Path $path -Leaf); pages = $pages; compatibilityMode = $doc.CompatibilityMode
        bookmarks = $names.Count; scideskBookmarks = @($names | Where-Object { $_ -like "_SD*" }).Count; otherBookmarks = @($names | Where-Object { $_ -notlike "_SD*" })
        fields = $before.Count; fieldTypes = $types; changedOnUpdate = $changed; customProperties = $props
        styles = @($doc.Paragraphs.Item(1).Style.NameLocal, $doc.Paragraphs.Item(13).Style.NameLocal); images = $doc.InlineShapes.Count
        firstFields = @($before | Select-Object -First 3)
      }
      $doc.Close(0)
    }
    [System.IO.File]::WriteAllText($outJson, (ConvertTo-Json -InputObject $results -Depth 6), $utf8)
    Write-Output "inspected $($results.Count) files -> $outJson"
  }
  else {
    $in = (Resolve-Path $Args2[0]).Path
    $outDir = [System.IO.Path]::GetFullPath($Args2[1])
    New-Item -ItemType Directory -Force $outDir | Out-Null
    $log = Join-Path (Split-Path $outDir -Parent) "word-edit.log"
    function Log($m) { Add-Content -Path $log -Value "$(Get-Date -Format HH:mm:ss.fff) $m" -Encoding UTF8 }
    $sel = $null
    function Find-Range($doc, $text) {
      $r = $doc.Content
      $r.Find.ClearFormatting()
      if (-not $r.Find.Execute($text)) { throw "not found: $text" }
      return $r
    }
    function Para($doc, $text) { return (Find-Range $doc $text).Paragraphs.Item(1).Range }
    function Field-In($range, [int]$type) { foreach ($f in $range.Fields) { if ($f.Type -eq $type) { return $f } }; throw "no field $type" }
    $scenarios = [ordered]@{
      "S00-open-save"      = { param($d) }
      "S01-type-middle"    = { param($d) $r = Find-Range $d "principales causas"; $r.Collapse(1); $r.Select(); $sel.TypeText("dos de las ") }
      "S02-type-start"     = { param($d) $r = Para $d "El concepto surgió"; $r.Collapse(1); $r.Select(); $sel.TypeText("Además, e"); $sel.Delete(1, 1) | Out-Null }
      "S03-type-end"       = { param($d) $r = Para $d "El interés por la AKOA"; $r.MoveEnd(1, -1) | Out-Null; $r.Collapse(0); $r.Select(); $sel.TypeText(" Frase añadida al final.") }
      "S04-split"          = { param($d) $r = Find-Range $d "No existe una definición única de AKOA. "; $r.Collapse(0); $r.Select(); $sel.TypeParagraph() }
      "S05-join"           = { param($d) $r = Para $d "El concepto surgió"; $r.MoveEnd(1, -1) | Out-Null; $r.Collapse(0); $r.Select(); $sel.Delete(1, 1) | Out-Null; $sel.TypeText(" ") }
      "S06-delete-para"    = { param($d) $r = Para $d "Conviene recordar que"; $r.Select(); $sel.Delete() | Out-Null }
      "S07-move-para"      = { param($d) $r = Para $d "La RM permite una definición"; $r.Select(); $sel.Cut(); $t = Para $d "La artrosis de rodilla es una de"; $t.Collapse(1); $t.Select(); $sel.Paste() }
      "S08-copy-para"      = { param($d) $r = Para $d "Estas observaciones han alimentado"; $r.Select(); $sel.Copy(); $t = Para $d "Los datos europeos son escasos"; $t.Collapse(0); $t.Select(); $sel.Paste() }
      "S09-retype-para"    = { param($d) $r = Para $d "La artrosis de rodilla afecta a más"; $r.MoveEnd(1, -1) | Out-Null; $r.Select(); $sel.TypeText("Párrafo reescrito entero por la coautora, sin citas.") }
      "S10-delete-citation" = { param($d) $f = Field-In (Para $d "La definición más utilizada") 81; $f.Select(); $sel.Delete() | Out-Null }
      "S11-edit-cit-result" = { param($d) $f = Field-In (Para $d "La definición más utilizada") 81; $f.Result.Text = "7" }
      "S12-manual-citation" = { param($d) $r = Find-Range $d "principales causas de dolor y discapacidad"; $r.Collapse(0); $r.Select(); $sel.TypeText(" (Smith, 2020)") }
      "S13-new-table"      = { param($d)
        # as a co-author would: an empty paragraph before table 1, References > Insert
        # Caption above it, a new table in it, then update the fields (F9 or printing)
        $r = Para $d "La definición más utilizada"; $r.InsertParagraphAfter()
        $empty = $r.Paragraphs.Item($r.Paragraphs.Count).Range
        $empty.Select(); $sel.InsertCaption("Tabla", ". Tabla nueva de la coautora", "", 0)
        $r = Find-Range $d "Tabla nueva de la coautora"; $empty = $r.Paragraphs.Item(1).Range.Next(4, 1)
        $d.Tables.Add($empty, 2, 2) | Out-Null
        $d.Fields.Update() | Out-Null }
      "S14-delete-table"   = { param($d) $d.Bookmarks.ShowHidden = $true; $b = $null; foreach ($x in $d.Bookmarks) { if ($x.Name -like "_SD_t_*") { $b = $x; break } }; $r = $b.Range; $r.Expand(4) | Out-Null; $r.Select(); $sel.Delete() | Out-Null; $d.Fields.Update() | Out-Null }
      "S15-copy-to-new-doc" = { param($d)
        $d.Content.Select(); $sel.Copy()
        # a new, empty document (Documents.Add + SaveAs2 froze Word here, see below)
        $blank = Join-Path $outDir "S15-copy-to-new-doc.docx"; $d.Close(0); Copy-Item (Join-Path (Split-Path $in -Parent) "blank.docx") $blank -Force
        $n = $word.Documents.Open($blank, $false, $false); $n.Content.Paste(); return $n }
    }
    foreach ($track in @($false, $true)) {
      foreach ($name in $scenarios.Keys) {
        if ($Only -and -not $name.StartsWith($Only)) { continue }
        if ($track -and $name -notin @("S01-type-middle", "S04-split", "S05-join", "S06-delete-para", "S07-move-para", "S09-retype-para", "S10-delete-citation", "S13-new-table")) { continue }
        # each scenario works on its own copy, saved in place with Save(): SaveAs2 froze the
        # hidden Word in this script (but not in a smaller one) and the cause was not found
        $file = Join-Path $outDir ($(if ($track) { "T" + $name.Substring(1) } else { $name }) + ".docx")
        Copy-Item $in $file -Force
        Log "$name track=$track open"
        $doc = $word.Documents.Open($file, $false, $false)
        $doc.ActiveWindow.View.Type = 3
        $doc.TrackRevisions = $track
        $sel = $word.Selection
        Log "  edit"
        $newDoc = & $scenarios[$name] $doc
        $isNew = $newDoc -is [System.__ComObject]
        $target = $(if ($isNew) { $newDoc } else { $doc })
        Log "  save $file"
        $target.Save()
        if ($isNew) { $target.Close(0) } else { $doc.Close(0) }
        Log "  saved"
        Write-Output "saved $file"
      }
    }
  }
}
finally {
  $word.Quit()
  [System.Runtime.InteropServices.Marshal]::ReleaseComObject($word) | Out-Null
}
