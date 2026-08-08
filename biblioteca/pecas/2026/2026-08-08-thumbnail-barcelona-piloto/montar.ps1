# Monta o thumbnail: gate de rosto -> render -> entrega em JPG q95.
#
# Uso:
#   powershell -File montar.ps1                 # entrega final, escala 2 (2560x1440 -> 1280x720)
#   powershell -File montar.ps1 -Preview        # + JPG de 720px para auditoria (== escala 1)
#   powershell -File montar.ps1 -PularChecagem  # so para iterar layout; entrega nunca
param(
  [int]$Escala = 2,
  [string]$Nome = 'thumbnail-barcelona-piloto',
  [switch]$Preview,
  [switch]$PularChecagem
)

$ErrorActionPreference = 'Stop'
$peca   = Split-Path -Parent $MyInvocation.MyCommand.Path
$render = 'C:\Dev\designer-num-pulo\tools\render.mjs'
$fonte  = Join-Path $peca 'fonte.html'
$saida  = Join-Path $peca 'saida'
if (-not (Test-Path $fonte)) { throw "sem fonte.html em $peca" }
New-Item -ItemType Directory -Force $saida | Out-Null

$largura = 1280
$altura  = 720

# GATE: texto sobre rosto (a Paula esta na foto), medido no quadro renderizado.
if (-not $PularChecagem) {
  $r = node $render checar $fonte --largura $largura --altura $altura | ConvertFrom-Json
  if (-not $r.ok) {
    $r.conflitos | ForEach-Object {
      $_.ocorrencias | ForEach-Object { 'CONFLITO: {0} sobre rosto em y {1}' -f $_.elemento, $_.rosto.y }
    }
    throw 'texto sobre rosto: corrija a ancora antes de gerar a entrega'
  }
  'checagem de rosto: ok'
}

$png = Join-Path $saida "$Nome.png"
node $render render $fonte --out $png --largura $largura --altura $altura --escala $Escala | Out-Null
node $render tratar $png --out (Join-Path $saida "$Nome.jpg") --largura $largura --qualidade 95 | Out-Null
Remove-Item $png -Force

if ($Preview) {
  $pngPrev = Join-Path $saida '_preview.png'
  node $render render $fonte --out $pngPrev --largura $largura --altura $altura --escala 1 | Out-Null
  node $render tratar $pngPrev --out (Join-Path $saida '_preview.jpg') --qualidade 88 | Out-Null
  Remove-Item $pngPrev -Force
}

"OK $Nome.jpg"
