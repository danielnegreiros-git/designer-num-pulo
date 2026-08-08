#!/usr/bin/env node
// Única ferramenta do worker designer: HTML → PNG (Playwright) e imagem (Sharp).
// Capacidade nova vira subcomando aqui; dependência nova exige decisão do Daniel.
import { chromium } from 'playwright'
import sharp from 'sharp'
import { resolve, extname } from 'node:path'
import { pathToFileURL } from 'node:url'
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname } from 'node:path'

const USO = `uso:
  node tools/render.mjs render <arquivo.html> --out <saida.png> [--largura 1080] [--altura 1080] [--escala 1] [--pagina-inteira]
  node tools/render.mjs tratar <entrada> --out <saida.(png|jpg|webp)> [--largura N] [--altura N] [--qualidade 80]
  node tools/render.mjs recortar <entrada> --out <saida> --x N --y N --largura N --altura N
  node tools/render.mjs cor <entrada> --out <saida> [--lut <arq.cube>|--perfil bruto-canon] [--exposicao auto|off]
                                      [--referencia <arq|pasta>] [--forca 0.7] [--saturacao 1] [--qualidade 92]
  node tools/render.mjs analisar <imagem> [--grade "3x4"] [--alvo 4.5]
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
  cor: ['out', 'lut', 'perfil', 'exposicao', 'referencia', 'forca', 'saturacao', 'qualidade'],
  analisar: ['grade', 'alvo'],
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
      if (nome === 'pagina-inteira') {
        op.paginaInteira = true
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
const PERFIS = {
  'bruto-canon': { lut: 'assets/luts/canon-log3-rec709.cube', exposicao: 'auto' },
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
    const p = PERFIS[op.perfil]
    if (!p) sairUso(`perfil desconhecido: ${op.perfil} (tem: ${Object.keys(PERFIS).join(', ')})`)
    caminhoLut = resolve(dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..', p.lut)
    exposicao = exposicao ?? p.exposicao
  }
  exposicao = exposicao ?? 'off'
  if (!['auto', 'off'].includes(exposicao)) sairUso('--exposicao aceita auto ou off')
  const forca = numero(op, 'forca', 0.7)
  if (forca < 0 || forca > 1) sairUso('--forca entre 0 e 1')
  const saturacao = numero(op, 'saturacao', 1)
  const qualidade = inteiro(op, 'qualidade', 92)
  garantirPasta(op.out)

  const { data, info: meta } = await sharp(entrada).raw().toBuffer({ resolveWithObject: true })
  const { width: W, height: H, channels: C } = meta
  const total = W * H
  const px = Buffer.from(data)
  const aplicado = []

  if (caminhoLut) {
    const lut = lerCube(caminhoLut)
    const cache = new Map()
    for (let i = 0; i < total; i++) {
      const o = i * C
      const chave = (px[o] << 16) | (px[o + 1] << 8) | px[o + 2]
      let v = cache.get(chave)
      if (v === undefined) {
        v = aplicarCube([px[o], px[o + 1], px[o + 2]], lut)
        if (cache.size < 1 << 20) cache.set(chave, v)
      }
      px[o] = v[0]
      px[o + 1] = v[1]
      px[o + 2] = v[2]
    }
    aplicado.push({ etapa: 'lut', arquivo: caminhoLut, tamanho: lut.n })
  }

  if (op.referencia) {
    const alvo = await estatisticaRGB(arquivosDeImagem(op.referencia))
    const soma = [0, 0, 0]
    const soma2 = [0, 0, 0]
    for (let i = 0; i < total; i++) {
      const o = i * C
      for (let k = 0; k < 3; k++) { soma[k] += px[o + k]; soma2[k] += px[o + k] * px[o + k] }
    }
    const origem = [0, 1, 2].map((k) => {
      const media = soma[k] / total
      return { media, desvio: Math.sqrt(Math.max(1, soma2[k] / total - media * media)) }
    })
    for (let i = 0; i < total; i++) {
      const o = i * C
      for (let k = 0; k < 3; k++) {
        const casado = (px[o + k] - origem[k].media) * (alvo[k].desvio / origem[k].desvio) + alvo[k].media
        px[o + k] = Math.min(255, Math.max(0, Math.round(px[o + k] + (casado - px[o + k]) * forca)))
      }
    }
    aplicado.push({ etapa: 'referencia', forca, alvo: alvo.map((a) => Math.round(a.media)) })
  }

  if (exposicao === 'auto') {
    // Níveis por percentil sobre a luminância: 0,3% de clip em cada ponta.
    const hist = new Uint32Array(256)
    for (let i = 0; i < total; i++) {
      const o = i * C
      hist[Math.round(0.2126 * px[o] + 0.7152 * px[o + 1] + 0.0722 * px[o + 2])]++
    }
    const corte = Math.round(total * 0.003)
    let baixo = 0
    let alto = 255
    for (let acc = 0, v = 0; v < 256; v++) { acc += hist[v]; if (acc > corte) { baixo = v; break } }
    for (let acc = 0, v = 255; v >= 0; v--) { acc += hist[v]; if (acc > corte) { alto = v; break } }
    if (alto - baixo > 20) {
      const ganho = 255 / (alto - baixo)
      const tabela = new Uint8Array(256)
      for (let v = 0; v < 256; v++) tabela[v] = Math.min(255, Math.max(0, Math.round((v - baixo) * ganho)))
      for (let i = 0; i < total; i++) {
        const o = i * C
        px[o] = tabela[px[o]]
        px[o + 1] = tabela[px[o + 1]]
        px[o + 2] = tabela[px[o + 2]]
      }
      aplicado.push({ etapa: 'exposicao', preto: baixo, branco: alto })
    } else {
      aplicado.push({ etapa: 'exposicao', pulada: 'faixa dinâmica curta demais para normalizar' })
    }
  }

  let img = sharp(px, { raw: { width: W, height: H, channels: C } })
  if (saturacao !== 1) {
    img = sharp(await img.png().toBuffer()).modulate({ saturation: saturacao })
    aplicado.push({ etapa: 'saturacao', valor: saturacao })
  }
  const formato = extname(op.out).slice(1).toLowerCase()
  if (formato === 'png') img = img.png()
  else if (formato === 'webp') img = img.webp({ quality: qualidade })
  else if (['jpg', 'jpeg'].includes(formato)) img = img.jpeg({ quality: qualidade })
  else sairUso(`formato de saída não suportado: .${formato}`)
  const r = await img.toFile(op.out)
  console.log(JSON.stringify({ ok: true, saida: op.out, largura: r.width, altura: r.height, aplicado }))
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

  // Âncora: menos detalhe entre cima e baixo; empate técnico (< 4) desempata
  // pelo scrim menor. Concentração de pele penaliza mas não decide sozinha —
  // quem confirma é a leitura da imagem, este número só diz onde olhar.
  const candidatas = faixas.filter((f) => f.nome !== 'meio')
  const custo = (f) => f.detalhe + (f.peleRelativa >= 1.6 ? 12 : 0)
  const ordenadas = [...candidatas].sort((a, b) =>
    Math.abs(custo(a) - custo(b)) < 4 ? a.scrim - b.scrim : custo(a) - custo(b))
  const escolhida = ordenadas[0]
  const rival = ordenadas[1]
  const suspeitas = candidatas.filter((f) => f.peleRelativa >= 1.6).map((f) => f.nome)

  console.log(JSON.stringify({
    ok: true,
    imagem: entrada,
    alvoContraste: alvo,
    faixas,
    recomendacao: {
      ancora: escolhida.nome,
      scrim: escolhida.scrim,
      concentracaoDePele: suspeitas,
      confirmar: suspeitas.length
        ? `ler a imagem antes de fixar a âncora: ${suspeitas.join(' e ')} concentra(m) pele acima da média da foto`
        : undefined,
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
const comandos = { render, tratar, recortar, cor, analisar, 'medir-tela': medirTela, contorno, info }
if (!comandos[comando]) sairUso(comando ? `comando desconhecido: ${comando}` : undefined)
const { pos, op } = lerArgs(resto, comando)
comandos[comando](pos, op).catch((e) => {
  console.error(e.message)
  process.exit(1)
})
