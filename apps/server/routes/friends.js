const { Router } = require('express')
const db = require('../db/database')
const { requireAuth } = require('../middleware/auth')

const router = Router()

// GET /friends — 내 친구 목록
router.get('/', requireAuth, (req, res) => {
  const rows = db.query(
    `SELECT u.id, u.username,
            (SELECT COUNT(*) FROM user_pets WHERE user_id = u.id) AS pet_count
     FROM friendships f
     JOIN users u ON u.id = f.friend_id
     WHERE f.user_id = ?`,
    [req.user.id]
  )
  res.json({ friends: rows })
})

// POST /friends — 친구 추가 (username으로)
router.post('/', requireAuth, (req, res) => {
  const { username } = req.body || {}
  if (!username) return res.status(400).json({ error: 'missing_username' })

  const target = db.query('SELECT id, username FROM users WHERE username = ?', [username])[0]
  if (!target) return res.status(404).json({ error: 'user_not_found' })
  if (target.id === req.user.id) return res.status(400).json({ error: 'cannot_add_self' })

  const existing = db.query('SELECT id FROM friendships WHERE user_id = ? AND friend_id = ?', [req.user.id, target.id])
  if (existing.length) return res.status(409).json({ error: 'already_friends' })

  db.run(
    'INSERT INTO friendships (user_id, friend_id, created_at) VALUES (?,?,?)',
    [req.user.id, target.id, Date.now()]
  )
  db.save()
  res.json({ ok: true, friend: { id: target.id, username: target.username } })
})

// DELETE /friends/:id — 친구 삭제
router.delete('/:id', requireAuth, (req, res) => {
  db.run('DELETE FROM friendships WHERE user_id = ? AND friend_id = ?', [req.user.id, Number(req.params.id)])
  db.save()
  res.json({ ok: true })
})

// GET /friends/:username/pets — 친구 펫 목록 조회
router.get('/:username/pets', requireAuth, (req, res) => {
  const target = db.query('SELECT id FROM users WHERE username = ?', [req.params.username])[0]
  if (!target) return res.status(404).json({ error: 'user_not_found' })

  // 내 친구인지 확인
  const isFriend = db.query('SELECT id FROM friendships WHERE user_id = ? AND friend_id = ?', [req.user.id, target.id])
  if (!isFriend.length) return res.status(403).json({ error: 'not_friends' })

  const rows = db.query('SELECT pet_snapshot FROM user_pets WHERE user_id = ?', [target.id])
  res.json({ pets: rows.map(r => JSON.parse(r.pet_snapshot)) })
})

module.exports = router
