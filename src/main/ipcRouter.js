const { ipcMain } = require('electron')

class IpcRouter {
  constructor({ petSystem, windowManager }) {
    this.petSystem     = petSystem
    this.windowManager = windowManager
  }
}

module.exports = IpcRouter
