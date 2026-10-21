$ErrorActionPreference = 'Stop'

Add-Type -AssemblyName PresentationCore
Add-Type -AssemblyName WindowsBase

$assetsDir = Join-Path $PSScriptRoot '..\assets\images'
$sourcePath = Join-Path $assetsDir 'auralyx-mark.svg'
[xml]$svg = Get-Content -LiteralPath $sourcePath -Raw
$svgNs = New-Object System.Xml.XmlNamespaceManager($svg.NameTable)
$svgNs.AddNamespace('svg', 'http://www.w3.org/2000/svg')
$paths = @($svg.SelectNodes('/svg:svg/svg:path', $svgNs))
$mark = [System.Windows.Media.Geometry]::Parse($paths[0].GetAttribute('d'))
$wave = [System.Windows.Media.Geometry]::Parse($paths[1].GetAttribute('d'))
$all = New-Object System.Windows.Media.GeometryGroup
$all.Children.Add($mark)
$all.Children.Add($wave)
$bounds = $all.Bounds

function New-GradientBrush($first, $middle, $last) {
  $brush = New-Object System.Windows.Media.LinearGradientBrush
  $brush.StartPoint = [System.Windows.Point]::new(0, 0)
  $brush.EndPoint = [System.Windows.Point]::new(1, 1)
  $brush.MappingMode = [System.Windows.Media.BrushMappingMode]::RelativeToBoundingBox
  $brush.GradientStops.Add([System.Windows.Media.GradientStop]::new([System.Windows.Media.ColorConverter]::ConvertFromString($first), 0))
  $brush.GradientStops.Add([System.Windows.Media.GradientStop]::new([System.Windows.Media.ColorConverter]::ConvertFromString($middle), 0.52))
  $brush.GradientStops.Add([System.Windows.Media.GradientStop]::new([System.Windows.Media.ColorConverter]::ConvertFromString($last), 1))
  return $brush
}

$mainBrush = New-GradientBrush '#67F4FF' '#4D8DFF' '#D66BFF'
$waveBrush = New-GradientBrush '#69F4FF' '#8B7CFF' '#FF78D2'

function Save-BrandPng([string]$fileName, [int]$size, [double]$markWidth, [string]$style) {
  $visual = New-Object System.Windows.Media.DrawingVisual
  $dc = $visual.RenderOpen()
  $canvasRect = [System.Windows.Rect]::new(0, 0, $size, $size)

  if ($style -eq 'icon') {
    $background = [System.Windows.Media.SolidColorBrush]::new([System.Windows.Media.ColorConverter]::ConvertFromString('#090C16'))
    $dc.DrawRectangle($background, $null, $canvasRect)

    $halo = New-Object System.Windows.Media.RadialGradientBrush
    $halo.Center = [System.Windows.Point]::new(0.5, 0.5)
    $halo.GradientOrigin = [System.Windows.Point]::new(0.5, 0.5)
    $halo.RadiusX = 0.5
    $halo.RadiusY = 0.5
    $halo.GradientStops.Add([System.Windows.Media.GradientStop]::new([System.Windows.Media.ColorConverter]::ConvertFromString('#303A7CFF'), 0))
    $halo.GradientStops.Add([System.Windows.Media.GradientStop]::new([System.Windows.Media.ColorConverter]::ConvertFromString('#003A7CFF'), 1))
    $dc.DrawEllipse($halo, $null, [System.Windows.Point]::new($size / 2, $size / 2), ($size / 2), ($size / 2))
  }

  $scale = ($size * $markWidth) / $bounds.Width
  $offsetX = (($size - ($bounds.Width * $scale)) / 2) - ($bounds.X * $scale)
  $offsetY = (($size - ($bounds.Height * $scale)) / 2) - ($bounds.Y * $scale)
  $transform = [System.Windows.Media.MatrixTransform]::new([System.Windows.Media.Matrix]::new($scale, 0, 0, $scale, $offsetX, $offsetY))
  $markCopy = $mark.Clone()
  $waveCopy = $wave.Clone()
  $markCopy.Transform = $transform
  $waveCopy.Transform = $transform

  if ($style -eq 'monochrome') {
    $symbolBrush = [System.Windows.Media.SolidColorBrush]::new([System.Windows.Media.Colors]::White)
    $dc.DrawGeometry($symbolBrush, $null, $markCopy)
    $dc.DrawGeometry($symbolBrush, $null, $waveCopy)
  } else {
    $dc.DrawGeometry($mainBrush, $null, $markCopy)
    $dc.DrawGeometry($waveBrush, $null, $waveCopy)
  }

  $dc.Close()
  $bitmap = [System.Windows.Media.Imaging.RenderTargetBitmap]::new($size, $size, 96, 96, [System.Windows.Media.PixelFormats]::Pbgra32)
  $bitmap.Render($visual)
  $encoder = New-Object System.Windows.Media.Imaging.PngBitmapEncoder
  $encoder.Frames.Add([System.Windows.Media.Imaging.BitmapFrame]::Create($bitmap))
  $target = Join-Path $assetsDir $fileName
  $stream = [System.IO.File]::Open($target, [System.IO.FileMode]::Create)
  try { $encoder.Save($stream) } finally { $stream.Dispose() }
}

Save-BrandPng 'icon.png' 1024 0.72 'icon'
Save-BrandPng 'android-icon-foreground.png' 432 0.62 'transparent'
Save-BrandPng 'android-icon-monochrome.png' 432 0.62 'monochrome'
Save-BrandPng 'splash-icon.png' 512 0.66 'transparent'
