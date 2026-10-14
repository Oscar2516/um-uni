# Genera un HTML autocontenido por cada página del sitio (para incrustar en Google Sites).
# Las imágenes de .\Imagenes se recortan, optimizan e incrustan (data URI) en cada HTML.
# Uso:  powershell -ExecutionPolicy Bypass -File .\build.ps1
Add-Type -AssemblyName System.Drawing
$root = $PSScriptRoot
$cfg  = Get-Content "$root\config.json" -Raw -Encoding UTF8 | ConvertFrom-Json

function Get-Trimmed([string]$path, [int]$maxW) {
  $src = New-Object System.Drawing.Bitmap $path
  $minX = $src.Width; $minY = $src.Height; $maxX = 0; $maxY = 0
  for ($y = 0; $y -lt $src.Height; $y += 2) {
    for ($x = 0; $x -lt $src.Width; $x += 2) {
      $c = $src.GetPixel($x, $y)
      if ($c.A -gt 20 -and ($c.R -lt 235 -or $c.G -lt 235 -or $c.B -lt 235)) {
        if ($x -lt $minX) { $minX = $x }; if ($x -gt $maxX) { $maxX = $x }
        if ($y -lt $minY) { $minY = $y }; if ($y -gt $maxY) { $maxY = $y }
      }
    }
  }
  $pad = 4
  $minX = [Math]::Max(0, $minX - $pad); $minY = [Math]::Max(0, $minY - $pad)
  $w = [Math]::Min($src.Width - $minX, $maxX - $minX + 2 * $pad)
  $h = [Math]::Min($src.Height - $minY, $maxY - $minY + 2 * $pad)
  $rect = New-Object System.Drawing.Rectangle $minX, $minY, $w, $h
  $crop = $src.Clone($rect, $src.PixelFormat)
  $src.Dispose()
  if ($w -gt $maxW) {
    $nh = [int]($h * $maxW / $w)
    $dst = New-Object System.Drawing.Bitmap $maxW, $nh
    $g = [System.Drawing.Graphics]::FromImage($dst)
    $g.InterpolationMode = 'HighQualityBicubic'; $g.DrawImage($crop, 0, 0, $maxW, $nh); $g.Dispose()
    $crop.Dispose(); $crop = $dst
  }
  return $crop
}
function To-DataUri($bmp, [string]$mime, [int]$q = 82) {
  $ms = New-Object IO.MemoryStream
  if ($mime -eq 'image/jpeg') {
    $enc = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object MimeType -eq 'image/jpeg'
    $ep = New-Object System.Drawing.Imaging.EncoderParameters 1
    $ep.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter ([System.Drawing.Imaging.Encoder]::Quality), ([long]$q)
    $bmp.Save($ms, $enc, $ep)
  } else { $bmp.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png) }
  "data:$mime;base64," + [Convert]::ToBase64String($ms.ToArray())
}
function Set-Prop($o, $n, $v) {
  if ($o.PSObject.Properties[$n]) { $o.$n = $v } else { $o | Add-Member -NotePropertyName $n -NotePropertyValue $v }
}

$img = "$root\Imagenes"
if (-not $cfg.logo      -and (Test-Path "$img\escudo_nombre.png"))          { $b = Get-Trimmed "$img\escudo_nombre.png" 520;          Set-Prop $cfg 'logo' (To-DataUri $b 'image/png');  $b.Dispose() }
if (-not $cfg.unidad    -and (Test-Path "$img\Unidad_de_Modernizacion.png")) { $b = Get-Trimmed "$img\Unidad_de_Modernizacion.png" 440; Set-Prop $cfg 'unidad' (To-DataUri $b 'image/png'); $b.Dispose() }
function Get-Hero([string]$path) {
  $b = New-Object System.Drawing.Bitmap $path
  $nh = [int]($b.Height * 1100 / $b.Width); $d = New-Object System.Drawing.Bitmap 1100, $nh
  $g = [System.Drawing.Graphics]::FromImage($d); $g.InterpolationMode = 'HighQualityBicubic'; $g.DrawImage($b, 0, 0, 1100, $nh); $g.Dispose(); $b.Dispose()
  $u = To-DataUri $d 'image/jpeg' 80; $d.Dispose(); return $u
}
if (-not $cfg.heroImage -and (Test-Path "$img\Fachada_UNI.png")) { Set-Prop $cfg 'heroImage' (Get-Hero "$img\Fachada_UNI.png") }

# Imagen de cabecera propia de cada sección (si existe en .\Imagenes)
$secImg = @{
  'normativa'           = 'normativa_Logo.png'
  'procesos'            = 'procesos_logo.png'
  'simplificacion'      = 'simplificacion_logo.png'
  'organizacion'        = 'organizacion_logo.png'
  'innovacion'          = 'innovacion_logo.png'
  'servicios-digitales' = 'servicios_digitales_logo.png'
}
$secUri = @{}
foreach ($k in $secImg.Keys) { if (Test-Path "$img\$($secImg[$k])") { $secUri[$k] = Get-Hero "$img\$($secImg[$k])" } }
$tpl  = Get-Content "$root\src\template.html" -Raw -Encoding UTF8
$utf8 = New-Object System.Text.UTF8Encoding($false)
$pages = 'inicio','normativa','procesos','simplificacion','organizacion','innovacion','servicios-digitales'
foreach ($p in $pages) {
  $pc = $cfg | ConvertTo-Json -Depth 6 | ConvertFrom-Json
  if ($secUri.ContainsKey($p)) { $pc.heroImage = $secUri[$p] }
  $json = $pc | ConvertTo-Json -Depth 6 -Compress
  $html = $tpl.Replace('/*__CONFIG__*/', $json).Replace('__PAGE__', $p)
  [IO.File]::WriteAllText("$root\dist\$p.html", $html, $utf8)
  Write-Host ("dist\{0}.html  {1:N0} KB" -f $p, ($html.Length / 1KB))
}
