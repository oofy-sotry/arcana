// 자동 업데이트 — GitHub Releases의 latest.yml로 새 버전을 확인해 받아 두고, 다 받으면 재시작할지 묻는다.
// 개발 실행에서는 건너뛰고, 확인 실패(오프라인 등)는 로그만 남겨 게임 시작을 막지 않는다
function createUpdater({ autoUpdater, isPackaged, dialog, logger = console }) {
  async function onDownloaded(info) {
    const { response } = await dialog.showMessageBox({
      type:     'info',
      title:    'Arcana 업데이트',
      message:  `새 버전 ${info.version}을 받았습니다.`,
      detail:   '"나중에"를 고르면 앱을 끌 때 설치됩니다.',
      buttons:  ['지금 재시작', '나중에'],
      defaultId: 0,
      cancelId:  1,
    })
    if (response === 0) autoUpdater.quitAndInstall()
  }

  async function start() {
    if (!isPackaged) {
      logger.log('[updater] 개발 실행이라 업데이트 확인을 건너뜁니다')
      return false
    }
    autoUpdater.autoDownload = true
    autoUpdater.autoInstallOnAppQuit = true
    autoUpdater.on('update-available', info => logger.log(`[updater] 새 버전 ${info.version} 받는 중`))
    autoUpdater.on('update-not-available', () => logger.log('[updater] 최신 버전입니다'))
    autoUpdater.on('error', err => logger.error('[updater] 오류:', err.message))
    autoUpdater.on('update-downloaded', info => {
      onDownloaded(info).catch(err => logger.error('[updater] 설치 확인 창 오류:', err.message))
    })
    try {
      await autoUpdater.checkForUpdates()
    } catch (err) {
      logger.error('[updater] 확인 실패:', err.message)
    }
    return true
  }

  return { start }
}

module.exports = { createUpdater }
