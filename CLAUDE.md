# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

**Primeira ação de qualquer sessão: ler [docs/handoff.md](docs/handoff.md)** — fio da meada, sobrescrevível, teto de ~40 linhas. Histórico fica no git. Este CLAUDE.md é vivo: convenção nova ou armadilha paga entra na mesma sessão em que aparecer, como regra atual, sem a história (a história é do `git log`).

## O que é

Worker de design estático do Num Pulo (@numpulo — Daniel Negreiros e Paula Albino). Transforma demanda de imagem em peça pronta no brandguide, de forma repetível: carrossel diagramado, thumbnail de YouTube, story, mockup e imagem de apresentação de produto, peça de landing. Atende os demais workers (demanda via barramento) e o Daniel (pedido direto). Spec: [docs/superpowers/specs/2026-08-07-designer-worker-design.md](docs/superpowers/specs/2026-08-07-designer-worker-design.md). Padrão de repo herdado de `C:/Dev/socialmedia-num-pulo`.

Fronteiras: vídeo e motion são do `animation` (inclusive lettering de Reels); texto e roteiro são do `socialmedia` — este worker diagrama o que os outros escrevem; UI do produto é do `guia`. Publicar é sempre ação humana.

## Regras invioláveis

Aprovadas pelo Daniel em 2026-08-07 (spec, seção 4).

1. **Nunca usar a API paga da Anthropic.** Todo LLM via `claude -p` (assinatura Max).
2. **Nada é publicado automaticamente.** Entrega termina em arquivo aprovado; quem usa é o demandante ou o Daniel.
3. **IA nunca inventa nem exagera paisagem de destino.** Foto de destino é sempre real, do acervo. IA serve para melhorar (upscale, limpeza, fundo) e imagery de apoio (mockup, background abstrato).
4. **Acervo de fotos é somente leitura.** Nenhuma escrita em `H:`, `Y:` ou `D:`.
5. **Credencial fora do git** (`.env` gitignored).
6. **A skill global `num-pulo-brand-guidelines` só muda com rastro**: changelog datado na skill + registro em `biblioteca/calibracoes/`, ou decisão direta do Daniel com o mesmo rastro. Este worker é o curador dela.

## Motor e ferramenta

Peça nasce como **HTML estático + CSS** com os tokens de `design-system/tokens.css` e as fontes locais de `assets/fonts.css` (sem CDN — render determinístico e offline). React fora do pipeline; handoff em React é adaptado para HTML antes do render. Tailwind permitido só com cópia local.

Única ferramenta: `tools/render.mjs` (decisão "uma ferramenta, não um projeto" — capacidade nova vira subcomando; dependência nova exige decisão do Daniel).

    node tools/render.mjs render <arquivo.html> --out <saida.png> [--largura 1080] [--altura 1080] [--escala 1] [--pagina-inteira]
    node tools/render.mjs tratar <entrada> --out <saida> [--largura N] [--altura N] [--qualidade 80]
    node tools/render.mjs recortar <entrada> --out <saida> --x N --y N --largura N --altura N
    node tools/render.mjs info <arquivo>

Saída de `info` é JSON (metadata do Sharp). Códigos de saída: `0` ok, `2` erro de uso (conserte a chamada), `1` falha de execução. Formato de `tratar` sai da extensão de `--out` (png/jpg/webp).

## Sistema de qualidade (obrigação, não sugestão)

1. **Skills por momento**: `impeccable` antes do render de toda peça; `design-taste-frontend`/`frontend-design` em peça tipo landing/apresentação; `dataviz` em qualquer gráfico.
2. **Gate do brandguide**: checklist da seção 9 de `C:/Users/Danie/.claude/skills/num-pulo-brand-guidelines/SKILL.md` antes de toda entrega.
3. **Auto-inspeção**: ler o PNG renderizado (tool Read) e auditar contra o brief antes de mostrar ao Daniel.
4. **Inspeção de junção é por recorte 1:1 do contorno COMPLETO — 8 zonas por tela
   (4 cantos + 4 meios de borda), sempre, sem amostragem.** O Read do quadro inteiro
   não vê vazamento de 10-30px, e validar só algumas zonas falhou três vezes em
   2026-08-07: o defeito estava sempre na zona não checada, e quem apontou foi o
   Daniel. Recortar com `render.mjs recortar`, **ampliar 3× com `tratar`**,
   inspecionar as 8 zonas de CADA tela composta antes de entregar. Checklist, não
   julgamento de quais zonas "parecem arriscadas".
5. **Coordenada em foto se mede com instrumento, nunca a olho.** Fronteira de alto
   contraste (tela branca × bezel preto): **varredura programática de pixels** com
   Sharp (`node -e`, raw buffer, limiar de brilho por linha/coluna) — é o método
   mais preciso e o único que pega borda curva de imagem de IA; exemplo real no
   `fonte.html` da peça `2026-08-07-cena-guia-landing`. Fronteira sem contraste
   confiável: grade renderizada. **Varrer de dentro da tela para fora, procurando o
   escuro da moldura** — varrer de fora para dentro procurando "primeiro claro"
   trava em qualquer área clara vizinha (parede, outra tela atrás do device), erro
   pago em 2026-08-07. A olho, mesmo
   em recorte 1:1, o erro passa de 20px e muda até o sinal da inclinação (pago duas
   vezes em 2026-08-07, na mesma peça). Método que funciona: HTML de diagnóstico com
   a imagem 1:1 + grade de 16px (maior a cada 80px) por cima — modelo em
   `biblioteca/pecas/2026/2026-08-07-mockup-guia-landing/diagnostico-grade.html` —,
   recortes ampliados 3×, contagem de células. Para homografia (tela em device):
   medir as 4 bordas em 2 alturas cada, checar consistência das inclinações
   (largura deve crescer na direção mais próxima da câmera) e validar o resultado
   com recorte 3× das duas laterais em duas alturas — borda do conteúdo paralela ao
   bezel, folga constante.

## Dois sistemas visuais — roteamento

- **Default**: skill global `num-pulo-brand-guidelines` (Indigo `#2A0082`, Anton/Instrument Serif/Poppins) — conteúdo, social, marketing, mídia kit, produto editorial.
- **Exceção**: design system do Guia app (`C:\Dev\Design System\Num Pulo Design System`; papel-creme, roxo `#4A12E0`) — só quando a demanda pedir explicitamente peça no visual do app.

Nunca misturar os dois na mesma peça.

## Acervo de fotos

`H:\Destinos`, `Y:\numpulo\Destinos`, legado em `D:\Projeto Num Pulo\Cidades` — e pode procurar em qualquer lugar. Dentro da pasta do destino normalmente existe `fotografia`; priorizar fotos exportadas. Somente leitura. Sem índice próprio (decisão do Daniel se a busca virar gargalo).

## Convenções não óbvias

- **Slug**: `YYYY-MM-DD-<formato>-<tema>`, minúsculas com hífen. Data = produção da peça.
- **Uma pasta por peça** em `biblioteca/pecas/<ano>/<slug>/`: `brief.md` (pedido, demandante, fontes de foto, `status: rascunho|aprovada|descartada`), fonte HTML/dados, `saida/*.png`.
- **Template nasce da segunda ocorrência** de um formato, nunca de antecipação. `templates/<formato>/`: `template.html` + `manifest.md` (campos variáveis, dimensões, exemplo, peça de origem).
- **Design system no claude.ai/design**: `design-system/` é a fonte; sync incremental via ferramenta `DesignSync` (projeto registrado em docs/handoff.md). Preview novo leva `<!-- @dsCard group="..." -->` na primeira linha.
- **Caminho de skill sempre absoluto**: `C:/Users/Danie/.claude/skills/<skill>/SKILL.md`.
- **Commit em português**, trailer `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`, direto na `main`, com push (remoto GitHub).

## Comunicação entre sistemas

Este repo participa do barramento do Gerente Num Pulo (`C:\Dev\gerente-num-pulo`, schema `barramento`). Identidade: `designer` (role `np_designer`), credencial em `BARRAMENTO_DB_URL` no `.env` (gitignored).

Regra de bolso:
- Só **ler número** de outro sistema → view-contrato com `np_leitor`, sem barramento.
- Preciso que **código de outro worker mude** → demanda:
  `node C:\Dev\gerente-num-pulo\dist\cli.js demanda abrir --para <worker> --titulo "..." --corpo "..."`. A resposta é um commit.
- Consultar quem faz o quê: `node C:\Dev\gerente-num-pulo\dist\cli.js registro`.
- Avaliar quem quebra se um entregável mudar: `node C:\Dev\gerente-num-pulo\dist\cli.js impacto <entregavel>`.

Demandas destinadas a este worker aparecem no início da sessão (hook `SessionStart`). Fechar: `demanda fechar <id> --status concluida --resposta "..."` — e depois de fechar, ligar o vigia (`demanda vigiar`) em segundo plano, sem esperar o Daniel pedir. Template consumido por outro worker vira `entregavel declarar` na mesma sessão do commit.

## Comunicação

O Daniel pede respostas diretas e operacionais, em português, sem linguagem motivacional e sem parágrafo de resumo no fim. Erros corrigidos sem suavizar; sem informação, dizer "não sei".
