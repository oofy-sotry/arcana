const { app, dialog } = require('electron')
const { autoUpdater } = require('electron-updater')
const path          = require('path')
const { createAgentService, loadAgentConfig, loadSecrets } = require('@arcana/agent')
const GameWorld     = require('./gameWorld')
const WindowManager = require('./windowManager')
const IpcRouter     = require('./ipcRouter')
const logger        = require('./logger')
const { createAgentGameApi } = require('./agentGameApi')
const { createAgentRequestLog } = require('./agentRequestLog')
const { createUpdater } = require('./updater')
const db            = require('../db/database')

const gameWorld     = new GameWorld()
const windowManager = new WindowManager()

// AI 펫 에이전트 — 설정은 userData/agent.json, 키는 환경변수 또는 userData/agent-secrets.json.
// 설정을 못 읽거나 공급자에 연결할 수 없으면 에이전트만 꺼지고 게임은 그대로 시작한다
function createAgent() {
  const userData = app.getPath('userData')
  try {
    const service = createAgentService({
      config:  loadAgentConfig({ overridePath: path.join(userData, 'agent.json') }),
      secrets: loadSecrets(path.join(userData, 'agent-secrets.json')),
      env:     process.env,
      game:    createAgentGameApi(gameWorld),
      // 게이트웨이 요약 job(설정 summary.enabled일 때만) — 대화 원문 없이 결과만
      onSummary: e => console.log('[agent] summary', e.ok ? `ok turns=${e.turns} ${e.ms}ms` : `fail ${e.ms}ms error=${JSON.stringify(e.error)}`),
    })
    service.init().then(s => console.log('[agent]', s.enabled ? `켜짐 (${s.model})` : `꺼짐 (${s.reason})`))
    return service
  } catch (err) {
    console.error('[agent] 설정을 읽을 수 없어 에이전트를 끕니다:', err.message)
    return null
  }
}

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
    faintSystem:       gameWorld.faintSystem,
    turnBattleSystem:  gameWorld.turnBattleSystem,
    gymSystem:         gameWorld.gymSystem,
    agentService:      createAgent(),
    agentRequestLog:   createAgentRequestLog(db),
    windowManager,
  })
  ipcRouter.register()

  windowManager.createTray(() => app.quit())

  createUpdater({ autoUpdater, isPackaged: app.isPackaged, dialog }).start() // 기다리지 않음 — 확인·다운로드는 뒤에서
})

app.on('before-quit', () => {
  gameWorld.shutdown()
})
