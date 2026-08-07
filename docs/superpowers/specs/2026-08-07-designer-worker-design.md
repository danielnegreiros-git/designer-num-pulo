# Worker DESIGNER — spec de design

Data: 2026-08-07. Decisões aprovadas pelo Daniel nesta data, nesta sessão.
Repo: `C:\Dev\designer-num-pulo` · remoto `https://github.com/danielnegreiros-git/designer-num-pulo.git`.
Padrão de repo herdado de `C:/Dev/socialmedia-num-pulo` (que herda de `atendimento-num-pulo`).

## 1. Missão

Transformar demanda de imagem estática em peça pronta, no brandguide, de forma
repetível. Formatos: carrossel diagramado de Instagram, thumbnail/capa de YouTube,
story, mockup e imagem de apresentação de produto, peça de landing, material de
apresentação. Atende os demais workers (via demanda no barramento) e o Daniel
(pedido direto).

## 2. Fronteiras

- **Vídeo e motion** são do `animation` (inclui lettering de Reels — spec dele de 2026-08-02).
- **Texto e roteiro** são do `socialmedia`. O designer diagrama o que os outros escrevem.
- **UI do produto** é do `guia`. O designer produz material de marketing do produto, não telas.
- **Publicar é sempre ação humana.** O worker entrega arquivo; quem usa é o demandante ou o Daniel.

## 3. Decisões de arquitetura (Daniel, 2026-08-07)

Mudança exige decisão nova, com data e autor.

1. **Motor de renderização: HTML/CSS → PNG via Playwright.** O brandguide já é CSS;
   template consome os tokens direto. Determinístico, repetível, tipografia
   pixel-perfect em qualquer dimensão (1080×1080, 1080×1350, 1280×720, A4).
   **Base de markup: HTML estático + CSS com os tokens do brandguide.** Tailwind é
   permitido como utilitário, com cópia local em `assets/` (sem CDN no render, para
   determinismo e render offline). **React fica fora do pipeline de peça estática**:
   não agrega em imagem parada e traria build. Handoff que chegar em React
   (Claude Design, skills de frontend) é adaptado para HTML estático antes do render.
2. **Workspace leve, uma ferramenta.** `tools/render.mjs` com subcomandos
   (render, tratamento via Sharp). Capacidade nova vira subcomando; ferramenta ou
   dependência nova exige decisão do Daniel.
3. **Sharp (Node.js) para manipulação**: crop, resize, conversão, compressão,
   rasterização de SVG, composição de camadas. SVG é gerado como código pela
   sessão e embutido nos templates ou rasterizado.
4. **Template nasce de repetição real, nunca de antecipação.** Primeira ocorrência
   de um formato é peça avulsa; a segunda promove a template em `templates/<formato>/`.
5. **Dois sistemas visuais coexistem e não se misturam:**
   - `num-pulo-brand-guidelines` (skill global; Indigo `#2A0082`, Anton/Instrument/Poppins):
     conteúdo, social, marketing, mídia kit, produto editorial. **Default deste worker.**
   - Design system do Guia app (`C:\Dev\Design System\Num Pulo Design System`;
     papel-creme, roxo `#4A12E0`, estética zine): UI do produto. Este worker só o
     usa se a demanda pedir explicitamente peça no visual do app.
6. **Acervo de fotos**: `H:\Destinos`, `Y:\numpulo\Destinos` e legado em
   `D:\Projeto Num Pulo\Cidades` — mas o worker pode procurar em qualquer lugar.
   Convenção: dentro da pasta do destino normalmente existe uma pasta `fotografia`;
   priorizar as fotos exportadas. **Somente leitura.** Sem índice próprio na
   fase 1; índice vira decisão do Daniel se a busca virar gargalo real.
7. **Este worker é o curador da skill `num-pulo-brand-guidelines`** — mesmo modelo
   do socialmedia com as skills de texto: mudança só com changelog datado na skill
   e registro em `biblioteca/calibracoes/`, ou decisão direta do Daniel com o mesmo
   rastro. A skill foi criada sem revisão cuidadosa e a primeira calibração é
   tarefa da fase 1.
8. **Geração AI de imagem permitida**, nesta ordem de preferência: ComfyUI (local,
   já instalado), ChatGPT (conta existente). Assinatura nova (ex.: Higgsfield) só
   com decisão do Daniel diante de demanda real.
9. **Design system publicado no claude.ai/design** via ferramenta `DesignSync`
   (skill `/design-sync`): tokens, componentes e previews de template sincronizados
   incrementalmente de `design-system/` para navegação visual do Daniel.

## 4. Regras invioláveis

1. **Nunca usar a API paga da Anthropic.** Todo LLM via `claude -p` (assinatura Max).
2. **Nada é publicado automaticamente.** Entrega termina em arquivo aprovado.
3. **IA nunca inventa nem exagera paisagem de destino.** Foto de destino é sempre
   real, do acervo. IA serve para melhorar (upscale, limpeza, remoção de fundo) e
   para imagery de apoio (mockup de produto, background abstrato) — nunca para
   fabricar um lugar que não existe ou não é daquele jeito.
4. **Acervo de fotos é somente leitura.** Nenhuma escrita em `H:`, `Y:` ou `D:`.
5. **Credencial e dado sensível fora do git** (`.env` gitignored).
6. **Skill global só muda com rastro** (decisão 7).

## 5. Estrutura do repo

```
designer-num-pulo/
  CLAUDE.md                  # regras, fronteiras, roteamento entre sistemas visuais
  docs/handoff.md            # fio da meada, sobrescrevível, teto ~40 linhas
  docs/superpowers/specs/
  tools/render.mjs           # única ferramenta: HTML → PNG (Playwright) + Sharp
  templates/<formato>/       # template.html + manifest.md
  design-system/             # tokens.css + componentes → sync claude.ai/design
  biblioteca/
    pecas/<ano>/<slug>/      # brief.md, fonte (html/dados), saida/*.png
    calibracoes/             # registro de calibração da brand-guidelines
  assets/                    # logos, fontes locais se necessário
  .env                       # BARRAMENTO_DB_URL (identidade `designer`)
```

Convenções:

- **Slug**: `YYYY-MM-DD-<formato>-<tema>`, minúsculas com hífen (padrão socialmedia).
- **Uma pasta por peça** em `biblioteca/pecas/<ano>/<slug>/`: `brief.md` (o que foi
  pedido, por quem, fontes de foto usadas), fonte da peça (HTML e/ou dados), `saida/`
  com os PNG. Peça entregue tem `brief.md` com campo `status: aprovada|descartada`.
- **Manifest de template** (`templates/<formato>/manifest.md`): campos variáveis,
  dimensões de saída, exemplo renderizado, data e peça de origem.
- **Commit em português**, trailer `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`,
  direto na `main`, push para o GitHub.

## 6. Fluxo por peça

1. Demanda chega (hook do gerente) ou pedido direto do Daniel.
2. Brief curto em `biblioteca/pecas/<ano>/<slug>/brief.md`.
3. Formato tem template → preencher e renderizar. Não tem → criar peça sob o
   brandguide (segunda ocorrência promove a template).
4. **Passada de qualidade antes do render** (seção 7, camadas 1 e 2).
5. Render via `tools/render.mjs` → PNG em `saida/`.
6. **Auto-inspeção visual**: a sessão lê o PNG gerado e audita contra o brief e o
   checklist antes de mostrar ao Daniel.
7. Entrega para "ok" do Daniel. Demanda fecha com commit como resposta; depois de
   fechar demanda vinda do hook, ligar o vigia (`demanda vigiar`) em segundo plano.

## 7. Sistema de qualidade

Três camadas, todas obrigatórias:

1. **Skills de execução por momento** (obrigação de invocar, não sugestão):
   - `impeccable` — toda peça HTML antes do render (hierarquia, espaçamento, tipografia).
   - `design-taste-frontend` / `frontend-design` — peça tipo landing/apresentação.
   - `dataviz` — qualquer gráfico ou visualização de dado.
2. **Gate do brandguide**: checklist da seção 9 da `num-pulo-brand-guidelines`
   verificado antes de toda entrega. Violação de fundo, Anton, contraste ou logo
   reprova a peça.
3. **Auto-inspeção do PNG renderizado** contra o brief, antes de chegar ao Daniel.

## 8. Integração com o gerente

Identidade `designer` no barramento (`C:\Dev\gerente-num-pulo`, schema `barramento`),
credencial em `BARRAMENTO_DB_URL` no `.env`. Regras iguais aos demais workers:
demanda como interface, registro como fonte de verdade, entregável declarado na
mesma sessão do commit, consumo declarado do que passar a ler. Hook `SessionStart`
injetando demandas destinadas a `designer` (mesmo padrão do socialmedia).

Identidade criada em 2026-08-07 (migration `2026-08-07-worker-designer.sql` no
gerente): role `np_designer`, ficha no registro, `.env` local e hook `SessionStart`
instalados, visibilidade testada (registro, fila, vigia, hook).

## 9. Fases e critérios de aceite

**Fase 0 — fundação:**
- [x] git init + remote GitHub (feito em 2026-08-07)
- [ ] CLAUDE.md e docs/handoff.md
- [ ] `tools/render.mjs`: renderiza HTML de teste em 1080×1080 e 1280×720; Sharp
      comprime e converte
- [ ] `design-system/tokens.css` extraído da brand-guidelines
- [x] Identidade `designer` no barramento; `registro` lista o worker (feito em 2026-08-07,
      com hook `SessionStart` e `.env` já instalados)
- [ ] Sync inicial do design system no claude.ai/design

**Fase 1 — formatos fundadores (alvo: mockup pronto até o checkpoint de 23/08; D0 em 31/08):**
- [ ] Mockup/imagem de apresentação do Guia Num Pulo — ciclo completo com aprovação
- [ ] Carrossel diagramado (candidato natural: Lote Fundador, 02/09) — ciclo completo
- [ ] Thumbnail de YouTube — ciclo completo
- [ ] Primeira calibração da `num-pulo-brand-guidelines`: revisão contra peças reais
      do site e mídia kit, ajustes propostos e decididos pelo Daniel, com rastro

**Fase 2 — crescimento por demanda:**
- Stories, peças de landing, deck comercial, novos templates conforme demanda real.
- Índice de fotos, automações: só se a dor aparecer, com decisão do Daniel.

## 10. Pontos em aberto

- Endpoint/instalação do ComfyUI (onde roda, como invocar) — levantar na fase 1,
  na primeira peça que precisar dele.
- Caminhos exatos em `Y:` e `D:` — confirmar com o Daniel na primeira busca de foto.
- Skills adicionais de design (além das listadas na seção 7): avaliar com
  `find-skills` quando um gap real aparecer, não antes.

## 11. Agenda relevante (2026-08-07)

Rio de Janeiro 08–12/08 (Hoteis.com) · checkpoint Onda 1 em 23/08 · D0 TriPulantes
Pass 31/08 · abertura pública 02/09 · Machu Picchu 05–11/09. A fase 1 existe para
servir esse calendário.
