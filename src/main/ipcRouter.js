const { ipcMain } = require('electron')

class IpcRouter {
  constructor({ petSystem, windowManager }) {
    this.petSystem     = petSystem
    this.windowManager = windowManager
  }

  register() {
    ipcMain.handle('pet:get-all', () => this.petSystem.getAll())

    ipcMain.on('overlay:toggle-mouse', (_event, ignore) => {
      this.windowManager.toggleMouseEvents(ignore)
    })
  }
}

module.exports = IpcRouter
