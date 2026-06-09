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
    return sprite
  }
}
