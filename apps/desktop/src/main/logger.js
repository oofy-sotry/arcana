const { app, ipcMain } = require('electron')
const fs   = require('fs')
const path = require('path')
const api  = require('../game/services/ApiService')

// 클라이언트 로그: 파일(userData/logs/arcana.log — Windows는 %APPDATA%\Arcana\logs) + 에러는 서버 /client-log로 전송.
// 사냥 등 대부분의 게임 로직이 서버를 거치지 않아, 이게 없으면 친구 PC에서 난 에러를 호스트가 알 수 없음.
const MAX_FILE_BYTES = 5 * 1024 * 1024
const RESEND_MS      = 60_000 // 같은 에러 메시지는 1분에 한 번만 서버로 전송

let logFile = null
const recentlySent = new Map()

function _ensureFile() {
  if (logFile) return logFile
  const dir = path.join(app.getPath('userData'), 'logs')
  fs.mkdirSync(dir, { recursive: true })
  logFile = path.join(dir, 'arcana.log')
  try {
    if (fs.statSync(logFile).size > MAX_FILE_BYTES) fs.renameSync(logFile, logFile + '.old')
  } catch { /* 첫 실행이면 파일 없음 */ }
  return logFile
}

function write(level, source, message) {
  const line = `[${new Date().toISOString()}] [${level}] ${source ? source + ' ' : ''}${message}\n`
  try { fs.appendFileSync(_ensureFile(), line) } catch { /* 로그 실패로 앱을 죽이지 않음 */ }
  if (level === 'error') _report(source, message)
}

function _report(source, message) {
  const key = `${source}|${message}`
  const now = Date.now()
  if (now - (recentlySent.get(key) || 0) < RESEND_MS) return
  recentlySent.set(key, now)
  api.post('/client-log', { level: 'error', source, message, version: app.getVersion() })
    .catch(() => { /* 서버 미접속 상태면 파일 로그만 남김 */ })
}

// 모든 창의 콘솔 경고/에러, 렌더러 크래시, 로드 실패를 수집
function _watchWindows() {
  const LEVELS = { 2: 'warn', 3: 'error' }
  app.on('browser-window-created', (_e, win) => {
    const wc = win.webContents
    wc.on('console-message', (_ev, level, message, line, sourceId) => {
      if (!LEVELS[level]) return
      write(LEVELS[level], `${path.basename(sourceId || '')}:${line}`, message)
    })
    wc.on('preload-error', (_ev, preloadPath, err) => write('error', path.basename(preloadPath), err?.stack || String(err)))
    wc.on('render-process-gone', (_ev, details) => write('error', 'renderer', `render-process-gone ${JSON.stringify(details)}`))
    wc.on('did-fail-load', (_ev, code, desc, url) => write('error', 'load', `${code} ${desc} ${url}`))
  })
}

// ipcMain.handle 핸들러가 throw하면 렌더러엔 "Error invoking remote method"만 보이므로 메인에서 원인을 기록
function _wrapIpc() {
  const origHandle = ipcMain.handle.bind(ipcMain)
  ipcMain.handle = (channel, handler) => origHandle(channel, async (...args) => {
    try {
      return await handler(...args)
    } catch (err) {
      write('error', `ipc:${channel}`, err?.stack || String(err))
      throw err
    }
  })
}

// IpcRouter.register()보다 먼저 호출해야 IPC 래핑이 적용됨
function install() {
  _watchWindows()
  _wrapIpc()
  process.on('uncaughtException',  err => write('error', 'main', err?.stack || String(err)))
  process.on('unhandledRejection', err => write('error', 'main', err?.stack || String(err)))
  write('info', 'main', `Arcana ${app.getVersion()} 시작`)
}

module.exports = { install, write }
