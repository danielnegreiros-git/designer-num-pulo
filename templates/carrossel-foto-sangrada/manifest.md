# Carrossel de foto sangrada

Carrossel de Instagram com foto do acervo ocupando o quadro inteiro e tipografia
branca por cima. Formato editorial padrão do canal para conteúdo de destino.

**Peça de origem:** `biblioteca/pecas/2026/2026-08-07-carrossel-madri-ou-barcelona/`
(Madri ou Barcelona, 10 slides, demanda 1103 do `socialmedia`).
**Padrão de referência do Daniel:** `Y:\numpulo\Transferencia\Gramado\Carrossel\Carrossel Gramado`.
Promovido a template por decisão dele em 2026-08-08, na primeira ocorrência.

## Dimensões

| O quê | Valor |
|---|---|
| Slide | 1080 × 1440 (3:4), entregue em 2160 × 2880 |
| Margem lateral | 120px |
| Coluna de texto | 780px |
| Bloco no rodapé | `bottom: 132px` |
| Bloco no topo | `top: 172px` |
| Faixa do split | 720px cada |

**Não é 1:1.** A seção 10.2 da `num-pulo-brand-guidelines` especifica 1080×1080; o
padrão real do canal é 3:4. Divergência aberta para calibração da skill.

## Tipografia

| Papel | Fonte | Tamanho | Observação |
|---|---|---|---|
| Título | Instrument Serif | 96px / lh 1.02 | itálico em trecho curto, não na frase inteira |
| Corpo | Poppins 400 | 30px / lh 1.44 | `<strong>` em 600 para a frase de peso |
| Capa | Anton caixa-alta | 148px | só na capa; presença constante dilui |
| Marcador | Poppins 600 | 19px, `letter-spacing` .30em | opcional |
| CTA | Poppins 600 | 36px | com seta e emoji por lado |
| Assinatura | Poppins 400 | 24px | `@numpulo`, só no último slide |

Cor de texto: **branco puro, sempre**. Nenhuma cor de marca toca fotografia
(`num-pulo-brand-guidelines`, seção 12.2).

## Campos variáveis

`{{TEMA}}` `{{MARCADOR}}` `{{FOTO}}` `{{FOTO_A}}` `{{FOTO_B}}` `{{FOTO_CTA}}`
`{{LADO_A}}` `{{LADO_B}}` `{{TITULO}}` `{{ENFASE}}` `{{TEXTO}}` `{{TEXTO_FORTE}}`
`{{TEXTO_CAPA}}` `{{PERGUNTA_CTA}}` `{{OPCAO_A}}` `{{OPCAO_B}}` `{{EMOJI_A}}`
`{{EMOJI_B}}` `{{TEXTO_CTA}}` `{{SCRIM}}`

`{{SCRIM}}` **não se inventa**: sai de `render.mjs analisar <imagem>`, campo
`recomendacao.scrim` da faixa que vai receber o texto.

## Regras do formato

1. **Capa sem rosto** — perde CTR. Split quando o tema é comparação.
2. **Último slide é CTA** com rosto, opções e assinatura.
3. **Marcador de contexto** quando o carrossel alterna entre dois assuntos; o
   leitor precisa saber sempre onde está. Fora disso, dispensável.
4. **Âncora e scrim saem de `analisar`**, nunca do olho. Faixa com concentração
   de pele acima de 1,6× a média pede leitura da imagem antes de fixar a âncora.
5. **Foto do acervo passa por `render.mjs cor`** quando for frame de bruto.

## Montagem

Copiar `montar.ps1` e `preparar-imagens.ps1` da peça de origem e ajustar. O
fluxo é: `preparar-imagens.ps1` (acervo → `imagens/` + análise) → editar
`fonte.html` com os scrims medidos → `montar.ps1 -Escala 2`.

Um HTML com todos os slides empilhados, render de 1080×(1440·N), recorte por
`render.mjs recortar`. Um arquivo por slide multiplicaria o mesmo CSS por dez.

Entrega em **JPG q95**. Foto sangrada não tem área chapada: PNG pesa 6× e o
Instagram recomprime na subida.
