param(
  [Parameter(Mandatory = $true)]
  [string]$Source,
  [Parameter(Mandatory = $true)]
  [string[]]$Destinations,
  [int]$MaxLongEdge = 1400,
  [int]$JpegQuality = 88
)

Add-Type -AssemblyName System.Drawing

$sourcePath = (Resolve-Path -LiteralPath $Source).Path
$sourceImage = [System.Drawing.Image]::FromFile($sourcePath)

try {
  $sourceImage.RotateFlip([System.Drawing.RotateFlipType]::Rotate90FlipNone)
  $scale = [Math]::Min(1.0, $MaxLongEdge / [double][Math]::Max($sourceImage.Width, $sourceImage.Height))
  [int]$rotatedWidth = [Math]::Round($sourceImage.Width * $scale)
  [int]$rotatedHeight = [Math]::Round($sourceImage.Height * $scale)
  $canvas = New-Object System.Drawing.Bitmap -ArgumentList $rotatedWidth, $rotatedHeight
  $canvas.SetResolution($sourceImage.HorizontalResolution, $sourceImage.VerticalResolution)

  try {
    $graphics = [System.Drawing.Graphics]::FromImage($canvas)
    try {
      $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
      $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
      $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
      $graphics.DrawImage($sourceImage, 0, 0, $rotatedWidth, $rotatedHeight)
    }
    finally {
      $graphics.Dispose()
    }

    $jpegCodec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() |
      Where-Object { $_.MimeType -eq "image/jpeg" } |
      Select-Object -First 1
    $encoderParameters = New-Object System.Drawing.Imaging.EncoderParameters(1)
    $encoderParameters.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter(
      [System.Drawing.Imaging.Encoder]::Quality,
      [long]$JpegQuality
    )

    foreach ($destination in $Destinations) {
      $destinationPath = [System.IO.Path]::GetFullPath($destination)
      $parent = [System.IO.Path]::GetDirectoryName($destinationPath)
      if (-not [System.IO.Directory]::Exists($parent)) {
        [System.IO.Directory]::CreateDirectory($parent) | Out-Null
      }
      $canvas.Save($destinationPath, $jpegCodec, $encoderParameters)
    }
  }
  finally {
    $canvas.Dispose()
  }
}
finally {
  $sourceImage.Dispose()
}
