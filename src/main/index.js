const { app } = require('electron')
const GameWorld     = require('./gameWorld')
const WindowManager = require('./windowManager')

const gameWorld     = new GameWorld()
const windowManager = new WindowManager()

app.whenReady().then(async () => {
  await gameWorld.init()
  gameWorld.startTick()

  windowManager.createOverlayWindow()
})
