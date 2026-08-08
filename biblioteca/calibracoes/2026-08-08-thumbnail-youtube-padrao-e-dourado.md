# Calibração — thumbnail de YouTube na `num-pulo-brand-guidelines`

**Data:** 2026-08-08
**Alcance:** skill global `num-pulo-brand-guidelines`, seções 1, 10.3, 13.3 (novas) + checklist (seção 9)
**Estado:** **APLICADO.** Aprovado pelo Daniel em 2026-08-08 (respostas diretas às
perguntas sobre cor do subtítulo e texto do piloto). Changelog datado no topo da skill.

## O problema

Não existia, até hoje, um padrão registrado para thumbnail de YouTube — as peças
do canal são feitas fora deste pipeline, sem template nem registro de medidas.
Primeiro pedido do gênero para este worker: definir o padrão a partir do que o
canal já publica e usar Barcelona como piloto.

## Medição

Puxados direto do YouTube (`@numpulo/videos`, ordenado por mais recentes), os 3
últimos vídeos publicados em 08/08: `"NORONHA custa mais que VIAJAR PRA FORA".
Vale o Pulo?`, `MADRI em 3 dias`, `SERRA DA CANASTRA e Capitólio: Roteiro de 7
Dias`. Thumbnails em `maxresdefault.jpg` (1280×720), medição por bounding box
de pixel (ImageMagick `-threshold` + `-trim`) e histograma de cor — não a olho.

| # | O que | Medido |
|---|---|---|
| 1 | Formato | 1280×720, sem logo/eyebrow/ghost number/badge, sem vinheta |
| 2 | Título (Madri, isolado) | Anton branco AllCaps, cap-height 390px = **54%** da altura |
| 3 | Título (Noronha, com subtítulo) | cap-height 158px = **22%** da altura |
| 4 | Subtítulo (Noronha) | cap-height 120px = **76%** do título, mesma fonte branca |
| 5 | Cor do subtítulo (Canastra) | `#F1AC22` (dourado/mostarda) — **fora das 6 cores da paleta** |
| 6 | Contraste do texto | Nenhuma das três usa vinheta — texto cai sobre zona já escura da própria foto |

O ponto 5 é o achado que forçou decisão: a skill não tinha essa cor. Perguntado
ao Daniel se o dourado deveria entrar como padrão ou ser substituído por cor já
existente (branco ou Portland Orange) — resposta: entra como cor nova, mas
**pontual**, reservada para tag informativa (o caso da Canastra é duração), não
para todo subtítulo. Para o piloto de Barcelona, confirmado: só título +
subtítulo branco, sem tag.

## O que eu recomendo

Registrar o padrão medido como seção nova (10.3, com espelho em 13.3), e a cor
dourada como sétima cor do sistema, com regra de uso restrita — do jeito que a
seção "Regras de Violet Mid" já restringe onde essa cor pode aparecer.

## O que foi editado

Em `C:/Users/Danie/.claude/skills/num-pulo-brand-guidelines/SKILL.md`:

- **Seção 1** — nova linha na paleta (Dourado `#F1AC22`) + bloco "Regras de
  Dourado" (uso restrito a tag informativa pontual em thumbnail).
- **Seção 10.3** (nova) — layout de thumbnail YouTube: formato, regra de
  "sem vinheta", escala tipográfica com as duas faixas (título isolado vs.
  título+subtítulo), alinhamento adaptável, tag dourada pontual, gate de rosto.
  As seções seguintes (antiga 10.3 "Produto Digital" e 13.3 "Hierarquia
  Tipográfica") foram renumeradas para 10.4 e 13.4.
- **Seção 13.3** (nova) — tabela de aplicação por contexto, no mesmo formato de
  13.1/13.2.
- **Seção 13.4** (Hierarquia Tipográfica, renumerada) — linha nova para
  Thumbnail YouTube.
- **Checklist (seção 9)** — item novo: dourado só em tag pontual, nunca
  subtítulo padrão nem massa.
- **Changelog datado** no topo da skill, com a tabela do que mudou e o link
  para este arquivo.

Alinhados no mesmo commit: `design-system/tokens.css` (token `--dourado`) e
`docs/handoff.md`.

## Ponto em aberto, não resolvido aqui

O piloto de Barcelona saiu com título em ~15% de cap-height (menor que os
22–54% medidos), porque a foto disponível no acervo (Park Güell, banco de
mosaico) tem menos espaço livre acima da cabeça da Paula do que as fotos das
três referências — que parecem enquadradas já pensando em thumbnail. Isso não
é uma regra nova da skill: é uma restrição da foto específica, contornada por
reduzir a escala em vez de forçar o texto sobre o rosto. Fica registrado para
quando houver fotos ou vídeo do próprio Barcelona: usar o teto de escala
(22%+) se o enquadramento permitir.

## Evidência

- Peça: `biblioteca/pecas/2026/2026-08-08-thumbnail-barcelona-piloto/`
- Referências: 3 últimos vídeos publicados em `youtube.com/@numpulo/videos`, 08/08
- Ainda não é template — nasce na segunda ocorrência ou por decisão direta do
  Daniel (mesma regra do carrossel), pendente da aprovação do piloto.
