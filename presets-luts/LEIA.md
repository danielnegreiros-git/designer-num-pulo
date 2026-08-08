# presets-luts

## `so-lut-clog3-rec709/`

Cinco frames do bruto da Espanha com **só o LUT Canon Log3 → Rec709 aplicado**,
nada mais: sem exposição automática, sem curva, sem saturação, sem sharpen.
PNG 3840×2160, sem perda. É exatamente o ponto de partida que o worker usa
antes de qualquer ajuste.

Comando que gerou:

    node tools/render.mjs cor <frame.png> --out <saida.png> \
      --lut assets/luts/canon-log3-rec709.cube --exposicao off

| Arquivo | Cena | Por que está aqui |
|---|---|---|
| `gran-via-fim-de-tarde.png` | Gran Vía, Edifício Metrópolis | luz baixa, céu com gradiente amplo |
| `sala-equis-interior.png` | Sala Equis | interior, luz mista, neon |
| `calcada-dia.png` | calçada arborizada | dia aberto, sombra de árvore |
| `sagrada-familia-sol.png` | Sagrada Família | sol forte, céu azul, alto contraste |
| `mesa-restaurante.png` | mesa de restaurante | tons quentes, pele, comida |

## `Padrao Fotos Versao Nova Suave.xmp`

Preset do Lightroom do Daniel, feito para CR3 da R6. Aplicado sobre o Rec709 já
convertido pelo LUT, não deu certo (lava a imagem e o Hue Yellow +36 puxa o
horizonte alaranjado para verde-oliva). Fica guardado como referência do look.

## `hald-identity-nivel8.png`

HALD CLUT identity, 512×512 / 64 passos por canal. Caminho para trazer um look
do Lightroom para cá como tabela de cor:

1. importar no Lightroom **sem nenhum ajuste automático**;
2. aplicar o preset;
3. exportar PNG no tamanho original, sem redimensionar, sem sharpen de saída, sRGB;
4. `node tools/render.mjs cor <foto> --out X --lut <hald-revelado.png>`

Não transporta o que é espacial (Texture, Clarity, Dehaze, sharpen, redução de
ruído) — só tom e cor.
