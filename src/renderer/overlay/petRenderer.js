const { Sprite, Assets } = PIXI

class PetRenderer {
  constructor(stage) {
    this.stage   = stage
    this.sprites = new Map()
  }

  async loadSprite(imagePath) {
    const texture = await Assets.load(imagePath)
    return Sprite.from(texture)
  }

  async addPet(pet, imagePath) {
    const sprite = await this.loadSprite(imagePath)
    sprite.anchor.set(0.5)
    sprite.x = Math.random() * window.innerWidth
    sprite.y = Math.random() * window.innerHeight
    sprite.interactive = true
    sprite.cursor = 'pointer'
    this.stage.addChild(sprite)
    this.sprites.set(pet.id, sprite)
    this.attachMouseEvents(sprite)
    return sprite
  }

  attachMouseEvents(sprite) {
    sprite.on('pointerover',  () => window.arcana.overlay.toggleMouse(false))
    sprite.on('pointerout',   () => window.arcana.overlay.toggleMouse(true))
  }

  moveRandom(ticker) {
    const SPEED     = 1.2
    const CHANGE_MS = 3000
    const directions = new Map()

    ticker.add(() => {
      const now = performance.now()
      this.sprites.forEach((sprite, id) => {
        if (!directions.has(id) || now - directions.get(id).since > CHANGE_MS) {
          const angle = Math.random() * Math.PI * 2
          directions.set(id, {
            dx:    Math.cos(angle) * SPEED,
            dy:    Math.sin(angle) * SPEED,
            since: now,
          })
        }
        const { dx, dy } = directions.get(id)
        sprite.x = Math.max(0, Math.min(window.innerWidth,  sprite.x + dx))
        sprite.y = Math.max(0, Math.min(window.innerHeight, sprite.y + dy))
      })
    })
  }
}
