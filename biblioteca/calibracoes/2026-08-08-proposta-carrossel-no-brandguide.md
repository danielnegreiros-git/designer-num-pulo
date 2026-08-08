# Calibração — carrossel na `num-pulo-brand-guidelines`

**Data:** 2026-08-08
**Alcance:** skill global `num-pulo-brand-guidelines`, seções 2, 10.2, 13.2 e 13.3
**Estado:** **APLICADO.** Aprovado pelo Daniel em 2026-08-08 (*"pode editar, esse
é o padrão do carrossel"*). Changelog datado no topo da skill.

## O problema

O padrão real de carrossel do canal, que o Daniel mandou seguir
(`Y:\numpulo\Transferencia\Gramado\Carrossel\Carrossel Gramado`), diverge da
skill em três pontos. Hoje a skill descreve algo que o canal não usa, e quem a
seguir ao pé da letra entrega peça fora do padrão.

Medido sobre `Gramado_2.png` normalizado a 1080 de largura, com grade de
diagnóstico — não a olho.

| # | Seção | A skill diz | O canal usa |
|---|---|---|---|
| 1 | 10.2 | carrossel **1080×1080** | **1080×1440 (3:4)**, entregue em 2160×2880 |
| 2 | 13.3 | slide: título 36–48px, corpo 15–16px | título **96px**, corpo **30px** (em 1080 de largura) |
| 3 | 2 | itálico do Instrument Serif em **uma palavra** | trecho de duas ou três palavras, às vezes a linha inteira |

O ponto 2 é consequência do ponto 1 e do fato de a régua da seção 13.3 ter sido
escrita para o quadro de 1080×1080. Em 3:4 a mesma proporção pede tipo maior.

## O que eu recomendo

Calibrar a skill para o padrão real, nos três pontos. A alternativa — mudar o
canal para caber na skill — significaria refazer o formato que já funciona no
feed, sem ganho.

## O que foi editado

Em `C:/Users/Danie/.claude/skills/num-pulo-brand-guidelines/SKILL.md`:

- **Seção 2** — itálico do Instrument Serif passou de "uma palavra" para "trecho
  curto, de uma a três palavras".
- **Seção 10.2** — deixou de ser "1:1 Square". Virou 3:4 com a grade completa
  (margem 120, coluna 780, bloco rodapé 132, bloco topo 172, faixa do split 720),
  as três estruturas de slide com os tamanhos reais, o rótulo de contexto, a
  assinatura e duas regras de legibilidade que saíram de erro pago aqui: vinheta
  dimensionada por medição da foto (brilho **e** detalhe) e texto nunca sobre
  rosto.
- **Seção 13.2** — tabela do carrossel reescrita, com o split corrigido de
  "vertical" para **horizontal** (duas faixas de 720px), que é como o canal usa.
- **Seção 13.3** — linhas de cover e slide de carrossel com os valores reais.
- **Changelog datado** no topo da skill, com a tabela do que mudou e o link para
  este arquivo.

Alinhados no mesmo commit: `templates/carrossel-foto-sangrada/manifest.md` (não
registra mais a divergência como aberta) e `docs/handoff.md`.

## Evidência

- Peça: `biblioteca/pecas/2026/2026-08-07-carrossel-madri-ou-barcelona/`
- Referência do Daniel: `Y:\numpulo\Transferencia\Gramado\Carrossel\Carrossel Gramado`
- Template: `templates/carrossel-foto-sangrada/manifest.md`
