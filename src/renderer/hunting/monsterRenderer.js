const ATTR_COLORS = {
  fire: 0xe74c3c, water: 0x3498db, wind: 0x2ecc71, earth: 0xd35400,
  thunder: 0xf1c40f, ice: 0xaed6f1, poison: 0x8e44ad, dragon: 0xff6b35,
}

class MonsterRenderer {
  constructor(stage, screenWidth, screenHeight, renderer) {
    this.stage    = stage
    this.W        = screenWidth
    this.H        = screenHeight
    this.renderer = renderer
    this.monsters = [] // { sprite, data }
    this._collisionCooldown = false
  }

  spawnMonster(monsterData) {
    const margin = 40
    const x      = margin + Math.random() * (this.W - margin * 2)
    const y      = margin + Math.random() * (this.H - margin * 2)
    const color  = ATTR_COLORS[monsterData.attribute] || 0xaaaaaa

    const g   = new PIXI.Graphics()
    g.rect(-16, -16, 32, 32).fill(color)
    const tex    = this.renderer.generateTexture(g)
    const sprite = new PIXI.Sprite(tex)
    sprite.anchor.set(0.5)
    sprite.x = x
    sprite.y = y
    g.destroy()

    this.stage.addChild(sprite)
    this.monsters.push({ sprite, data: monsterData })
    return sprite
  }

  removeMonster(sprite) {
    const idx = this.monsters.findIndex(m => m.sprite === sprite)
    if (idx === -1) return
    this.stage.removeChild(sprite)
    sprite.destroy()
    this.monsters.splice(idx, 1)
    // 2초 후 새 몬스터 스폰
    setTimeout(() => {
      if (this.monsters.length < 3) this._spawnRandom()
    }, 2000)
  }

  _spawnRandom() {
    if (!window._currentZoneMonsters?.length) return
    const list = window._currentZoneMonsters
    this.spawnMonster(list[Math.floor(Math.random() * list.length)])
  }

  // AABB 충돌 감지 — 충돌 시 onCollide 콜백 호출 (1초 쿨다운)
  checkCollision(petSprite, onCollide) {
    if (this._collisionCooldown) return
    for (const m of this.monsters) {
      const dx = Math.abs(petSprite.x - m.sprite.x)
      const dy = Math.abs(petSprite.y - m.sprite.y)
      if (dx < 32 && dy < 32) {
        this._collisionCooldown = true
        setTimeout(() => { this._collisionCooldown = false }, 1000)
        onCollide(m.data)
        return
      }
    }
  }
}

// hunting.js의 initScene() 이후 인스턴스 생성: window._monsterRenderer = new MonsterRenderer(...)
window._monsterRenderer = null
