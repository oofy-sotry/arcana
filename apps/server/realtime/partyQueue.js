// 파티 사냥 매칭 — 구역(zoneId)별 독립 대기열. 2명 모이면 유예시간 시작,
// 그 안에 3번째가 오면 즉시 확정, 아니면 유예 만료 시 2명으로 확정.
const MIN_PARTY = 2
const MAX_PARTY = 3
const DEFAULT_GRACE_MS = Number(process.env.PARTY_GRACE_MS) || 8000

const forming = new Map() // zoneId -> { members: [entry], timer: Timeout|null }

function _lock(zoneId, onLock) {
  const group = forming.get(zoneId)
  if (!group) return
  if (group.timer) clearTimeout(group.timer)
  forming.delete(zoneId)
  onLock(group.members)
}

// entry: { userId, username, ws, pet }
// 반환: { status: 'waiting'|'forming'|'already_waiting', count }
// 그룹이 확정되면(즉시 또는 유예 만료 후) onLock(members) 콜백이 호출됨.
function join(zoneId, entry, { graceMs = DEFAULT_GRACE_MS, onLock }) {
  let group = forming.get(zoneId)
  if (!group) { group = { members: [], timer: null }; forming.set(zoneId, group) }

  if (group.members.some(m => m.userId === entry.userId)) {
    return { status: 'already_waiting', count: group.members.length }
  }

  group.members.push(entry)

  if (group.members.length >= MAX_PARTY) {
    const count = group.members.length
    _lock(zoneId, onLock)
    return { status: 'forming', count }
  }
  if (group.members.length === MIN_PARTY) {
    group.timer = setTimeout(() => _lock(zoneId, onLock), graceMs)
    return { status: 'forming', count: group.members.length }
  }
  return { status: 'waiting', count: group.members.length }
}

function leave(zoneId, userId) {
  const group = forming.get(zoneId)
  if (!group) return
  const idx = group.members.findIndex(m => m.userId === userId)
  if (idx === -1) return
  group.members.splice(idx, 1)
  if (group.members.length < MIN_PARTY && group.timer) {
    clearTimeout(group.timer)
    group.timer = null
  }
  if (group.members.length === 0) forming.delete(zoneId)
}

function groupSize(zoneId) {
  return forming.get(zoneId)?.members.length ?? 0
}

module.exports = { join, leave, groupSize, MIN_PARTY, MAX_PARTY, DEFAULT_GRACE_MS }
