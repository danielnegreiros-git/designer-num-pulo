# Renderiza fonte.html (10 slides empilhados) e recorta os quadros 2160x2880.
#
# Antes de gerar a entrega, roda `render.mjs checar`: texto sobre rosto, medido
# no slide RENDERIZADO. Gate, nao aviso -- se acusar conflito, a montagem para.
# -PularChecagem so para iterar layout; entrega nunca sai sem passar.
# Entrega em JPG q95: slide de carrossel e foto sangrada, PNG só incha o arquivo
# (10x mais peso, diferença visual nula depois da recompressao do Instagram).
# -Png tambem grava os PNGs; -Preview grava JPGs de 720px para auditoria.
# Uso: powershell -File montar.ps1 [-Escala 2] [-Png] [-Preview]
param([int]$Escala = 2, [switch]$Png, [switch]$Preview, [switch]$PularChecagem)

$ErrorActionPreference = 'Stop'
$peca = Split-Path -Parent $MyInvocation.MyCommand.Path
$render = 'C:\Dev\designer-num-pulo\tools\render.mjs'
$tira = Join-Path $peca 'saida\_tira.png'
$saida = Join-Path $peca 'saida'

if (-not $PularChecagem) {
  $fonte = Join-Path $peca 'fonte.html'
  $r = node $render checar $fonte | ConvertFrom-Json
  if (-not $r.ok) {
    $r.conflitos | ForEach-Object {
      $slide = $_.slide
      $_.ocorrencias | ForEach-Object { "CONFLITO slide {0}: {1} sobre rosto em y {2}" -f $slide, $_.elemento, $_.rosto.y }
    }
    throw 'texto sobre rosto: corrija a ancora ou o enquadramento antes de gerar a entrega'
  }
  "checagem de rosto: ok em $($r.slides) slides"
}

node $render render (Join-Path $peca 'fonte.html') --out $tira --largura 1080 --altura 14400 --escala $Escala | Out-Null

$h = 1440 * $Escala
$w = 1080 * $Escala
for ($i = 1; $i -le 10; $i++) {
  $n = '{0:d2}' -f $i
  $y = ($i - 1) * $h
  $arq = Join-Path $saida "madri-ou-barcelona-$n.png"
  node $render recortar $tira --out $arq --x 0 --y $y --largura $w --altura $h | Out-Null
  node $render tratar $arq --out (Join-Path $saida "madri-ou-barcelona-$n.jpg") --qualidade 95 | Out-Null
  if ($Preview) {
    node $render tratar $arq --out (Join-Path $saida "_preview-$n.jpg") --largura 720 --qualidade 88 | Out-Null
  }
  if (-not $Png) { Remove-Item $arq -Force }
  "OK slide $n"
}
Remove-Item $tira -Force
