# Handoff — designer-num-pulo

Atualizado: 2026-08-08.

## Estado

Fase 0 concluída, primeira demanda de outro worker entregue, primeira calibração
da skill global feita.

- `2026-08-07-carrossel-madri-ou-barcelona` — demanda 1103 do `socialmedia`,
  publica 09/08. Quatro rodadas de calibração do Daniel aplicadas. Entregue em
  `saida/*.jpg`, **aguardando aprovação dele**.
- `2026-08-07-mockup-guia-landing` e `2026-08-07-cena-guia-landing` — aprovadas,
  não publicadas. O Daniel planeja as demais imagens do Guia e troca de uma vez.
- Templates: `mockup-tela-em-cena/`, `carrossel-foto-sangrada/`.
- `num-pulo-brand-guidelines` calibrada: carrossel de 1:1 para 3:4, escala
  tipográfica e itálico do padrão real. Skill, template e peça alinhados.

O que o worker sabe fazer e como decide está no CLAUDE.md — em especial a ordem
de fonte de imagem, o tratamento por fonte e os gates de diagramação. Nada disso
depende de memória de sessão.

## Índices de foto gerados

`Barcelona 2022` (68 fotos, 57 com landmark) e `Espanha Nomad 2025` (10). Regra:
topou com pasta `Fotografia` não indexada, indexa. Entregável declarado;
`edicao-num-pulo` avisado pela demanda 1104.

## Próximo passo

Fase 1 (spec, seção 9), no calendário do lançamento: mockup e apresentação do
Guia até o checkpoint de 23/08 (D0 em 31/08), carrossel do Lote Fundador (02/09),
thumbnail de YouTube.

## Situações em aberto

- **Look de cor.** O Daniel vai exportar um HALD revelado com o preset dele. O
  identity está em `presets-luts/hald-identity-nivel8.png` e os frames de partida
  (só LUT) em `presets-luts/so-lut-clog3-rec709/`. Enquanto não vem, frame de
  vídeo casa estatisticamente com as fotos exportadas do destino.
- **Camera Raw por COM, não implementado.** Photoshop 2024 responde por COM
  (27.9.1) e o ACR lê `.xmp` como sidecar do RAW — única rota fiel ao preset do
  Lightroom. `darktable-cli` e `rawtherapee-cli` não leem preset do Adobe.
- Plano do Daniel para o conjunto de imagens do Guia.
- ComfyUI: endpoint a levantar na primeira peça que precisar. Para grade de cor
  não serve; o caso de uso é upscale, limpeza e imagery de apoio.
- Fontes do projeto remoto no claude.ai/design caem em fallback. Projeto:
  `019e1dc1-2de2-7941-b801-4382556049d6`.
- Screenshot do interior do Guia depende de sessão logada do Daniel.
