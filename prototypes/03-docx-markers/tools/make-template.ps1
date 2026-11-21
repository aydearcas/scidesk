# Builds the reference template (template/reference.dotx) with desktop Word, as a user would:
# Normal in Calibri 12 pt with double spacing (Reumatologia Clinica's manuscript format),
# headings, caption and title. The exporter takes its styles from this file (R35).
# Also draws the test figure (template/figure-1.png) with System.Drawing.
$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent
Add-Type -AssemblyName System.Drawing

# --- figure: a small bar chart
$bmp = New-Object System.Drawing.Bitmap 1200, 700
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = "AntiAlias"; $g.Clear([System.Drawing.Color]::White)
$font = New-Object System.Drawing.Font "Calibri", 28
$pen = New-Object System.Drawing.Pen ([System.Drawing.Color]::Black), 3
$g.DrawLine($pen, 140, 620, 1150, 620); $g.DrawLine($pen, 140, 620, 140, 60)
$vals = @(12, 31, 47, 64); $labels = @("Basal", "12 m", "24 m", "48 m")
for ($i = 0; $i -lt 4; $i++) {
  $h = $vals[$i] * 8; $x = 220 + $i * 230
  $g.FillRectangle((New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(60, 110, 170))), $x, 620 - $h, 140, $h)
  $g.DrawString($labels[$i], $font, [System.Drawing.Brushes]::Black, $x + 20, 630)
  $g.DrawString("$($vals[$i]) %", $font, [System.Drawing.Brushes]::Black, $x + 25, 570 - $h)
}
$bmp.Save("$root\template\figure-1.png", [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose(); $bmp.Dispose()

# --- template
$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0
try {
  $doc = $word.Documents.Add()
  $n = $doc.Styles.Item(-1)               # wdStyleNormal
  $n.Font.Name = "Calibri"; $n.Font.Size = 12
  $n.ParagraphFormat.LineSpacingRule = 2  # wdLineSpaceDouble
  $n.ParagraphFormat.SpaceAfter = 0; $n.ParagraphFormat.SpaceBefore = 0
  foreach ($s in @(@(-2, 14), @(-3, 12), @(-4, 12))) {   # Heading 1..3
    $h = $doc.Styles.Item($s[0])
    $h.Font.Name = "Calibri"; $h.Font.Size = $s[1]; $h.Font.Bold = $true; $h.Font.Color = 0
    $h.ParagraphFormat.SpaceBefore = 12; $h.ParagraphFormat.SpaceAfter = 0
  }
  $h = $doc.Styles.Item(-4); $h.Font.Italic = $true
  $c = $doc.Styles.Item(-35)              # wdStyleCaption
  $c.Font.Name = "Calibri"; $c.Font.Size = 12; $c.Font.Bold = $false; $c.Font.Italic = $false; $c.Font.Color = 0
  $t = $doc.Styles.Item(-63)              # wdStyleTitle
  $t.Font.Name = "Calibri"; $t.Font.Size = 16; $t.Font.Bold = $true
  $doc.RemovePersonalInformation = $true   # no author name in the template
  $doc.SaveAs2("$root\template\reference.dotx", 14)   # wdFormatXMLTemplate
  $doc.Close(0)
  Write-Output "template and figure written"
}
finally {
  $word.Quit()
  [System.Runtime.InteropServices.Marshal]::ReleaseComObject($word) | Out-Null
}
