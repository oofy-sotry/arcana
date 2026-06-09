const { ipcMain } = require('electron')

class IpcRouter {
  constructor({ petSystem, windowManager }) {
    this.petSystem     = petSystem
    this.windowManager = windowManager
  }

  register() {
    ipcMain.handle('pet:get-all', () => this.petSystem.getAll())
  }
}

module.exports = IpcRouter
