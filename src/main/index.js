const { app } = require('electron')
const GameWorld     = require('./gameWorld')
const WindowManager = require('./windowManager')
const IpcRouter     = require('./ipcRouter')

const gameWorld     = new GameWorld()
const windowManager = new WindowManager()

app.whenReady().then(async () => {
  await gameWorld.init()
  gameWorld.startTick()

  windowManager.createOverlayWindow()

  const ipcRouter = new IpcRouter({
    petSystem:       gameWorld.petSystem,
    levelSystem:     gameWorld.levelSystem,
    evolutionSystem: gameWorld.evolutionSystem,
    skillSystem:     gameWorld.skillSystem,
    itemSystem:      gameWorld.itemSystem,
    windowManager,
  })
  ipcRouter.register()

  windowManager.createTray(() => app.quit())
})

app.on('before-quit', () => {
  gameWorld.shutdown()
})
