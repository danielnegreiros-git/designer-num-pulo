---
slug: 2026-08-07-carrossel-madri-ou-barcelona
formato: carrossel
demandante: socialmedia (demanda 1103)
status: rascunho
publica: 2026-08-09 (agendamento pelo Daniel)
---

# Carrossel — Madri ou Barcelona (10 slides)

## Pedido

Demanda 1103 do `socialmedia`. Roteiro aprovado pelo Daniel em 07/08, texto integral em
`C:/Dev/socialmedia-num-pulo/biblioteca/outputs/2026/2026-08-07-carrossel-madri-ou-barcelona/v1.md`
(vault: `[[Carrossel - Madri ou Barcelona]]`). Nenhuma palavra do roteiro foi alterada.

Duas regras do formato, cumpridas: slide 1 não abre com rosto; slide 10 é CTA de comentário
com dois times e um emoji por lado.

## Padrão visual

Referência dada pelo Daniel: `Y:\numpulo\Transferencia\Gramado\Carrossel\Carrossel Gramado`.
O que foi extraído e replicado:

- **2160×2880 (3:4)**, foto sangrada, sem moldura nem margem branca.
- Texto **só em branco** sobre a foto, com vinheta no lado que recebe o texto.
- **Instrument Serif** no título (96px em 1080 de largura), com trecho curto em itálico;
  **Poppins** 400/600 no corpo (30px, `line-height` 1.44); **Anton** só na capa.
- Margem lateral 120px, coluna de texto 780px, bloco ancorado no topo ou no rodapé
  conforme o espaço livre da foto.
- Assinatura `@numpulo` no último slide, canto inferior esquerdo.

Medição do padrão feita por grade de diagnóstico sobre o `Gramado_2.png` normalizado a
1080 de largura, não a olho.

## Adição própria: marcador de cidade

O `socialmedia` pediu marcador visual fixo, porque o carrossel alterna as duas cidades.
Solução: eyebrow no topo esquerdo, Poppins 600 19px, caixa-alta, `letter-spacing` .30em,
branco, com traço de 34px antes. Três valores: `MADRI`, `BARCELONA`, `MADRI × BARCELONA`.
O slide 1 não leva marcador (a capa já nomeia as duas). Vinheta de topo de 24% garante o
contraste do marcador sobre céu ou parede clara.

## Fontes de imagem

Acervo somente leitura. Nada gerado por IA, nenhuma paisagem inventada.

| Slide | Cidade | Arquivo em `imagens/` | Origem |
|---|---|---|---|
| 01 | as duas | `s01-madri-metropolis.jpg` + `s01-bcn-sagrada.jpg` | frames `NUM_1451` (Edifício Metrópolis) e `NUM_2785` (Sagrada Família) |
| 02 | as duas | `s02-calcada.jpg` | frame `NUM_9943` (calçada arborizada, Madri) |
| 03 | Barcelona | `s03-casa-batllo.jpg` | foto `Barcelona 2022/Fotografia/Casa Batlo/IMG_7856.jpg` |
| 04 | Madri | `s04-gran-via.jpg` | foto `Espanha Nomad 2025/Thumb/NUM_1511.JPG` |
| 05 | Madri | `s05-taberna.jpg` | foto `Espanha Nomad 2025/Thumb/NUM_0097.JPG` |
| 06 | Madri | `s06-mercado.jpg` | foto `Espanha Nomad 2025/Fotografia/Mercado Madrid/NUM_0380.JPG` |
| 07 | Barcelona | `s07-pao-tomate.jpg` | frame `NUM_2044` (pão rústico na mesa) |
| 08 | Madri | `s08-sala-equis.jpg` | frame `NUM_1222` (Sala Equis) |
| 09 | as duas | `s09-bcn-passeig.jpg` + `s09-mad-rua.jpg` | frame `NUM_2604` (Passeig de Gràcia) + foto `Thumb/NUM_0043.JPG` |
| 10 | as duas | `s10-casal.jpg` | frame `NUM_9907` (os dois, Madri) |

Frames localizados pelo `_index` de `H:\Destinos\Espanha Nomad 2025\_index\{madrid,barcelona}\index.csv`
(busca por landmark e descrição), extraídos no meio do clipe com `ffmpeg`.

Tudo reproduzível por `preparar-imagens.ps1`, que reconstrói `imagens/` do zero a partir
do acervo e imprime a análise de âncora e scrim de cada arquivo.

**Frame de vídeo sai em C-Log3 e não pode ir cru para a peça.** O bruto da Canon R6 é
desbotado e cinza ao lado das fotos exportadas; colado assim, o carrossel fica com dois
padrões de cor. Conversão pelo LUT da curva da câmera mais casamento com as fotos
exportadas da mesma viagem, que são o padrão de cor aprovado:

    node tools/render.mjs cor <frame> --out <saida> --perfil bruto-canon \
      --referencia <pasta de fotos exportadas do destino> --forca 0.5

## Posicionamento de texto e scrim, por medição

`render.mjs analisar <imagem> --grade 3x4` devolve por faixa: brilho, detalhe,
concentração de pele e o scrim que o branco precisa para bater contraste 4,5. Cada slide
recebe esse número em `--scrim`. Valores usados:

| Slide | Âncora | `--scrim` | Por quê |
|---|---|---|---|
| 01 | centro + rodapé | .70 | split, faixa clara nas duas metades |
| 02 | rodapé | .39 | calçada limpa, detalhe 24 |
| 03 | rodapé | .55 | fachada com detalhe 55 — brilho sozinho pedia .17 e não lia |
| 04 | rodapé | .54 | vitrine acesa atrás |
| 05 | rodapé | .20 | fachada preta; âncora no rodapé porque o rosto está no meio |
| 06 | rodapé | .65 | banca de frutas, detalhe 48 |
| 07 | topo | .37 | mesa clara embaixo |
| 08 | rodapé | .30 | interior escuro |
| 09 | rodapé | .55 | split |
| 10 | rodapé | .65 | prédio claro e selfie |

## Como montar

    powershell -File biblioteca/pecas/2026/2026-08-07-carrossel-madri-ou-barcelona/montar.ps1 -Escala 2

Renderiza `fonte.html` (os 10 slides empilhados, 1080×14400) e recorta os 10 quadros
2160×2880 em `saida/`. `-Preview` gera também os JPGs de 720px para auto-inspeção;
`-Png` guarda os PNGs além dos JPGs.

Entrega em **JPG qualidade 95** (16MB os dez). O padrão Gramado veio em PNG, mas slide de
foto sangrada não tem área chapada: o PNG pesa 6× mais (104MB) e o Instagram recomprime
tudo na subida. Se precisar do PNG, `-Png`.

## Divergências do brandguide, para calibração

O padrão Gramado, que o Daniel mandou seguir, difere da skill `num-pulo-brand-guidelines`
em três pontos. A skill não foi alterada; a decisão é dele.

1. **Formato.** A skill (10.2) especifica carrossel 1080×1080. O padrão real é 3:4.
2. **Escala tipográfica.** A skill (13.3) pede título 36–48px e corpo 15–16px. O padrão
   real, normalizado para 1080 de largura, é título 96px e corpo 30px.
3. **Itálico.** A skill (seção 2) restringe o itálico do Instrument Serif a uma palavra.
   O padrão real usa trecho de duas ou três palavras, e às vezes a linha inteira.

## Calibração do Daniel, 2026-08-08 (rodada 1)

Três apontamentos dele sobre a v1, todos corrigidos:

1. **Slide 5, texto na cara da Paula.** O bloco no topo encostava na cabeça dela. A
   análise mostra o rosto no terço central (pele 5,1× a média da foto), então o bloco foi
   para o rodapé, onde cai sobre a saia e a calçada.
2. **Slide 3, título sem leitura sobre imagem complexa.** Confirmado por medição: a faixa
   pedia scrim .17 por brilho, mas .55 por detalhe (fachada da Casa Batlló, desvio 55).
   Além disso o gradiente entregava metade do valor na primeira linha do título — agora o
   scrim fica cheio ao longo de todo o bloco e só decai acima dele.
3. **Fotos sem tratamento.** Frame de bruto passa pelo LUT da câmera e casa com as fotos
   exportadas do destino. O que era grade chutado virou `render.mjs cor`.

Aprovado por ele na mesma rodada: diagramação, marcador de cidade e o split.

## Pendências

- Aprovação do Daniel. Publicação é ação humana.
- Legenda e hashtags saem do `v1.md` do `socialmedia`, não desta peça.
