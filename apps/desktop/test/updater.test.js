const { test } = require('node:test')
const assert = require('node:assert/strict')
const { EventEmitter } = require('events')
const { createUpdater } = require('../src/main/updater')

// electron-updater autoUpdater 대역 — 이벤트와 확인·설치 호출만 흉내
function fakeUpdater({ check = async () => ({}) } = {}) {
  const u = new EventEmitter()
  u.checks = 0
  u.installs = 0
  u.checkForUpdates = () => { u.checks++; return check() }
  u.quitAndInstall = () => { u.installs++ }
  return u
}

function fakeLogger() {
  const lines = []
  return { lines, log: (...a) => lines.push(['log', a.join(' ')]), error: (...a) => lines.push(['error', a.join(' ')]) }
}

const fakeDialog = response => {
  const calls = []
  return { calls, showMessageBox: async opts => { calls.push(opts); return { response } } }
}

const tick = () => new Promise(r => setImmediate(r))

test('개발 실행(패키징 안 됨)이면 업데이트를 확인하지 않는다', async () => {
  const autoUpdater = fakeUpdater()
  const started = await createUpdater({ autoUpdater, isPackaged: false, dialog: fakeDialog(0), logger: fakeLogger() }).start()
  assert.equal(started, false)
  assert.equal(autoUpdater.checks, 0)
})

test('패키징된 앱이면 자동 다운로드·종료 시 설치를 켜고 업데이트를 확인한다', async () => {
  const autoUpdater = fakeUpdater()
  const started = await createUpdater({ autoUpdater, isPackaged: true, dialog: fakeDialog(0), logger: fakeLogger() }).start()
  assert.equal(started, true)
  assert.equal(autoUpdater.checks, 1)
  assert.equal(autoUpdater.autoDownload, true)
  assert.equal(autoUpdater.autoInstallOnAppQuit, true)
})

test('확인 실패(오프라인 등)는 로그만 남기고 던지지 않는다', async () => {
  const logger = fakeLogger()
  const autoUpdater = fakeUpdater({ check: async () => { throw new Error('net::ERR_INTERNET_DISCONNECTED') } })
  await createUpdater({ autoUpdater, isPackaged: true, dialog: fakeDialog(0), logger }).start()
  assert.ok(logger.lines.some(([lv, m]) => lv === 'error' && m.includes('ERR_INTERNET_DISCONNECTED')))
})

test('error 이벤트는 로그만 남긴다', async () => {
  const logger = fakeLogger()
  const autoUpdater = fakeUpdater()
  await createUpdater({ autoUpdater, isPackaged: true, dialog: fakeDialog(0), logger }).start()
  autoUpdater.emit('error', new Error('latest.yml 없음'))
  assert.ok(logger.lines.some(([lv, m]) => lv === 'error' && m.includes('latest.yml 없음')))
  assert.equal(autoUpdater.installs, 0)
})

test('받은 뒤 "지금 재시작"을 고르면 설치하며 재시작한다', async () => {
  const dialog = fakeDialog(0)
  const autoUpdater = fakeUpdater()
  await createUpdater({ autoUpdater, isPackaged: true, dialog, logger: fakeLogger() }).start()
  autoUpdater.emit('update-downloaded', { version: '0.3.1' })
  await tick()
  assert.equal(dialog.calls.length, 1)
  assert.ok(dialog.calls[0].message.includes('0.3.1'))
  assert.equal(autoUpdater.installs, 1)
})

test('"나중에"를 고르면 바로 설치하지 않는다 (앱 종료 시 설치)', async () => {
  const autoUpdater = fakeUpdater()
  await createUpdater({ autoUpdater, isPackaged: true, dialog: fakeDialog(1), logger: fakeLogger() }).start()
  autoUpdater.emit('update-downloaded', { version: '0.3.1' })
  await tick()
  assert.equal(autoUpdater.installs, 0)
})
