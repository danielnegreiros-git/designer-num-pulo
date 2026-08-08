# Brief — cena notebook + celular para a landing (/lista)

- slug: 2026-08-07-cena-guia-landing
- formato: mockup-produto (2ª ocorrência do formato — candidata a promover template)
- demandante: Daniel (pedido direto)
- status: rascunho

## Pedido

Substituir o vídeo "feio e sem impacto" da seção do roteiro em guia.numpulo.com.br/lista
por uma imagem de mockup: notebook com o roteiro sendo montado + celular ao lado com
uma interna de item do guia, em cena natural (luz ambiente, vaso, planta), **sem
bordas** — a imagem se dissolve no fundo da página. Referências do Daniel: carrossel
estilo Robinhood (creme, sombra de folhas). Corte na altura permitido; laterais nunca.

## Sistema visual

Design system do Guia app. Fundo/dissolve no token da landing `--bg: #F4EEE0`
(conferido em `guia-num-pulo-app/src/app/globals.css:158`). Bordas laterais e topo
esfumadas em máscara CSS até o creme puro (pixels das bordas = `#F4EEE0` exato,
verificado por amostragem); base inferior é a mesa (corte de altura permitido).

## Assets

- `cena-base-ia.png` — base gerada no ChatGPT do Daniel (2026-08-07 21:45): notebook +
  celular em pé, telas em branco, planta, sombra de folhas. Imagery de apoio (regra 3
  ok). A moldura pintada pela IA foi jogada para fora do quadro (base ampliada 6%).
- `tela-roteiro-desktop.png` — screenshot real do Daniel logado (Meu Roteiro,
  Milagres, 1363×832), de `biblioteca/prints/guia/`.
- `tela-patacho.jpg` — screenshot real da interna da Praia do Patacho
  (guia.numpulo.com.br, jul/2026, acervo MockupMobile).

## Render

    node tools/render.mjs render <peça>/fonte.html --out <scratch>/cena-4x.png --largura 1200 --altura 800 --escala 4
    node tools/render.mjs tratar <scratch>/cena-4x.png --out saida/cena-guia-landing-2400x1600.png --largura 2400

Supersampling obrigatório (regra 6 do CLAUDE.md): render direto em escala 2 deixa a
aresta do layer 3D serrilhada.

## Técnica

- Homografia (grade 1:1, regra 5 do CLAUDE.md) para as duas telas.
- Canto inferior direito do notebook oculto pelo celular: canto virtual extrapolado
  pelas retas das bordas; conteúdo do notebook clipado (`clip-path` calculado por
  homografia inversa) na linha do celular, que fica por cima.
- Borda esquerda da tela do notebook na base de IA é levemente curva (~10px):
  conteúdo cobre o casco com transbordo sobre o bezel preto (sidebar roxo esconde).
- `diagnostico-grade.html` = instrumento de medição.

## Saída

`saida/cena-guia-landing-2400x1600.png` (master) + `.webp` (120KB, entrega web).
Uso na landing: imagem sobre o fundo `--bg`, sem moldura; laterais já dissolvem;
altura pode ser cortada pelo container. A troca na seção da /lista é mudança no
repo do guia (worker `guia`).
