// index.html 기준 상대경로 — src/renderer/hunting/ → 프로젝트 루트까지 3단계
const MONSTER_SPRITE_BASE = '../../../assets/sprites/monsters/'

class MonsterRenderer {
  constructor(stage, screenWidth, screenHeight, renderer) {
    this.stage    = stage
    this.W        = screenWidth
    this.H        = screenHeight
    this.renderer = renderer
    this.monsters = [] // { sprite, data }
    this._collisionCooldown = false
  }

  // pos를 주면 그 위치에 스폰 (조우 모드에서 펫 앞에 배치), 없으면 무작위
  async spawnMonster(monsterData, pos = null) {
    const margin = 40
    const x      = pos?.x ?? margin + Math.random() * (this.W - margin * 2)
    const y      = pos?.y ?? margin + Math.random() * (this.H - margin * 2)

    let tex
    try {
      tex = await PIXI.Assets.load(`${MONSTER_SPRITE_BASE}${monsterData.id}.png`)
    } catch {
      // 아직 그려진 이미지가 없는 몬스터 → id 시드 도트 스프라이트 (같은 몬스터는 항상 같은 모양)
      tex = PIXI.Texture.from(PixelSprite.toCanvas({
        seed: monsterData.id, attribute: monsterData.attribute, kind: 'monster', isBoss: monsterData.isBoss,
      }))
      tex.source.scaleMode = 'nearest'
    }
    const size   = monsterData.isBoss ? 44 : 32
    const sprite = new PIXI.Sprite(tex)
    sprite.anchor.set(0.5)
    sprite.width  = size
    sprite.height = size
    sprite.x = x
    sprite.y = y

    this.stage.addChild(sprite)
    this.monsters.push({ sprite, data: monsterData })
    return sprite
  }

  // respawn: false면 리스폰 없이 제거만 (조우 모드)
  removeMonster(sprite, { respawn = true } = {}) {
    const idx = this.monsters.findIndex(m => m.sprite === sprite)
    if (idx === -1) return
    const respawnMs = this.monsters[idx].data.respawnMs || 2000
    this.stage.removeChild(sprite)
    sprite.destroy()
    this.monsters.splice(idx, 1)
    if (!respawn) return
    // 티어 기반 딜레이 후 리스폰 (tier1-2=2s, tier3-4=3s, tier5-6=5s, tier7=8s)
    setTimeout(() => {
      if (this.monsters.length < 3) this._spawnRandom()
    }, respawnMs)
  }

  // 피격 연출 — 잠깐 빨갛게 틴트
  flash(sprite, ms = 150) {
    if (!sprite || sprite.destroyed) return
    sprite.tint = 0xff5555
    setTimeout(() => { if (!sprite.destroyed) sprite.tint = 0xffffff }, ms)
  }

  // 데미지 숫자 — 위로 떠오르며 사라짐
  floatText(x, y, text, color = 0xffffff) {
    const label = new PIXI.Text({
      text,
      style: { fontSize: 16, fontWeight: 'bold', fill: color, stroke: { color: 0x000000, width: 3 } },
    })
    label.anchor.set(0.5)
    label.x = x
    label.y = y
    this.stage.addChild(label)

    const duration = 700
    const start    = performance.now()
    const step = (now) => {
      if (label.destroyed) return
      const t = Math.min(1, (now - start) / duration)
      label.y     = y - 30 * t
      label.alpha = 1 - t
      if (t < 1) return requestAnimationFrame(step)
      this.stage.removeChild(label)
      label.destroy()
    }
    requestAnimationFrame(step)
  }

  clearAll() {
    for (const m of this.monsters) {
      this.stage.removeChild(m.sprite)
      m.sprite.destroy()
    }
    this.monsters = []
  }

  _spawnRandom() {
    if (!window._currentZoneMonsters?.length) return
    const list = window._currentZoneMonsters
    this.spawnMonster(list[Math.floor(Math.random() * list.length)])
  }

  // AABB 충돌 감지 — 충돌 시 onCollide(data, sprite) 콜백 호출 (1초 쿨다운)
  checkCollision(petSprite, onCollide) {
    if (this._collisionCooldown) return
    for (const m of this.monsters) {
      const dx = Math.abs(petSprite.x - m.sprite.x)
      const dy = Math.abs(petSprite.y - m.sprite.y)
      if (dx < 32 && dy < 32) {
        this._collisionCooldown = true
        setTimeout(() => { this._collisionCooldown = false }, 1000)
        onCollide(m.data, m.sprite)
        return
      }
    }
  }
}

// hunting.js의 initScene() 이후 인스턴스 생성: window._monsterRenderer = new MonsterRenderer(...)
window._monsterRenderer = null
