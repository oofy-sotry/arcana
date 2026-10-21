const { BrowserWindow, Tray, Menu, nativeImage, screen } = require('electron')
const path = require('path')

class WindowManager {
  constructor() {
    this.overlayWindow  = null
    this.launcherWindow = null
    this.tray           = null
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

  createLauncherWindow() {
    if (this.launcherWindow && !this.launcherWindow.isDestroyed()) {
      this.launcherWindow.focus()
      return this.launcherWindow
    }

    this.launcherWindow = new BrowserWindow({
      width:  800,
      height: 600,
      title:  'Arcana',
      webPreferences: {
        preload:          path.join(__dirname, '../preload/preload.js'),
        contextIsolation: true,
        nodeIntegration:  false,
      },
    })

    this.launcherWindow.loadFile(
      path.join(__dirname, '../renderer/launcher/index.html')
    )

    this.launcherWindow.on('closed', () => { this.launcherWindow = null })

    return this.launcherWindow
  }

  // 사냥터는 새 창 대신 요청한 창(메인 런처)의 화면을 사냥 페이지로 전환
  // query: 야생 조우면 { zone, monster } — 사냥 페이지가 조우 모드(그 몬스터 1마리, 끝나면 자동 복귀)로 열림
  showHuntingIn(win, query = {}) {
    if (!win || win.isDestroyed()) return
    win.loadFile(path.join(__dirname, '../renderer/hunting/index.html'), { query })
  }

  // 사냥 페이지 → 런처 복귀 (런처 init이 저장된 맵 위치로 월드 화면을 다시 띄움)
  showLauncherIn(win) {
    if (!win || win.isDestroyed()) return
    win.loadFile(path.join(__dirname, '../renderer/launcher/index.html'))
  }

  createTray(onQuit) {
    const iconPath = path.join(__dirname, '../assets/tray_icon.png')
    const icon     = nativeImage.createFromPath(iconPath)

    this.tray = new Tray(icon)
    this.tray.setToolTip('Arcana')

    const menu = Menu.buildFromTemplate([
      { label: '런처 열기', click: () => this.createLauncherWindow() },
      { type: 'separator' },
      { label: '종료',     click: onQuit },
    ])

    this.tray.setContextMenu(menu)
    this.tray.on('double-click', () => this.createLauncherWindow())

    return this.tray
  }

  toggleMouseEvents(ignore) {
    if (!this.overlayWindow) return
    this.overlayWindow.setIgnoreMouseEvents(ignore, { forward: true })
  }
}

module.exports = WindowManager
