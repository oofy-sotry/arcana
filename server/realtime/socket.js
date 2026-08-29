// 실시간 PvP WS 연결 수명주기: 인증 → 매칭 대기열 → 매치 진행 → 연결 종료 처리.
const db = require('../db/database')
const { verifyToken } = require('../middleware/auth')
const queue = require('./queue')
const { runMatch } = require('./match')
const partyQueue = require('./partyQueue')
const { runHunt } = require('./huntMatch')

// userId -> { ws, matchController, partyZoneId, huntController }
const connections = new Map()

function send(ws, msg) {
  if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(msg))
}

function startMatch(a, b) {
  send(a.ws, { type: 'match:found', self: a.userId, opponent: { userId: b.userId, username: b.username } })
  send(b.ws, { type: 'match:found', self: b.userId, opponent: { userId: a.userId, username: a.username } })

  const controller = runMatch(a, b, {
    broadcast: event => { send(a.ws, event); send(b.ws, event) },
    onEnd: result => {
      const winnerId = result.winner === 'draw' ? null : result.winner
      db.run(
        `INSERT INTO battle_log
         (attacker_id, defender_id, attacker_username, defender_username, attacker_pet, defender_pet, winner_id, log, battled_at)
         VALUES (?,?,?,?,?,?,?,?,?)`,
        [
          a.userId, b.userId,
          a.username, b.username,
          JSON.stringify(a.pet), JSON.stringify(b.pet),
          winnerId, JSON.stringify(result.log), Date.now(),
        ]
      )
      db.save()

      const connA = connections.get(a.userId)
      const connB = connections.get(b.userId)
      if (connA) connA.matchController = null
      if (connB) connB.matchController = null
    },
  })

  const connA = connections.get(a.userId)
  const connB = connections.get(b.userId)
  if (connA) connA.matchController = controller
  if (connB) connB.matchController = controller
}

function startHunt(zoneId, members) {
  const controller = runHunt(zoneId, members, {
    broadcast: event => members.forEach(m => send(m.ws, event)),
    onEnd: () => {
      members.forEach(m => {
        const conn = connections.get(m.userId)
        if (conn) conn.huntController = null
      })
    },
  })

  members.forEach(m => {
    const conn = connections.get(m.userId)
    if (conn) { conn.huntController = controller; conn.partyZoneId = null }
  })
}

function attach(wss) {
  wss.on('connection', ws => {
    let userId   = null
    let username = null

    ws.on('message', raw => {
      let msg
      try { msg = JSON.parse(raw) } catch { return }

      if (msg.type === 'auth') {
        const result = verifyToken(msg.token)
        if (result.error) { send(ws, { type: 'auth:error', error: result.error }); return }
        userId   = result.user.id
        username = result.user.username
        connections.set(userId, { ws, matchController: null, partyZoneId: null, huntController: null })
        send(ws, { type: 'auth:ok', userId, username })
        return
      }

      if (msg.type === 'queue:join') {
        if (!userId) { send(ws, { type: 'error', error: 'not_authenticated' }); return }
        const pair = queue.join({ userId, username, ws, pet: msg.pet })
        if (!pair) { send(ws, { type: 'queue:waiting' }); return }
        startMatch(pair[0], pair[1])
        return
      }

      if (msg.type === 'queue:leave') {
        if (userId) queue.leave(userId)
        return
      }

      if (msg.type === 'party:join') {
        if (!userId) { send(ws, { type: 'error', error: 'not_authenticated' }); return }
        const zoneId = msg.zoneId
        const conn = connections.get(userId)
        if (conn) conn.partyZoneId = zoneId
        const result = partyQueue.join(zoneId, { userId, username, ws, pet: msg.pet }, {
          onLock: members => startHunt(zoneId, members),
        })
        send(ws, { type: 'party:queue-status', zoneId, ...result })
        return
      }

      if (msg.type === 'party:leave') {
        const conn = connections.get(userId)
        if (conn?.partyZoneId) { partyQueue.leave(conn.partyZoneId, userId); conn.partyZoneId = null }
        return
      }
    })

    ws.on('close', () => {
      if (!userId) return
      queue.leave(userId)
      const conn = connections.get(userId)
      if (conn?.matchController) conn.matchController.forfeit(userId)
      if (conn?.partyZoneId) partyQueue.leave(conn.partyZoneId, userId)
      if (conn?.huntController) conn.huntController.removeMember(userId)
      connections.delete(userId)
    })
  })
}

module.exports = { attach }
