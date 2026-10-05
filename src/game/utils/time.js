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

// 로컬 날짜 키 'YYYY-MM-DD' — "하루가 지나면" 판정(기절 횟수 감소, 하루 1번 치료)에 사용
function toDayKey(ms = Date.now()) {
  const d = new Date(ms)
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mm}-${dd}`
}

// 두 날짜 키 사이의 날 수 (to가 더 이르면 0)
function daysBetween(fromKey, toKey) {
  const parse = k => { const [y, m, d] = k.split('-').map(Number); return Date.UTC(y, m - 1, d) }
  return Math.max(0, Math.round((parse(toKey) - parse(fromKey)) / 86400000))
}

module.exports = {
  AGE_DURATION_SECONDS,
  TICK_INTERVAL_SECONDS,
  getElapsedSeconds,
  secondsToAge,
  calcOfflineTicks,
  toDayKey,
  daysBetween,
}
