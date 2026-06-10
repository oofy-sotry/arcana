const { Router } = require('express')
const db = require('../db/database')
const { requireAuth } = require('../middleware/auth')

const router = Router()

// POST /save/sync — 클라이언트 펫 스냅샷 업로드
router.post('/sync', requireAuth, (req, res) => {
  const { pets } = req.body || {}
  if (!Array.isArray(pets)) return res.status(400).json({ error: 'invalid_data' })

  db.run('DELETE FROM user_pets WHERE user_id = ?', [req.user.id])
  pets.forEach(pet => {
    db.run(
      'INSERT INTO user_pets (user_id, pet_snapshot, synced_at) VALUES (?,?,?)',
      [req.user.id, JSON.stringify(pet), Date.now()]
    )
  })
  db.save()
  res.json({ ok: true, synced: pets.length })
})

// GET /save/sync — 서버에 저장된 내 펫 스냅샷 조회
router.get('/sync', requireAuth, (req, res) => {
  const rows = db.query('SELECT pet_snapshot, synced_at FROM user_pets WHERE user_id = ?', [req.user.id])
  res.json({
    pets:      rows.map(r => JSON.parse(r.pet_snapshot)),
    synced_at: rows[0]?.synced_at ?? null,
  })
})

module.exports = router
