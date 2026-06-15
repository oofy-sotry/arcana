const TILE_SIZE = 48
const VIEWPORT_W = 15  // 타일 수
const VIEWPORT_H = 11

// 타일 색상 팔레트
const TILE_COLORS = {
  0:  { base: '#4a7c40', border: '#3d6b34' },   // 잔디
  1:  { base: '#2d5a1b', border: '#1e3d10' },   // 나무
  2:  { base: '#3a6fa8', border: '#2d5a8a' },   // 물
  3:  { base: '#8b7355', border: '#7a6244' },   // 길
  4:  { base: '#5a4a3a', border: '#4a3a2a' },   // 건물 벽
  5:  { base: '#3a2a1a', border: '#8b7355' },   // 건물 입구
  6:  { base: '#6aaa50', border: '#4a8a30' },   // 출구 동
  7:  { base: '#6aaa50', border: '#4a8a30' },   // 출구 남
  8:  { base: '#6aaa50', border: '#4a8a30' },   // 출구 서
  9:  { base: '#6aaa50', border: '#4a8a30' },   // 출구 북
  10: { base: '#3a6b2a', border: '#2a5a1a' },   // 야생 풀밭 (배틀 발생)
}

const APPEARANCE_COLORS = {
  male_a:   { hair: '#1a1a1a', robe: '#e94560', skin: '#f5c99a' },
  male_b:   { hair: '#e8e8e8', robe: '#4a90e2', skin: '#f5c99a' },
  female_a: { hair: '#8B4513', robe: '#4caf50', skin: '#f5c99a' },
  female_b: { hair: '#9c27b0', robe: '#9b59b6', skin: '#f5d5b0' },
}

const WALKABLE = new Set([0, 3, 5, 6, 7, 8, 9, 10])
const WILD_GRASS = new Set([10])

// BFS 경로탐색
function findPath(tiles, sx, sy, ex, ey, w, h) {
  if (sx === ex && sy === ey) return []
  const key = (x, y) => y * w + x
  const visited = new Set([key(sx, sy)])
  const queue = [[sx, sy, []]]
  const dirs = [[0,-1],[0,1],[-1,0],[1,0]]
  while (queue.length) {
    const [x, y, path] = queue.shift()
    for (const [dx, dy] of dirs) {
      const nx = x + dx, ny = y + dy
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue
      if (!WALKABLE.has(tiles[ny][nx])) continue
      if (visited.has(key(nx, ny))) continue
      visited.add(key(nx, ny))
      const newPath = [...path, [nx, ny]]
      if (nx === ex && ny === ey) return newPath
      queue.push([nx, ny, newPath])
    }
  }
  return null
}

class WorldEngine {
  constructor(canvas, mapData, summoner) {
    this.canvas   = canvas
    this.ctx      = canvas.getContext('2d')
    this.map      = mapData
    this.summoner = summoner

    // 플레이어 위치 (타일 좌표)
    this.playerX = mapData.startX ?? 7
    this.playerY = mapData.startY ?? 7

    // 픽셀 단위 부드러운 이동
    this.pixelX  = this.playerX * TILE_SIZE
    this.pixelY  = this.playerY * TILE_SIZE
    this.moving  = false
    this.moveQueue = []
    this.facing  = 'down' // up/down/left/right

    // 걷기 애니메이션
    this.walkFrame = 0
    this.walkTick  = 0

    this.callbacks = {}
    this._raf = null
    this._keys = new Set()

    this._resize()
    this._bindEvents()
    this._loop()
  }

  _resize() {
    const W = VIEWPORT_W * TILE_SIZE
    const H = VIEWPORT_H * TILE_SIZE
    this.canvas.width  = W
    this.canvas.height = H
    this.canvas.style.width  = W + 'px'
    this.canvas.style.height = H + 'px'
  }

  _bindEvents() {
    this._onKey = e => {
      if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)) {
        e.preventDefault()
        this._keys.add(e.key)
      }
    }
    this._onKeyUp = e => this._keys.delete(e.key)
    this._onClick = e => {
      const rect = this.canvas.getBoundingClientRect()
      const scaleX = this.canvas.width / rect.width
      const scaleY = this.canvas.height / rect.height
      const mx = (e.clientX - rect.left) * scaleX
      const my = (e.clientY - rect.top)  * scaleY

      const camX = this.pixelX - (VIEWPORT_W / 2) * TILE_SIZE
      const camY = this.pixelY - (VIEWPORT_H / 2) * TILE_SIZE
      const tx = Math.floor((mx + camX) / TILE_SIZE)
      const ty = Math.floor((my + camY) / TILE_SIZE)

      if (tx < 0 || ty < 0 || tx >= this.map.width || ty >= this.map.height) return
      if (!WALKABLE.has(this.map.tiles[ty][tx])) return

      const path = findPath(this.map.tiles, this.playerX, this.playerY, tx, ty, this.map.width, this.map.height)
      if (path) this.moveQueue = path
    }

    window.addEventListener('keydown', this._onKey)
    window.addEventListener('keyup', this._onKeyUp)
    this.canvas.addEventListener('click', this._onClick)
  }

  _loop() {
    this._raf = requestAnimationFrame(() => this._loop())
    this._update()
    this._draw()
  }

  _update() {
    if (this.moving) {
      // 픽셀 단위 이동 (8px/frame → 6프레임에 1타일 48px)
      const speed = 8
      const targetX = this.playerX * TILE_SIZE
      const targetY = this.playerY * TILE_SIZE
      const dx = targetX - this.pixelX
      const dy = targetY - this.pixelY

      if (Math.abs(dx) <= speed && Math.abs(dy) <= speed) {
        this.pixelX = targetX
        this.pixelY = targetY
        this.moving = false
        this._onArrival()
      } else {
        this.pixelX += Math.sign(dx) * speed
        this.pixelY += Math.sign(dy) * speed
        this.walkTick++
        if (this.walkTick % 6 === 0) this.walkFrame = (this.walkFrame + 1) % 4
      }
      return
    }

    // 키보드 이동
    let dx = 0, dy = 0
    if (this._keys.has('ArrowUp'))    { dy = -1; this.facing = 'up' }
    else if (this._keys.has('ArrowDown'))  { dy =  1; this.facing = 'down' }
    else if (this._keys.has('ArrowLeft'))  { dx = -1; this.facing = 'left' }
    else if (this._keys.has('ArrowRight')) { dx =  1; this.facing = 'right' }

    if (dx !== 0 || dy !== 0) {
      this.moveQueue = []
      this._tryMove(this.playerX + dx, this.playerY + dy)
      return
    }

    // 클릭 경로 이동
    if (this.moveQueue.length) {
      const [nx, ny] = this.moveQueue.shift()
      const ddx = nx - this.playerX, ddy = ny - this.playerY
      this.facing = ddx > 0 ? 'right' : ddx < 0 ? 'left' : ddy > 0 ? 'down' : 'up'
      this._tryMove(nx, ny)
    }
  }

  _tryMove(nx, ny) {
    if (nx < 0 || ny < 0 || nx >= this.map.width || ny >= this.map.height) {
      this._checkEdgeExit(nx, ny)
      return
    }
    const tile = this.map.tiles[ny][nx]
    if (!WALKABLE.has(tile)) return
    this.playerX = nx
    this.playerY = ny
    this.moving  = true
  }

  _checkEdgeExit(nx, ny) {
    // 맵 경계 밖으로 나갔을 때 → 인접 출구 타일 확인
    const clampX = Math.max(0, Math.min(this.map.width - 1, nx))
    const clampY = Math.max(0, Math.min(this.map.height - 1, ny))
    const exit = this.map.exits?.find(e => e.tile_x === clampX && e.tile_y === clampY)
    if (exit && this.callbacks.onExit) this.callbacks.onExit(exit)
  }

  _onArrival() {
    // NPC 체크
    const npc = this.map.npcs?.find(n => n.tile_x === this.playerX && n.tile_y === this.playerY)
    if (npc && this.callbacks.onNpc) { this.callbacks.onNpc(npc); return }

    // 출구 체크
    const exit = this.map.exits?.find(e => e.tile_x === this.playerX && e.tile_y === this.playerY)
    if (exit && this.callbacks.onExit) { this.callbacks.onExit(exit); return }

    // 야생 풀밭 배틀 체크
    const tile = this.map.tiles[this.playerY]?.[this.playerX]
    if (WILD_GRASS.has(tile) && this.map.wildConfig) {
      const rate = this.map.wildConfig.encounterRate ?? 0.15
      if (Math.random() < rate && this.callbacks.onWildEncounter) {
        this.callbacks.onWildEncounter(this.map.wildConfig)
      }
    }
  }

  _draw() {
    const ctx = this.ctx
    const VW = VIEWPORT_W * TILE_SIZE
    const VH = VIEWPORT_H * TILE_SIZE

    // 카메라: 플레이어 중심
    const camX = this.pixelX - (VIEWPORT_W / 2) * TILE_SIZE
    const camY = this.pixelY - (VIEWPORT_H / 2) * TILE_SIZE

    ctx.clearRect(0, 0, VW, VH)
    ctx.save()
    ctx.translate(-camX, -camY)

    // 타일 렌더링
    const startTX = Math.max(0, Math.floor(camX / TILE_SIZE) - 1)
    const startTY = Math.max(0, Math.floor(camY / TILE_SIZE) - 1)
    const endTX   = Math.min(this.map.width,  Math.ceil((camX + VW) / TILE_SIZE) + 1)
    const endTY   = Math.min(this.map.height, Math.ceil((camY + VH) / TILE_SIZE) + 1)

    for (let ty = startTY; ty < endTY; ty++) {
      for (let tx = startTX; tx < endTX; tx++) {
        const tileId = this.map.tiles[ty]?.[tx] ?? 0
        this._drawTile(ctx, tx, ty, tileId)
      }
    }

    // NPC 렌더링
    this.map.npcs?.forEach(npc => this._drawNpc(ctx, npc))

    // 플레이어 렌더링
    this._drawPlayer(ctx)

    ctx.restore()

    // 미니맵 (우하단)
    this._drawMinimap(ctx, VW, VH)
  }

  _drawTile(ctx, tx, ty, tileId) {
    const col = TILE_COLORS[tileId] || TILE_COLORS[0]
    const px = tx * TILE_SIZE, py = ty * TILE_SIZE
    const S = TILE_SIZE

    ctx.fillStyle = col.base
    ctx.fillRect(px, py, S, S)

    // 테두리 (경계선 느낌)
    ctx.fillStyle = col.border
    ctx.fillRect(px, py, S, 1)
    ctx.fillRect(px, py, 1, S)

    // 타일별 세부 장식
    if (tileId === 1) {
      // 나무: 진한 원
      ctx.fillStyle = '#1e4010'
      ctx.beginPath()
      ctx.arc(px + S/2, py + S/2, S * 0.35, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#2d5a1b'
      ctx.beginPath()
      ctx.arc(px + S/2 - 3, py + S/2 - 3, S * 0.2, 0, Math.PI * 2)
      ctx.fill()
    } else if (tileId === 2) {
      // 물: 물결
      ctx.fillStyle = '#5a9fd4'
      ctx.fillRect(px + 4, py + S/2 - 2, S - 8, 4)
    } else if (tileId === 5) {
      // 건물 입구: 문
      ctx.fillStyle = '#6b4226'
      ctx.fillRect(px + S/4, py + S/4, S/2, S * 0.7)
      ctx.fillStyle = '#f5c99a'
      ctx.beginPath()
      ctx.arc(px + S * 0.65, py + S/2, 2, 0, Math.PI * 2)
      ctx.fill()
    } else if (tileId === 10) {
      // 야생 풀밭: 풀잎 장식
      ctx.fillStyle = '#2a5a1a'
      const blades = [[8,8],[16,12],[24,8],[32,12],[40,8],[12,20],[28,20],[20,16]]
      blades.forEach(([bx, by]) => {
        ctx.fillRect(px + bx, py + by, 2, 8)
        ctx.fillRect(px + bx - 2, py + by + 3, 2, 5)
      })
    } else if (tileId >= 6) {
      // 출구: 밝은 화살표
      ctx.fillStyle = 'rgba(255,255,100,0.3)'
      ctx.fillRect(px, py, S, S)
      ctx.fillStyle = '#fff'
      ctx.font = `${S * 0.4}px sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      const arrows = { 6:'▶', 7:'▼', 8:'◀', 9:'▲' }
      ctx.fillText(arrows[tileId] || '•', px + S/2, py + S/2)
    }
  }

  _drawNpc(ctx, npc) {
    const px = npc.tile_x * TILE_SIZE
    const py = npc.tile_y * TILE_SIZE
    const S = TILE_SIZE

    // 몸통
    ctx.fillStyle = npc.color || '#ffd54f'
    ctx.fillRect(px + S*0.3, py + S*0.35, S*0.4, S*0.4)

    // 머리
    ctx.fillStyle = '#f5c99a'
    ctx.fillRect(px + S*0.3, py + S*0.1, S*0.4, S*0.3)

    // 이름
    ctx.fillStyle = '#ffd54f'
    ctx.font = '9px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'
    ctx.fillText(npc.name, px + S/2, py - 12)

    // 상호작용 힌트 (근처 2타일 이내)
    const dist = Math.abs(npc.tile_x - this.playerX) + Math.abs(npc.tile_y - this.playerY)
    if (dist <= 2) {
      ctx.fillStyle = '#fff'
      ctx.font = '10px sans-serif'
      ctx.fillText('💬', px + S/2, py - 24)
    }
  }

  _drawPlayer(ctx) {
    const ap = APPEARANCE_COLORS[this.summoner?.appearance] || APPEARANCE_COLORS.male_a
    const px = this.playerX * TILE_SIZE
    const py = this.playerY * TILE_SIZE
    const S  = TILE_SIZE
    const cx = px + S / 2
    const by = py + S - 4

    // 걷기 애니메이션 오프셋 (다리 흔들기)
    const legOff = this.moving ? [0, 3, 0, -3][this.walkFrame] : 0
    const P = 2 // pixel unit

    // 그림자
    ctx.fillStyle = 'rgba(0,0,0,0.2)'
    ctx.beginPath()
    ctx.ellipse(cx, by + 2, 10, 4, 0, 0, Math.PI * 2)
    ctx.fill()

    // 다리
    ctx.fillStyle = '#333'
    ctx.fillRect(cx - 5*P, by - 4*P + legOff, 4*P, 4*P)
    ctx.fillRect(cx + P,   by - 4*P - legOff, 4*P, 4*P)

    // 신발
    ctx.fillStyle = '#111'
    ctx.fillRect(cx - 5*P, by,      5*P, 2*P)
    ctx.fillRect(cx + P,   by,      5*P, 2*P)

    // 망토/몸통
    ctx.fillStyle = ap.robe
    ctx.fillRect(cx - 6*P, by - 12*P, 12*P, 8*P)

    // 소매
    ctx.fillRect(cx - 9*P, by - 11*P, 3*P, 5*P)
    ctx.fillRect(cx + 6*P, by - 11*P, 3*P, 5*P)

    // 손
    ctx.fillStyle = ap.skin
    ctx.fillRect(cx - 9*P, by - 7*P, 2*P, 2*P)
    ctx.fillRect(cx + 7*P, by - 7*P, 2*P, 2*P)

    // 목
    ctx.fillStyle = ap.skin
    ctx.fillRect(cx - P, by - 13*P, 2*P, 2*P)

    // 얼굴
    ctx.fillStyle = ap.skin
    ctx.fillRect(cx - 4*P, by - 20*P, 8*P, 8*P)

    // 눈 (방향에 따라)
    ctx.fillStyle = '#333'
    if (this.facing !== 'up') {
      ctx.fillRect(cx - 3*P, by - 18*P, P, P)
      ctx.fillRect(cx + 2*P, by - 18*P, P, P)
    }

    // 머리카락
    ctx.fillStyle = ap.hair
    ctx.fillRect(cx - 4*P, by - 22*P, 8*P, 4*P)
    ctx.fillRect(cx - 5*P, by - 21*P, P, 4*P)
    ctx.fillRect(cx + 4*P, by - 21*P, P, 4*P)
  }

  _drawMinimap(ctx, VW, VH) {
    const MW = this.map.width * 3
    const MH = this.map.height * 3
    const mx = VW - MW - 8
    const my = VH - MH - 8

    ctx.fillStyle = 'rgba(0,0,0,0.5)'
    ctx.fillRect(mx - 2, my - 2, MW + 4, MH + 4)

    for (let ty = 0; ty < this.map.height; ty++) {
      for (let tx = 0; tx < this.map.width; tx++) {
        const col = TILE_COLORS[this.map.tiles[ty][tx]] || TILE_COLORS[0]
        ctx.fillStyle = col.base
        ctx.fillRect(mx + tx * 3, my + ty * 3, 3, 3)
      }
    }

    // 플레이어 위치
    ctx.fillStyle = '#e94560'
    ctx.fillRect(mx + this.playerX * 3, my + this.playerY * 3, 3, 3)
  }

  on(event, cb) {
    this.callbacks[event] = cb
    return this
  }

  setMap(mapData, startX, startY) {
    this.map     = mapData
    this.playerX = startX ?? mapData.startX ?? 7
    this.playerY = startY ?? mapData.startY ?? 7
    this.pixelX  = this.playerX * TILE_SIZE
    this.pixelY  = this.playerY * TILE_SIZE
    this.moveQueue = []
    this.moving  = false
  }

  destroy() {
    cancelAnimationFrame(this._raf)
    window.removeEventListener('keydown', this._onKey)
    window.removeEventListener('keyup', this._onKeyUp)
    this.canvas.removeEventListener('click', this._onClick)
  }
}
