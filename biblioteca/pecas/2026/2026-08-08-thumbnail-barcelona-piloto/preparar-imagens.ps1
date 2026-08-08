# Reconstroi imagens/ a partir do acervo (somente leitura). Foto pronta, sem
# tratamento de cor — regra 1 da ordem de fonte do CLAUDE.md.
$ErrorActionPreference = 'Stop'

$peca    = Split-Path -Parent $MyInvocation.MyCommand.Path
$render  = 'C:\Dev\designer-num-pulo\tools\render.mjs'
$imagens = Join-Path $peca 'imagens'
New-Item -ItemType Directory -Force $imagens | Out-Null

# Park Guell, banco de mosaico: original 3256x4070 (retrato). Recorte 16:9 na
# faixa inferior — copa de pinheiro + aqueduto de pedra em cima (zona escura
# para o titulo, sem vinheta) e a Paula sentada no banco embaixo.
$origem = 'H:\Destinos\Barcelona 2022\Fotografia\Park Guell\NUM_6973.jpg'
$bruto  = Join-Path $env:TEMP 'np-thumb-bcn-crop.jpg'
node $render recortar $origem --out $bruto --x 0 --y 2100 --largura 3256 --altura 1831 | Out-Null
node $render tratar $bruto --out (Join-Path $imagens 'barcelona-park-guell.jpg') --qualidade 92 | Out-Null
Remove-Item $bruto -Force
'OK barcelona-park-guell.jpg  <- Barcelona 2022/Park Guell/NUM_6973.jpg (recorte 16:9)'

$a = node $render analisar (Join-Path $imagens 'barcelona-park-guell.jpg') --grade 3x4 | ConvertFrom-Json
"`nanalise (para conferir a zona escura do titulo, faixa esquerda):"
$a.recomendacao | ConvertTo-Json -Compress
