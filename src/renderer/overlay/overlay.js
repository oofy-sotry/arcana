const { Application } = PIXI

const app = new Application()

async function initApp() {
  await app.init({
    width:            window.innerWidth,
    height:           window.innerHeight,
    backgroundAlpha:  0,
    antialias:        true,
    resolution:       window.devicePixelRatio || 1,
    autoDensity:      true,
  })

  document.getElementById('app').appendChild(app.canvas)

  const pets      = await window.arcana.pet.getAll()
  const renderer  = new PetRenderer(app.stage)
  const imagePath = '../assets/pet_default.png'

  for (const pet of pets) {
    await renderer.addPet(pet, imagePath)
  }

  renderer.moveRandom(app.ticker)
}

initApp()
