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
  node tools/render.mjs recortar <entrada> --out <saida> --x N --y N --largura N --altura N
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

async function info(pos) {
  const [arquivo] = pos
  if (!arquivo) sairUso('info exige <arquivo>')
  if (!existsSync(arquivo)) sairUso(`arquivo não existe: ${arquivo}`)
  const m = await sharp(arquivo).metadata()
  console.log(JSON.stringify({ formato: m.format, largura: m.width, altura: m.height, canais: m.channels }))
}

const [comando, ...resto] = process.argv.slice(2)
const comandos = { render, tratar, recortar, 'medir-tela': medirTela, contorno, info }
if (!comandos[comando]) sairUso(comando ? `comando desconhecido: ${comando}` : undefined)
const { pos, op } = lerArgs(resto, comando)
comandos[comando](pos, op).catch((e) => {
  console.error(e.message)
  process.exit(1)
})
