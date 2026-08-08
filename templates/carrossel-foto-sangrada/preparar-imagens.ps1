# Reconstroi imagens/ a partir do acervo (somente leitura, fora o _index).
# Este arquivo E o rastro da peca: o que esta aqui e a origem exata de cada
# imagem e o tratamento aplicado. Preencher os dois blocos abaixo e rodar.
#
# ORDEM DE FONTE (CLAUDE.md, "Acervo de imagem"). Nao pular etapa:
#   1. foto pronta   <destino>/Fotografia/            -> sem tratamento
#   2. iPhone        <destino>/Bruto */iPhone */      -> --perfil iphone
#   3. frame         achado pelo _index do destino    -> --perfil bruto-canon
#   4. RAW da R6     <destino>/Bruto */Canon R6/      -> --perfil raw-canon
$ErrorActionPreference = 'Stop'

$peca    = Split-Path -Parent $MyInvocation.MyCommand.Path
$render  = 'C:\Dev\designer-num-pulo\tools\render.mjs'
$destino = 'H:\Destinos\SUBSTITUIR'          # <<< pasta do destino
$imagens = Join-Path $peca 'imagens'
New-Item -ItemType Directory -Force $imagens | Out-Null

# Referencia de cor: as fotos ja exportadas do proprio destino. E o que aproxima
# material bruto do padrao aprovado do canal. Sem elas, pule o --referencia.
$ref = Join-Path $destino 'Fotografia'

# Antes de escolher: garanta que o destino tem indice de foto.
if (-not (Test-Path (Join-Path $destino '_index\fotos\index.csv'))) {
  "indexando fotos de $destino (primeira vez)"
  node $render indexar-fotos $destino --descrever | Out-Null
}

# --- 1. FOTOS PRONTAS: entram sem tratamento, so recompressao ---------------
$fotos = [ordered]@{
  # 's01-abertura' = "$destino\Fotografia\NUM_0001.jpg"
}
foreach ($nome in $fotos.Keys) {
  node $render tratar $fotos[$nome] --out (Join-Path $imagens "$nome.jpg") --qualidade 92 | Out-Null
  "OK $nome  <- foto pronta"
}

# --- 2. iPHONE / 4. RAW: perfil resolve heic, dng e cr3 ---------------------
# @{ arquivo = <caminho>; perfil = 'iphone' | 'raw-canon' }
$brutos = [ordered]@{
  # 's03-mercado' = @{ arquivo = "$destino\Bruto\iPhone\IMG_0001.heic"; perfil = 'iphone' }
}
foreach ($nome in $brutos.Keys) {
  $b = $brutos[$nome]
  node $render cor $b.arquivo --out (Join-Path $imagens "$nome.jpg") `
    --perfil $b.perfil --referencia $ref --forca 0.5 --qualidade 92 | Out-Null
  "OK $nome  <- $($b.perfil)"
}

# --- 3. FRAMES DE VIDEO: ultima opcao fotografica ---------------------------
# Achar pelo indice: <destino>/_index/<cidade>/index.csv, busca por landmark ou
# descricao. Frame tirado no meio do clipe.
$frames = [ordered]@{
  # 's05-rua' = @('cidade', 'NUM_0001')
}
foreach ($nome in $frames.Keys) {
  $cidade, $id = $frames[$nome]
  $linha = Import-Csv (Join-Path $destino "_index\$cidade\index.csv") |
    Where-Object { [System.IO.Path]::GetFileNameWithoutExtension($_.caminho) -eq $id } |
    Select-Object -First 1
  if (-not $linha) { throw "clipe $id nao esta no index de $cidade" }
  $t = [math]::Max(0.1, [double]$linha.duracao_s / 2)
  $bruto = Join-Path $env:TEMP "np-frame-$id.jpg"
  & ffmpeg -nostdin -loglevel error -y -ss $t -i $linha.caminho -frames:v 1 -q:v 2 $bruto
  node $render cor $bruto --out (Join-Path $imagens "$nome.jpg") `
    --perfil bruto-canon --referencia $ref --forca 0.5 --qualidade 92 | Out-Null
  Remove-Item $bruto -Force
  "OK $nome  <- $cidade/$id (frame)"
}

# --- MEDICAO que decide ancora e scrim de cada slide ------------------------
# O fonte.html usa estes numeros em --scrim e na escolha de .bloco baixo/cima.
"`n--- analise (ancora e scrim por imagem) ---"
Get-ChildItem $imagens -Filter *.jpg | Sort-Object Name | ForEach-Object {
  $a = node $render analisar $_.FullName --grade 3x4 | ConvertFrom-Json
  $cima  = ($a.faixas | Where-Object nome -eq 'cima').scrim
  $baixo = ($a.faixas | Where-Object nome -eq 'baixo').scrim
  '{0,-22} recomenda={1,-6} scrim(cima={2} baixo={3})' -f $_.BaseName, $a.recomendacao.ancora, $cima, $baixo
}
