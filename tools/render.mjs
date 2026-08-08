#!/usr/bin/env node
// Única ferramenta do worker designer: HTML → PNG (Playwright) e imagem (Sharp).
// Capacidade nova vira subcomando aqui; dependência nova exige decisão do Daniel.
import { chromium } from 'playwright'
import sharp from 'sharp'
import { resolve, extname, basename, relative } from 'node:path'
import { pathToFileURL } from 'node:url'
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync, unlinkSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { tmpdir } from 'node:os'
import { dirname } from 'node:path'

const USO = `uso:
  node tools/render.mjs render <arquivo.html> --out <saida.png> [--largura 1080] [--altura 1080] [--escala 1] [--pagina-inteira]
  node tools/render.mjs tratar <entrada> --out <saida.(png|jpg|webp)> [--largura N] [--altura N] [--qualidade 80]
  node tools/render.mjs recortar <entrada> --out <saida> --x N --y N --largura N --altura N
  node tools/render.mjs cor <entrada> --out <saida> [--lut <arq.cube|hald.png>|--perfil bruto-canon|raw-canon|iphone] [--exposicao auto|off]
                                      [--referencia <arq|pasta>] [--forca 0.7] [--preset <arq.xmp>] [--preset-forca 1]
                                      [--curva 0..1] [--saturacao 1] [--nitidez 0..5] [--qualidade 92]
  node tools/render.mjs analisar <imagem> [--grade "3x4"] [--alvo 4.5]
  node tools/render.mjs rostos <imagem> [--forcar]              # detecta rosto e grava .rostos.json
  node tools/render.mjs checar <fonte.html> [--minimo 0.06]     # texto sobre rosto, no slide renderizado
  node tools/render.mjs indexar-fotos <pasta-do-destino> [--pasta Fotografia] [--descrever] [--out <dir>]
  node tools/render.mjs hald --out <identity.png> [--nivel 8]   # gera identity para trazer look do Lightroom
  node tools/render.mjs medir-tela <imagem> --regiao "x0,y0,x1,y1" [--limiar 100] [--alcance 80] [--mapa "escala,dx,dy"]
                                            [--esq|--dir "y0,y1"] [--topo|--fundo "x0,x1"]   # borda ocluída: restrinja o trecho
  node tools/render.mjs contorno <imagem> --quad "x,y x,y x,y x,y" --out <pasta> [--escala 1] [--zona 200]
  node tools/render.mjs info <arquivo>`

function sairUso(msg) {
  console.error(msg ? `${msg}\n${USO}` : USO)
  process.exit(2)
}

const FLAGS_PERMITIDAS = {
  render: ['largura', 'altura', 'escala', 'out', 'pagina-inteira'],
  tratar: ['largura', 'altura', 'qualidade', 'out'],
  recortar: ['x', 'y', 'largura', 'altura', 'out'],
  cor: ['out', 'lut', 'perfil', 'exposicao', 'referencia', 'forca', 'preset', 'preset-forca', 'curva', 'saturacao', 'nitidez', 'qualidade'],
  analisar: ['grade', 'alvo'],
  hald: ['out', 'nivel'],
  rostos: ['forcar', 'cache'],
  checar: ['largura', 'altura', 'minimo', 'cache'],
  'indexar-fotos': ['pasta', 'out', 'descrever'],
  'medir-tela': ['regiao', 'limiar', 'mapa', 'alcance', 'esq', 'dir', 'topo', 'fundo'],
  contorno: ['quad', 'out', 'escala', 'zona'],
  info: [],
}

function lerArgs(argv, comando) {
  const permitidas = FLAGS_PERMITIDAS[comando] || []
  const pos = []
  const op = {}
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a.startsWith('--')) {
      const nome = a.slice(2)
      if (!permitidas.includes(nome)) sairUso(`flag desconhecida: ${a}`)
      if (['pagina-inteira', 'forcar', 'descrever'].includes(nome)) {
        op[nome === 'pagina-inteira' ? 'paginaInteira' : nome] = true
        continue
      }
      const v = argv[++i]
      if (v === undefined || v.startsWith('--')) sairUso(`falta valor para ${a}`)
      op[nome] = v
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

function numero(op, nome, padrao) {
  if (op[nome] === undefined) return padrao
  const n = Number(op[nome])
  if (!Number.isFinite(n)) sairUso(`--${nome} deve ser numérico`)
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
  const meta = await sharp(op.out).metadata()
  console.log(JSON.stringify({ ok: true, saida: op.out, largura: meta.width, altura: meta.height }))
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

async function recortar(pos, op) {
  const [entrada] = pos
  if (!entrada || !op.out) sairUso('recortar exige <entrada> e --out')
  if (!existsSync(entrada)) sairUso(`arquivo não existe: ${entrada}`)
  for (const n of ['x', 'y', 'largura', 'altura']) {
    if (op[n] === undefined) sairUso(`recortar exige --${n}`)
  }
  garantirPasta(op.out)
  const r = await sharp(entrada)
    .extract({
      left: inteiroOuZero(op, 'x'),
      top: inteiroOuZero(op, 'y'),
      width: inteiro(op, 'largura'),
      height: inteiro(op, 'altura'),
    })
    .toFile(op.out)
  console.log(JSON.stringify({ ok: true, saida: op.out, largura: r.width, altura: r.height }))
}

function inteiroOuZero(op, nome) {
  const n = Number(op[nome])
  if (!Number.isInteger(n) || n < 0) sairUso(`--${nome} deve ser inteiro >= 0`)
  return n
}

// Acha o quadrilátero de uma tela clara cercada de moldura escura, varrendo SEMPRE
// de dentro para fora: varredura de fora para dentro trava em qualquer área clara
// vizinha (parede, outra tela atrás do device). Artefato escuro DENTRO da tela
// (ilha da câmera, UI escura) só puxa a borda para dentro, por isso o refino
// descarta iterativamente as amostras que caem para dentro do ajuste. Ambos os
// erros foram pagos em 2026-08-07; o método está aqui para não voltarem.
async function medirTela(pos, op) {
  const [entrada] = pos
  if (!entrada) sairUso('medir-tela exige <imagem>')
  if (!existsSync(entrada)) sairUso(`arquivo não existe: ${entrada}`)
  if (!op.regiao) sairUso('medir-tela exige --regiao "x0,y0,x1,y1" — caixa em volta da tela, com o centro caindo dentro dela')
  const r = op.regiao.split(',').map(Number)
  if (r.length !== 4 || r.some((n) => !Number.isFinite(n))) sairUso('--regiao malformada: use "x0,y0,x1,y1"')
  const [rx0, ry0, rx1, ry1] = r
  const limiar = numero(op, 'limiar', 100)
  const alcance = numero(op, 'alcance', 80)

  const { data, info: meta } = await sharp(entrada).raw().toBuffer({ resolveWithObject: true })
  const { width: W, height: H, channels: C } = meta
  const dentro = (x, y) => x >= 0 && y >= 0 && x < W && y < H
  const escuro = (x, y) => {
    if (!dentro(x, y)) return true
    const i = (y * W + x) * C
    return Math.max(data[i], data[i + 1], data[i + 2]) < limiar
  }
  const cx = Math.round((rx0 + rx1) / 2)
  const cy = Math.round((ry0 + ry1) / 2)
  if (escuro(cx, cy)) sairUso(`centro da região (${cx},${cy}) caiu em área escura — a caixa precisa ter o centro dentro da tela`)

  // Amostras da borda: para cada posição ao longo da borda, o primeiro pixel
  // escuro saindo do centro. `passo` cobre ~40 pontos por borda.
  const trecho = (nome, padrao) => {
    if (op[nome] === undefined) return padrao
    const t = op[nome].split(',').map(Number)
    if (t.length !== 2 || t.some((n) => !Number.isFinite(n))) sairUso(`--${nome} malformado: use "a0,a1"`)
    return t
  }
  const amostrar = (horizontal, sentido, spanNome) => {
    const [a0, a1] = trecho(spanNome, horizontal ? [ry0, ry1] : [rx0, rx1])
    // A região dá o trecho amostrado; a varredura pode passar `alcance` px além
    // dela para achar a moldura (região não precisa ser exata).
    const borda = horizontal ? (sentido < 0 ? rx0 : rx1) : (sentido < 0 ? ry0 : ry1)
    const limite = borda + sentido * alcance
    const partida = horizontal ? cx : cy
    const passo = Math.max(2, Math.round((a1 - a0) / 40))
    const pontos = []
    for (let a = a0 + passo; a < a1 - passo; a += passo) {
      for (let b = partida; sentido < 0 ? b >= limite : b <= limite; b += sentido) {
        if (escuro(horizontal ? b : a, horizontal ? a : b)) { pontos.push([a, b]); break }
      }
    }
    if (pontos.length < 4) sairUso('varredura não achou moldura suficiente — confira --regiao e --limiar')
    return pontos
  }

  // Ajuste robusto v = m*t + b, descartando o que cai para dentro (sentido interno
  // = -sentido da varredura). Três passadas convergem mesmo com a ilha da câmera
  // ocupando a maioria das colunas do topo.
  const ajustar = (pontos, sentidoInterno, tol = 1.5) => {
    let uso = pontos
    let m = 0, b = 0
    for (let passada = 0; passada < 12; passada++) {
      const n = uso.length
      const st = uso.reduce((s, p) => s + p[0], 0)
      const sv = uso.reduce((s, p) => s + p[1], 0)
      const stt = uso.reduce((s, p) => s + p[0] * p[0], 0)
      const stv = uso.reduce((s, p) => s + p[0] * p[1], 0)
      const den = n * stt - st * st
      m = den === 0 ? 0 : (n * stv - st * sv) / den
      b = (sv - m * st) / n
      const filtrado = pontos.filter(([t, v]) => (v - (m * t + b)) * sentidoInterno <= tol)
      if (filtrado.length < 4 || filtrado.length === uso.length) break
      uso = filtrado
    }
    return { m, b, amostras: uso.length }
  }

  const esq = ajustar(amostrar(true, -1, 'esq'), +1)   // x cresce para dentro
  const dir = ajustar(amostrar(true, +1, 'dir'), -1)
  const topo = ajustar(amostrar(false, -1, 'topo'), +1) // y cresce para dentro
  const fundo = ajustar(amostrar(false, +1, 'fundo'), -1)

  // Lateral: x = m*y + b. Horizontal: y = m*x + b. Interseção das duas.
  const canto = (lat, hor) => {
    const x = (lat.m * hor.b + lat.b) / (1 - lat.m * hor.m)
    return [x, hor.m * x + hor.b]
  }
  let cantos = {
    tl: canto(esq, topo), tr: canto(dir, topo),
    bl: canto(esq, fundo), br: canto(dir, fundo),
  }
  if (op.mapa) {
    const mp = op.mapa.split(',').map(Number)
    if (mp.length !== 3 || mp.some((n) => !Number.isFinite(n))) sairUso('--mapa malformado: use "escala,dx,dy"')
    const [k, dx, dy] = mp
    cantos = Object.fromEntries(Object.entries(cantos).map(([n, [x, y]]) => [n, [x * k + dx, y * k + dy]]))
  }
  const arredonda = ([x, y]) => [Number(x.toFixed(1)), Number(y.toFixed(1))]
  const saida = Object.fromEntries(Object.entries(cantos).map(([n, c]) => [n, arredonda(c)]))
  console.log(JSON.stringify({
    ...saida,
    quad: ['tl', 'tr', 'bl', 'br'].map((n) => saida[n].join(',')).join(' '),
    amostras: { esq: esq.amostras, dir: dir.amostras, topo: topo.amostras, fundo: fundo.amostras },
  }))
}

// Recorta as 8 zonas do contorno de uma tela composta (4 cantos + 4 meios de
// borda) ampliadas 3× em pixel cru. É checklist, não amostragem: validar só as
// zonas que "parecem arriscadas" deixou passar três defeitos em 2026-08-07 — o
// defeito estava sempre na zona que ficou de fora.
async function contorno(pos, op) {
  const [entrada] = pos
  if (!entrada || !op.quad || !op.out) sairUso('contorno exige <imagem>, --quad "x,y x,y x,y x,y" (TL TR BL BR) e --out <pasta>')
  if (!existsSync(entrada)) sairUso(`arquivo não existe: ${entrada}`)
  const p = op.quad.trim().split(/\s+/).map((par) => par.split(',').map(Number))
  if (p.length !== 4 || p.some((c) => c.length !== 2 || c.some((n) => !Number.isFinite(n)))) {
    sairUso('--quad malformado: use "x,y x,y x,y x,y" na ordem TL TR BL BR')
  }
  const k = numero(op, 'escala', 1)
  const [tl, tr, bl, br] = p.map(([x, y]) => [x * k, y * k])
  const meio = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]
  const zonas = {
    'canto-tl': tl, 'borda-topo': meio(tl, tr), 'canto-tr': tr, 'borda-dir': meio(tr, br),
    'canto-br': br, 'borda-fundo': meio(bl, br), 'canto-bl': bl, 'borda-esq': meio(tl, bl),
  }
  const lado = inteiro(op, 'zona', 200)
  const meta = await sharp(entrada).metadata()
  if (lado > meta.width || lado > meta.height) sairUso(`--zona ${lado} maior que a imagem`)
  mkdirSync(resolve(op.out), { recursive: true })
  const saidas = []
  for (const [nome, [x, y]] of Object.entries(zonas)) {
    const left = Math.max(0, Math.min(meta.width - lado, Math.round(x - lado / 2)))
    const top = Math.max(0, Math.min(meta.height - lado, Math.round(y - lado / 2)))
    const arq = `${op.out}/${nome}.png`
    await sharp(entrada)
      .extract({ left, top, width: lado, height: lado })
      .resize(lado * 3, lado * 3, { kernel: 'nearest' })
      .toFile(arq)
    saidas.push(arq)
  }
  console.log(JSON.stringify({ ok: true, zonas: saidas }))
}

// ── cor ─────────────────────────────────────────────────────────────────────
// Frame de bruto da R6 sai em C-Log3: cinza e chapado ao lado de foto exportada.
// Colado cru, a peça fica com dois padrões de cor. A conversão certa é o LUT da
// própria curva de câmera (Log→Rec709), não um ganho de contraste chutado.
// Ordem fixa: LUT (curva da câmera) → referência (casa com foto aprovada) →
// exposição (níveis por percentil) → saturação. Inverter a ordem faz o LUT
// receber entrada que não é log e devolver cor errada.
// `bruto-canon` calibrado em 2026-08-08 contra as fotos exportadas da mesma
// viagem: os frames batiam contraste global 67 contra 53 das fotos e ainda assim
// pareciam mais moles. Contraste global mede espalhamento da cena inteira; o que
// falta no log convertido é punch de meio-tom, cor e micro-detalhe. Daí curva S
// nos médios (sem mexer nos extremos, que a exposição já ancorou), saturação e
// sharpen — e não mais ganho de contraste global, que só estouraria a foto.
// Saturação média das fotos exportadas do canal, medida em 2026-08-08 sobre as
// cinco fotos aprovadas da peça de carrossel. Alvo do modo `--saturacao auto`.
const ALVO_SATURACAO = 26

// Quatro fontes de imagem, quatro tratamentos. A ordem de preferência de fonte
// está no CLAUDE.md; aqui ficam só as receitas.
const PERFIS = {
  // Frame de vídeo da R6: C-Log3 → Rec709 pelo LUT da câmera.
  'bruto-canon': {
    lut: 'assets/luts/canon-log3-rec709.cube',
    exposicao: 'auto',
    curva: 0.4,
    saturacao: 'auto',
    nitidez: 2.4,
  },
  // RAW da R6 (.CR3): LibRaw revela neutro e o preset do Daniel entra em força
  // cheia — foi desenhado exatamente para este ponto do fluxo. Sem `--preset`,
  // cai numa revelação sóbria e o resto é igual aos outros perfis.
  'raw-canon': {
    exposicao: 'auto',
    curva: 0.25,
    saturacao: 'auto',
    nitidez: 1.8,
  },
  // iPhone. Dois bichos diferentes sob o mesmo nome, medidos em 2026-08-08
  // contra as fotos exportadas do canal (alvo: contraste ~58, saturação ~30,
  // nitidez ~18):
  //
  //   .heic/.jpg  já sai revelado pela Apple — contraste 66, saturação 23,
  //               nitidez 24. Contraste e nitidez JÁ passam do alvo (é o Smart
  //               HDR e o sharpening da câmera). Só falta cor. Somar curva ou
  //               sharpen aqui empilha halo em cima do que a Apple já fez.
  //   .dng        ProRAW cru sai lavado — contraste 48, saturação 27, nitidez
  //               13. Precisa de tudo, como qualquer RAW.
  //
  // O perfil escolhe a variante pela extensão: quem monta peça não precisa
  // saber de qual botão do iPhone a foto veio.
  'iphone': {
    exposicao: 'auto',
    curva: 0,
    saturacao: 'auto',
    nitidez: 0,
    variantePorExtensao: {
      '.dng': { exposicao: 'auto', curva: 0.15, saturacao: 'auto', nitidez: 1.4 },
    },
  },
}

function resolverPerfil(nome, entrada) {
  const base = PERFIS[nome]
  if (!base) return null
  const variante = base.variantePorExtensao?.[extname(entrada).toLowerCase()]
  return variante ? { ...base, ...variante } : base
}

// Formatos que o Sharp não decodifica e o ImageMagick sim (LibRaw e libheif já
// vêm embutidos no build instalado, verificado em 2026-08-08 — nenhuma
// dependência nova). `-auto-orient` é obrigatório: LibRaw entrega o sensor na
// orientação física e o retrato sai deitado.
const EXT_VIA_MAGICK = new Set(['.cr3', '.cr2', '.nef', '.arw', '.raf', '.rw2', '.dng', '.heic', '.heif'])

// Decodifica em 16 BITS. O CR3 da R6 tem 14 bits de latitude, e é justamente
// essa latitude que sustenta recuperação de alta e abertura de sombra. Passar
// por 8 bits antes de tratar joga fora o que se quer usar — o tratamento tem
// que cair sobre o RAW, não sobre um derivado já achatado.
function decodificarSePreciso(entrada) {
  const ext = extname(entrada).toLowerCase()
  if (!EXT_VIA_MAGICK.has(ext)) return { arquivo: entrada, temporario: null, bits: 8 }
  const saida = resolve(tmpdir(), `np-decod-${createHash('sha1').update(resolve(entrada)).digest('hex').slice(0, 12)}.png`)
  try {
    execFileSync('magick', [entrada, '-auto-orient', '-colorspace', 'sRGB', '-depth', '16', saida], { stdio: 'pipe' })
  } catch (e) {
    throw new Error(`magick não decodificou ${ext}: ${e.message}. Confira 'magick -version' (precisa dos delegates raw e heic).`)
  }
  return { arquivo: saida, temporario: saida, bits: 16 }
}

// ── preset do Lightroom (.xmp) ──────────────────────────────────────────────
// Lê um preset do Camera Raw e aplica os ajustes que são PONTUAIS (dependem só
// do valor do pixel) e por isso têm equivalente honesto fora do Adobe: curva de
// tons, contraste, altas/sombras/brancos/pretos, vibração/saturação, HSL por
// faixa de matiz, calibração de primários e granulado.
//
// NÃO transporta, porque é espacial ou proprietário: Texture, Clarity, Dehaze,
// Sharpness/NR do ACR e perfil de câmera (Adobe Color). O comando avisa quais
// campos ignorou — nunca fingir que aplicou.
//
// Ressalva que o Daniel levantou e está certa: preset feito para CR3 opera em
// RAW linear com latitude de arquivo bruto. Sobre C-Log3 já convertido em
// Rec709 pelo LUT, Highlights -100 e Shadows +90 chegam num sinal comprimido e
// o efeito é mais forte. Daí `--preset-forca`, que escala os ajustes de
// tonalidade (não a curva nem o HSL, que são transporte direto).
const FAIXAS_HSL = {
  Red: 0, Orange: 30, Yellow: 60, Green: 120, Aqua: 180, Blue: 240, Purple: 285, Magenta: 320,
}

function lerPresetXmp(caminho) {
  if (!existsSync(caminho)) sairUso(`preset não existe: ${caminho}`)
  const xml = readFileSync(caminho, 'utf8')
  const attr = (nome) => {
    const m = xml.match(new RegExp(`crs:${nome}="([^"]*)"`))
    return m ? m[1] : undefined
  }
  const num = (nome, padrao = 0) => {
    const v = attr(nome)
    if (v === undefined) return padrao
    const n = Number(String(v).replace('+', ''))
    return Number.isFinite(n) ? n : padrao
  }
  const curva = (() => {
    const bloco = xml.match(/<crs:ToneCurvePV2012>[\s\S]*?<\/crs:ToneCurvePV2012>/)
    if (!bloco) return null
    const pontos = [...bloco[0].matchAll(/<rdf:li>\s*(\d+)\s*,\s*(\d+)\s*<\/rdf:li>/g)]
      .map((m) => [Number(m[1]), Number(m[2])])
    return pontos.length >= 2 ? pontos : null
  })()

  const hsl = {}
  for (const cor of Object.keys(FAIXAS_HSL)) {
    hsl[cor] = {
      hue: num(`HueAdjustment${cor}`),
      sat: num(`SaturationAdjustment${cor}`),
      lum: num(`LuminanceAdjustment${cor}`),
    }
  }

  const ignorados = []
  for (const [campo, rotulo] of [
    ['Texture', 'Texture'], ['Clarity2012', 'Clarity'], ['Dehaze', 'Dehaze'],
    ['Sharpness', 'Sharpness (use --nitidez)'], ['LuminanceSmoothing', 'redução de ruído'],
  ]) {
    if (num(campo) !== 0) ignorados.push(rotulo)
  }
  if (attr('LensProfileEnable') === '1') ignorados.push('perfil de lente')

  return {
    nome: (xml.match(/<rdf:li xml:lang="x-default">([^<]+)<\/rdf:li>/) || [])[1] || basename(caminho),
    exposicao: num('Exposure2012'),
    contraste: num('Contrast2012'),
    altas: num('Highlights2012'),
    sombras: num('Shadows2012'),
    brancos: num('Whites2012'),
    pretos: num('Blacks2012'),
    vibracao: num('Vibrance'),
    saturacao: num('Saturation'),
    curva,
    hsl,
    calibragem: { azulHue: num('BlueHue'), vermelhoHue: num('RedHue'), verdeHue: num('GreenHue') },
    granulado: { quantidade: num('GrainAmount'), tamanho: num('GrainSize', 25) },
    ignorados,
  }
}

// Spline monotônica pelos pontos da curva de tons, avaliada em 256 passos.
function tabelaDaCurva(pontos) {
  const p = [...pontos].sort((a, b) => a[0] - b[0])
  const tabela = new Uint8Array(256)
  for (let v = 0; v < 256; v++) {
    let i = 0
    while (i < p.length - 2 && p[i + 1][0] < v) i++
    const [x0, y0] = p[i]
    const [x1, y1] = p[i + 1]
    const t = x1 === x0 ? 0 : (v - x0) / (x1 - x0)
    const s = t * t * (3 - 2 * t) // suaviza o joelho, como o ACR
    tabela[v] = Math.min(255, Math.max(0, Math.round(y0 + (y1 - y0) * s)))
  }
  return tabela
}

function aplicarPreset(buf, total, preset, forca) {
  const passos = []

  // 1. tonalidade: exposição, altas, sombras, brancos, pretos — por máscara de
  //    luminância, escalados por `forca` (é aqui que RAW e Rec709 divergem).
  const ex = (preset.exposicao / 5) * forca
  const alt = (preset.altas / 100) * forca
  const som = (preset.sombras / 100) * forca
  const bra = (preset.brancos / 100) * forca
  const pre = (preset.pretos / 100) * forca
  if (ex || alt || som || bra || pre) {
    for (let i = 0; i < total; i++) {
      const o = i * 3
      const L = (0.2126 * buf[o] + 0.7152 * buf[o + 1] + 0.0722 * buf[o + 2]) / 255
      const mAlta = Math.max(0, (L - 0.45) / 0.55) ** 1.4
      const mSombra = Math.max(0, (0.55 - L) / 0.55) ** 1.4
      const mBranco = Math.max(0, (L - 0.7) / 0.3) ** 1.2
      const mPreto = Math.max(0, (0.3 - L) / 0.3) ** 1.2
      const ganho = 1 + ex + alt * mAlta * 0.55 + bra * mBranco * 0.35
      const soma = (som * mSombra * 0.30 + pre * mPreto * 0.25) * 255
      for (let c = 0; c < 3; c++) buf[o + c] = buf[o + c] * ganho + soma
    }
    passos.push({ etapa: 'tonalidade', exposicao: preset.exposicao, altas: preset.altas, sombras: preset.sombras, brancos: preset.brancos, pretos: preset.pretos, forca })
  }

  // 2. contraste: curva S no pivô 0,5, ancorada nos extremos
  if (preset.contraste) {
    const k = (preset.contraste / 100) * 0.55 * forca
    for (let i = 0; i < total * 3; i++) {
      const x = Math.min(1, Math.max(0, buf[i] / 255))
      buf[i] = (x + k * (x - 0.5) * (1 - Math.abs(2 * x - 1))) * 255
    }
    passos.push({ etapa: 'contraste', valor: preset.contraste })
  }

  // 3. curva de tons: transporte direto, sem escalar por forca. Interpola na
  //    tabela em vez de indexar, para não requantizar em 8 bits no meio.
  if (preset.curva) {
    const tabela = tabelaDaCurva(preset.curva)
    for (let i = 0; i < total * 3; i++) {
      const v = Math.min(255, Math.max(0, buf[i]))
      const b0 = Math.floor(v)
      const t = v - b0
      buf[i] = tabela[b0] * (1 - t) + tabela[Math.min(255, b0 + 1)] * t
    }
    passos.push({ etapa: 'curva-de-tons', pontos: preset.curva })
  }

  // 4. HSL por faixa de matiz + calibração de primários + vibração/saturação
  const temHsl = Object.values(preset.hsl).some((h) => h.hue || h.sat || h.lum)
  const temCal = preset.calibragem.azulHue || preset.calibragem.vermelhoHue || preset.calibragem.verdeHue
  if (temHsl || temCal || preset.vibracao || preset.saturacao) {
    const faixas = Object.entries(FAIXAS_HSL).map(([nome, centro]) => ({ centro, ...preset.hsl[nome] }))
    for (let i = 0; i < total; i++) {
      const o = i * 3
      const r = Math.min(1, Math.max(0, buf[o] / 255))
      const g = Math.min(1, Math.max(0, buf[o + 1] / 255))
      const b = Math.min(1, Math.max(0, buf[o + 2] / 255))
      const max = Math.max(r, g, b)
      const min = Math.min(r, g, b)
      const d = max - min
      if (d < 0.004) continue
      let h = 0
      if (max === r) h = 60 * (((g - b) / d) % 6)
      else if (max === g) h = 60 * ((b - r) / d + 2)
      else h = 60 * ((r - g) / d + 4)
      if (h < 0) h += 360
      const l = (max + min) / 2
      let s = d / (1 - Math.abs(2 * l - 1) || 1e-6)

      let dh = 0
      let ds = 0
      let dl = 0
      // O HSL também escala por `forca`: ele foi calibrado sobre RAW da Canon
      // com perfil Adobe Color, e aqui o ponto de partida é o LUT Log3→Rec709,
      // que responde diferente. Em força cheia, o Hue Yellow +36 do preset
      // puxava o horizonte alaranjado do fim de tarde para verde-oliva.
      for (const f of faixas) {
        let dist = Math.abs(h - f.centro)
        if (dist > 180) dist = 360 - dist
        const peso = Math.max(0, 1 - dist / 45) * forca
        if (!peso) continue
        dh += (f.hue / 100) * 30 * peso
        ds += (f.sat / 100) * peso
        dl += (f.lum / 100) * 0.25 * peso
      }
      // calibração de primários: gira só o azul/vermelho/verde puros
      const pesoAzul = Math.max(0, 1 - Math.abs(((h - 240 + 540) % 360) - 180) / 60) * forca
      dh += (preset.calibragem.azulHue / 100) * 20 * pesoAzul

      // vibração levanta menos o que já está saturado; saturação é linear
      const vib = (preset.vibracao / 100) * (1 - s) * 0.8 * forca
      const sat = (preset.saturacao / 100) * forca
      s = Math.min(1, Math.max(0, s * (1 + ds + sat) + vib))
      const nl = Math.min(1, Math.max(0, l + dl))
      const nh = (h + dh + 360) % 360

      const c2 = (1 - Math.abs(2 * nl - 1)) * s
      const x2 = c2 * (1 - Math.abs(((nh / 60) % 2) - 1))
      const m2 = nl - c2 / 2
      let rr = 0
      let gg = 0
      let bb = 0
      if (nh < 60) { rr = c2; gg = x2 } else if (nh < 120) { rr = x2; gg = c2 } else if (nh < 180) { gg = c2; bb = x2 } else if (nh < 240) { gg = x2; bb = c2 } else if (nh < 300) { rr = x2; bb = c2 } else { rr = c2; bb = x2 }
      buf[o] = (rr + m2) * 255
      buf[o + 1] = (gg + m2) * 255
      buf[o + 2] = (bb + m2) * 255
    }
    passos.push({ etapa: 'cor', vibracao: preset.vibracao, saturacao: preset.saturacao, hsl: temHsl, calibragem: temCal })
  }

  // 5. granulado — PRNG com semente fixa: peça tem que sair igual toda vez
  if (preset.granulado.quantidade) {
    const sigma = (preset.granulado.quantidade / 100) * 14 * forca
    let semente = 0x9e3779b9
    const aleatorio = () => {
      semente ^= semente << 13; semente >>>= 0
      semente ^= semente >> 17
      semente ^= semente << 5; semente >>>= 0
      return semente / 0xffffffff - 0.5
    }
    for (let i = 0; i < total; i++) {
      const o = i * 3
      const ruido = aleatorio() * sigma * 2
      buf[o] += ruido
      buf[o + 1] += ruido
      buf[o + 2] += ruido
    }
    passos.push({ etapa: 'granulado', quantidade: preset.granulado.quantidade, sigma: +sigma.toFixed(2) })
  }

  return passos
}

// HALD CLUT: a ponte entre um look feito no Lightroom/Camera Raw e este worker.
// Preset .xmp é paramétrico do Adobe e não roda fora dele; um HALD identity
// revelado com o preset aplicado carrega o mesmo look como tabela de cor, que
// roda em qualquer lugar. Fluxo: `render.mjs hald --out identity.png`, revelar
// no Lightroom com o preset, exportar PNG sem redimensionar, e passar o arquivo
// revelado em `--lut`.
async function gerarHald(pos, op) {
  if (!op.out) sairUso('hald exige --out <arquivo.png>')
  if (extname(op.out).toLowerCase() !== '.png') sairUso('hald exige saída .png (JPEG destrói a tabela)')
  const nivel = inteiro(op, 'nivel', 8)
  if (nivel < 2 || nivel > 16) sairUso('--nivel entre 2 e 16 (8 = 512×512, 64 passos por canal)')
  const n = nivel * nivel
  const lado = nivel * nivel * nivel
  const px = Buffer.alloc(lado * lado * 3)
  for (let b = 0; b < n; b++) {
    for (let g = 0; g < n; g++) {
      for (let r = 0; r < n; r++) {
        const i = r + g * n + b * n * n
        const o = i * 3
        px[o] = Math.round((r / (n - 1)) * 255)
        px[o + 1] = Math.round((g / (n - 1)) * 255)
        px[o + 2] = Math.round((b / (n - 1)) * 255)
      }
    }
  }
  garantirPasta(op.out)
  const r = await sharp(px, { raw: { width: lado, height: lado, channels: 3 } }).png({ compressionLevel: 9 }).toFile(op.out)
  console.log(JSON.stringify({
    ok: true,
    saida: op.out,
    largura: r.width,
    altura: r.height,
    nivel,
    passosPorCanal: n,
    comoUsar: [
      'importar no Lightroom SEM nenhum ajuste automático',
      'aplicar o preset desejado',
      'exportar PNG no tamanho original, sem redimensionar, sem sharpen de saída, sRGB',
      'usar o arquivo exportado em: render.mjs cor <foto> --out X --lut <hald-revelado.png>',
    ],
  }))
}

async function lerHald(caminho) {
  const { data, info: m } = await sharp(caminho).removeAlpha().raw().toBuffer({ resolveWithObject: true })
  if (m.width !== m.height) sairUso(`HALD precisa ser quadrado: ${m.width}×${m.height}`)
  const nivel = Math.round(Math.cbrt(m.width))
  if (nivel ** 3 !== m.width) sairUso(`largura ${m.width} não é nível³ de HALD — exportou redimensionado?`)
  const n = nivel * nivel
  const dados = new Float32Array(n * n * n * 3)
  for (let b = 0; b < n; b++) {
    for (let g = 0; g < n; g++) {
      for (let r = 0; r < n; r++) {
        const i = r + g * n + b * n * n
        const src = i * m.channels
        const dst = (b * n * n + g * n + r) * 3
        dados[dst] = data[src] / 255
        dados[dst + 1] = data[src + 1] / 255
        dados[dst + 2] = data[src + 2] / 255
      }
    }
  }
  return { n, dmin: [0, 0, 0], dmax: [1, 1, 1], dados, origem: `HALD nível ${nivel}` }
}

function lerCube(caminho) {
  if (!existsSync(caminho)) sairUso(`LUT não existe: ${caminho}`)
  const linhas = readFileSync(caminho, 'utf8').split(/\r?\n/)
  let n = 0
  let dmin = [0, 0, 0]
  let dmax = [1, 1, 1]
  const tabela = []
  for (const bruta of linhas) {
    const l = bruta.trim()
    if (!l || l.startsWith('#')) continue
    if (l.startsWith('TITLE')) continue
    if (l.startsWith('LUT_3D_SIZE')) { n = Number(l.split(/\s+/)[1]); continue }
    if (l.startsWith('LUT_1D_SIZE')) sairUso('LUT 1D não suportado — use um .cube 3D')
    if (l.startsWith('DOMAIN_MIN')) { dmin = l.split(/\s+/).slice(1).map(Number); continue }
    if (l.startsWith('DOMAIN_MAX')) { dmax = l.split(/\s+/).slice(1).map(Number); continue }
    const v = l.split(/\s+/).map(Number)
    if (v.length === 3 && v.every(Number.isFinite)) tabela.push(v)
  }
  if (!n || tabela.length !== n * n * n) sairUso(`.cube inválido: LUT_3D_SIZE ${n}, ${tabela.length} amostras`)
  // .cube varre o vermelho primeiro
  const dados = new Float32Array(n * n * n * 3)
  for (let i = 0; i < tabela.length; i++) {
    dados[i * 3] = tabela[i][0]
    dados[i * 3 + 1] = tabela[i][1]
    dados[i * 3 + 2] = tabela[i][2]
  }
  return { n, dmin, dmax, dados }
}

function aplicarCube(px, lut) {
  const { n, dmin, dmax, dados } = lut
  const saida = [0, 0, 0]
  const idx = [0, 0, 0]
  const fr = [0, 0, 0]
  for (let c = 0; c < 3; c++) {
    const norm = (px[c] / 255 - dmin[c]) / (dmax[c] - dmin[c])
    const p = Math.min(n - 1, Math.max(0, norm * (n - 1)))
    idx[c] = Math.min(n - 2, Math.floor(p))
    fr[c] = p - idx[c]
  }
  // interpolação trilinear sobre os 8 vértices da célula
  for (let c = 0; c < 3; c++) saida[c] = 0
  for (let dz = 0; dz < 2; dz++) {
    for (let dy = 0; dy < 2; dy++) {
      for (let dx = 0; dx < 2; dx++) {
        const peso = (dx ? fr[0] : 1 - fr[0]) * (dy ? fr[1] : 1 - fr[1]) * (dz ? fr[2] : 1 - fr[2])
        if (peso === 0) continue
        const o = ((idx[2] + dz) * n * n + (idx[1] + dy) * n + (idx[0] + dx)) * 3
        saida[0] += dados[o] * peso
        saida[1] += dados[o + 1] * peso
        saida[2] += dados[o + 2] * peso
      }
    }
  }
  return saida.map((v) => Math.min(255, Math.max(0, v * 255)))
}

// Média e desvio por canal, o suficiente para casar uma imagem com o padrão de
// cor de um conjunto de fotos já aprovadas (transferência de Reinhard).
async function estatisticaRGB(caminhos) {
  let somaN = 0
  const soma = [0, 0, 0]
  const soma2 = [0, 0, 0]
  for (const c of caminhos) {
    const { data, info: m } = await sharp(c).resize(320, 320, { fit: 'inside' }).raw().toBuffer({ resolveWithObject: true })
    const n = m.width * m.height
    for (let i = 0; i < n; i++) {
      for (let k = 0; k < 3; k++) {
        const v = data[i * m.channels + k]
        soma[k] += v
        soma2[k] += v * v
      }
    }
    somaN += n
  }
  return [0, 1, 2].map((k) => {
    const media = soma[k] / somaN
    return { media, desvio: Math.sqrt(Math.max(1, soma2[k] / somaN - media * media)) }
  })
}

function arquivosDeImagem(alvo) {
  if (!existsSync(alvo)) sairUso(`referência não existe: ${alvo}`)
  if (!statSync(alvo).isDirectory()) return [alvo]
  const lista = readdirSync(alvo)
    .filter((f) => /\.(jpe?g|png|webp)$/i.test(f))
    .map((f) => `${alvo}/${f}`)
  if (!lista.length) sairUso(`pasta de referência sem imagem: ${alvo}`)
  return lista
}

async function cor(pos, op) {
  const [entrada] = pos
  if (!entrada || !op.out) sairUso('cor exige <entrada> e --out')
  if (!existsSync(entrada)) sairUso(`arquivo não existe: ${entrada}`)
  if (op.lut && op.perfil) sairUso('use --lut ou --perfil, não os dois')

  let caminhoLut = op.lut
  let exposicao = op.exposicao
  if (op.perfil) {
    const p = resolverPerfil(op.perfil, entrada)
    if (!p) sairUso(`perfil desconhecido: ${op.perfil} (tem: ${Object.keys(PERFIS).join(', ')})`)
    // Nem todo perfil tem LUT: só o frame de vídeo precisa converter curva de
    // câmera. RAW e iPhone chegam já em espaço de exibição.
    if (p.lut) {
      caminhoLut = resolve(dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..', p.lut)
    }
    exposicao = exposicao ?? p.exposicao
  }
  exposicao = exposicao ?? 'off'
  if (!['auto', 'off'].includes(exposicao)) sairUso('--exposicao aceita auto ou off')
  const forca = numero(op, 'forca', 0.7)
  if (forca < 0 || forca > 1) sairUso('--forca entre 0 e 1')
  const perfil = op.perfil ? resolverPerfil(op.perfil, entrada) : {}
  const curva = numero(op, 'curva', perfil.curva ?? 0)
  if (curva < 0 || curva > 1) sairUso('--curva entre 0 e 1')
  const saturacao = op.saturacao === 'auto' ? 'auto' : numero(op, 'saturacao', perfil.saturacao ?? 1)
  const nitidez = numero(op, 'nitidez', perfil.nitidez ?? 0)
  if (nitidez < 0 || nitidez > 5) sairUso('--nitidez entre 0 e 5')
  const qualidade = inteiro(op, 'qualidade', 92)
  garantirPasta(op.out)

  const decod = decodificarSePreciso(entrada)
  // `raw({depth:'ushort'})` sozinho NÃO preserva 16 bits: o Sharp converte o
  // pipeline para 8 bits e só o container sai com 2 bytes, com o byte alto
  // zerado (média 201, máximo 255 num arquivo que tem 65535). É preciso pedir
  // `toColourspace('rgb16')` para o pipeline inteiro ficar em 16.
  const bruto16 = decod.bits === 16
  let entradaSharp = sharp(decod.arquivo)
  if (bruto16) entradaSharp = entradaSharp.toColourspace('rgb16')
  const { data, info: meta } = await entradaSharp
    .raw(bruto16 ? { depth: 'ushort' } : {})
    .toBuffer({ resolveWithObject: true })
  if (decod.temporario) unlinkSync(decod.temporario)
  const { width: W, height: H, channels: C } = meta
  const total = W * H
  const aplicado = []
  if (decod.temporario) {
    aplicado.push({ etapa: 'decodificacao', via: 'magick', formato: extname(entrada).toLowerCase(), bits: decod.bits })
  }

  // O pipeline inteiro roda em float e quantiza UMA vez, no fim. Em 8 bits, seis
  // transformações empilhadas (LUT, níveis, tonalidade, contraste, curva, HSL)
  // arredondam seis vezes e o céu do fim de tarde vira faixa de cor. Erro pago
  // em 2026-08-08, na primeira aplicação do preset.
  // Tudo trabalha na escala 0–255 em float, venha de 8 ou de 16 bits. Vindo de
  // 16, a divisão por 257 preserva as casas decimais — a latitude continua lá,
  // ela só deixa de ser inteira.
  const fonte = bruto16 ? new Uint16Array(data.buffer, data.byteOffset, data.length / 2) : data
  const escala = bruto16 ? 1 / 257 : 1
  const buf = new Float32Array(total * 3)
  for (let i = 0; i < total; i++) {
    const o = i * C
    buf[i * 3] = fonte[o] * escala
    buf[i * 3 + 1] = fonte[o + 1] * escala
    buf[i * 3 + 2] = fonte[o + 2] * escala
  }
  const alfa = C === 4 ? new Uint8Array(total) : null
  if (alfa) for (let i = 0; i < total; i++) alfa[i] = Math.round(fonte[i * C + 3] * escala)

  // Níveis por percentil sobre a luminância: 0,3% de clip em cada ponta.
  const normalizarNiveis = () => {
    if (exposicao !== 'auto') return
    const hist = new Uint32Array(256)
    for (let i = 0; i < total; i++) {
      const o = i * 3
      const v = Math.round(0.2126 * buf[o] + 0.7152 * buf[o + 1] + 0.0722 * buf[o + 2])
      hist[Math.min(255, Math.max(0, v))]++
    }
    const corte = Math.round(total * 0.003)
    let baixo = 0
    let alto = 255
    for (let acc = 0, v = 0; v < 256; v++) { acc += hist[v]; if (acc > corte) { baixo = v; break } }
    for (let acc = 0, v = 255; v >= 0; v--) { acc += hist[v]; if (acc > corte) { alto = v; break } }
    if (alto - baixo > 20) {
      const ganho = 255 / (alto - baixo)
      for (let i = 0; i < total * 3; i++) buf[i] = (buf[i] - baixo) * ganho
      aplicado.push({ etapa: 'exposicao', preto: baixo, branco: alto })
    } else {
      aplicado.push({ etapa: 'exposicao', pulada: 'faixa dinâmica curta demais para normalizar' })
    }
  }

  if (caminhoLut) {
    if (!existsSync(caminhoLut)) sairUso(`LUT não existe: ${caminhoLut}`)
    const ehHald = ['.png', '.tif', '.tiff'].includes(extname(caminhoLut).toLowerCase())
    const lut = ehHald ? await lerHald(caminhoLut) : lerCube(caminhoLut)
    // Cache pela cor de entrada (a origem é uint8, então há no máximo 16,7M
    // chaves e na prática muito menos); a saída fica em float.
    const cache = new Map()
    for (let i = 0; i < total; i++) {
      const o = i * 3
      const chave = (buf[o] << 16) | (buf[o + 1] << 8) | buf[o + 2]
      let v = cache.get(chave)
      if (v === undefined) {
        v = aplicarCube([buf[o], buf[o + 1], buf[o + 2]], lut)
        if (cache.size < 1 << 20) cache.set(chave, v)
      }
      buf[o] = v[0]
      buf[o + 1] = v[1]
      buf[o + 2] = v[2]
    }
    aplicado.push({ etapa: 'lut', arquivo: caminhoLut, tamanho: lut.n })
  }

  // Normalização de níveis vem logo depois do LUT: o preset foi desenhado para
  // um RAW já com preto e branco no lugar, e a curva dele levanta o preto de
  // propósito. Rodar a exposição DEPOIS do preset desfaz exatamente isso — na
  // primeira tentativa o preto voltou de 8 para 58. Erro pago em 2026-08-08.
  normalizarNiveis()

  // Ordem que o Daniel definiu: LUT (curva da câmera) primeiro, preset depois,
  // ajustes finais por último. O preset é de Rec709 revelado — entrar antes do
  // LUT seria aplicá-lo em log.
  if (op.preset) {
    const preset = lerPresetXmp(op.preset)
    const forcaPreset = numero(op, 'preset-forca', 1)
    if (forcaPreset < 0 || forcaPreset > 1) sairUso('--preset-forca entre 0 e 1')
    const passos = aplicarPreset(buf, total, preset, forcaPreset)
    aplicado.push({ etapa: 'preset', nome: preset.nome, forca: forcaPreset, passos, naoTransportado: preset.ignorados })
  }

  if (op.referencia) {
    const alvo = await estatisticaRGB(arquivosDeImagem(op.referencia))
    const soma = [0, 0, 0]
    const soma2 = [0, 0, 0]
    for (let i = 0; i < total; i++) {
      const o = i * 3
      for (let k = 0; k < 3; k++) { soma[k] += buf[o + k]; soma2[k] += buf[o + k] * buf[o + k] }
    }
    const origem = [0, 1, 2].map((k) => {
      const media = soma[k] / total
      return { media, desvio: Math.sqrt(Math.max(1, soma2[k] / total - media * media)) }
    })
    for (let i = 0; i < total; i++) {
      const o = i * 3
      for (let k = 0; k < 3; k++) {
        const casado = (buf[o + k] - origem[k].media) * (alvo[k].desvio / origem[k].desvio) + alvo[k].media
        buf[o + k] += (casado - buf[o + k]) * forca
      }
    }
    aplicado.push({ etapa: 'referencia', forca, alvo: alvo.map((a) => Math.round(a.media)) })
  }

  // (a normalização de níveis já rodou acima, antes do preset)

  if (curva > 0) {
    // Curva S ancorada nos extremos: o deslocamento é máximo em 0,25 e 0,75 e
    // vai a zero em 0 e 1, então preto e branco ficam onde a exposição colocou.
    for (let i = 0; i < total * 3; i++) {
      const x = Math.min(1, Math.max(0, buf[i] / 255))
      buf[i] = (x + curva * (x - 0.5) * (1 - Math.abs(2 * x - 1))) * 255
    }
    aplicado.push({ etapa: 'curva', valor: curva })
  }

  // Saturação é ALVO, não ganho fixo: ganho 1,6 numa cena já colorida (o prato
  // de pão com tomate) deixa a cor artificial, e a mesma 1,6 mal levanta um
  // frame de fim de tarde. `auto` mede a saturação da imagem e mira o valor das
  // fotos exportadas do canal (~26%). Erro pago em 2026-08-08.
  if (saturacao !== 1) {
    const medir = () => {
      let soma = 0
      for (let i = 0; i < total; i++) {
        const o = i * 3
        const max = Math.max(buf[o], buf[o + 1], buf[o + 2])
        const min = Math.min(buf[o], buf[o + 1], buf[o + 2])
        soma += max <= 0 ? 0 : (max - min) / max
      }
      return (soma / total) * 100
    }
    const aplicarGanho = (k) => {
      for (let i = 0; i < total; i++) {
        const o = i * 3
        const cinza = 0.2126 * buf[o] + 0.7152 * buf[o + 1] + 0.0722 * buf[o + 2]
        for (let c = 0; c < 3; c++) buf[o + c] = cinza + (buf[o + c] - cinza) * k
      }
    }
    if (saturacao === 'auto') {
      const antes = medir()
      const ganhos = []
      // duas passadas: o ganho no RGB não é linear na métrica de saturação
      for (let passo = 0; passo < 2; passo++) {
        const atual = medir()
        if (atual < 0.5) break
        const k = Math.min(2, Math.max(1, ALVO_SATURACAO / atual))
        if (Math.abs(k - 1) < 0.02) break
        aplicarGanho(k)
        ganhos.push(+k.toFixed(3))
      }
      aplicado.push({ etapa: 'saturacao', modo: 'auto', alvo: ALVO_SATURACAO, de: +antes.toFixed(1), para: +medir().toFixed(1), ganhos })
    } else {
      aplicarGanho(saturacao)
      aplicado.push({ etapa: 'saturacao', valor: saturacao })
    }
  }

  // Quantização única, com dither de ±0,5 LSB: sem ele, gradiente amplo (céu ao
  // entardecer) ainda mostra degrau na volta para 8 bits. Semente fixa, para a
  // peça sair idêntica em toda montagem.
  const saidaPx = Buffer.alloc(total * C)
  let semente = 0x2545f491
  const ruido = () => {
    semente ^= semente << 13; semente >>>= 0
    semente ^= semente >> 17
    semente ^= semente << 5; semente >>>= 0
    return semente / 0xffffffff - 0.5
  }
  for (let i = 0; i < total; i++) {
    const o = i * 3
    const d = i * C
    for (let c = 0; c < 3; c++) {
      saidaPx[d + c] = Math.min(255, Math.max(0, Math.round(buf[o + c] + ruido())))
    }
    if (alfa) saidaPx[d + 3] = alfa[i]
  }

  let img = sharp(saidaPx, { raw: { width: W, height: H, channels: C } })
  if (nitidez > 0) {
    // Sharpen por último, depois de cor: afiar antes faz a curva e a saturação
    // trabalharem em cima do halo. Frame 16:9 vira 3:4 com upscale de ~1,33×
    // no slide, então o sharpen aqui também compensa essa ampliação.
    img = sharp(await img.png().toBuffer()).sharpen({ sigma: nitidez })
    aplicado.push({ etapa: 'nitidez', sigma: nitidez })
  }
  const formato = extname(op.out).slice(1).toLowerCase()
  if (formato === 'png') img = img.png()
  else if (formato === 'webp') img = img.webp({ quality: qualidade })
  else if (['jpg', 'jpeg'].includes(formato)) img = img.jpeg({ quality: qualidade })
  else sairUso(`formato de saída não suportado: .${formato}`)
  const r = await img.toFile(op.out)
  console.log(JSON.stringify({ ok: true, saida: op.out, largura: r.width, altura: r.height, aplicado }))
}

// ── rostos ──────────────────────────────────────────────────────────────────
// Texto sobre a cara de alguém é erro que não se negocia, e nenhuma métrica de
// pixel resolve: pele por cor acusa fruta e parede ocre, detalhe não separa
// rosto de fachada. O Chromium do Playwright não expõe FaceDetector (testado em
// 2026-08-08, com e sem as flags de Shape Detection), então quem enxerga é o
// LLM da assinatura Max, via `claude -p` — nunca a API paga (regra 1).
//
// O resultado fica em cache num `.rostos.json` ao lado da imagem: peça tem que
// sair igual em toda montagem, e chamar modelo a cada render seria lento e
// variável. `--forcar` refaz a detecção quando a imagem muda.
// Cache por SHA-1 do conteúdo, não por caminho: o `checar` recria os slides em
// pasta temporária a cada rodada, e cache por caminho faria o detector rodar de
// novo toda vez. Detector é LLM e varia entre chamadas — na primeira rodada a
// nuca da Paula no slide 8 virou "rosto" e sumiu na seguinte. Mesmo pixel,
// mesmo veredito.
function caminhoCacheRostos(imagem, pastaCache) {
  const hash = createHash('sha1').update(readFileSync(imagem)).digest('hex').slice(0, 16)
  const pasta = pastaCache || resolve(dirname(resolve(imagem)), '.rostos')
  mkdirSync(pasta, { recursive: true })
  return resolve(pasta, `${hash}.json`)
}

async function rostos(pos, op) {
  const [entrada] = pos
  if (!entrada) sairUso('rostos exige <imagem>')
  if (!existsSync(entrada)) sairUso(`arquivo não existe: ${entrada}`)
  const cache = caminhoCacheRostos(entrada, op.cache)

  if (existsSync(cache) && !op.forcar) {
    const guardado = JSON.parse(readFileSync(cache, 'utf8'))
    console.log(JSON.stringify({ ok: true, imagem: entrada, origem: 'cache', ...guardado }))
    return
  }

  const reduzida = resolve(tmpdir(), `np-rostos-${Date.now()}.jpg`)
  await sharp(entrada).resize(1024, null, { fit: 'inside' }).jpeg({ quality: 88 }).toFile(reduzida)

  // O prompt exige feições visíveis: pessoa de costas não é rosto para efeito de
  // diagramação, e sem essa cláusula o detector marcou a nuca da Paula no slide 8.
  const prompt = `Leia a imagem ${reduzida} e responda SO com JSON, sem texto antes ou depois, no formato {"rostos":[{"x":0.0,"y":0.0,"w":0.0,"h":0.0}]}. Cada objeto e a caixa do rosto de UMA pessoa, em FRACAO da largura e altura da imagem (0 a 1), com x,y do canto superior esquerdo e a caixa indo do queixo ao topo da testa. REGRAS: conte apenas rostos com feicoes visiveis (pelo menos olhos ou boca aparecendo). NAO conte pessoa de costas, nuca, cabeca coberta, rosto em foto dentro da foto, cartaz, estatua, manequim ou reflexo. Se nao houver nenhum rosto assim, devolva {"rostos":[]}.`

  let bruto
  try {
    // `claude` no Windows é um .cmd: vai por `cmd /c` em vez de shell:true,
    // que concatena argumentos sem escapar (Node avisa, DEP0190).
    const viaCmd = process.platform === 'win32'
    bruto = execFileSync(
      viaCmd ? 'cmd' : 'claude',
      viaCmd ? ['/c', 'claude', '-p', '--allowedTools', 'Read'] : ['-p', '--allowedTools', 'Read'],
      { input: prompt, encoding: 'utf8', maxBuffer: 1 << 20 },
    )
  } catch (e) {
    unlinkSync(reduzida)
    throw new Error(`falha ao chamar claude -p: ${e.message}`)
  }
  unlinkSync(reduzida)

  const casado = bruto.match(/\{[\s\S]*\}/)
  if (!casado) throw new Error(`resposta sem JSON: ${bruto.slice(0, 200)}`)
  const lista = JSON.parse(casado[0]).rostos
  if (!Array.isArray(lista)) throw new Error('resposta sem campo rostos')
  const validos = lista
    .filter((r) => ['x', 'y', 'w', 'h'].every((k) => Number.isFinite(r[k])))
    .map((r) => ({ x: +r.x.toFixed(3), y: +r.y.toFixed(3), w: +r.w.toFixed(3), h: +r.h.toFixed(3) }))

  // Faixa vertical proibida: do topo do rosto mais alto à base do mais baixo,
  // com folga. Texto encostado no queixo lê tão mal quanto texto em cima dele.
  const FOLGA = 0.03
  const zona = validos.length
    ? {
        y0: +Math.max(0, Math.min(...validos.map((r) => r.y)) - FOLGA).toFixed(3),
        y1: +Math.min(1, Math.max(...validos.map((r) => r.y + r.h)) + FOLGA).toFixed(3),
      }
    : null

  const saida = { rostos: validos, zonaProibida: zona, folga: FOLGA }
  writeFileSync(cache, JSON.stringify(saida, null, 2))
  console.log(JSON.stringify({ ok: true, imagem: entrada, origem: 'deteccao', cache, ...saida }))
}

// ── indexar-fotos ───────────────────────────────────────────────────────────
// Espelha, para foto, o índice que o `edicao-num-pulo` mantém para vídeo. Mesma
// pasta `_index` do destino, arquivo separado (`_index/fotos/`) para não haver
// dúvida sobre o que é foto e o que é clipe.
//
// ATENÇÃO: escreve no acervo. A regra 4 do CLAUDE.md é "acervo somente leitura";
// o Daniel abriu esta exceção em 2026-08-08, restrita a `_index/fotos/`. Nada
// fora dessa pasta é criado, movido ou alterado.
const EXT_FOTO = new Set(['.jpg', '.jpeg', '.png', '.heic', '.heif', '.tif', '.tiff', '.webp', '.cr3', '.cr2', '.dng', '.arw', '.nef'])

function lerExif(arquivos) {
  const lote = execFileSync('exiftool', [
    '-json', '-charset', 'filename=utf8', '-n',
    '-Model', '-LensModel', '-DateTimeOriginal', '-CreateDate',
    '-ImageWidth', '-ImageHeight', '-Orientation', '-GPSLatitude', '-GPSLongitude',
    ...arquivos,
  ], { encoding: 'utf8', maxBuffer: 1 << 28 })
  return JSON.parse(lote)
}

async function indexarFotos(pos, op) {
  const [destino] = pos
  if (!destino) sairUso('indexar-fotos exige <pasta-do-destino>')
  if (!existsSync(destino)) sairUso(`destino não existe: ${destino}`)
  const subpasta = op.pasta || 'Fotografia'
  const raiz = resolve(destino, subpasta)
  if (!existsSync(raiz)) sairUso(`sem pasta ${subpasta} em ${destino} — passe --pasta se o nome for outro`)

  const arquivos = []
  const varrer = (dir) => {
    for (const nome of readdirSync(dir)) {
      const alvo = resolve(dir, nome)
      if (statSync(alvo).isDirectory()) varrer(alvo)
      else if (EXT_FOTO.has(extname(nome).toLowerCase())) arquivos.push(alvo)
    }
  }
  varrer(raiz)
  if (!arquivos.length) sairUso(`nenhuma foto em ${raiz}`)

  const exif = lerExif(arquivos)
  const porArquivo = new Map(exif.map((e) => [resolve(e.SourceFile), e]))
  const nomeDestino = basename(resolve(destino))

  const saidaDir = op.out ? resolve(op.out) : resolve(destino, '_index', 'fotos')
  mkdirSync(saidaDir, { recursive: true })
  const cacheDir = resolve(saidaDir, '.descricoes')
  if (op.descrever) mkdirSync(cacheDir, { recursive: true })

  const registros = []
  for (const arq of arquivos) {
    const e = porArquivo.get(arq) || {}
    const largura = e.ImageWidth ?? null
    const altura = e.ImageHeight ?? null
    // Derivado: versão reduzida ou recorte feito para outro uso. Fica no índice
    // (é rastro), mas marcado, para peça não escolher a cópia pequena por acaso.
    const relativo = relative(raiz, arq).toLowerCase()
    const derivado = /(^|[\\/])(reduzida|para o video|thumbs?)([\\/]|$)/.test(relativo)
      || /_reduzida|_pequena|-small|\.jpg\.png$/.test(basename(arq).toLowerCase())
    const reg = {
      caminho: arq,
      destino: nomeDestino,
      pasta: relative(raiz, dirname(arq)) || '.',
      arquivo: basename(arq),
      camera: e.Model || '',
      lente: e.LensModel || '',
      recorded_date: e.DateTimeOriginal || e.CreateDate || '',
      formato: extname(arq).slice(1).toLowerCase(),
      resolucao: largura && altura ? `${largura}x${altura}` : '',
      orientacao: largura && altura ? (largura >= altura ? 'paisagem' : 'retrato') : '',
      megapixels: largura && altura ? +((largura * altura) / 1e6).toFixed(1) : null,
      derivado,
      lat: e.GPSLatitude ?? null,
      lon: e.GPSLongitude ?? null,
      landmark: '',
      descricao: '',
      tags: [],
      rostos: null,
    }

    if (op.descrever) {
      const hash = createHash('sha1').update(arq).digest('hex').slice(0, 16)
      const cache = resolve(cacheDir, `${hash}.json`)
      let visto
      if (existsSync(cache)) {
        visto = JSON.parse(readFileSync(cache, 'utf8'))
      } else {
        const reduzida = resolve(tmpdir(), `np-idx-${hash}.jpg`)
        const decod = decodificarSePreciso(arq)
        await sharp(decod.arquivo).rotate().resize(900, null, { fit: 'inside' }).jpeg({ quality: 82 }).toFile(reduzida)
        if (decod.temporario) unlinkSync(decod.temporario)
        const prompt = `Leia a imagem ${reduzida} e responda SO com JSON, sem texto antes ou depois: {"descricao":"...","landmark":"...","tags":["..."],"rostos":0}. descricao: uma frase objetiva do que aparece, em portugues, como legenda de acervo (sem juizo de valor, sem adjetivo de propaganda). landmark: nome do ponto turistico ou lugar reconhecivel, ou "" se nao houver. tags: 2 a 5 palavras curtas (ex: externo, comida, arquitetura, retrato, praia, noite). rostos: quantas pessoas tem rosto com feicoes visiveis.`
        const viaCmd = process.platform === 'win32'
        const bruto = execFileSync(
          viaCmd ? 'cmd' : 'claude',
          viaCmd ? ['/c', 'claude', '-p', '--allowedTools', 'Read'] : ['-p', '--allowedTools', 'Read'],
          { input: prompt, encoding: 'utf8', maxBuffer: 1 << 20 },
        )
        unlinkSync(reduzida)
        const casado = bruto.match(/\{[\s\S]*\}/)
        visto = casado ? JSON.parse(casado[0]) : { descricao: '', landmark: '', tags: [], rostos: null }
        writeFileSync(cache, JSON.stringify(visto))
      }
      reg.descricao = visto.descricao || ''
      reg.landmark = visto.landmark || ''
      reg.tags = Array.isArray(visto.tags) ? visto.tags : []
      reg.rostos = Number.isFinite(visto.rostos) ? visto.rostos : null
      process.stderr.write(`. ${reg.arquivo}\n`)
    }
    registros.push(reg)
  }

  const colunas = ['caminho', 'destino', 'pasta', 'arquivo', 'camera', 'lente', 'recorded_date',
    'formato', 'resolucao', 'orientacao', 'megapixels', 'derivado', 'lat', 'lon', 'landmark', 'descricao', 'tags', 'rostos']
  const escapar = (v) => {
    const s = Array.isArray(v) ? v.join(', ') : v === null || v === undefined ? '' : String(v)
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const csv = [colunas.join(','), ...registros.map((r) => colunas.map((c) => escapar(r[c])).join(','))].join('\n')
  writeFileSync(resolve(saidaDir, 'index.csv'), csv, 'utf8')
  writeFileSync(resolve(saidaDir, 'index.json'), JSON.stringify(registros, null, 1), 'utf8')

  console.log(JSON.stringify({
    ok: true,
    destino: nomeDestino,
    pastaLida: raiz,
    fotos: registros.length,
    comDescricao: registros.filter((r) => r.descricao).length,
    saida: [resolve(saidaDir, 'index.csv'), resolve(saidaDir, 'index.json')],
  }))
}

// ── checar ──────────────────────────────────────────────────────────────────
// Auditoria final: texto em cima de rosto, no slide RENDERIZADO. Medir rosto na
// imagem de origem não basta — `object-fit: cover` recorta, o split comprime a
// foto em meia altura e o bloco de texto tem posição própria. No slide 10 a
// medição na imagem dizia zona 0,44–0,77 e o conflito real só aparece depois do
// cover. Erro apontado pelo Daniel em 2026-08-08.
//
// Rosto menor que --minimo (fração da altura do slide) não conta: turista no
// fundo da multidão não é o mesmo problema que a cara de quem assina o canal.
async function checar(pos, op) {
  const [arquivo] = pos
  if (!arquivo) sairUso('checar exige <arquivo.html>')
  if (!existsSync(arquivo)) sairUso(`arquivo não existe: ${arquivo}`)
  const largura = inteiro(op, 'largura', 1080)
  const altura = inteiro(op, 'altura', 1440)
  const minimo = numero(op, 'minimo', 0.06)
  const pasta = resolve(tmpdir(), `np-checar-${Date.now()}`)
  mkdirSync(pasta, { recursive: true })
  // Cache de rostos fica ao lado da fonte, não no temporário: assim a auditoria
  // repetida da mesma peça não redetecta nem muda de veredito.
  const pastaCache = op.cache || resolve(dirname(resolve(arquivo)), '.rostos')
  mkdirSync(pastaCache, { recursive: true })

  const browser = await chromium.launch()
  let caixas
  let quantos
  try {
    const page = await browser.newPage({ viewport: { width: largura, height: altura } })
    await page.goto(pathToFileURL(resolve(arquivo)).href, { waitUntil: 'networkidle' })
    await page.evaluate(() => document.fonts.ready)
    const medido = await page.evaluate(() => {
      const slides = [...document.querySelectorAll('.slide')]
      return slides.map((s) => {
        const base = s.getBoundingClientRect()
        const alvos = [...s.querySelectorAll('.bloco, .marcador, .assinatura')]
        return alvos.map((el) => {
          const r = el.getBoundingClientRect()
          return {
            classe: el.className,
            y0: (r.top - base.top) / base.height,
            y1: (r.bottom - base.top) / base.height,
            x0: (r.left - base.left) / base.width,
            x1: (r.right - base.left) / base.width,
          }
        })
      })
    })
    caixas = medido
    quantos = medido.length
    for (let i = 0; i < quantos; i++) {
      await page.evaluate((n) => document.querySelectorAll('.slide')[n].scrollIntoView(), i)
      const el = await page.$(`.slide:nth-of-type(${i + 1})`)
      await el.screenshot({ path: `${pasta}/slide-${String(i + 1).padStart(2, '0')}.png` })
    }
  } finally {
    await browser.close()
  }

  const conflitos = []
  const porSlide = []
  for (let i = 0; i < quantos; i++) {
    const n = String(i + 1).padStart(2, '0')
    const arq = `${pasta}/slide-${n}.png`
    const saidaRostos = execFileSync(process.execPath, [
      new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'),
      'rostos', arq, '--cache', pastaCache,
    ], { encoding: 'utf8', maxBuffer: 1 << 20 })
    const det = JSON.parse(saidaRostos)
    const grandes = det.rostos.filter((r) => r.h >= minimo)
    const meus = []
    for (const r of grandes) {
      for (const c of caixas[i]) {
        const cruzaY = c.y1 > r.y && c.y0 < r.y + r.h
        const cruzaX = c.x1 > r.x && c.x0 < r.x + r.w
        if (cruzaY && cruzaX) {
          meus.push({ elemento: c.classe, rosto: r })
        }
      }
    }
    porSlide.push({ slide: i + 1, rostos: grandes.length, rostosIgnorados: det.rostos.length - grandes.length, conflitos: meus.length })
    if (meus.length) conflitos.push({ slide: i + 1, ocorrencias: meus })
  }

  console.log(JSON.stringify({
    ok: conflitos.length === 0,
    fonte: arquivo,
    slides: quantos,
    minimoAlturaRosto: minimo,
    resumo: porSlide,
    conflitos,
    capturas: pasta,
  }, null, 2))
  if (conflitos.length) process.exit(1)
}

// ── analisar ────────────────────────────────────────────────────────────────
// Onde o texto cabe numa foto é medição, não olho: luminância diz se o branco
// lê, desvio diz se a área é limpa ou cheia de detalhe. O slide 3 (fachada da
// Casa Batlló) e o slide 5 (texto na cara da Paula) foram os dois erros pagos
// em 2026-08-08 por escolher âncora e scrim no chute.
function luminanciaRelativa(r, g, b) {
  const lin = (v) => { const s = v / 255; return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4 }
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
}

// Alfa de scrim preto que leva o contraste com texto branco ao alvo.
function scrimNecessario(L, alvo) {
  const permitido = 1.05 / alvo - 0.05
  if (L <= permitido) return 0
  return Math.min(0.9, Math.round((1 - permitido / L) * 100) / 100)
}

// Luminância média não é suficiente. O título do slide 3 caiu numa faixa que
// pedia scrim 0.17 por brilho e mesmo assim não lia: a fachada da Casa Batlló
// tem detalhe 57, e texto branco sobre padrão de alto contraste local se perde
// mesmo quando a média está escura. O scrim de texto é o maior dos dois.
function scrimPorDetalhe(desvio) {
  if (desvio <= 25) return 0
  return Math.min(0.65, Math.round(((desvio - 25) / 60) * 100) / 100)
}

// Pele: YCbCr (Chai & Ngan) E RGB (Kovac) ao mesmo tempo. Luminância não separa
// pele de parede, crominância separa — mas YCbCr sozinho acusa 24% de "pele" na
// fachada bege da Casa Batlló. O AND com Kovac derruba fachada, madeira e areia,
// que empatam em crominância e perdem na relação entre canais.
// Serve para uma coisa só: marcar a zona onde NÃO se escreve. Detalhe alto não
// pega rosto — no slide 5 a Paula estava sobre fundo escuro e uniforme, e a
// métrica de detalhe mandou o texto justo na cara dela.
function ehPele(r, g, b) {
  const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b
  const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b
  const y = 0.299 * r + 0.587 * g + 0.114 * b
  const cromaOk = y > 40 && cb >= 77 && cb <= 127 && cr >= 133 && cr <= 173
  if (!cromaOk) return false
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  return r > 95 && g > 40 && b > 20 && max - min > 15 && r - g > 15 && r > g && r > b
}

async function analisar(pos, op) {
  const [entrada] = pos
  if (!entrada) sairUso('analisar exige <imagem>')
  if (!existsSync(entrada)) sairUso(`arquivo não existe: ${entrada}`)
  const g = (op.grade || '3x4').split('x').map(Number)
  if (g.length !== 2 || g.some((n) => !Number.isInteger(n) || n < 1)) sairUso('--grade malformada: use "colunasxlinhas", ex "3x4"')
  const [cols, linhas] = g
  const alvo = numero(op, 'alvo', 4.5)

  const larguraAmostra = 480
  const { data, info: m } = await sharp(entrada)
    .resize(larguraAmostra, null, { fit: 'inside' })
    .raw()
    .toBuffer({ resolveWithObject: true })
  const { width: W, height: H, channels: C } = m

  // Métricas globais: servem para comparar frame tratado com foto exportada por
  // número, em vez de "achei que ficou perto". Nitidez é energia de gradiente
  // (Sobel simplificado), normalizada pela amostra, então só compara entre
  // imagens medidas na mesma largura.
  const globais = (() => {
    let somaY = 0
    let soma2Y = 0
    let somaSat = 0
    let somaGrad = 0
    let nGrad = 0
    const n = W * H
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const o = (y * W + x) * C
        const r = data[o]
        const g = data[o + 1]
        const b = data[o + 2]
        const cinza = 0.2126 * r + 0.7152 * g + 0.0722 * b
        somaY += cinza
        soma2Y += cinza * cinza
        const max = Math.max(r, g, b)
        const min = Math.min(r, g, b)
        somaSat += max === 0 ? 0 : (max - min) / max
        if (x + 1 < W && y + 1 < H) {
          const oq = (y * W + x + 1) * C
          const ob = ((y + 1) * W + x) * C
          const gx = cinza - (0.2126 * data[oq] + 0.7152 * data[oq + 1] + 0.0722 * data[oq + 2])
          const gy = cinza - (0.2126 * data[ob] + 0.7152 * data[ob + 1] + 0.0722 * data[ob + 2])
          somaGrad += Math.sqrt(gx * gx + gy * gy)
          nGrad++
        }
      }
    }
    const mediaY = somaY / n
    return {
      brilho: +mediaY.toFixed(1),
      contraste: +Math.sqrt(Math.max(0, soma2Y / n - mediaY * mediaY)).toFixed(1),
      saturacao: +((somaSat / n) * 100).toFixed(1),
      nitidez: +(somaGrad / nGrad).toFixed(2),
    }
  })()

  const celulas = []
  for (let ly = 0; ly < linhas; ly++) {
    for (let lx = 0; lx < cols; lx++) {
      const x0 = Math.floor((lx * W) / cols)
      const x1 = Math.floor(((lx + 1) * W) / cols)
      const y0 = Math.floor((ly * H) / linhas)
      const y1 = Math.floor(((ly + 1) * H) / linhas)
      let soma = 0
      let soma2 = 0
      let somaL = 0
      let pele = 0
      let n = 0
      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
          const o = (y * W + x) * C
          const cinza = 0.2126 * data[o] + 0.7152 * data[o + 1] + 0.0722 * data[o + 2]
          soma += cinza
          soma2 += cinza * cinza
          somaL += luminanciaRelativa(data[o], data[o + 1], data[o + 2])
          if (ehPele(data[o], data[o + 1], data[o + 2])) pele++
          n++
        }
      }
      const media = soma / n
      const desvio = Math.sqrt(Math.max(0, soma2 / n - media * media))
      const L = somaL / n
      celulas.push({
        col: lx, linha: ly,
        fracao: { x: +(lx / cols).toFixed(3), y: +(ly / linhas).toFixed(3), w: +(1 / cols).toFixed(3), h: +(1 / linhas).toFixed(3) },
        brilho: Math.round(media),
        detalhe: Math.round(desvio),
        pele: +((pele / n) * 100).toFixed(1),
        contrasteBranco: +(1.05 / (L + 0.05)).toFixed(2),
        scrim: Math.max(scrimNecessario(L, alvo), scrimPorDetalhe(desvio)),
        scrimPorBrilho: scrimNecessario(L, alvo),
        scrimPorDetalhe: scrimPorDetalhe(desvio),
      })
    }
  }

  const faixa = (nome, de, ate) => {
    const dentro = celulas.filter((c) => c.linha >= de && c.linha < ate)
    const media = (f) => dentro.reduce((s, c) => s + f(c), 0) / dentro.length
    return {
      nome,
      linhas: [de, ate - 1],
      brilho: Math.round(media((c) => c.brilho)),
      detalhe: Math.round(media((c) => c.detalhe)),
      pele: +Math.max(...dentro.map((c) => c.pele)).toFixed(1),
      scrim: +Math.max(...dentro.map((c) => c.scrim)).toFixed(2),
    }
  }
  const t = Math.max(1, Math.round(linhas / 3))
  const faixas = [faixa('cima', 0, t), faixa('meio', t, linhas - t), faixa('baixo', linhas - t, linhas)]
    .filter((f) => f.linhas[1] >= f.linhas[0])

  // Pele é sinal RELATIVO, não veto: em foto de viagem, fruta, tijolo e parede
  // ocre entram na faixa de pele em número absoluto. O que denuncia rosto é a
  // faixa concentrar pele bem acima da média da própria imagem.
  const peleMedia = celulas.reduce((s, c) => s + c.pele, 0) / celulas.length
  for (const f of faixas) f.peleRelativa = peleMedia > 0.5 ? +(f.pele / peleMedia).toFixed(2) : 0

  // Rosto detectado VETA a faixa, sem negociação. É a única checagem aqui que
  // não é heurística: vem de `render.mjs rostos`, gravado no .rostos.json.
  const cacheRostos = caminhoCacheRostos(entrada)
  const deteccao = existsSync(cacheRostos) ? JSON.parse(readFileSync(cacheRostos, 'utf8')) : null
  const zona = deteccao?.zonaProibida ?? null
  for (const f of faixas) {
    const inicio = f.linhas[0] / linhas
    const fim = (f.linhas[1] + 1) / linhas
    f.temRosto = Boolean(zona && fim > zona.y0 && inicio < zona.y1)
  }

  // Âncora: faixa com rosto está fora. Entre as que sobram, menos detalhe;
  // empate técnico (< 4) desempata pelo scrim menor.
  const candidatas = faixas.filter((f) => f.nome !== 'meio')
  const livres = candidatas.filter((f) => !f.temRosto)
  const pool = livres.length ? livres : candidatas
  const custo = (f) => f.detalhe + (f.peleRelativa >= 1.6 ? 12 : 0)
  const ordenadas = [...pool].sort((a, b) =>
    Math.abs(custo(a) - custo(b)) < 4 ? a.scrim - b.scrim : custo(a) - custo(b))
  const escolhida = ordenadas[0]
  const rival = ordenadas[1]
  const suspeitas = candidatas.filter((f) => f.peleRelativa >= 1.6).map((f) => f.nome)

  const rostosBloco = deteccao
    ? {
        quantidade: deteccao.rostos.length,
        zonaProibida: zona,
        faixasVetadas: candidatas.filter((f) => f.temRosto).map((f) => f.nome),
        alerta: livres.length === 0 && zona
          ? 'rosto atravessa topo e rodapé — reenquadrar ou trocar a imagem, não existe âncora limpa'
          : undefined,
      }
    : {
        pendente: 'sem .rostos.json — rodar `render.mjs rostos <imagem>` antes de fixar a âncora',
        peleSugereGente: suspeitas.length > 0,
      }

  console.log(JSON.stringify({
    ok: true,
    imagem: entrada,
    alvoContraste: alvo,
    globais,
    rostos: rostosBloco,
    faixas,
    recomendacao: {
      ancora: escolhida.nome,
      scrim: escolhida.scrim,
      concentracaoDePele: suspeitas,
      motivo: rival
        ? `detalhe ${escolhida.detalhe} contra ${rival.detalhe} em ${rival.nome}; scrim ${escolhida.scrim} contra ${rival.scrim}`
        : 'faixa única',
    },
    celulas,
  }))
}

async function info(pos) {
  const [arquivo] = pos
  if (!arquivo) sairUso('info exige <arquivo>')
  if (!existsSync(arquivo)) sairUso(`arquivo não existe: ${arquivo}`)
  const m = await sharp(arquivo).metadata()
  console.log(JSON.stringify({ formato: m.format, largura: m.width, altura: m.height, canais: m.channels }))
}

const [comando, ...resto] = process.argv.slice(2)
const comandos = { render, tratar, recortar, cor, analisar, rostos, checar, 'indexar-fotos': indexarFotos, hald: gerarHald, 'medir-tela': medirTela, contorno, info }
if (!comandos[comando]) sairUso(comando ? `comando desconhecido: ${comando}` : undefined)
const { pos, op } = lerArgs(resto, comando)
comandos[comando](pos, op).catch((e) => {
  console.error(e.message)
  process.exit(1)
})
