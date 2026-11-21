# Drives desktop Word through COM to build the synthetic review round.
#   build    -In build/blocks.json -Out sent.docx -Author "Name" -Initials "XX"
#   extract  -In sent.docx -Out build/sent-paragraphs.json
#   validate -In sent.docx -Edits edits.json -Out build/validate-x.json
#   apply    -In sent.docx -Edits edits.json -Out returned-x.docx -Author "Name" -Initials "XX" -Report build/apply-x.json
#   inspect  -In a.docx,b.docx -Out build/inspect.json
# Word signs revisions and comments with the Office account name unless
# Options.UseLocalUserInfo is on, so this script turns it on, sets UserName and
# UserInitials, and always restores the three original values in `finally`.
# A copy of the original values is kept in -IdentityBackup until they are restored.
# The script never prints the user's real name: it only reports whether it was found.
param(
  [Parameter(Mandatory = $true)][ValidateSet("build", "extract", "validate", "apply", "inspect")][string]$Mode,
  [Parameter(Mandatory = $true)][string[]]$In,
  [string]$Out,
  [string]$Edits,
  [string]$Report,
  [string]$Author = "SciDesk corpus",
  [string]$Initials = "SC",
  [string]$IdentityBackup
)
$ErrorActionPreference = "Stop"
# powershell -File passes "a,b" as one string; accept comma-separated lists too.
$In = @($In | ForEach-Object { $_ -split "," } | Where-Object { $_ })
$utf8 = New-Object System.Text.UTF8Encoding($false)

function Read-Json($path) { return (Get-Content -LiteralPath $path -Raw -Encoding UTF8 | ConvertFrom-Json) }
function Write-Json($obj, $path) {
  $full = [System.IO.Path]::GetFullPath($path)
  [System.IO.File]::WriteAllText($full, (ConvertTo-Json -InputObject $obj -Depth 12), $utf8)
}
function Clean($t) { return ($t -replace "[\r\a]", "") }

# ---------- Find helpers ----------
function Find-All($doc, $scope, [string]$text) {
  # Returns every exact, case-sensitive match of $text inside $scope (Word ranges).
  $found = @()
  if ($scope.Information(12) -and $scope.Cells.Count -eq 1) {
    # Inside a single table cell Word's Find does not match reliably, so search the cell text
    # (one paragraph, so string offsets equal character positions).
    $cellText = Clean $scope.Text
    $at = $cellText.IndexOf($text, [System.StringComparison]::Ordinal)
    while ($at -ge 0) {
      $found += $doc.Range($scope.Start + $at, $scope.Start + $at + $text.Length)
      $at = $cellText.IndexOf($text, $at + 1, [System.StringComparison]::Ordinal)
    }
    return , $found
  }
  $probe = $text
  if ($probe.Length -gt 250) { $probe = $probe.Substring(0, 250) }
  $probe = $probe -replace "\^", "^^"
  $r = $scope.Duplicate
  while ($true) {
    $r.Find.ClearFormatting()
    # FindText, MatchCase, MatchWholeWord, MatchWildcards, MatchSoundsLike, MatchAllWordForms, Forward, Wrap
    $ok = $r.Find.Execute($probe, $true, $false, $false, $false, $false, $true, 0)
    if (-not $ok) { break }
    if ($r.Start -lt $scope.Start -or $r.End -gt $scope.End) { break }
    $cand = $doc.Range($r.Start, $r.Start + $text.Length)
    if ((Clean $cand.Text) -ceq $text) { $found += $cand }
    $next = $r.End
    if ($next -ge $scope.End) { break }
    $r = $doc.Range($next, $scope.End)
  }
  return , $found
}

function Get-Scope($doc, $e) {
  if ($null -ne $e.table) {
    $cell = $doc.Tables.Item([int]$e.table).Cell([int]$e.row, [int]$e.col).Range
    return $doc.Range($cell.Start, $cell.End - 1)
  }
  return $doc.Content
}

function Resolve-Target($doc, $scope, [string]$anchor, $target) {
  # Returns @{ ok; count; range; error } for $target inside the unique $anchor.
  $hits = Find-All $doc $scope $anchor
  if ($hits.Count -ne 1) { return @{ ok = $false; count = $hits.Count; error = "anchor found $($hits.Count) times" } }
  $a = $hits[0]
  if ($null -eq $target -or $target -eq "") { return @{ ok = $true; count = 1; range = $a } }
  $idx = $anchor.IndexOf([string]$target, [System.StringComparison]::Ordinal)
  if ($idx -lt 0) { return @{ ok = $false; count = 1; error = "target is not inside anchor" } }
  $t = $doc.Range($a.Start + $idx, $a.Start + $idx + ([string]$target).Length)
  if ((Clean $t.Text) -cne [string]$target) { return @{ ok = $false; count = 1; error = "target offset mismatch" } }
  return @{ ok = $true; count = 1; range = $t }
}

function Resolve-Edit($doc, $e) {
  $res = Resolve-Target $doc (Get-Scope $doc $e) ([string]$e.anchor) $e.target
  $out = @{ main = $res }
  if ($e.type -eq "move") {
    $dscope = $doc.Content
    if ($null -ne $e.destination.table) { $dscope = Get-Scope $doc $e.destination }
    $out.dest = Resolve-Target $doc $dscope ([string]$e.destination.anchor) $e.destination.target
  }
  return $out
}

# ---------- Word session with a temporary identity ----------
$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0
$orig = @{ useLocal = $word.Options.UseLocalUserInfo; name = $word.UserName; initials = $word.UserInitials }
$word.Options.UseLocalUserInfo = $true
$origLocal = @{ name = $word.UserName; initials = $word.UserInitials }
if ($IdentityBackup) {
  Write-Json @{ useLocal = $orig.useLocal; localName = $origLocal.name; localInitials = $origLocal.initials } $IdentityBackup
}
$realNames = @($orig.name, $origLocal.name) | Where-Object { $_ -and $_.Trim().Length -gt 2 } | Select-Object -Unique
try {
  $word.UserName = $Author
  $word.UserInitials = $Initials

  if ($Mode -eq "build") {
    $blocks = Read-Json $In[0]
    $doc = $word.Documents.Add()
    $doc.Content.LanguageID = 3082   # Spanish (modern sort)
    $styleOf = @{ title = -63; h1 = -2; h2 = -3; para = -1; ref = -1; caption = -35; note = -1 }

    function Add-Runs($runs, [string]$kind) {
      $pos = $doc.Content.End - 1
      $r = $doc.Range($pos, $pos)
      $text = -join ($runs | ForEach-Object { [string]$_.text })
      $r.InsertAfter($text)
      $r.Style = [int]$styleOf[$kind]
      $r.Font.Reset()
      if ($kind -eq "note") { $r.Font.Size = 9 }
      $off = 0
      foreach ($run in $runs) {
        $len = ([string]$run.text).Length
        $sub = $doc.Range($r.Start + $off, $r.Start + $off + $len)
        if ($run.bold) { $sub.Font.Bold = $true }
        if ($run.italic) { $sub.Font.Italic = $true }
        if ($run.superscript) { $sub.Font.Superscript = $true }
        $off += $len
      }
      $r.InsertParagraphAfter()
    }

    foreach ($b in $blocks) {
      if ($b.kind -ne "table") { Add-Runs $b.runs $b.kind; continue }
      Add-Runs $b.caption "caption"
      $pos = $doc.Content.End - 1
      $t = $doc.Tables.Add($doc.Range($pos, $pos), [int]$b.rows, [int]$b.columns)
      $t.Borders.Enable = $true
      $t.Range.Style = -1
      $t.Range.Font.Reset()
      $t.Range.Font.Size = 10
      $t.Range.ParagraphFormat.SpaceAfter = 0
      foreach ($c in $b.cells) {
        $cr = $t.Cell([int]$c.row, [int]$c.col).Range
        $cr.Text = -join ($c.runs | ForEach-Object { [string]$_.text })
        $start = $t.Cell([int]$c.row, [int]$c.col).Range.Start
        $off = 0
        foreach ($run in $c.runs) {
          $len = ([string]$run.text).Length
          if ($run.superscript) { $doc.Range($start + $off, $start + $off + $len).Font.Superscript = $true }
          $off += $len
        }
        if ($c.header) { $t.Cell([int]$c.row, [int]$c.col).Range.Font.Bold = $true }
      }
      for ($i = 1; $i -le [int]$b.headerRows; $i++) { $t.Rows.Item($i).HeadingFormat = -1 }
      # Merge spanning cells from the last one backwards so pending indices stay valid.
      $spans = @($b.cells | Where-Object { $_.rowspan -gt 1 -or $_.colspan -gt 1 } |
        Sort-Object -Property @{ Expression = { [int]$_.row }; Descending = $true }, @{ Expression = { [int]$_.col }; Descending = $true })
      foreach ($c in $spans) {
        $t.Cell([int]$c.row, [int]$c.col).Merge($t.Cell([int]$c.row + [int]$c.rowspan - 1, [int]$c.col + [int]$c.colspan - 1))
      }
      foreach ($n in $b.notes) { Add-Runs $n "note" }
    }
    # Drop the trailing empty paragraph.
    $last = $doc.Paragraphs.Last.Range
    if ((Clean $last.Text) -eq "") { $doc.Range($last.Start - 1, $last.End).Delete() | Out-Null }
    $doc.SaveAs2([System.IO.Path]::GetFullPath($Out), 12)
    $doc.Close(0)
    Write-Output "built $Out"
  }

  elseif ($Mode -eq "extract") {
    $doc = $word.Documents.Open((Resolve-Path $In[0]).Path, $false, $true)
    $paras = @()
    $i = 0
    foreach ($p in $doc.Paragraphs) {
      $i++
      $style = ""; try { $style = $p.Range.ParagraphStyle.NameLocal } catch {}
      $item = [ordered]@{ index = $i; style = $style; text = (Clean $p.Range.Text) }
      if ($p.Range.Information(12)) {
        try { $cell = $p.Range.Cells.Item(1) } catch { continue }   # end-of-row marks
        $tables = $doc.Tables
        for ($k = 1; $k -le $tables.Count; $k++) {
          if ($p.Range.Start -ge $tables.Item($k).Range.Start -and $p.Range.End -le $tables.Item($k).Range.End) { $item.table = $k }
        }
        $item.row = $cell.RowIndex
        $item.col = $cell.ColumnIndex
      }
      $paras += $item
    }
    $doc.Close(0)
    Write-Json $paras $Out
    Write-Output "extracted $($paras.Count) paragraphs"
  }

  elseif ($Mode -eq "validate") {
    $editList = Read-Json $Edits
    $doc = $word.Documents.Open((Resolve-Path $In[0]).Path, $false, $true)
    $rows = @()
    foreach ($e in $editList.edits) {
      $r = Resolve-Edit $doc $e
      $row = [ordered]@{ id = $e.id; ok = $r.main.ok; error = $r.main.error; count = $r.main.count }
      if ($r.dest) { $row.destOk = $r.dest.ok; $row.destError = $r.dest.error }
      $rows += $row
    }
    # Overlap check between resolved ranges.
    $doc.Close(0)
    Write-Json $rows $Out
    $bad = @($rows | Where-Object { -not $_.ok -or ($_.Contains("destOk") -and -not $_.destOk) })
    Write-Output "validated $($rows.Count) edits, $($bad.Count) problems"
  }

  elseif ($Mode -eq "apply") {
    $editList = Read-Json $Edits
    $doc = $word.Documents.Open((Resolve-Path $In[0]).Path, $false, $false)
    $doc.TrackRevisions = $false
    # Resolve every range on the untouched document first; Word keeps ranges live as the text changes.
    $jobs = @()
    $results = @{}
    foreach ($e in $editList.edits) {
      $r = Resolve-Edit $doc $e
      $okDest = (-not $r.dest) -or $r.dest.ok
      if ($r.main.ok -and $okDest) {
        $key = $r.main.range.Start
        if ($r.dest -and $r.dest.range.Start -gt $key) { $key = $r.dest.range.Start }
        $jobs += [pscustomobject]@{ e = $e; r = $r; key = $key }
      }
      else {
        $results[[string]$e.id] = [ordered]@{ id = $e.id; applied = $false; error = "$($r.main.error) $($r.dest.error)".Trim() }
      }
    }
    foreach ($j in ($jobs | Sort-Object -Property key -Descending)) {
      $e = $j.e; $rg = $j.r.main.range
      try {
        $doc.TrackRevisions = [bool]$e.tracked
        switch ($e.type) {
          "insert" {
            if ($e.position -eq "before") { $p = $doc.Range($rg.Start, $rg.Start) } else { $p = $doc.Range($rg.End, $rg.End) }
            $p.InsertAfter([string]$e.text)
          }
          "delete" { $rg.Delete() | Out-Null }
          "replace" { $rg.Text = [string]$e.text }
          "comment" { $doc.Comments.Add($rg, [string]$e.comment) | Out-Null }
          "format" {
            if ($e.format -eq "italic") { $rg.Font.Italic = $true }
            elseif ($e.format -eq "bold") { $rg.Font.Bold = $true }
            else { throw "unknown format $($e.format)" }
          }
          "split_paragraph" {
            # Like selecting the space before the sentence and pressing Enter.
            $pos = $rg.Start
            $before = $doc.Range($pos - 1, $pos)
            if ($before.Text -eq " ") { $before.Text = "`r" } else { $doc.Range($pos, $pos).InsertParagraphAfter() }
          }
          "merge_paragraphs" {
            $pos = $rg.Start
            $mark = $doc.Range($pos - 1, $pos)
            if ($mark.Text -ne "`r") { throw "target is not at the start of a paragraph" }
            $doc.Range($pos, $pos).InsertBefore(" ")
            $doc.Range($pos - 1, $pos).Delete() | Out-Null
          }
          "move" {
            $d = $j.r.dest.range
            if ($e.destination.position -eq "after") { $p = $doc.Range($d.End, $d.End) } else { $p = $doc.Range($d.Start, $d.Start) }
            $p.FormattedText = $rg.FormattedText
            $rg.Delete() | Out-Null
          }
          default { throw "unknown edit type $($e.type)" }
        }
        if ($e.comment -and $e.type -ne "comment") { throw "comment field only allowed on comment edits" }
        $results[[string]$e.id] = [ordered]@{ id = $e.id; applied = $true; tracked = [bool]$e.tracked }
      }
      catch {
        $results[[string]$e.id] = [ordered]@{ id = $e.id; applied = $false; error = $_.Exception.Message }
      }
    }
    $doc.TrackRevisions = $false
    $doc.SaveAs2([System.IO.Path]::GetFullPath($Out), 12)
    $doc.Close(0)
    $list = @($editList.edits | ForEach-Object { $results[[string]$_.id] })
    Write-Json $list $Report
    $failed = @($list | Where-Object { -not $_.applied })
    Write-Output "applied $($list.Count - $failed.Count) of $($list.Count) edits -> $Out"
  }

  elseif ($Mode -eq "inspect") {
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    $all = @()
    foreach ($f in $In) {
      $path = (Resolve-Path $f).Path
      $doc = $word.Documents.Open($path, $false, $true)
      $revs = @()
      foreach ($r in $doc.Revisions) {
        $revs += [ordered]@{ type = $r.Type; author = $r.Author; isRealUser = ($realNames -contains $r.Author); text = ($r.Range.Text -replace "[\r\a]", [string][char]0xB6) }
      }
      $coms = @()
      foreach ($c in $doc.Comments) {
        $coms += [ordered]@{ author = $c.Author; initials = $c.Initial; isRealUser = ($realNames -contains $c.Author); scope = (Clean $c.Scope.Text); text = (Clean $c.Range.Text) }
      }
      $doc.Revisions.AcceptAll()
      $accepted = @(foreach ($p in $doc.Paragraphs) { Clean $p.Range.Text })
      $doc.Close(0)
      $doc = $word.Documents.Open($path, $false, $true)
      $doc.Revisions.RejectAll()
      $rejected = @(foreach ($p in $doc.Paragraphs) { Clean $p.Range.Text })
      $doc.Close(0)
      # Look for the real user name anywhere in the package (core.xml, people.xml, comments...).
      $zip = [System.IO.Compression.ZipFile]::OpenRead($path)
      $leaks = @()
      foreach ($entry in $zip.Entries) {
        if ($entry.FullName -notmatch "\.(xml|rels)$") { continue }
        $sr = New-Object System.IO.StreamReader($entry.Open())
        $xml = $sr.ReadToEnd(); $sr.Close()
        foreach ($n in $realNames) { if ($xml.Contains($n)) { $leaks += $entry.FullName } }
      }
      $zip.Dispose()
      $all += [ordered]@{ file = (Split-Path $f -Leaf); revisions = $revs; comments = $coms; accepted = $accepted; rejected = $rejected; realUserNameFoundIn = @($leaks | Select-Object -Unique) }
    }
    Write-Json $all $Out
    Write-Output "inspected $($In.Count) files"
  }
}
finally {
  # Close anything left open without saving, so Quit() never waits on a hidden prompt.
  while ($word.Documents.Count -gt 0) { $word.Documents.Item(1).Close(0) }
  $word.UserName = $origLocal.name
  $word.UserInitials = $origLocal.initials
  $word.Options.UseLocalUserInfo = $orig.useLocal
  $restored = ($word.Options.UseLocalUserInfo -eq $orig.useLocal) -and ($word.UserName -ceq $(if ($orig.useLocal) { $origLocal.name } else { $orig.name }))
  $word.Quit()
  [System.Runtime.InteropServices.Marshal]::ReleaseComObject($word) | Out-Null
  [GC]::Collect(); [GC]::WaitForPendingFinalizers()
  if ($IdentityBackup -and (Test-Path $IdentityBackup)) { Remove-Item -LiteralPath $IdentityBackup -Force }
  Write-Output "word identity restored: $restored"
}
