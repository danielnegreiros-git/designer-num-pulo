# mockup-tela-em-cena

Tela real de produto projetada no vidro de um aparelho que está numa cena
fotográfica. Aparelho e cena vêm de foto (real ou gerada); a tela é sempre
screenshot verdadeiro, projetado por homografia.

- **Família:** `templates/mockup-*`. Este cobre **aparelho em cena**. Outros tipos
  de mockup (impresso, vestuário, tela flutuante sem cena, embalagem) são
  templates irmãos, não variações deste.
- **Nasceu de:** `biblioteca/pecas/2026/2026-08-07-cena-guia-landing` (2ª ocorrência
  do formato; a 1ª foi `2026-08-07-mockup-guia-landing`). Promovido em 2026-08-07.
- **Peça de referência, com tudo preenchido:** o `fonte.html` da peça acima —
  duas telas, oclusão de uma pela outra, ilha da câmera e dissolve no fundo.

## Slots

| Slot | O que é |
|---|---|
| `[FUNDO]` | Cor do quadro. Onde a peça vai viver, se dissolve; senão branco |
| `[BASE]` | Imagem da cena com as telas em branco |
| `[BASE_X] [BASE_Y] [BASE_W] [BASE_H]` | Posição e tamanho da base no quadro (ampliar joga moldura pintada por IA para fora) |
| `[ESCALA_BASE]` | `[BASE_W]` ÷ largura original da base — entra no `--mapa` |
| `[FADE]` | Largura do esfumado das bordas que devem dissolver |
| `[TELA_x_W] [TELA_x_H]` | Tamanho local da tela: a resolução em que o screenshot fica nítido |
| `[SCREENSHOT_x]` | Screenshot real |
| `[COR_TELA]` | Cor de fundo da tela (cobre o vão de 1px do inset) |
| `[RAIO_x]` | Raio do vidro do aparelho |
| `[ILHA_*]` | Caixa da ilha/notch no quadro e sua origem na base |

## Procedimento

**1. Base.** Cena real do acervo, ou gerada (ChatGPT/ComfyUI) com as telas em
branco num tom claro uniforme. Regra 3 do CLAUDE.md: IA nunca fabrica paisagem de
destino — aqui ela desenha mesa, aparelho e luz, nunca o lugar.

**2. Medir cada tela** (nunca a olho — regra 5):

    node tools/render.mjs medir-tela <base> --regiao "x0,y0,x1,y1" --mapa "<escala>,<dx>,<dy>"

`--regiao` é uma caixa aproximada em volta da tela com o centro caindo dentro
dela; a varredura vai até 80px além (`--alcance`). Borda tapada por outro objeto
→ restrinja o trecho amostrado (`--esq/--dir "a0,a1"`, `--topo/--fundo "a0,a1"`),
senão a varredura acha a moldura do objeto da frente. Confira o campo `amostras`:
borda com poucas amostras é sinal de região errada.

**3. Compor** com `NP.tela(elemento, quad, { raio })` — inset anti-serrilhado e
raio do vidro vêm junto. Oclusão entre objetos: `NP.poligono`.

**4. Renderizar com supersampling** (regra 6 — `matrix3d` não recebe antialiasing):

    node tools/render.mjs render fonte.html --out <scratch>/peca-4x.png --largura 1200 --altura 800 --escala 4
    node tools/render.mjs tratar <scratch>/peca-4x.png --out saida/<nome>.png --largura 2400

**5. Validar o contorno completo de CADA tela** (regra 4 — checklist, não amostragem):

    node tools/render.mjs contorno saida/<nome>.png --quad "<quad medido>" --escala 2 --out <scratch>/zonas-a

Abrir as 8 imagens. O que reprova: conteúdo por cima da moldura, vão entre
conteúdo e moldura, degraus na aresta, ilha coberta pelo conteúdo, texto fora de
paralelo com a moldura.

**6. Entregar** PNG master + webp (`tratar --qualidade 82`).

## Armadilhas que este template já resolve

| Sintoma | Causa |
|---|---|
| Tela sai do vidro / vão nas pontas | Cantos medidos a olho. Só `medir-tela` |
| Borda medida 6px para dentro | Varredura pegou a moldura do objeto que oclui. Restringir o trecho |
| Aresta serrilhada | `matrix3d` sem antialiasing. Supersampling + inset (automático em `NP.tela`) |
| Canto do conteúdo sobre a moldura | `raio` menor que o do vidro |
| Conteúdo sumindo longe da oclusão | Clip de altura cheia. O entalhe começa no topo do objeto que oclui |
| Ilha da câmera coberta | Conteúdo começando abaixo dela. O conteúdo cobre o vidro todo e a ilha é repintada por cima |
