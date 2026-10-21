const { Router } = require('express')
const { verifyToken } = require('../middleware/auth')

const router = Router()

// 클라이언트 에러를 서버 로그로 수집 — 친구가 말해주기 전에 호스트가 서버 로그에서 바로 확인
// 로그인 전 에러도 받아야 해서 인증은 선택(토큰 있으면 username 표기)
const MAX_PER_MIN = 30
const MAX_LEN     = 2000
const hits = new Map() // ip → { windowStart, count }

function allow(ip) {
  const now = Date.now()
  const h = hits.get(ip)
  if (!h || now - h.windowStart > 60_000) { hits.set(ip, { windowStart: now, count: 1 }); return true }
  h.count++
  return h.count <= MAX_PER_MIN
}

// POST /client-log  { level, message, source, version }
router.post('/', (req, res) => {
  if (!allow(req.ip)) return res.status(429).json({ error: 'too_many_requests' })

  const { level, message, source, version } = req.body || {}
  if (typeof message !== 'string' || !message) return res.status(400).json({ error: 'message_required' })

  const header = req.headers.authorization || ''
  const { user } = verifyToken(header.startsWith('Bearer ') ? header.slice(7) : null)
  const who = user ? user.username : 'anonymous'
  const clip = s => String(s ?? '').slice(0, MAX_LEN).replace(/\s+/g, ' ')

  console.warn(
    `[${new Date().toISOString()}] [CLIENT ${clip(level) || 'error'}] ip=${req.ip} user=${who} v=${clip(version)} ` +
    `src=${clip(source)} ${clip(message)}`
  )
  res.json({ ok: true })
})

module.exports = router
