---
slug: 2026-08-08-thumbnail-barcelona-piloto
formato: thumbnail-youtube
demandante: Daniel (pedido direto)
status: rascunho
publica: n/a — piloto de formato, vídeo ainda não tem data
---

# Thumbnail YouTube — Barcelona (piloto do formato)

## Pedido

Primeiro thumbnail de YouTube feito por este worker. Não existe template ainda —
formato novo, primeira ocorrência. Pedido do Daniel: extrair o padrão real do
canal a partir dos 3 últimos vídeos publicados e usar Barcelona como piloto.

Texto: **BARCELONA** / **ALÉM DO ÓBVIO** (título + subtítulo, sem tag de
duração — essa é reservada para caso pontual, como o da Serra da Canastra).

## Padrão extraído (referência: 3 últimos vídeos do canal, 08/08)

Vídeos analisados, puxados direto do YouTube (`@numpulo/videos`, mais recentes):
`NORONHA — Vale a Pena?`, `MADRI`, `SERRA DA CANASTRA — Viagem Completa 7 Dias`.
Medição por pixel (ImageMagick), não a olho — bounding box de cada bloco de texto.

- **1280×720.** Sem logo, sem eyebrow, sem ghost number, sem badge — só foto + título.
- **Anton, sempre AllCaps, sempre branco puro, sem stroke nem drop-shadow.**
- **Sem vinheta.** As três peças resolvem contraste na escolha do enquadramento — o
  texto cai sobre uma área que já é escura e orgânica na própria foto (folhagem densa,
  copa de árvore, silhueta de serra), nunca sobre céu ou superfície clara.
- **Alinhamento segue o espaço negativo da foto**, não é fixo: Noronha (bloco à
  direita, pessoas à esquerda), Madri (centralizado), Canastra (bloco à esquerda,
  pessoa à direita).
- **Cap-height do título ≈ 22% da altura do quadro** quando é linha única sobre
  título+subtítulo (medido no Noronha: 158px de 720). Título de duas linhas sem
  subtítulo reparte a proporção entre as linhas (Canastra). Título isolado sem
  subtítulo pode ocupar bem mais — o Madri sozinho mede 390px, 54% da altura.
- **Subtítulo, quando existe, ≈ 76% do tamanho do título** (medido no Noronha:
  120px vs 158px), mesma fonte Anton branca — é continuação do gancho, não uma
  tag separada.
- **Pessoas sempre presentes**, corpo inteiro ou 3/4, engajadas com a câmera, nunca
  cobrindo a zona do texto.

Achado fora do padrão da skill atual: o subtítulo da Canastra ("VIAGEM COMPLETA 7
DIAS") usa uma cor dourada (`#F1AC22`, medida por histograma) que não existe na
paleta de 6 cores do brandguide. Decisão do Daniel (08/08): o dourado **entra
como cor nova do sistema**, mas de uso pontual — reservado para tag informativa
(duração, roteiro), não para todo subtítulo. Registrado em
`biblioteca/calibracoes/2026-08-08-thumbnail-youtube-padrao-e-dourado.md`.

## Fonte de imagem

Foto pronta do acervo (`H:\Destinos\Barcelona 2022\Fotografia`), sem tratamento —
regra 1 da ordem de fonte do CLAUDE.md. Nenhum frame de vídeo: o vídeo de
Barcelona ainda não existe, e mesmo que existisse, foto do destino vem primeiro.

`Park Guell\NUM_6973.jpg` — Paula sentada no banco de mosaico do Park Güell, com
o aqueduto de pedra e a copa de pinheiros ao fundo (recorte 16:9 na faixa
inferior da foto, preparar-imagens.ps1). Escolhida entre 6 candidatas por ter a
única combinação de: pessoa presente e engajada + zona escura e orgânica
contígua a partir da borda esquerda, larga o bastante para o bloco de texto sem
vinheta. As demais (Casa Batlló, Sagrada Família, Palau Nacional, praça em golden
hour) tinham céu claro ocupando a área onde o texto precisaria entrar.

## Como montar

    powershell -File biblioteca/pecas/2026/2026-08-08-thumbnail-barcelona-piloto/preparar-imagens.ps1
    powershell -File biblioteca/pecas/2026/2026-08-08-thumbnail-barcelona-piloto/montar.ps1 -Preview

## Pendências

- Aprovação do Daniel sobre o piloto — só depois disso vira `templates/thumbnail-youtube/`
  (template nasce da segunda ocorrência ou de decisão dele, nunca de antecipação).
- Vídeo de Barcelona ainda não tem data nem roteiro — esta peça é só o piloto visual.
