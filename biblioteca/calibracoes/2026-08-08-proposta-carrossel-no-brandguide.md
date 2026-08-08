# Proposta de calibração — carrossel na `num-pulo-brand-guidelines`

**Data:** 2026-08-08
**Alcance:** skill global `num-pulo-brand-guidelines`, seções 2, 10.2 e 13.3
**Estado:** **PENDENTE — a skill não foi tocada.** Depende de decisão do Daniel.

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

## Se o Daniel aprovar

1. Editar as seções 2, 10.2 e 13.3 de
   `C:/Users/Danie/.claude/skills/num-pulo-brand-guidelines/SKILL.md`.
2. Changelog datado dentro da skill (exigência da regra 6).
3. Marcar este arquivo como `aplicado` e anotar o que foi editado.
4. Alinhar `templates/carrossel-foto-sangrada/manifest.md`, que hoje registra a
   divergência como aberta.

## Evidência

- Peça: `biblioteca/pecas/2026/2026-08-07-carrossel-madri-ou-barcelona/`
- Referência do Daniel: `Y:\numpulo\Transferencia\Gramado\Carrossel\Carrossel Gramado`
- Template: `templates/carrossel-foto-sangrada/manifest.md`
