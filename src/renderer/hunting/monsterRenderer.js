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

  async spawnMonster(monsterData) {
    const margin = 40
    const x      = margin + Math.random() * (this.W - margin * 2)
    const y      = margin + Math.random() * (this.H - margin * 2)

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

  removeMonster(sprite) {
    const idx = this.monsters.findIndex(m => m.sprite === sprite)
    if (idx === -1) return
    const respawnMs = this.monsters[idx].data.respawnMs || 2000
    this.stage.removeChild(sprite)
    sprite.destroy()
    this.monsters.splice(idx, 1)
    // 티어 기반 딜레이 후 리스폰 (tier1-2=2s, tier3-4=3s, tier5-6=5s, tier7=8s)
    setTimeout(() => {
      if (this.monsters.length < 3) this._spawnRandom()
    }, respawnMs)
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
