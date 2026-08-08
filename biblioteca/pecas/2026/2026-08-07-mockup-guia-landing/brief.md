# Brief — mockup do Guia para a landing

- slug: 2026-08-07-mockup-guia-landing
- formato: mockup-produto (primeira ocorrência — sem template ainda)
- demandante: Daniel (pedido direto, teste do fluxo da fase 1)
- status: aprovada (2026-08-07, Daniel) — teste do fluxo, sem uso agendado

## Pedido

Imagem de apresentação do Guia Num Pulo para a landing: mockup do produto em cena,
com screenshot real do app. Escolhas do Daniel: uso = landing do Guia; conteúdo =
tela real; enquadramento = celular em cena lifestyle.

## Sistema visual

Design system do Guia app (exceção da decisão 5 do spec — a peça é do produto):
creme `#F0EBE2`/`#F6F2EA`, roxo `#4A12E0`/ink `#1A1325`, amarelo `#F2C94C` com
parcimônia. Sem tipografia na peça: a landing fornece H1/sub; a imagem entra como
asset visual.

## Assets usados (todos reais)

- `foto-noronha.jpg` — NUM_7854_horizontal.jpg (Landing Page Fotos; Paula no deck,
  Morro do Pico, Noronha). Foto oficial da landing.
- `mockup-telas.png` — mockup transparente (4 telas reais do app + iPhone) do
  handoff design_handoff_conheca_mockup_hero (1448×1086, alfa real).

## Decisões de produção

- O PNG do iPhone único com a tela do Patacho (`MockupMobile/b64cf648...png`) tem o
  xadrez de transparência PINTADO (3 canais) — inutilizável direto. Fica para a v2.
- v2 planejada ("celular na mão"): base gerada no ChatGPT do Daniel (mão segurando
  iPhone, tela neutra, fundo desfocado genérico — imagery de apoio, sem paisagem de
  destino inventada) + composição da tela real por cima. Prompt entregue ao Daniel.
- Saída: 2400×1600 (render 1200×800, escala 2). Duas versões: limpa e com logo.

## Saída

Duas versões, aguardando escolha/ok do Daniel:

- `saida/mockup-guia-landing-2400x1600.png` — v1 "telas em cena": foto de Noronha
  (landing) + mockup das 4 telas. 100% real, sem IA.
- `saida/mockup-guia-mao-2400x1600.png` — v2 "celular na mão": base gerada no
  ChatGPT pelo Daniel em 2026-08-07 (`base-mao-ia.png`; mão + iPhone com tela em
  branco, praia genérica desfocada — imagery de apoio, dentro da regra 3) +
  screenshot real do app (`tela-dia01.jpg`, guia.numpulo.com.br, jul/2026)
  composto por homografia CSS (`fonte-mao.html`). Ambas com webp de entrega.
