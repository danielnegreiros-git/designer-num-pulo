# Worker DESIGNER — Fase 0 (fundação) — Plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deixar o worker designer operacional: CLAUDE.md, ferramenta de render HTML→PNG com tratamento de imagem, tokens do brandguide, fontes locais, logos e sync inicial no claude.ai/design.

**Architecture:** Workspace leve (sem build, sem framework de teste — verificação por execução direta da CLI). Uma única ferramenta, `tools/render.mjs` (Playwright + Sharp), com subcomandos. Tokens e previews em `design-system/`, sincronizados com o claude.ai/design via ferramenta `DesignSync`.

**Tech Stack:** Node.js (ESM), Playwright (chromium), Sharp, @fontsource (Anton, Instrument Serif, Poppins).

## Global Constraints

Copiadas do spec `docs/superpowers/specs/2026-08-07-designer-worker-design.md`:

- **Nunca usar a API paga da Anthropic.** Todo LLM via `claude -p`.
- **Nada é publicado automaticamente.** Entrega termina em arquivo aprovado.
- **IA nunca inventa nem exagera paisagem de destino.**
- **Acervo de fotos é somente leitura** (`H:\Destinos`, `Y:\numpulo\Destinos`, `D:\Projeto Num Pulo\Cidades`).
- **`.env` fora do git** (já no `.gitignore`).
- **Uma ferramenta, não um projeto**: capacidade nova é subcomando de `render.mjs`; dependência nova exige decisão do Daniel. Dependências aprovadas nesta fase: `playwright`, `sharp`, `@fontsource/*`.
- **Base de markup: HTML estático + CSS.** React fora do pipeline. Sem CDN no render (fontes locais via @fontsource).
- **Commits em português**, direto na `main`, push para `origin`, trailer `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.
- Português em documentação e nomes; código em inglês só onde a linguagem obriga.

**Estado já feito (não refazer):** git init + remote, spec commitado, `.gitignore` (`.env`, `node_modules/`), `.env` com `BARRAMENTO_DB_URL`, `.claude/settings.json` com hook SessionStart, identidade `np_designer` no barramento.

## Mapa de arquivos

| Arquivo | Responsabilidade |
|---|---|
| `CLAUDE.md` | Regras do worker: missão, fronteiras, regras invioláveis, qualidade, convenções |
| `docs/handoff.md` | Fio da meada, sobrescrevível, teto ~40 linhas |
| `package.json` | Deps: playwright, sharp, @fontsource/anton, @fontsource/instrument-serif, @fontsource/poppins |
| `assets/fonts.css` | @font-face apontando para `../node_modules/@fontsource/...` (render offline) |
| `assets/logo-{white,purple,black}.png` | Logos copiadas da skill num-pulo-brand-guidelines |
| `design-system/tokens.css` | Variáveis CSS do brandguide (cores, fontes, escala) |
| `design-system/previews/cores.html` | Preview de paleta (card do claude.ai/design e fixture de render) |
| `design-system/previews/tipografia.html` | Preview da escala tipográfica (idem) |
| `tools/render.mjs` | CLI: `render` (HTML→PNG), `tratar` (Sharp), `info` (metadata JSON) |

---

### Task 1: CLAUDE.md e handoff.md

**Files:**
- Create: `CLAUDE.md`
- Create: `docs/handoff.md`

**Interfaces:**
- Produces: convenções que todas as tasks seguintes citam (slug, pasta por peça, subcomandos da ferramenta).

- [ ] **Step 1: Escrever `CLAUDE.md`** com o conteúdo abaixo (íntegra):

````markdown
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
    node tools/render.mjs info <arquivo>

Saída de `info` é JSON (metadata do Sharp). Códigos de saída: `0` ok, `2` erro de uso (conserte a chamada), `1` falha de execução. Formato de `tratar` sai da extensão de `--out` (png/jpg/webp).

## Sistema de qualidade (obrigação, não sugestão)

1. **Skills por momento**: `impeccable` antes do render de toda peça; `design-taste-frontend`/`frontend-design` em peça tipo landing/apresentação; `dataviz` em qualquer gráfico.
2. **Gate do brandguide**: checklist da seção 9 de `C:/Users/Danie/.claude/skills/num-pulo-brand-guidelines/SKILL.md` antes de toda entrega.
3. **Auto-inspeção**: ler o PNG renderizado (tool Read) e auditar contra o brief antes de mostrar ao Daniel.

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
````

- [ ] **Step 2: Escrever `docs/handoff.md`**:

````markdown
# Handoff — designer-num-pulo

Atualizado: 2026-08-07.

## Estado

Fase 0 em implementação (plano: docs/superpowers/plans/2026-08-07-fase-0-fundacao.md).
Feito até aqui: spec aprovado, git + GitHub, identidade `designer` no barramento
(role, .env, hook SessionStart testados).

## Em andamento

- Fase 0: CLAUDE.md, tools/render.mjs, tokens, fontes locais, logos, sync claude.ai/design.

## Próximo passo

1. Terminar as tasks do plano da fase 0, em ordem.
2. Fase 1 (spec, seção 9): mockup do Guia (alvo 23/08), carrossel Lote Fundador,
   thumbnail de YouTube, primeira calibração da brand-guidelines.

## Situações em aberto

- Projeto do design system no claude.ai/design: criar no sync inicial e registrar o
  projectId aqui.
- ComfyUI: endpoint e invocação a levantar na primeira peça que precisar (fase 1).
````

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md docs/handoff.md
git commit -m "docs: CLAUDE.md e handoff do worker designer

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
git push
```

---

### Task 2: Dependências e fontes locais

**Files:**
- Create: `package.json` (via npm)
- Create: `assets/fonts.css`

**Interfaces:**
- Produces: `assets/fonts.css` com as famílias `Anton`, `Instrument Serif`, `Poppins` (300/400/600) para todo HTML de peça/preview importar com `<link rel="stylesheet" href="...fonts.css">` relativo.

- [ ] **Step 1: Inicializar npm e instalar dependências**

```bash
npm init -y
npm pkg set type=module private=true
npm install playwright sharp @fontsource/anton @fontsource/instrument-serif @fontsource/poppins
npx playwright install chromium
```

- [ ] **Step 2: Conferir que os woff2 existem** (os caminhos do fonts.css dependem disso):

```bash
ls node_modules/@fontsource/anton/files/anton-latin-400-normal.woff2 \
   node_modules/@fontsource/instrument-serif/files/instrument-serif-latin-400-normal.woff2 \
   node_modules/@fontsource/instrument-serif/files/instrument-serif-latin-400-italic.woff2 \
   node_modules/@fontsource/poppins/files/poppins-latin-300-normal.woff2 \
   node_modules/@fontsource/poppins/files/poppins-latin-400-normal.woff2 \
   node_modules/@fontsource/poppins/files/poppins-latin-600-normal.woff2
```

Expected: os seis arquivos listados. Se algum nome divergir, ajustar o fonts.css do passo 3 para o nome real.

- [ ] **Step 3: Escrever `assets/fonts.css`**:

```css
/* Fontes locais do brandguide — sem CDN, render offline e determinístico.
   Caminhos relativos a assets/: peça em subpasta ajusta o href do <link>, não este arquivo. */
@font-face {
  font-family: 'Anton';
  font-style: normal;
  font-weight: 400;
  src: url('../node_modules/@fontsource/anton/files/anton-latin-400-normal.woff2') format('woff2');
}
@font-face {
  font-family: 'Instrument Serif';
  font-style: normal;
  font-weight: 400;
  src: url('../node_modules/@fontsource/instrument-serif/files/instrument-serif-latin-400-normal.woff2') format('woff2');
}
@font-face {
  font-family: 'Instrument Serif';
  font-style: italic;
  font-weight: 400;
  src: url('../node_modules/@fontsource/instrument-serif/files/instrument-serif-latin-400-italic.woff2') format('woff2');
}
@font-face {
  font-family: 'Poppins';
  font-style: normal;
  font-weight: 300;
  src: url('../node_modules/@fontsource/poppins/files/poppins-latin-300-normal.woff2') format('woff2');
}
@font-face {
  font-family: 'Poppins';
  font-style: normal;
  font-weight: 400;
  src: url('../node_modules/@fontsource/poppins/files/poppins-latin-400-normal.woff2') format('woff2');
}
@font-face {
  font-family: 'Poppins';
  font-style: normal;
  font-weight: 600;
  src: url('../node_modules/@fontsource/poppins/files/poppins-latin-600-normal.woff2') format('woff2');
}
```

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json assets/fonts.css
git commit -m "deps: playwright, sharp e fontes locais do brandguide

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
git push
```

---

### Task 3: Tokens e previews do design system

**Files:**
- Create: `design-system/tokens.css`
- Create: `design-system/previews/cores.html`
- Create: `design-system/previews/tipografia.html`

**Interfaces:**
- Consumes: `assets/fonts.css` (Task 2).
- Produces: `tokens.css` com as variáveis `--branco`, `--lavanda`, `--indigo`, `--laranja`, `--lime`, `--violeta` e classes `.font-display`, `.font-editorial`, `.font-body`; dois HTML que a Task 4 renderiza e a Task 6 sincroniza.

- [ ] **Step 1: Escrever `design-system/tokens.css`** (valores literais da skill `num-pulo-brand-guidelines`, seções 1, 2 e 7):

```css
/* Tokens do brandguide Num Pulo — fonte: skill global num-pulo-brand-guidelines.
   Mudança aqui acompanha calibração da skill, nunca diverge dela. */
:root {
  --branco:  #FFFFFF; /* fundo padrão */
  --lavanda: #EBDAF8; /* fundo secundário */
  --indigo:  #2A0082; /* fundo de impacto e texto sobre claro */
  --laranja: #FF5931; /* acento pontual; proibido como fundo */
  --lime:    #E4FE00; /* acento máximo; proibido como fundo; texto só indigo/preto */
  --violeta: #9b40f5; /* tags/labels sobre fundo claro; proibido sobre indigo */
}

.font-display   { font-family: 'Anton', sans-serif; text-transform: uppercase; }
.font-editorial { font-family: 'Instrument Serif', serif; }
.font-body      { font-family: 'Poppins', sans-serif; }
```

- [ ] **Step 2: Escrever `design-system/previews/cores.html`**:

```html
<!-- @dsCard group="Cores" -->
<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<title>Num Pulo — Paleta</title>
<link rel="stylesheet" href="../../assets/fonts.css">
<link rel="stylesheet" href="../tokens.css">
<style>
  * { margin: 0; box-sizing: border-box; }
  body { width: 1080px; height: 1080px; background: var(--branco); font-family: 'Poppins', sans-serif; padding: 64px; }
  h1 { font-family: 'Instrument Serif', serif; font-size: 48px; color: var(--indigo); margin-bottom: 8px; }
  p.sub { font-size: 14px; color: var(--violeta); text-transform: uppercase; letter-spacing: 0.3em; font-weight: 600; margin-bottom: 40px; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
  .sw { border-radius: 12px; padding: 24px; height: 240px; display: flex; flex-direction: column; justify-content: flex-end; border: 1px solid rgba(42,0,130,0.15); }
  .sw b { font-size: 18px; font-weight: 600; }
  .sw span { font-size: 13px; font-weight: 300; }
</style>
</head>
<body>
  <h1>Paleta <em>Num Pulo</em></h1>
  <p class="sub">Fundos: branco, lavanda, indigo — nesta ordem</p>
  <div class="grid">
    <div class="sw" style="background: var(--branco); color: var(--indigo);"><b>Pure White</b><span>#FFFFFF · fundo padrão</span></div>
    <div class="sw" style="background: var(--lavanda); color: var(--indigo);"><b>Moon Lavender</b><span>#EBDAF8 · fundo secundário</span></div>
    <div class="sw" style="background: var(--indigo); color: var(--branco);"><b>Persian Indigo</b><span>#2A0082 · impacto pontual</span></div>
    <div class="sw" style="background: var(--branco); color: var(--indigo); border: 3px solid var(--laranja);"><b>Portland Orange</b><span>#FF5931 · só acento, nunca fundo</span></div>
    <div class="sw" style="background: var(--branco); color: var(--indigo); border: 3px solid var(--lime);"><b>Electric Lime</b><span>#E4FE00 · só acento, nunca fundo</span></div>
    <div class="sw" style="background: var(--branco); color: var(--violeta); border: 3px solid var(--violeta);"><b>Violet Mid</b><span>#9b40f5 · tags e labels sobre claro</span></div>
  </div>
</body>
</html>
```

- [ ] **Step 3: Escrever `design-system/previews/tipografia.html`**:

```html
<!-- @dsCard group="Tipografia" -->
<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<title>Num Pulo — Tipografia</title>
<link rel="stylesheet" href="../../assets/fonts.css">
<link rel="stylesheet" href="../tokens.css">
<style>
  * { margin: 0; box-sizing: border-box; }
  body { width: 1080px; height: 1080px; background: var(--branco); color: var(--indigo); padding: 64px; font-family: 'Poppins', sans-serif; }
  .linha { border-bottom: 1px solid rgba(42,0,130,0.12); padding: 22px 0; }
  .rotulo { font-size: 11px; font-weight: 600; letter-spacing: 0.3em; text-transform: uppercase; color: var(--laranja); margin-bottom: 6px; }
</style>
</head>
<body>
  <div class="linha"><div class="rotulo">Display XL — Anton 96, AllCaps</div>
    <div class="font-display" style="font-size: 96px; line-height: 1;">JALAPÃO</div></div>
  <div class="linha"><div class="rotulo">Display L — Instrument Serif 64, itálico em uma palavra</div>
    <div class="font-editorial" style="font-size: 64px;">viajar <em>leve</em> sempre</div></div>
  <div class="linha"><div class="rotulo">Heading 2 — Poppins 600 · 28</div>
    <div style="font-weight: 600; font-size: 28px;">Roteiro de 5 dias testado por nós</div></div>
  <div class="linha"><div class="rotulo">Body — Poppins 400 · 16</div>
    <div style="font-size: 16px; line-height: 1.65;">Fomos direto pros pontos que valem o pulo: fervedouros, dunas e cachoeiras, na ordem que economiza estrada.</div></div>
  <div class="linha"><div class="rotulo">Caption — Poppins 300 · 12 · Eyebrow 10/600 ls 4px</div>
    <div style="font-weight: 300; font-size: 12px;">Fervedouro do Ceiça | Mateiros TO</div></div>
</body>
</html>
```

- [ ] **Step 4: Commit**

```bash
git add design-system/
git commit -m "design-system: tokens do brandguide e previews de cores e tipografia

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
git push
```

---

### Task 4: `tools/render.mjs`

**Files:**
- Create: `tools/render.mjs`

**Interfaces:**
- Consumes: previews da Task 3 (fixtures de verificação).
- Produces: CLI `render <html> --out <png> [--largura N] [--altura N] [--escala N] [--pagina-inteira]`, `tratar <in> --out <out> [--largura N] [--altura N] [--qualidade N]`, `info <arquivo>` (JSON no stdout). Exit codes: 0 ok, 2 uso, 1 execução.

- [ ] **Step 1: Escrever `tools/render.mjs`**:

```js
#!/usr/bin/env node
// Única ferramenta do worker designer: HTML → PNG (Playwright) e imagem (Sharp).
// Capacidade nova vira subcomando aqui; dependência nova exige decisão do Daniel.
import { chromium } from 'playwright'
import sharp from 'sharp'
import { resolve, extname } from 'node:path'
import { pathToFileURL } from 'node:url'
import { existsSync, mkdirSync } from 'node:fs'
import { dirname } from 'node:path'

const USO = `uso:
  node tools/render.mjs render <arquivo.html> --out <saida.png> [--largura 1080] [--altura 1080] [--escala 1] [--pagina-inteira]
  node tools/render.mjs tratar <entrada> --out <saida.(png|jpg|webp)> [--largura N] [--altura N] [--qualidade 80]
  node tools/render.mjs info <arquivo>`

function sairUso(msg) {
  console.error(msg ? `${msg}\n${USO}` : USO)
  process.exit(2)
}

function lerArgs(argv) {
  const pos = []
  const op = {}
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--pagina-inteira') op.paginaInteira = true
    else if (a.startsWith('--')) {
      const v = argv[++i]
      if (v === undefined) sairUso(`falta valor para ${a}`)
      op[a.slice(2)] = v
    } else pos.push(a)
  }
  return { pos, op }
}

function inteiro(op, nome, padrao) {
  if (op[nome] === undefined) return padrao
  const n = Number(op[nome])
  if (!Number.isInteger(n) || n <= 0) sairUso(`--${nome} deve ser inteiro positivo`)
  return n
}

function garantirPasta(caminho) {
  mkdirSync(dirname(resolve(caminho)), { recursive: true })
}

async function render(pos, op) {
  const [arquivo] = pos
  if (!arquivo || !op.out) sairUso('render exige <arquivo.html> e --out')
  if (!existsSync(arquivo)) sairUso(`arquivo não existe: ${arquivo}`)
  const largura = inteiro(op, 'largura', 1080)
  const altura = inteiro(op, 'altura', 1080)
  const escala = inteiro(op, 'escala', 1)
  garantirPasta(op.out)
  const browser = await chromium.launch()
  try {
    const page = await browser.newPage({
      viewport: { width: largura, height: altura },
      deviceScaleFactor: escala,
    })
    await page.goto(pathToFileURL(resolve(arquivo)).href, { waitUntil: 'networkidle' })
    await page.evaluate(() => document.fonts.ready)
    await page.screenshot({ path: op.out, fullPage: Boolean(op.paginaInteira) })
  } finally {
    await browser.close()
  }
  console.log(JSON.stringify({ ok: true, saida: op.out, largura: largura * escala, altura: altura * escala }))
}

async function tratar(pos, op) {
  const [entrada] = pos
  if (!entrada || !op.out) sairUso('tratar exige <entrada> e --out')
  if (!existsSync(entrada)) sairUso(`arquivo não existe: ${entrada}`)
  const formato = extname(op.out).slice(1).toLowerCase()
  if (!['png', 'jpg', 'jpeg', 'webp'].includes(formato)) sairUso(`formato de saída não suportado: .${formato}`)
  const qualidade = inteiro(op, 'qualidade', 80)
  garantirPasta(op.out)
  let img = sharp(entrada)
  if (op.largura || op.altura) {
    img = img.resize(op.largura ? inteiro(op, 'largura') : null, op.altura ? inteiro(op, 'altura') : null, { fit: 'cover' })
  }
  if (formato === 'png') img = img.png()
  else if (formato === 'webp') img = img.webp({ quality: qualidade })
  else img = img.jpeg({ quality: qualidade })
  const r = await img.toFile(op.out)
  console.log(JSON.stringify({ ok: true, saida: op.out, largura: r.width, altura: r.height, bytes: r.size }))
}

async function info(pos) {
  const [arquivo] = pos
  if (!arquivo) sairUso('info exige <arquivo>')
  if (!existsSync(arquivo)) sairUso(`arquivo não existe: ${arquivo}`)
  const m = await sharp(arquivo).metadata()
  console.log(JSON.stringify({ formato: m.format, largura: m.width, altura: m.height, canais: m.channels }))
}

const [comando, ...resto] = process.argv.slice(2)
const { pos, op } = lerArgs(resto)
const comandos = { render, tratar, info }
if (!comandos[comando]) sairUso(comando ? `comando desconhecido: ${comando}` : undefined)
comandos[comando](pos, op).catch((e) => {
  console.error(e.message)
  process.exit(1)
})
```

- [ ] **Step 2: Verificar erro de uso (exit 2)**

```bash
node tools/render.mjs render; echo "exit: $?"
```

Expected: mensagem de uso no stderr e `exit: 2`.

- [ ] **Step 3: Renderizar os dois previews e conferir dimensões**

```bash
node tools/render.mjs render design-system/previews/cores.html --out /tmp-designer/cores.png
node tools/render.mjs info /tmp-designer/cores.png
node tools/render.mjs render design-system/previews/tipografia.html --out /tmp-designer/tipografia.png --largura 1080 --altura 1080
node tools/render.mjs info /tmp-designer/tipografia.png
```

(usar o scratchpad da sessão no lugar de `/tmp-designer`)
Expected: `{"formato":"png","largura":1080,"altura":1080,...}` nos dois.

- [ ] **Step 4: Inspecionar visualmente os PNG** (tool Read nos dois arquivos). Expected: fontes do brandguide carregadas (Anton em caixa alta no "JALAPÃO", serifada no título da paleta), cores corretas, nada cortado. **Se as fontes caírem em fallback (sans genérica), o caminho relativo de `assets/fonts.css` está errado — corrigir antes de seguir.**

- [ ] **Step 5: Verificar `tratar`**

```bash
node tools/render.mjs tratar <scratchpad>/cores.png --out <scratchpad>/cores.webp --largura 540 --qualidade 70
node tools/render.mjs info <scratchpad>/cores.webp
```

Expected: `{"formato":"webp","largura":540,...}`.

- [ ] **Step 6: Commit**

```bash
git add tools/render.mjs
git commit -m "tools: render.mjs — HTML para PNG via Playwright e tratamento via Sharp

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
git push
```

---

### Task 5: Logos no repo

**Files:**
- Create: `assets/logo-white.png`, `assets/logo-purple.png`, `assets/logo-black.png`

**Interfaces:**
- Consumes: originais em `C:/Users/Danie/.claude/skills/num-pulo-brand-guidelines/assets/`.
- Produces: logos locais que peças referenciam por caminho relativo. **Atenção (da própria skill): são JPEG com fundo preto apesar da extensão .png — usar `mix-blend-mode: screen` (white/purple) ou `multiply` (black); nunca distorcer, nunca recriar com fontes.**

- [ ] **Step 1: Copiar as três logos**

```bash
cp "/c/Users/Danie/.claude/skills/num-pulo-brand-guidelines/assets/logo-white.png" \
   "/c/Users/Danie/.claude/skills/num-pulo-brand-guidelines/assets/logo-purple.png" \
   "/c/Users/Danie/.claude/skills/num-pulo-brand-guidelines/assets/logo-black.png" assets/
```

Se os arquivos não existirem nesse caminho, procurar em `C:\Dev\Design System\Num Pulo Design System\assets\` (mesmos nomes) e copiar de lá; se também faltar, perguntar ao Daniel — não seguir sem as logos.

- [ ] **Step 2: Conferir metadata**

```bash
node tools/render.mjs info assets/logo-white.png
node tools/render.mjs info assets/logo-purple.png
node tools/render.mjs info assets/logo-black.png
```

Expected: três JSON válidos com largura/altura > 0 (formato pode vir `jpeg` — esperado).

- [ ] **Step 3: Commit**

```bash
git add assets/
git commit -m "assets: logos oficiais do wordmark Num Pulo

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
git push
```

---

### Task 6: Sync inicial no claude.ai/design

**Files:**
- Modify: `docs/handoff.md` (registrar projectId)

**Interfaces:**
- Consumes: `design-system/tokens.css` e previews (Task 3), ferramenta `DesignSync`.
- Produces: projeto "Num Pulo Design System" no claude.ai/design com os dois cards.

- [ ] **Step 1: Listar projetos** — `DesignSync {method: "list_projects"}`. Se já existir um projeto de design system chamado "Num Pulo Design System", usar o projectId dele; **não tocar** no projeto "Redesign do painel Next.js" (é do gerente). Se não existir, criar: `DesignSync {method: "create_project", name: "Num Pulo Design System"}`.

- [ ] **Step 2: Finalizar o plano de escrita**

`DesignSync {method: "finalize_plan", projectId: "<id>", localDir: "C:\\Dev\\designer-num-pulo\\design-system", writes: ["tokens/tokens.css", "previews/cores.html", "previews/tipografia.html"]}`

- [ ] **Step 3: Subir os arquivos**

`DesignSync {method: "write_files", projectId: "<id>", planId: "<plan>", files: [{path: "tokens/tokens.css", localPath: "tokens.css"}, {path: "previews/cores.html", localPath: "previews/cores.html"}, {path: "previews/tipografia.html", localPath: "previews/tipografia.html"}]}`

**Atenção:** os previews referenciam `../../assets/fonts.css`, que não existe no projeto remoto — no claude.ai/design as fontes caem em fallback. Aceitável na fase 0; se o card ficar ilegível, embutir um `<link>` do Google Fonts (seção 7 da skill) **só na cópia remota**, nunca na local.

- [ ] **Step 4: Verificar** — `DesignSync {method: "list_files", projectId: "<id>"}`. Expected: os três paths.

- [ ] **Step 5: Registrar o projectId em `docs/handoff.md`** (substituir a linha de "Situações em aberto" sobre o projeto por: `- Design system no claude.ai/design: projeto <id> ("Num Pulo Design System"), 3 arquivos.`), commit e push:

```bash
git add docs/handoff.md
git commit -m "design-system: sync inicial no claude.ai/design

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
git push
```

---

### Task 7: Fechamento da fase 0

**Files:**
- Modify: `docs/superpowers/specs/2026-08-07-designer-worker-design.md` (checkboxes da fase 0)
- Modify: `docs/handoff.md`

- [ ] **Step 1: Marcar no spec** os itens da fase 0 concluídos (`- [ ]` → `- [x]`, com data).

- [ ] **Step 2: Reescrever `docs/handoff.md`**: estado = fase 0 concluída; próximo passo = fase 1 (mockup do Guia até 23/08, carrossel Lote Fundador, thumbnail de YouTube, primeira calibração da brand-guidelines); situações em aberto = ComfyUI (endpoint) e fontes no projeto remoto do claude.ai/design.

- [ ] **Step 3: Verificação final da fase 0** (rodar tudo de novo, do zero):

```bash
node C:\Dev\gerente-num-pulo\dist\cli.js registro designer   # ficha aparece
node tools/render.mjs render design-system/previews/cores.html --out <scratchpad>/final.png
node tools/render.mjs info <scratchpad>/final.png            # 1080×1080
```

- [ ] **Step 4: Commit final**

```bash
git add docs/
git commit -m "fase 0 concluida: worker designer operacional

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
git push
```
