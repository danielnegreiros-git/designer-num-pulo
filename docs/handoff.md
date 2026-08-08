# Handoff — designer-num-pulo

Atualizado: 2026-08-08.

## Estado

Fase 0 concluída e primeira demanda de outro worker entregue.

Peças em `biblioteca/pecas/2026/`:

- `2026-08-07-mockup-guia-landing` e `2026-08-07-cena-guia-landing` — aprovadas pelo
  Daniel, não publicadas. Ele vai planejar as demais imagens do Guia e trocar tudo de
  uma vez. Sem demanda aberta para o `guia`.
- `2026-08-07-carrossel-madri-ou-barcelona` — primeiro carrossel, 10 slides, demanda
  1103 do `socialmedia`, publica 09/08. Duas rodadas de calibração do Daniel já
  aplicadas. Entregue em `saida/*.jpg`, aguardando aprovação final.

Templates: `mockup-tela-em-cena/` e **`carrossel-foto-sangrada/`** (este promovido na
primeira ocorrência, por decisão do Daniel, e declarado no registro do barramento).

## Aprendido e mecanizado

- Tela em aparelho: `render.mjs medir-tela` e `contorno`, `assets/composicao.js` com
  inset anti-serrilhado, raio do vidro e oclusão, render supersampled.
- Carrossel: padrão do Gramado medido por grade, virou template + CLAUDE.md.
- **Cor de frame de bruto: `render.mjs cor`.** C-Log3 → LUT da câmera → casamento com
  as fotos exportadas do destino → exposição → curva S → saturação por alvo → sharpen.
- **Posicionamento de texto: `render.mjs analisar`.** Âncora e scrim por medição, com
  scrim calculado por brilho e por detalhe.
- **`render.mjs hald`**: ponte para trazer look do Lightroom como tabela de cor.

## Próximo passo

Fase 1 (spec, seção 9), com o calendário do lançamento: mockup/apresentação do Guia
até o checkpoint de 23/08 (D0 em 31/08), carrossel do Lote Fundador (02/09),
thumbnail de YouTube, e a primeira calibração da `num-pulo-brand-guidelines`.

## Situações em aberto

- **Calibração da skill, pendente de decisão do Daniel.** O padrão Gramado diverge da
  `num-pulo-brand-guidelines` em três pontos: formato de carrossel (3:4 contra o
  1080×1080 da seção 10.2), escala tipográfica (título 96px / corpo 30px contra
  36–48 / 15–16 da 13.3) e itálico do Instrument Serif em trecho, não em uma palavra
  só (seção 2). Detalhe no `brief.md` da peça de carrossel. A skill não foi tocada.
- **Look de cor, pendente do Daniel.** Se ele tiver preset de Lightroom que define o
  look do canal, o caminho está pronto: `render.mjs hald --out identity.png`, ele
  revela com o preset, e `cor --lut <revelado.png>` passa a ser o padrão no lugar do
  casamento estatístico.
- Plano do Daniel para o conjunto de imagens do Guia (a troca na /lista sai de uma
  vez, via demanda para o `guia`).
- ComfyUI: endpoint e invocação, a levantar na primeira peça que precisar — para
  grade de cor não serve; o caso de uso é upscale, limpeza e imagery de apoio.
- Fontes do projeto remoto no claude.ai/design caem em fallback. Projeto:
  `019e1dc1-2de2-7941-b801-4382556049d6`.
- Acesso ao interior do Guia para screenshot depende de sessão logada do Daniel no
  Chromium do Playwright (trava de pré-lançamento).
