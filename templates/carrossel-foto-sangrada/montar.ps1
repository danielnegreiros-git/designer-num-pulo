# Monta o carrossel: gate de rosto -> render da tira -> recorte -> entrega.
#
# GENERICO: descobre sozinho quantos slides o fonte.html tem e a altura da tira.
# Copie para a pasta da peca SEM EDITAR. O unico parametro que costuma mudar e
# -Nome, que prefixa os arquivos de saida (default: nome da pasta da peca).
#
# Uso:
#   powershell -File montar.ps1                 # entrega final, escala 2
#   powershell -File montar.ps1 -Preview        # + JPGs de 720px para auditoria
#   powershell -File montar.ps1 -Escala 1       # rascunho rapido enquanto itera
#   powershell -File montar.ps1 -Png            # guarda tambem os PNGs
#   powershell -File montar.ps1 -PularChecagem  # so para iterar layout; entrega nunca
param(
  [int]$Escala = 2,
  [string]$Nome,
  [switch]$Png,
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

# Nome dos arquivos: prefixo do slug, sem a data.
if (-not $Nome) {
  $Nome = (Split-Path $peca -Leaf) -replace '^\d{4}-\d{2}-\d{2}-', ''
}

# Quantos slides: conta no proprio HTML, para nao existir numero repetido em
# dois lugares. Peca de 8 slides e de 10 usam este mesmo arquivo sem edicao.
$html = Get-Content $fonte -Raw
$slides = ([regex]::Matches($html, '<section[^>]*class="[^"]*\bslide\b')).Count
if ($slides -lt 1) { throw 'nenhum <section class="slide"> encontrado em fonte.html' }

# Altura do slide: le do CSS da propria peca, com 1440 como padrao do formato.
$m = [regex]::Match($html, '(?s)\.slide\s*\{[^}]*?height:\s*(\d+)px')
$alturaSlide = if ($m.Success) { [int]$m.Groups[1].Value } else { 1440 }
$larguraSlide = 1080
$m2 = [regex]::Match($html, '(?s)\.slide\s*\{[^}]*?width:\s*(\d+)px')
if ($m2.Success) { $larguraSlide = [int]$m2.Groups[1].Value }

"peca: $Nome | $slides slides de ${larguraSlide}x${alturaSlide} | escala $Escala"

# GATE: texto sobre rosto, medido no slide renderizado. Aborta a entrega.
if (-not $PularChecagem) {
  $r = node $render checar $fonte --largura $larguraSlide --altura $alturaSlide | ConvertFrom-Json
  if (-not $r.ok) {
    $r.conflitos | ForEach-Object {
      $s = $_.slide
      $_.ocorrencias | ForEach-Object { 'CONFLITO slide {0}: {1} sobre rosto em y {2}' -f $s, $_.elemento, $_.rosto.y }
    }
    throw 'texto sobre rosto: corrija a ancora ou o enquadramento antes de gerar a entrega'
  }
  "checagem de rosto: ok em $($r.slides) slides"
}

$tira = Join-Path $saida '_tira.png'
node $render render $fonte --out $tira --largura $larguraSlide --altura ($alturaSlide * $slides) --escala $Escala | Out-Null

$h = $alturaSlide * $Escala
$w = $larguraSlide * $Escala
for ($i = 1; $i -le $slides; $i++) {
  $n = '{0:d2}' -f $i
  $y = ($i - 1) * $h
  # $arqPng, nao $png: PowerShell nao diferencia maiusculas em nome de variavel,
  # e $png sobrescreve o switch -Png, quebrando o script na primeira volta.
  $arqPng = Join-Path $saida "$Nome-$n.png"
  node $render recortar $tira --out $arqPng --x 0 --y $y --largura $w --altura $h | Out-Null
  node $render tratar $arqPng --out (Join-Path $saida "$Nome-$n.jpg") --qualidade 95 | Out-Null
  if ($Preview) {
    node $render tratar $arqPng --out (Join-Path $saida "_preview-$n.jpg") --largura 720 --qualidade 88 | Out-Null
  }
  if (-not $Png) { Remove-Item $arqPng -Force }
  "OK slide $n"
}
Remove-Item $tira -Force
