import { Application, Assets, Sprite } from '../../node_modules/pixi.js/dist/pixi.min.mjs'

class PetRenderer {
  constructor(stage) {
    this.stage   = stage
    this.sprites = new Map()
  }

  async addPet(pet, fallbackImagePath) {
    const spriteId = (pet.species && pet.species !== 'default') ? pet.species.toLowerCase() : pet.attribute
    const specificPath = `../../../assets/sprites/characters/${spriteId}_${pet.evolution_stage}.png`
    let texture
    try {
      texture = await Assets.load(specificPath)
    } catch {
      texture = await Assets.load(fallbackImagePath) // 아직 그려지지 않은 종·단계는 기본 이미지로 폴백
    }
    const sprite  = Sprite.from(texture)
    sprite.anchor.set(0.5)
    sprite.x = Math.random() * window.innerWidth
    sprite.y = Math.random() * window.innerHeight
    sprite.interactive = true
    sprite.cursor = 'pointer'
    sprite.on('pointerover', () => window.arcana.overlay.toggleMouse(false))
    sprite.on('pointerout',  () => window.arcana.overlay.toggleMouse(true))
    this.stage.addChild(sprite)
    this.sprites.set(pet.id, sprite)
    return sprite
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
          directions.set(id, { dx: Math.cos(angle) * SPEED, dy: Math.sin(angle) * SPEED, since: now })
        }
        const { dx, dy } = directions.get(id)
        sprite.x = Math.max(0, Math.min(window.innerWidth,  sprite.x + dx))
        sprite.y = Math.max(0, Math.min(window.innerHeight, sprite.y + dy))
      })
    })
  }
}

async function initApp() {
  const app = new Application()
  await app.init({
    width:           window.innerWidth,
    height:          window.innerHeight,
    backgroundAlpha: 0,
    antialias:       true,
    resolution:      window.devicePixelRatio || 1,
    autoDensity:     true,
  })
  document.getElementById('app').appendChild(app.canvas)

  const pets     = await window.arcana.pet.getAll()
  const renderer = new PetRenderer(app.stage)
  for (const pet of pets) {
    await renderer.addPet(pet, '../assets/pet_default.png')
  }
  renderer.moveRandom(app.ticker)
}

initApp()
