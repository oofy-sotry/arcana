const { app } = require('electron')
const GameWorld     = require('./gameWorld')
const WindowManager = require('./windowManager')
const IpcRouter     = require('./ipcRouter')
const logger        = require('./logger')

const gameWorld     = new GameWorld()
const windowManager = new WindowManager()

app.whenReady().then(async () => {
  logger.install() // 창 생성·IPC 등록 전에 설치해야 전부 수집됨
  await gameWorld.init()
  gameWorld.startTick()

  windowManager.createOverlayWindow()

  const ipcRouter = new IpcRouter({
    petSystem:        gameWorld.petSystem,
    levelSystem:      gameWorld.levelSystem,
    evolutionSystem:  gameWorld.evolutionSystem,
    skillSystem:      gameWorld.skillSystem,
    itemSystem:       gameWorld.itemSystem,
    huntingSystem:    gameWorld.huntingSystem,
    explorationSystem: gameWorld.explorationSystem,
    breedingSystem:   gameWorld.breedingSystem,
    gachaSystem:      gameWorld.gachaSystem,
    partySystem:      gameWorld.partySystem,
    questSystem:      gameWorld.questSystem,
    onlineSystem:      gameWorld.onlineSystem,
    equipmentSystem:   gameWorld.equipmentSystem,
    factionSystem:     gameWorld.factionSystem,
    pvpSystem:         gameWorld.pvpSystem,
    summonerSystem:    gameWorld.summonerSystem,
    collectionSystem:  gameWorld.collectionSystem,
    windowManager,
  })
  ipcRouter.register()

  windowManager.createTray(() => app.quit())
})

app.on('before-quit', () => {
  gameWorld.shutdown()
})
