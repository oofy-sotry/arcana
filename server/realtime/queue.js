// 실시간 PvP 공개 매칭 대기열 — FIFO. 2명 이상 모이면 가장 오래 기다린 둘을 즉시 매칭.
const waiting = []

function join(entry) {
  if (waiting.some(e => e.userId === entry.userId)) return null // 이미 대기 중
  waiting.push(entry)
  return tryMatch()
}

function leave(userId) {
  const idx = waiting.findIndex(e => e.userId === userId)
  if (idx !== -1) waiting.splice(idx, 1)
}

function tryMatch() {
  if (waiting.length < 2) return null
  return [waiting.shift(), waiting.shift()]
}

function size() { return waiting.length }

module.exports = { join, leave, tryMatch, size }
