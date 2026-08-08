# presets-luts

## PENDENTE — Daniel: exportar o HALD com o seu preset

Enquanto isso não vem, frame de vídeo e RAW são tratados por **aproximação
estatística** (o worker casa a cor com as fotos já exportadas do destino).
Funciona, mas é aproximação. Com o HALD, passa a ser o seu look exato.

**São 5 minutos no Lightroom. Uma vez só, vale para sempre.**

### Passo a passo

1. Importar `hald-identity-nivel8.png` no Lightroom Classic.
   Ele parece uma cartela de cores quadriculada. É isso mesmo.
2. **Zerar qualquer ajuste automático** que o Lightroom aplique na importação
   (Auto Tone, perfil automático). A imagem tem que entrar exatamente como está.
3. Aplicar o preset `Padrao Fotos Versao Nova Suave` (ou o que você quiser que
   vire o padrão do canal).
4. Exportar como **PNG**, e aqui estão as três coisas que estragam tudo:
   - **não redimensionar** — tem que sair 512 × 512;
   - **sem sharpen de saída** (nenhum, nem "baixo");
   - espaço de cor **sRGB**.
5. Salvar nesta pasta com o nome `hald-numpulo.png`.

Pronto. Na próxima sessão é só dizer "o HALD está lá" que eu ligo no pipeline.

### Se der errado

Se o Lightroom insistir em mexer no arquivo, tem um plano B: pegue um dos frames
de `so-lut-clog3-rec709/`, trate do seu jeito, exporte e deixe aqui ao lado do
original. Eu comparo os dois e derivo o ajuste.

### O que o HALD não carrega

Só tom e cor. Textura, Clarity, Dehaze, sharpen e redução de ruído são efeitos
espaciais (dependem do pixel vizinho) e não cabem numa tabela de cor. O worker
aplica sharpen próprio, calibrado contra as suas fotos exportadas.

---

## O que já está aqui

### `hald-identity-nivel8.png`

A cartela a ser revelada, acima. 512 × 512, 64 passos por canal.
Gerada por `node tools/render.mjs hald --out <arquivo.png>`.

### `so-lut-clog3-rec709/`

Cinco frames do bruto da Espanha com **só o LUT Canon Log3 → Rec709 aplicado**,
nada mais: sem exposição automática, sem curva, sem saturação, sem sharpen. PNG
3840 × 2160, sem perda. É exatamente o ponto de partida do worker, antes de
qualquer ajuste — se você quiser montar um preset novo pensando no fluxo daqui,
monte em cima destes.

| Arquivo | Cena | Por que está aqui |
|---|---|---|
| `gran-via-fim-de-tarde.png` | Gran Vía, Edifício Metrópolis | luz baixa, céu com gradiente amplo |
| `sala-equis-interior.png` | Sala Equis | interior, luz mista, neon |
| `calcada-dia.png` | calçada arborizada | dia aberto, sombra de árvore |
| `sagrada-familia-sol.png` | Sagrada Família | sol forte, céu azul, alto contraste |
| `mesa-restaurante.png` | mesa de restaurante | tons quentes, pele, comida |

Comando que gerou:

    node tools/render.mjs cor <frame.png> --out <saida.png> \
      --lut assets/luts/canon-log3-rec709.cube --exposicao off

### `Padrao Fotos Versao Nova Suave.xmp`

Seu preset do Lightroom, feito para CR3 da R6. Guardado como referência do look.

Tentei reimplementar os parâmetros dele fora do Adobe e **não funciona**: sobre
um CR3 revelado o resultado sai esverdeado e posterizado, porque Highlights,
Shadows e HSL do Camera Raw são algoritmos proprietários. Por isso o caminho é o
HALD, que captura o resultado em vez de tentar refazer a conta.
