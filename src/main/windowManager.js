const { BrowserWindow, screen } = require('electron')
const path = require('path')

class WindowManager {
  constructor() {
    this.overlayWindow = null
  }

  createOverlayWindow() {
    const { width, height } = screen.getPrimaryDisplay().workAreaSize

    this.overlayWindow = new BrowserWindow({
      width,
      height,
      x: 0,
      y: 0,
      frame: false,
      transparent: true,
      alwaysOnTop: true,
      skipTaskbar: true,
      resizable: false,
      focusable: false,
      webPreferences: {
        preload: path.join(__dirname, '../preload/preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
      },
    })

    this.overlayWindow.setIgnoreMouseEvents(true, { forward: true })
    this.overlayWindow.loadFile(
      path.join(__dirname, '../renderer/overlay/index.html')
    )

    return this.overlayWindow
  }

  toggleMouseEvents(ignore) {
    if (!this.overlayWindow) return
    this.overlayWindow.setIgnoreMouseEvents(ignore, { forward: true })
  }
}

module.exports = WindowManager
