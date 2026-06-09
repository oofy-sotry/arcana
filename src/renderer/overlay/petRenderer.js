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
}
