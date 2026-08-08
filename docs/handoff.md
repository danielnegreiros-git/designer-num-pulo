# Handoff — designer-num-pulo

Atualizado: 2026-08-07.

## Estado

Fase 0 concluída. Duas peças de teste entregues e aprovadas pelo Daniel
(`biblioteca/pecas/2026/`): `2026-08-07-mockup-guia-landing` (celular na mão) e
`2026-08-07-cena-guia-landing` (notebook + celular em cena, dissolve no creme da
landing). Nenhuma está publicada: o Daniel vai planejar as demais imagens do Guia
e trocar tudo de uma vez. Sem demanda aberta para o `guia`.

Primeiro formato promovido a template: `templates/mockup-tela-em-cena/`.

## Aprendido e mecanizado (07/08)

Cinco rodadas de retrabalho na primeira peça de tela-em-aparelho, todas pegas pelo
Daniel. As lições estão em código, não só em prosa — quem repetir o gênero segue
`templates/mockup-tela-em-cena/manifest.md` e não reencontra os erros:

- `render.mjs medir-tela` mede o quad da tela (varredura de dentro para fora).
- `render.mjs contorno` gera as 8 zonas de validação — checklist, não amostragem.
- `assets/composicao.js` embute inset anti-serrilhado, raio do vidro e oclusão.
- Render de peça com homografia é supersampled (`--escala 4` → `tratar`).

## Próximo passo

Fase 1 (spec, seção 9), com o calendário do lançamento: mockup/apresentação do
Guia até o checkpoint de 23/08 (D0 em 31/08), carrossel do Lote Fundador (02/09),
thumbnail de YouTube, e a primeira calibração da `num-pulo-brand-guidelines`.

## Situações em aberto

- Plano do Daniel para o conjunto de imagens do Guia (ele traz; a troca na /lista
  sai de uma vez, via demanda para o `guia`).
- ComfyUI: endpoint e invocação, a levantar na primeira peça que precisar.
- Fontes do projeto remoto no claude.ai/design caem em fallback (previews locais
  usam @fontsource). Projeto: `019e1dc1-2de2-7941-b801-4382556049d6`.
- Acesso ao interior do Guia para screenshot depende de sessão logada do Daniel
  no Chromium do Playwright (trava de pré-lançamento).
