const AGE_DURATION_SECONDS = 43200  // 12시간 실시간 = 1살
const TICK_INTERVAL_SECONDS = 60    // 게임 루프 주기

// fromMs, toMs: Date.now() 기준 밀리초 타임스탬프
function getElapsedSeconds(fromMs, toMs = Date.now()) {
  return Math.max(0, Math.floor((toMs - fromMs) / 1000))
}

// DB의 age_seconds → 표시용 나이(살)
function secondsToAge(ageSeconds) {
  return Math.floor(ageSeconds / AGE_DURATION_SECONDS)
}

// 오프라인 경과 시간 → 처리해야 할 tick 횟수
function calcOfflineTicks(elapsedSeconds) {
  return Math.floor(elapsedSeconds / TICK_INTERVAL_SECONDS)
}

module.exports = {
  AGE_DURATION_SECONDS,
  TICK_INTERVAL_SECONDS,
  getElapsedSeconds,
  secondsToAge,
  calcOfflineTicks,
}
