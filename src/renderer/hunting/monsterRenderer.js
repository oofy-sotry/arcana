class MonsterRenderer {
  constructor(stage, screenWidth, screenHeight) {
    this.stage    = stage
    this.W        = screenWidth
    this.H        = screenHeight
    this.monsters = [] // { sprite, data, cooldown }
    this._collisionCooldown = false
  }
}

window._monsterRenderer = null
