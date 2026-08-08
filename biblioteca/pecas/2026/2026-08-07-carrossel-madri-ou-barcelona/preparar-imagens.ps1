# Reconstroi imagens/ a partir do acervo (somente leitura). Reproduzivel: o que
# esta aqui e a origem exata de cada imagem da peca e o tratamento aplicado.
#
# Frame de bruto sai em C-Log3 e nao entra cru na peca. Conversao pelo LUT da
# curva da camera (--perfil bruto-canon) e casamento com as fotos exportadas do
# proprio destino (--referencia), que sao o padrao de cor aprovado.
$ErrorActionPreference = 'Stop'

$peca   = Split-Path -Parent $MyInvocation.MyCommand.Path
$render = 'C:\Dev\designer-num-pulo\tools\render.mjs'
$dest   = 'H:\Destinos\Espanha Nomad 2025'
$imagens = Join-Path $peca 'imagens'
New-Item -ItemType Directory -Force $imagens | Out-Null

# Referencia de cor: fotos exportadas da mesma viagem, ja aprovadas.
$ref = Join-Path $env:TEMP 'np-ref-espanha'
New-Item -ItemType Directory -Force $ref | Out-Null
Get-ChildItem $ref -File | Remove-Item -Force
Copy-Item "$dest\Thumb\*.JPG" $ref -Force
Copy-Item "$dest\Fotografia\Mercado Madrid\NUM_0380.JPG" $ref -Force
Copy-Item "$dest\Fotografia\Mercado Madrid\NUM_0406.JPG" $ref -Force

# Frames de bruto: cidade + clipe. Frame tirado no meio do clipe.
$frames = [ordered]@{
  's01-madri-metropolis' = @('madrid',    'NUM_1451')
  's01-bcn-sagrada'      = @('barcelona', 'NUM_2785')
  's02-calcada'          = @('madrid',    'NUM_9943')
  's07-pao-tomate'       = @('barcelona', 'NUM_2044')
  's08-sala-equis'       = @('madrid',    'NUM_1222')
  's09-bcn-passeig'      = @('barcelona', 'NUM_2604')
  's10-casal'            = @('madrid',    'NUM_9907')
}
foreach ($nome in $frames.Keys) {
  $cidade, $id = $frames[$nome]
  $linha = Import-Csv "$dest\_index\$cidade\index.csv" |
    Where-Object { [System.IO.Path]::GetFileNameWithoutExtension($_.caminho) -eq $id } |
    Select-Object -First 1
  if (-not $linha) { throw "clipe $id nao esta no index de $cidade" }
  $t = [math]::Max(0.1, [double]$linha.duracao_s / 2)
  $bruto = Join-Path $env:TEMP "np-frame-$id.jpg"
  & ffmpeg -nostdin -loglevel error -y -ss $t -i $linha.caminho -frames:v 1 -q:v 2 $bruto
  node $render cor $bruto --out (Join-Path $imagens "$nome.jpg") `
    --perfil bruto-canon --referencia $ref --forca 0.5 --qualidade 92 | Out-Null
  Remove-Item $bruto -Force
  "OK $nome  <- $cidade/$id (log -> LUT + referencia)"
}

# Fotos ja exportadas: entram sem tratamento, so recompressao.
$fotos = [ordered]@{
  's03-casa-batllo' = 'H:\Destinos\Barcelona 2022\Fotografia\Casa Batlo\IMG_7856.jpg'
  's04-gran-via'    = "$dest\Thumb\NUM_1511.JPG"
  's05-taberna'     = "$dest\Thumb\NUM_0097.JPG"
  's06-mercado'     = "$dest\Fotografia\Mercado Madrid\NUM_0380.JPG"
  's09-mad-rua'     = "$dest\Thumb\NUM_0043.JPG"
}
foreach ($nome in $fotos.Keys) {
  node $render tratar $fotos[$nome] --out (Join-Path $imagens "$nome.jpg") --qualidade 92 | Out-Null
  "OK $nome  <- foto exportada"
}

# Medicao que decide ancora e scrim de cada slide. O fonte.html usa estes numeros.
"`n--- analise (ancora e scrim por imagem) ---"
Get-ChildItem $imagens -Filter *.jpg | Sort-Object Name | ForEach-Object {
  $a = node $render analisar $_.FullName --grade 3x4 | ConvertFrom-Json
  $p = if ($a.recomendacao.concentracaoDePele) { " pele-concentrada:[$($a.recomendacao.concentracaoDePele -join ',')]" } else { '' }
  "{0,-22} ancora={1,-6} scrim={2}{3}" -f $_.BaseName, $a.recomendacao.ancora, $a.recomendacao.scrim, $p
}
