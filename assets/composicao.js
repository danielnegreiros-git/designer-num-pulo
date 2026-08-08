/* Máquina de composição de tela em dispositivo — worker designer.
 *
 * Um arquivo só, carregado por <script src> pelas peças e templates: correção
 * aqui vale para todas, sem fork silencioso. Sem dependência, sem módulo ES
 * (file:// bloqueia import), sem estado global além de `NP`.
 *
 * As regras 6 e 8 do CLAUDE.md estão embutidas aqui de propósito: quem usa
 * `NP.tela()` recebe o inset anti-serrilhado e o raio do vidro sem precisar
 * lembrar deles. */
window.NP = (function () {
  'use strict'

  function adjunta(m) {
    return [
      m[4] * m[8] - m[5] * m[7], m[2] * m[7] - m[1] * m[8], m[1] * m[5] - m[2] * m[4],
      m[5] * m[6] - m[3] * m[8], m[0] * m[8] - m[2] * m[6], m[2] * m[3] - m[0] * m[5],
      m[3] * m[7] - m[4] * m[6], m[1] * m[6] - m[0] * m[7], m[0] * m[4] - m[1] * m[3],
    ]
  }

  function mult(a, b) {
    const c = []
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        let s = 0
        for (let k = 0; k < 3; k++) s += a[3 * i + k] * b[3 * k + j]
        c[3 * i + j] = s
      }
    }
    return c
  }

  function multVetor(m, v) {
    return [
      m[0] * v[0] + m[1] * v[1] + m[2] * v[2],
      m[3] * v[0] + m[4] * v[1] + m[5] * v[2],
      m[6] * v[0] + m[7] * v[1] + m[8] * v[2],
    ]
  }

  function baseParaPontos(p) {
    const m = [p[0], p[2], p[4], p[1], p[3], p[5], 1, 1, 1]
    const v = multVetor(adjunta(m), [p[6], p[7], 1])
    return mult(m, [v[0], 0, 0, 0, v[1], 0, 0, 0, v[2]])
  }

  /* Homografia do retângulo local (0,0)-(w,h) para o quadrilátero de destino.
   * `quad` é [x,y] × 4 na ordem TL, TR, BL, BR — a mesma ordem que
   * `render.mjs medir-tela` devolve no campo `quad`. */
  function homografia(w, h, quad) {
    const origem = baseParaPontos([0, 0, w, 0, 0, h, w, h])
    const t = mult(baseParaPontos(quad), adjunta(origem))
    for (let i = 0; i < 9; i++) t[i] /= t[8]
    return t
  }

  /* Ponto do quadro (canvas) → coordenada local do elemento transformado.
   * É o que permite descrever clip-path em coordenadas do quadro, que é onde
   * se enxerga a cena, em vez das coordenadas locais da tela. */
  function paraLocal(t, x, y) {
    const v = multVetor(adjunta(t), [x, y, 1])
    return [v[0] / v[2], v[1] / v[2]]
  }

  function aplicar(elt, t) {
    elt.style.transformOrigin = '0 0'
    elt.style.transform = 'matrix3d(' + [
      t[0], t[3], 0, t[6],
      t[1], t[4], 0, t[7],
      0, 0, 1, 0,
      t[2], t[5], 0, t[8],
    ].join(',') + ')'
  }

  /* Encolhe o quadrilátero movendo cada canto `px` pixels em direção ao centro.
   * O Chromium não antialiasa a aresta de um layer com matrix3d: sem isso a
   * borda do overlay vira degraus visíveis sobre a moldura escura do aparelho. */
  function encolher(quad, px) {
    if (!px) return quad.slice()
    const cx = (quad[0] + quad[2] + quad[4] + quad[6]) / 4
    const cy = (quad[1] + quad[3] + quad[5] + quad[7]) / 4
    const out = []
    for (let i = 0; i < 8; i += 2) {
      const dx = cx - quad[i]
      const dy = cy - quad[i + 1]
      const d = Math.hypot(dx, dy) || 1
      out.push(quad[i] + (dx / d) * px, quad[i + 1] + (dy / d) * px)
    }
    return out
  }

  /* Projeta o elemento no quadrilátero do vidro do aparelho.
   *
   * opts.inset  px de encolhimento anti-serrilhado (padrão 1.5; use 0 só quando
   *             a aresta não encostar em moldura escura).
   * opts.raio   border-radius do conteúdo. DEVE ser o raio do vidro: menor que
   *             ele e o canto do conteúdo aparece por cima da moldura.
   *
   * Devolve a transformação, necessária para `poligono()`. */
  function tela(elt, quad, opts) {
    const o = opts || {}
    if (o.raio !== undefined) elt.style.borderRadius = o.raio + 'px'
    const t = homografia(elt.offsetWidth, elt.offsetHeight, encolher(quad, o.inset === undefined ? 1.5 : o.inset))
    aplicar(elt, t)
    return t
  }

  /* clip-path do elemento descrito em coordenadas do QUADRO, não locais.
   *
   * Serve para oclusão: o polígono mantém o que aparece e entalha só onde outro
   * objeto passa na frente. O entalhe desce até o topo do objeto que oclui e só
   * ali recorta — um corte de altura inteira come conteúdo bem acima dele. */
  function poligono(elt, t, pontos) {
    elt.style.clipPath = 'polygon(' + pontos.map(function (p) {
      return paraLocal(t, p[0], p[1]).map(function (v) { return v.toFixed(1) + 'px' }).join(' ')
    }).join(', ') + ')'
  }

  return { homografia, paraLocal, aplicar, encolher, tela, poligono }
})()
