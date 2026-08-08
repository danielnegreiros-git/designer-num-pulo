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
    node tools/render.mjs cor <entrada> --out <saida> [--lut <arq.cube>|--perfil bruto-canon]
                                        [--exposicao auto|off] [--referencia <arq|pasta>] [--forca 0.7]
    node tools/render.mjs analisar <imagem> [--grade "3x4"] [--alvo 4.5]
    node tools/render.mjs rostos <imagem> [--forcar] [--cache <pasta>]
    node tools/render.mjs checar <fonte.html> [--largura 1080] [--altura 1440] [--minimo 0.06]
    node tools/render.mjs medir-tela <imagem> --regiao "x0,y0,x1,y1" [--alcance 80] [--limiar 100] [--mapa "escala,dx,dy"]
                                              [--esq|--dir "y0,y1"] [--topo|--fundo "x0,x1"]
    node tools/render.mjs contorno <imagem> --quad "x,y x,y x,y x,y" --out <pasta> [--escala 1] [--zona 200]
    node tools/render.mjs info <arquivo>

Toda saída é JSON. Códigos de saída: `0` ok, `2` erro de uso (conserte a chamada), `1` falha de execução. Formato de `tratar` sai da extensão de `--out` (png/jpg/webp).

**A máquina de composição mora em [assets/composicao.js](assets/composicao.js)** (`NP.tela`, `NP.poligono`, `NP.homografia`), carregada por `<script src>`. Peça **nunca** copia essa máquina para dentro de si: correção lá tem que valer para todas. É o mesmo princípio das skills globais — cópia local é fork silencioso.

## Sistema de qualidade (obrigação, não sugestão)

1. **Skills por momento**: `impeccable` antes do render de toda peça; `design-taste-frontend`/`frontend-design` em peça tipo landing/apresentação; `dataviz` em qualquer gráfico.
2. **Gate do brandguide**: checklist da seção 9 de `C:/Users/Danie/.claude/skills/num-pulo-brand-guidelines/SKILL.md` antes de toda entrega.
3. **Auto-inspeção**: ler o PNG renderizado (tool Read) e auditar contra o brief antes de mostrar ao Daniel.

### Composição sobre foto (tela em aparelho, recorte, máscara)

Cinco rodadas de retrabalho em 2026-08-07 na primeira peça do gênero, todas
pegas pelo Daniel e nenhuma por mim. As lições viraram **ferramenta e
biblioteca** — cumprir é rodar os comandos, não lembrar das regras. Quem faz
peça desse tipo segue `templates/mockup-tela-em-cena/manifest.md`.

4. **Coordenada em foto se mede com `render.mjs medir-tela`, nunca a olho.** A
   olho o erro passa de 20px e chega a inverter o sinal da inclinação. O
   subcomando varre pixels **de dentro da tela para fora** (de fora para dentro
   trava em qualquer área clara vizinha) e descarta amostra puxada para dentro
   por artefato escuro (ilha da câmera). Borda tapada por outro objeto: restringir
   o trecho com `--esq/--dir/--topo/--fundo`, senão a varredura acha a moldura do
   objeto da frente. Sem contraste confiável para varrer, o fallback é grade
   renderizada 1:1 (modelo: `diagnostico-grade.html` na peça
   `2026-08-07-cena-guia-landing`).
5. **Compor com `NP.tela()` da [assets/composicao.js](assets/composicao.js)**, que
   já embute o inset anti-serrilhado e cobra o raio do vidro. Oclusão entre
   objetos: `NP.poligono()` — o entalhe começa **no topo do objeto que oclui**;
   clip de altura cheia come conteúdo longe da junção.
6. **Render com supersampling**: `render --escala 4` no scratchpad, `tratar
   --largura <final>` para a saída. `matrix3d` não recebe antialiasing do
   Chromium; sem isso a aresta sai em degraus.
7. **Validar as 8 zonas do contorno de CADA tela com `render.mjs contorno`** antes
   de entregar. É checklist, não amostragem: validar só as zonas que "parecem
   arriscadas" deixou passar três defeitos seguidos, e o defeito estava sempre na
   zona que ficou de fora.

## Carrossel de Instagram

**Template: `templates/carrossel-foto-sangrada/`** — aprovado pelo Daniel em 2026-08-08.
Carrossel novo começa por ele, não do zero. Peça de origem:
`biblioteca/pecas/2026/2026-08-07-carrossel-madri-ou-barcelona/`. Padrão de referência
dele: `Y:\numpulo\Transferencia\Gramado\Carrossel\Carrossel Gramado`.

- **2160×2880 (3:4)**, não 1:1. Foto sangrada, texto só branco, vinheta no lado do texto.
- Normalizado a 1080 de largura: margem 120px, coluna 780px, título Instrument Serif 96px
  (`line-height` 1.02), corpo Poppins 30px (1.44). Anton só na capa.
- Fonte é **um** HTML com os slides empilhados; render de 1080×(1440·N) e recorte por
  `render.mjs recortar`. Um HTML por slide multiplica o mesmo CSS por dez.
- **Entrega em JPG q95.** Foto sangrada não tem área chapada: PNG pesa 6× e o Instagram
  recomprime na subida.

## Foto do acervo em peça

- **Frame de vídeo sai em C-Log3** (Canon R6). Cru ao lado de foto exportada, a peça fica
  com dois padrões de cor. A conversão é pelo **LUT da curva da câmera**, não por ganho de
  contraste chutado: `render.mjs cor <frame> --out X --perfil bruto-canon`
  (`assets/luts/canon-log3-rec709.cube`, copiado do acervo de LUTs do Daniel).
- **O padrão de cor do canal são as fotos exportadas do próprio destino.** Para o frame
  casar com elas na mesma peça, somar `--referencia <pasta com as fotos> --forca 0.5`
  (casamento estatístico por canal). Ordem fixa e não negociável dentro do comando:
  LUT → referência → exposição → curva → saturação → nitidez. Fora dessa ordem o LUT
  recebe entrada que não é log e devolve cor errada, e o sharpen vira halo afiado.
- **Saturação é alvo, não ganho.** `--saturacao auto` mede a imagem e mira os 26% das
  fotos aprovadas: cena já colorida (prato de comida, 31%) não recebe nada, frame de fim
  de tarde (17%) sobe. Ganho fixo de 1,6 deixou o tomate artificial em 2026-08-08.
- **Contraste global engana.** Os frames convertidos batiam 67 contra 53 das fotos e ainda
  assim pareciam moles: o que falta no log é punch de meio-tom, não espalhamento. Curva S
  ancorada nos extremos (`--curva`), nunca ganho de contraste global.
- **Look do Lightroom se traz por HALD CLUT.** Preset `.xmp` é paramétrico do Adobe e não
  roda aqui. `render.mjs hald --out identity.png` gera a tabela; o Daniel revela com o
  preset e exporta PNG sem redimensionar; `cor --lut <hald-revelado.png>` aplica. Vale
  para qualquer editor que revele imagem, não só Lightroom.
- **Frame 16:9 em slide 3:4 sofre upscale de ~1,33×** e nunca vai bater com foto nativa
  vertical em detalhe fino. O sharpen compensa em parte; o limite é da fonte. Por isso:
  **onde existe foto do destino, usa-se foto.** Frame entra quando não há foto da cena —
  e aí a escolha é o clipe mais **gráfico** (letreiro, silhueta, objeto em fundo escuro),
  que depende menos de detalhe fino. Os quatro slides reprovados pelo Daniel em
  2026-08-08 eram os quatro cuja imagem principal era frame; três tinham foto disponível
  no acervo e ninguém tinha olhado.
- **Acervo de um destino pode estar em mais de uma pasta e de mais de uma viagem.**
  Barcelona tinha 63 fotos tratadas em `H:\Destinos\Barcelona 2022\Fotografia` enquanto a
  peça usava frame de vídeo da viagem de 2025. Antes de recorrer a frame, varrer todas as
  pastas do destino.
- **Onde o texto vai numa foto é medição, não olho:** `render.mjs analisar <imagem>` devolve,
  por faixa, brilho, detalhe, concentração de pele e o **scrim** necessário para o branco
  bater contraste 4,5. O slide usa esse número em `--scrim`; vinheta chutada falhou em
  2026-08-08 em dois slides.
  - Scrim se calcula por brilho **e por detalhe**. Faixa escura na média mas cheia de
    padrão (fachada da Casa Batlló, detalhe 55) mata texto branco do mesmo jeito.
  - O gradiente mantém o scrim **cheio ao longo de todo o bloco de texto** e só decai
    acima dele. Gradiente que começa a cair na base entrega metade do valor medido na
    primeira linha do título.
  - **Pele é sinal, não veto.** Fruta, tijolo e parede ocre entram na faixa de pele; o que
    denuncia rosto é a faixa concentrar pele acima da média da própria foto (≥1,6×). É
    dica de onde olhar, nunca a decisão.
- **Texto sobre rosto é gate, não revisão: `render.mjs checar <fonte.html>`.** Obrigatório
  antes de toda entrega com pessoa na peça; `montar.ps1` chama e aborta se acusar.
  - A medição é no **slide renderizado**, não na foto de origem: `object-fit: cover`
    recorta e o split comprime a foto em meia altura, então bbox medida na imagem não
    corresponde ao que sai. Erro pago em 2026-08-08, no slide 10.
  - Quem enxerga é `render.mjs rostos`, que chama `claude -p` (assinatura Max, regra 1) —
    o Chromium do Playwright **não** expõe `FaceDetector`, testado com e sem as flags de
    Shape Detection. Detecção fica em cache por **SHA-1 do conteúdo** em `.rostos/`
    (gitignored): LLM varia entre chamadas e a peça precisa do mesmo veredito.
  - O prompt exige feições visíveis. Sem essa cláusula, nuca e cabeça de costas viram
    "rosto" e a auditoria acusa conflito onde não há.
  - `--minimo` (padrão 0,06 da altura) ignora rosto pequeno: turista no fundo da multidão
    não é o mesmo problema que a cara de quem assina o canal.
- **Achar o frame pelo índice, não abrindo vídeo**: destinos indexados pelo `edicao-num-pulo`
  têm `_index/<cidade>/index.csv`, uma linha por clipe com `landmark`, `descricao`, `plano`,
  `classe` (broll/fala) e caminho. Busca por texto chega direto no clipe.
- Escolha de imagem se faz em **contact sheet**, não abrindo arquivo por arquivo: gerar HTML
  em grade com as candidatas e renderizar.
- Peça com foto do acervo leva um **`preparar-imagens.ps1`** que reconstrói `imagens/` do
  zero: origem exata de cada arquivo, tratamento aplicado e a análise que definiu âncora e
  scrim. Modelo em `biblioteca/pecas/2026/2026-08-07-carrossel-madri-ou-barcelona/`.

## Dois sistemas visuais — roteamento

- **Default**: skill global `num-pulo-brand-guidelines` (Indigo `#2A0082`, Anton/Instrument Serif/Poppins) — conteúdo, social, marketing, mídia kit, produto editorial.
- **Exceção**: design system do Guia app (`C:\Dev\Design System\Num Pulo Design System`; papel-creme, roxo `#4A12E0`) — só quando a demanda pedir explicitamente peça no visual do app.

Nunca misturar os dois na mesma peça.

## Acervo de fotos

`H:\Destinos`, `Y:\numpulo\Destinos`, legado em `D:\Projeto Num Pulo\Cidades` — e pode procurar em qualquer lugar. Dentro da pasta do destino normalmente existe `fotografia`; priorizar fotos exportadas. Somente leitura. Sem índice próprio (decisão do Daniel se a busca virar gargalo).

## Convenções não óbvias

- **Slug**: `YYYY-MM-DD-<formato>-<tema>`, minúsculas com hífen. Data = produção da peça.
- **Uma pasta por peça** em `biblioteca/pecas/<ano>/<slug>/`: `brief.md` (pedido, demandante, fontes de foto, `status: rascunho|aprovada|descartada`), fonte HTML/dados, `saida/*.png`.
- **Template nasce da segunda ocorrência** de um formato, nunca de antecipação. `templates/<formato>/`: `template.html` + `manifest.md` (slots, procedimento com os comandos, peça de origem, armadilhas que ele resolve).
- **Mockup é família, não formato único**: `templates/mockup-<tipo>/`. Existe `mockup-tela-em-cena` (aparelho em cena fotográfica, desde 07/08). Tipo novo — impresso, vestuário, tela flutuante sem cena, embalagem — é **template irmão**, nunca variação forçada dentro de um existente. O que os irmãos compartilham (homografia, inset, oclusão) mora em `assets/composicao.js`, não copiado em cada um.
- **Design system no claude.ai/design**: `design-system/` é a fonte; sync incremental via ferramenta `DesignSync` (projeto registrado em docs/handoff.md). Preview novo leva `<!-- @dsCard group="..." -->` na primeira linha.
- **Caminho de skill sempre absoluto**: `C:/Users/Danie/.claude/skills/<skill>/SKILL.md`.
- **Commit em português**, trailer `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`, direto na `main`, com push (remoto GitHub). **Sem aspas duplas na mensagem**: dentro de here-string do PowerShell elas quebram o quoting nativo do Windows e o git recebe cada palavra como pathspec. Pior: o `git push` seguinte responde ok mesmo sem commit novo — conferir com `git log --oneline -1`.

## Comunicação entre sistemas

Este repo participa do barramento do Gerente Num Pulo (`C:\Dev\gerente-num-pulo`, schema `barramento`). Identidade: `designer` (role `np_designer`), credencial em `BARRAMENTO_DB_URL` no `.env` (gitignored).

Regra de bolso:
- Só **ler número** de outro sistema → view-contrato com `np_leitor`, sem barramento.
- Preciso que **código de outro worker mude** → demanda:
  `node C:\Dev\gerente-num-pulo\dist\cli.js demanda abrir --para <worker> --titulo "..." --corpo "..."`. A resposta é um commit.
- Consultar quem faz o quê: `node C:\Dev\gerente-num-pulo\dist\cli.js registro`.
- Avaliar quem quebra se um entregável mudar: `node C:\Dev\gerente-num-pulo\dist\cli.js impacto <entregavel>`.

Demandas destinadas a este worker aparecem no início da sessão (hook `SessionStart`). Fechar: `demanda fechar <id> --status concluida --resposta "..."` — e depois de fechar, checar o barramento com `demanda vigiar --desde <iso8601>`, sem esperar o Daniel pedir. **`vigiar` é consulta pontual, não daemon**: `--desde` é obrigatório e ele reporta movimentação de fora (chegadas, fechamentos e recados de outros), não as próprias ações. Rodar em segundo plano não serve para nada. Template consumido por outro worker vira `entregavel declarar` na mesma sessão do commit.

## Comunicação

O Daniel pede respostas diretas e operacionais, em português, sem linguagem motivacional e sem parágrafo de resumo no fim. Erros corrigidos sem suavizar; sem informação, dizer "não sei".
