# Handoff — designer-num-pulo

Atualizado: 2026-08-08.

## Estado

Fase 0 concluída e primeira demanda de outro worker entregue.

Peças em `biblioteca/pecas/2026/`:

- `2026-08-07-mockup-guia-landing` e `2026-08-07-cena-guia-landing` — aprovadas pelo
  Daniel, não publicadas. Ele planeja as demais imagens do Guia e troca tudo de uma vez.
- `2026-08-07-carrossel-madri-ou-barcelona` — primeiro carrossel, 10 slides, demanda
  1103 do `socialmedia`, publica 09/08. **Quatro rodadas de calibração do Daniel**
  aplicadas (diagramação, cor, troca de frame por foto, texto sobre rosto). Entregue em
  `saida/*.jpg`, aguardando aprovação final.

Templates: `mockup-tela-em-cena/` e `carrossel-foto-sangrada/`.

## O que este worker sabe fazer agora

Tudo em `tools/render.mjs`, tudo medido em vez de julgado a olho:

- **Peça**: `render`, `recortar`, `tratar` — HTML → quadros da entrega.
- **Cor por fonte**: `cor --perfil bruto-canon|raw-canon|iphone`. Pipeline em float,
  quantização única com dither. RAW e HEIC decodificados via ImageMagick em 16 bits.
- **Diagramação medida**: `analisar` (âncora, scrim por brilho e por detalhe),
  `rostos` (via `claude -p`, cache por hash), `checar` (gate de texto sobre rosto no
  slide renderizado, chamado pelo `montar.ps1`).
- **Acervo**: `indexar-fotos` — índice de foto espelhando o de vídeo do `edicao`.
- **Composição**: `medir-tela`, `contorno`, `assets/composicao.js`.
- **Ponte de look**: `hald` (HALD CLUT identity para trazer preset do Lightroom).

Ordem de fonte de imagem e tratamento por fonte: CLAUDE.md, seção "Acervo de imagem".

## Índices de foto já gerados

- `H:\Destinos\Barcelona 2022\_index\fotos\` — 68 fotos, 57 com landmark
- `H:\Destinos\Espanha Nomad 2025\_index\fotos\` — 10 fotos

Regra: ao topar com uma pasta `Fotografia` ainda não indexada, indexar. Entregável
declarado no registro; `edicao-num-pulo` avisado pela demanda 1104.

## Próximo passo

Fase 1 (spec, seção 9), com o calendário do lançamento: mockup/apresentação do Guia
até o checkpoint de 23/08 (D0 em 31/08), carrossel do Lote Fundador (02/09),
thumbnail de YouTube, e a primeira calibração da `num-pulo-brand-guidelines`.

## Situações em aberto

- **Calibração da skill, pendente do Daniel.** O padrão Gramado diverge da
  `num-pulo-brand-guidelines` em três pontos: formato de carrossel (3:4 contra
  1080×1080 da seção 10.2), escala tipográfica (96/30 contra 36–48/15–16 da 13.3) e
  itálico em trecho, não em uma palavra (seção 2). A skill não foi tocada.
- **Look de cor.** O Daniel vai exportar um HALD revelado com o preset dele; o
  identity está em `presets-luts/hald-identity-nivel8.png` e os frames de partida
  (só LUT aplicado) em `presets-luts/so-lut-clog3-rec709/`. Enquanto não vem, frame
  de vídeo casa estatisticamente com as fotos exportadas do destino.
- **Camera Raw por COM, não implementado.** Photoshop 2024 responde
  (`New-Object -ComObject Photoshop.Application`, versão 27.9.1) e o ACR lê `.xmp`
  como sidecar do RAW. É a única rota fiel ao preset do Lightroom — `darktable-cli`
  e `rawtherapee-cli` usam formato próprio e não leem preset do Adobe.
- Plano do Daniel para o conjunto de imagens do Guia.
- ComfyUI: endpoint e invocação, a levantar na primeira peça que precisar — para
  grade de cor não serve; o caso de uso é upscale, limpeza e imagery de apoio.
- Fontes do projeto remoto no claude.ai/design caem em fallback. Projeto:
  `019e1dc1-2de2-7941-b801-4382556049d6`.
- Acesso ao interior do Guia para screenshot depende de sessão logada do Daniel.
