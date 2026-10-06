# Converte as fotos da extração para o site: no máximo 800 px, JPEG qualidade 78, nome pelo SKU.
# Uso (raiz do projeto):
#   node scripts/catalogo/importar_agrotrator.cjs --mapa > mapa.txt
#   powershell -File scripts/catalogo/converter_fotos_agrotrator.ps1 -Mapa mapa.txt -Origem "<pasta>\imagens"
param(
  [Parameter(Mandatory = $true)][string]$Mapa,
  [Parameter(Mandatory = $true)][string]$Origem,
  [string]$Destino = "public\catalogo",
  [int]$Max = 800
)
Add-Type -AssemblyName System.Drawing
New-Item -ItemType Directory -Force $Destino | Out-Null
$codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq "image/jpeg" }
$params = New-Object System.Drawing.Imaging.EncoderParameters 1
$params.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter ([System.Drawing.Imaging.Encoder]::Quality), 78L
$ok = 0; $falhas = @()
foreach ($linha in Get-Content $Mapa) {
  $partes = $linha.Split(";")
  if ($partes.Count -ne 2) { continue }
  $src = Join-Path $Origem $partes[0]
  $dst = Join-Path $Destino $partes[1]
  if (Test-Path $dst) { $ok++; continue }
  try {
    $img = [System.Drawing.Image]::FromFile($src)
    $escala = [Math]::Min(1.0, $Max / [Math]::Max($img.Width, $img.Height))
    $w = [int]($img.Width * $escala); $h = [int]($img.Height * $escala)
    $bmp = New-Object System.Drawing.Bitmap $w, $h
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.Clear([System.Drawing.Color]::White)  # PNG/WebP transparentes ficam com fundo branco
    $g.InterpolationMode = "HighQualityBicubic"
    $g.DrawImage($img, 0, 0, $w, $h)
    $bmp.Save($dst, $codec, $params)
    $g.Dispose(); $bmp.Dispose(); $img.Dispose()
    $ok++
  } catch {
    $falhas += $partes[0]
  }
}
"Convertidas: $ok | Falhas: $($falhas.Count)"
$falhas | Select-Object -First 20
