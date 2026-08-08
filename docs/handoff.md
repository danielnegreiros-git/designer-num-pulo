# Handoff — designer-num-pulo

Atualizado: 2026-08-08.

## Estado

Fase 0 concluída, primeira demanda de outro worker entregue, duas calibrações
da skill global feitas (carrossel, thumbnail de YouTube).

- `2026-08-07-carrossel-madri-ou-barcelona` (demanda 1103, publica 09/08) e
  `2026-08-08-thumbnail-barcelona-piloto` (primeiro thumbnail do worker, padrão
  extraído dos 3 últimos vídeos publicados) — **aguardando aprovação do Daniel**.
  Thumbnail só vira template na segunda ocorrência ou por decisão dele.
- `2026-08-07-mockup-guia-landing` e `2026-08-07-cena-guia-landing` — aprovadas,
  não publicadas. O Daniel planeja as demais imagens do Guia e troca de uma vez.
- Templates: `mockup-tela-em-cena/`, `carrossel-foto-sangrada/`.
- `num-pulo-brand-guidelines` calibrada duas vezes: carrossel 1:1→3:4 com escala
  real; seção nova de thumbnail YouTube (10.3/13.3) + dourado `#F1AC22` pontual.

CLAUDE.md tem o que o worker sabe fazer e como decide — ordem de fonte de
imagem, tratamento por fonte, gates de diagramação. Nada disso é memória de sessão.

## Índices de foto gerados

`Barcelona 2022` (68 fotos, 57 com landmark) e `Espanha Nomad 2025` (10). Regra:
topou com pasta `Fotografia` não indexada, indexa. Entregável declarado;
`edicao-num-pulo` avisado pela demanda 1104.

## Próximo passo

Fase 1 (spec, seção 9), no calendário do lançamento: mockup e apresentação do
Guia até o checkpoint de 23/08 (D0 em 31/08), carrossel do Lote Fundador (02/09).

## Situações em aberto

- **Look de cor, com o Daniel.** Vai revelar `presets-luts/hald-identity-nivel8.png`
  com o preset dele → `presets-luts/hald-numpulo.png` (passo a passo em
  `presets-luts/LEIA.md`). Ao aparecer, ligar no pipeline (`cor --lut`) no lugar
  do `--referencia` estatístico de hoje. Se não tiver feito, lembrar sem cobrar.
- **Camera Raw por COM, não implementado.** Photoshop 2024 responde por COM
  (27.9.1), ACR lê `.xmp` como sidecar — única rota fiel ao preset do Lightroom.
- Plano do Daniel para o conjunto de imagens do Guia.
- ComfyUI: endpoint a levantar na primeira peça que precisar (upscale, limpeza,
  imagery de apoio — não serve para grade de cor).
- Fontes do projeto remoto no claude.ai/design caem em fallback. Projeto:
  `019e1dc1-2de2-7941-b801-4382556049d6`.
- Screenshot do interior do Guia depende de sessão logada do Daniel.
