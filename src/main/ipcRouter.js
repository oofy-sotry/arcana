const { ipcMain } = require('electron')

class IpcRouter {
  constructor({ petSystem, levelSystem, evolutionSystem, skillSystem, itemSystem, windowManager }) {
    this.petSystem       = petSystem
    this.levelSystem     = levelSystem
    this.evolutionSystem = evolutionSystem
    this.skillSystem     = skillSystem
    this.itemSystem      = itemSystem
    this.windowManager   = windowManager
  }

  register() {
    ipcMain.handle('pet:get-all', () => this.petSystem.getAll())
    ipcMain.handle('pet:create', (_e, { name, attribute }) =>
      this.petSystem.createPet(name, attribute)
    )
    ipcMain.handle('pet:add-exp', (_e, { petId, amount }) => {
      const pets = this.petSystem.getAll()
      const pet  = pets.find(p => p.id === petId)
      if (!pet) return null
      return this.levelSystem.addExperience(pet, amount)
    })

    ipcMain.on('overlay:toggle-mouse', (_event, ignore) => {
      this.windowManager.toggleMouseEvents(ignore)
    })
  }
}

module.exports = IpcRouter
