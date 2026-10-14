# Genera el sitio estático en .\docs (listo para GitHub Pages).
# Las imágenes de .\Imagenes se recortan/optimizan y se guardan en docs\img.
# Uso:  powershell -ExecutionPolicy Bypass -File .\build.ps1
Add-Type -AssemblyName System.Drawing
$root = $PSScriptRoot
$out  = "$root\docs"
$img  = "$root\Imagenes"
$cfg  = Get-Content "$root\config.json" -Raw -Encoding UTF8 | ConvertFrom-Json
New-Item -ItemType Directory -Force "$out\img" | Out-Null

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
  $crop = $src.Clone((New-Object System.Drawing.Rectangle $minX, $minY, $w, $h), $src.PixelFormat)
  $src.Dispose()
  if ($w -gt $maxW) { $r = Resize-Bmp $crop $maxW; $crop.Dispose(); $crop = $r }
  return $crop
}
function Resize-Bmp($bmp, [int]$maxW) {
  $nh = [int]($bmp.Height * $maxW / $bmp.Width)
  $dst = New-Object System.Drawing.Bitmap $maxW, $nh
  $g = [System.Drawing.Graphics]::FromImage($dst)
  $g.InterpolationMode = 'HighQualityBicubic'; $g.DrawImage($bmp, 0, 0, $maxW, $nh); $g.Dispose()
  return $dst
}
function Save-Jpeg($bmp, [string]$file, [int]$q = 82) {
  $enc = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object MimeType -eq 'image/jpeg'
  $ep = New-Object System.Drawing.Imaging.EncoderParameters 1
  $ep.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter ([System.Drawing.Imaging.Encoder]::Quality), ([long]$q)
  $bmp.Save($file, $enc, $ep)
}
function Make-Hero([string]$srcName, [string]$dstName) {
  if (-not (Test-Path "$img\$srcName")) { return $null }
  $b = New-Object System.Drawing.Bitmap "$img\$srcName"
  $d = Resize-Bmp $b 1400; $b.Dispose()
  Save-Jpeg $d "$out\img\$dstName" 82; $d.Dispose()
  return "img/$dstName"
}
function Set-Prop($o, $n, $v) {
  if ($o.PSObject.Properties[$n]) { $o.$n = $v } else { $o | Add-Member -NotePropertyName $n -NotePropertyValue $v }
}

# Logos de cabecera
if (-not $cfg.logo -and (Test-Path "$img\escudo_nombre.png")) {
  $b = Get-Trimmed "$img\escudo_nombre.png" 520; $b.Save("$out\img\logo-uni.png", [System.Drawing.Imaging.ImageFormat]::Png); $b.Dispose()
  Set-Prop $cfg 'logo' 'img/logo-uni.png'
}
if (-not $cfg.unidad -and (Test-Path "$img\Unidad_de_Modernizacion.png")) {
  $b = Get-Trimmed "$img\Unidad_de_Modernizacion.png" 440; $b.Save("$out\img\unidad.png", [System.Drawing.Imaging.ImageFormat]::Png); $b.Dispose()
  Set-Prop $cfg 'unidad' 'img/unidad.png'
}

# Hero de inicio y de cada sección
if (-not $cfg.heroImage) { $h = Make-Hero 'Fachada_UNI.png' 'hero-inicio.jpg'; if ($h) { Set-Prop $cfg 'heroImage' $h } }
$secImg = [ordered]@{
  'normativa'           = 'normativa_Logo.png'
  'procesos'            = 'procesos_logo.png'
  'simplificacion'      = 'simplificacion_logo.png'
  'organizacion'        = 'organizacion_logo.png'
  'innovacion'          = 'innovacion_logo.png'
  'servicios-digitales' = 'servicios_digitales_logo.png'
}
$secPath = @{}
foreach ($k in $secImg.Keys) { $h = Make-Hero $secImg[$k] "hero-$k.jpg"; if ($h) { $secPath[$k] = $h } }

# Organigrama (imagen + datos de la página Organización)
$orgSrc = "$root\documentos_referencia\Organigrama_UNI_hor.jpg"
if (-not $cfg.orgImage -and (Test-Path $orgSrc)) {
  $bm = New-Object System.Drawing.Bitmap $orgSrc
  $d = Resize-Bmp $bm 3400; $bm.Dispose()
  Save-Jpeg $d "$out\img\organigrama.jpg" 80; $d.Dispose()
  Set-Prop $cfg 'orgImage' 'img/organigrama.jpg'
}
$orgJson = '{"units":' + (Get-Content "$root\src\data\organizacion_unidades.json" -Raw -Encoding UTF8) + ',"arts":' + (Get-Content "$root\src\data\rof_articulos.json" -Raw -Encoding UTF8) + '}'
$orgCss  = Get-Content "$root\src\org.css" -Raw -Encoding UTF8
$orgJs   = Get-Content "$root\src\org.js"  -Raw -Encoding UTF8

# Menú: enlaces relativos entre páginas (si config.json no define otra URL)
$pages = 'inicio','normativa','procesos','simplificacion','organizacion','innovacion','servicios-digitales'
if (-not $cfg.nav) { Set-Prop $cfg 'nav' ([pscustomobject]@{}) }
foreach ($p in $pages) {
  if (-not $cfg.nav.PSObject.Properties[$p] -or -not $cfg.nav.$p) { Set-Prop $cfg.nav $p "$p.html" }
}

$tpl  = Get-Content "$root\src\template.html" -Raw -Encoding UTF8
$utf8 = New-Object System.Text.UTF8Encoding($false)
foreach ($p in $pages) {
  $pc = $cfg | ConvertTo-Json -Depth 6 | ConvertFrom-Json
  if ($secPath.ContainsKey($p)) { $pc.heroImage = $secPath[$p] }
  $json = $pc | ConvertTo-Json -Depth 6 -Compress
  $html = $tpl.Replace('/*__CONFIG__*/', $json).Replace('__PAGE__', $p)
  if ($p -eq 'organizacion') {
    $html = $html.Replace('/*__ORGCSS__*/', $orgCss).Replace('/*__ORGJS__*/', $orgJs).Replace('/*__ORG__*/null', $orgJson)
  } else {
    $html = $html.Replace('/*__ORGCSS__*/', '').Replace('/*__ORGJS__*/', '')
  }
  [IO.File]::WriteAllText("$out\$p.html", $html, $utf8)
  if ($p -eq 'inicio') { [IO.File]::WriteAllText("$out\index.html", $html, $utf8) }
  Write-Host ("docs\{0}.html  {1:N0} KB" -f $p, ($html.Length / 1KB))
}
[IO.File]::WriteAllText("$out\.nojekyll", '', $utf8)
