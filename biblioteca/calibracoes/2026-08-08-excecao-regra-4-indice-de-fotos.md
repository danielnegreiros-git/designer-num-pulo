# Exceção à regra 4 — índice de fotos no acervo

**Data:** 2026-08-08
**Decidido por:** Daniel, nesta sessão
**Alcance:** regra inviolável 4 da spec (`acervo somente leitura`)
**Estado:** aplicado

## O que muda

`render.mjs indexar-fotos <destino>` passa a **escrever** em
`<destino>/_index/fotos/`:

    index.csv
    index.json
    .descricoes/     cache interno da descrição por LLM

E em nenhum outro lugar. Nenhuma imagem do acervo é criada, movida, renomeada
ou alterada. A pasta `_index` já existe nos destinos indexados — é onde o
`edicao-num-pulo` mantém o índice de vídeo.

## Por que o Daniel abriu

A regra 4 existe para proteger o acervo, e continua valendo para isso. O que ela
estava impedindo, sem necessidade, era o worker deixar registrado o que já sabia.

O custo apareceu na primeira peça de carrossel: quatro slides usaram frame de
vídeo enquanto havia 63 fotos tratadas de Barcelona paradas em
`H:\Destinos\Barcelona 2022\Fotografia`, numa viagem diferente da que a peça
tratava. A varredura foi manual, valeu só para aquela demanda, e o resultado foi
reprovado pelo Daniel.

Pedido dele, literal: *"o que eu preciso também é que ao enxergar a pasta
fotografia você gerar um registro índex delas também para consultas futuras e
não só da demanda em questão. Usando o mesmo padrão e a mesma pasta índex do
destino mas separado para ficar claro que é foto e não vídeo."*

## Salvaguardas

- A escrita é restrita a `_index/fotos/`. Qualquer outro caminho continua
  proibido pela regra 4.
- O `edicao-num-pulo`, dono de `_index`, foi avisado pela **demanda 1104**, com a
  saída explícita de mudar o local se conflitar com algo que ele mantenha.
- O índice foi declarado como entregável no registro do barramento
  (`index-de-fotos-do-acervo`), então quem depender dele aparece no `impacto`.
- O índice é **reconstruível**: apagar a pasta e rodar de novo devolve o mesmo
  conteúdo, fora as descrições, que vêm de LLM e são cacheadas por hash.

## Onde está documentado

- Spec, regra 4 — nota de exceção
- `CLAUDE.md`, regra inviolável 4 e seção "Acervo de imagem"
- `tools/render.mjs`, comentário do subcomando `indexar-fotos`

## Já rodado em

| Destino | Fotos | Com landmark |
|---|---|---|
| `H:\Destinos\Barcelona 2022` | 68 | 57 |
| `H:\Destinos\Espanha Nomad 2025` | 10 | — |
