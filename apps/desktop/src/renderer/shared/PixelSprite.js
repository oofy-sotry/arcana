// 이미지가 없는 몬스터·펫·NPC용 절차적 도트 스프라이트.
// 시드(몬스터 id 등)가 같으면 항상 같은 모양 — 좌우 대칭 마스크를 시드 난수로 채우고 속성 색으로 음영·외곽선을 입힌다.
// 브라우저 스크립트(window.PixelSprite)와 node 테스트(module.exports) 양쪽에서 쓰도록 DOM 의존은 toCanvas에만 둔다.
;(function (root) {
  // 마스크: 반쪽 폭 6 × 높이 12, 마지막 열이 중앙선. 0=빈칸 1=시드에 따라 몸/빈칸 2=항상 몸
  const MASKS = {
    monster: [
      [0, 0, 0, 0, 1, 1],
      [0, 0, 0, 1, 1, 2],
      [0, 0, 0, 1, 2, 2],
      [0, 0, 1, 1, 2, 2],
      [0, 1, 1, 2, 2, 2],
      [0, 1, 1, 2, 2, 2],
      [0, 1, 1, 2, 2, 2],
      [1, 1, 2, 2, 2, 2],
      [1, 1, 1, 2, 2, 2],
      [0, 1, 1, 1, 1, 2],
      [0, 0, 1, 1, 0, 1],
      [0, 0, 1, 1, 0, 0],
    ],
    // 펫·NPC: 둥근 몸통 + 귀, 빈칸 확률이 낮아 덜 흉측하게
    pet: [
      [0, 1, 1, 0, 0, 0],
      [0, 1, 2, 0, 0, 0],
      [0, 0, 2, 2, 2, 2],
      [0, 1, 2, 2, 2, 2],
      [1, 2, 2, 2, 2, 2],
      [1, 2, 2, 2, 2, 2],
      [1, 2, 2, 2, 2, 2],
      [0, 1, 2, 2, 2, 2],
      [0, 1, 2, 2, 2, 2],
      [0, 0, 1, 2, 2, 2],
      [0, 0, 1, 2, 1, 1],
      [0, 0, 1, 1, 0, 0],
    ],
  }
  const EYE_ROW = { monster: 4, pet: 5 }
  const EYE_COL = 3 // 반쪽 기준 열 → 양쪽 대칭으로 2개

  const ATTR_COLORS = {
    fire: '#e74c3c', water: '#3498db', wind: '#2ecc71', earth: '#d35400',
    thunder: '#f1c40f', ice: '#aed6f1', poison: '#8e44ad', dragon: '#ff6b35',
    light: '#fff3b0', dark: '#5b4b8a', omni: '#e056fd',
  }

  function hashString(s) {
    let h = 2166136261
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) }
    return h >>> 0
  }

  // mulberry32 — 시드 고정 난수
  function rng(seed) {
    let a = seed
    return () => {
      a |= 0; a = (a + 0x6d2b79f5) | 0
      let t = Math.imul(a ^ (a >>> 15), 1 | a)
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
  }

  function shade(hex, amt) {
    const n = parseInt(hex.slice(1), 16)
    const f = c => Math.max(0, Math.min(255, Math.round(c + (amt > 0 ? (255 - c) : c) * amt)))
    const r = f(n >> 16), g = f((n >> 8) & 255), b = f(n & 255)
    return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)
  }

  // 색 격자(2차원 배열, 빈칸 null) 생성. 외곽선용으로 사방 1칸 여백 포함 → 14×14
  function grid({ seed, attribute, kind = 'monster', color, isBoss = false }) {
    const mask = MASKS[kind] || MASKS.monster
    const rand = rng(hashString(String(seed)))
    const base = color || ATTR_COLORS[attribute] || '#aaaaaa'
    const H = mask.length, HALF = mask[0].length, W = HALF * 2
    const body = Array.from({ length: H }, () => Array(W).fill(false))

    for (let y = 0; y < H; y++) {
      for (let x = 0; x < HALF; x++) {
        const m = mask[y][x]
        const on = m === 2 || (m === 1 && rand() < 0.5)
        body[y][x] = on
        body[y][W - 1 - x] = on
      }
    }

    const out = Array.from({ length: H + 2 }, () => Array(W + 2).fill(null))
    const outline = shade(base, -0.65)
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < HALF; x++) {
        if (!body[y][x]) continue
        // 위는 밝게, 아래는 어둡게 + 시드 얼룩 (얼룩도 좌우 대칭)
        const t = y / (H - 1)
        const speck = rand() < 0.15 ? -0.12 : 0
        out[y + 1][x + 1] = out[y + 1][W - x] = shade(base, 0.25 - t * 0.5 + speck)
      }
    }
    // 외곽선: 몸에 맞닿은 빈칸
    for (let y = 0; y < H + 2; y++) {
      for (let x = 0; x < W + 2; x++) {
        if (out[y][x]) continue
        const near = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => {
          const by = y - 1 + dy, bx = x - 1 + dx
          return by >= 0 && by < H && bx >= 0 && bx < W && body[by][bx]
        })
        if (near) out[y][x] = outline
      }
    }
    // 눈: 흰자 + 그 아래 동공
    const er = EYE_ROW[kind] ?? 4
    for (const ex of [EYE_COL, W - 1 - EYE_COL]) {
      out[er + 1][ex + 1] = '#ffffff'
      out[er + 2][ex + 1] = '#111111'
    }
    // 보스: 머리 위 금색 뿔 표시
    if (isBoss) {
      for (const hx of [2, W - 3]) { out[0][hx + 1] = '#ffd700'; out[1][hx + 1] = out[1][hx + 1] || '#ffd700' }
    }
    return out
  }

  // 캐시된 캔버스(1셀=scale px). 화면에선 CSS image-rendering:pixelated / PIXI nearest로 확대
  const cache = new Map()
  function toCanvas(opts, scale = 1) {
    const key = JSON.stringify([opts.seed, opts.attribute, opts.kind, opts.color, !!opts.isBoss, scale])
    if (cache.has(key)) return cache.get(key)
    const g = grid(opts)
    const c = document.createElement('canvas')
    c.width = g[0].length * scale
    c.height = g.length * scale
    const ctx = c.getContext('2d')
    g.forEach((row, y) => row.forEach((col, x) => {
      if (!col) return
      ctx.fillStyle = col
      ctx.fillRect(x * scale, y * scale, scale, scale)
    }))
    cache.set(key, c)
    return c
  }

  // DOM에 바로 붙일 새 캔버스 (같은 캔버스를 여러 곳에 append하면 이동되므로 복사본)
  function element(opts, cssSize) {
    const src = toCanvas(opts)
    const c = document.createElement('canvas')
    c.width = src.width; c.height = src.height
    c.getContext('2d').drawImage(src, 0, 0)
    c.style.cssText = `width:${cssSize}px; height:${cssSize}px; image-rendering:pixelated;`
    return c
  }

  const api = { grid, toCanvas, element, ATTR_COLORS }
  if (typeof module !== 'undefined' && module.exports) module.exports = api
  else root.PixelSprite = api
})(typeof window !== 'undefined' ? window : globalThis)
