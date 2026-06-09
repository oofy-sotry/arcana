const ATTR_COLORS = {
  fire: 0xe74c3c, water: 0x3498db, wind: 0x2ecc71, earth: 0xd35400,
  thunder: 0xf1c40f, ice: 0xaed6f1, poison: 0x8e44ad, dragon: 0xff6b35,
}

class MonsterRenderer {
  constructor(stage, screenWidth, screenHeight) {
    this.stage    = stage
    this.W        = screenWidth
    this.H        = screenHeight
    this.monsters = [] // { sprite, data }
    this._collisionCooldown = false
  }

  spawnMonster(monsterData) {
    const margin = 40
    const x      = margin + Math.random() * (this.W - margin * 2)
    const y      = margin + Math.random() * (this.H - margin * 2)
    const color  = ATTR_COLORS[monsterData.attribute] || 0xaaaaaa

    const g = new PIXI.Graphics()
    g.rect(-16, -16, 32, 32).fill(color)
    const renderer = PIXI.autoDetectRenderer
    const tex = window._app?.renderer?.generateTexture(g)
    g.destroy()

    const sprite = tex ? new PIXI.Sprite(tex) : new PIXI.Graphics().rect(-16, -16, 32, 32).fill(color)
    if (sprite.anchor) sprite.anchor.set(0.5)
    sprite.x = x
    sprite.y = y

    this.stage.addChild(sprite)
    this.monsters.push({ sprite, data: monsterData })
    return sprite
  }
}

window._monsterRenderer = null
