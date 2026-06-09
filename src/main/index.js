const { app } = require('electron')
const GameWorld = require('./gameWorld')

const gameWorld = new GameWorld()

app.whenReady().then(async () => {
  await gameWorld.init()
  gameWorld.startTick()
})
