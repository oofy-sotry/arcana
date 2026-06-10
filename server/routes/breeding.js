const { Router } = require('express')
const db = require('../db/database')
const { requireAuth } = require('../middleware/auth')

const router = Router()

// GET /breeding/offers — 활성 교배 공고 목록
router.get('/offers', requireAuth, (req, res) => {
  const rows = db.query(
    `SELECT id, username, pet_snapshot, price, created_at
     FROM breeding_offers
     WHERE is_active = 1 AND user_id != ?
     ORDER BY created_at DESC LIMIT 50`,
    [req.user.id]
  )
  res.json({ offers: rows.map(r => ({ ...r, pet: JSON.parse(r.pet_snapshot), pet_snapshot: undefined })) })
})

// POST /breeding/offers — 교배 공고 등록
router.post('/offers', requireAuth, (req, res) => {
  const { pet, price = 100 } = req.body || {}
  if (!pet) return res.status(400).json({ error: 'missing_pet' })

  // 기존 공고 비활성화
  db.run('UPDATE breeding_offers SET is_active = 0 WHERE user_id = ? AND is_active = 1', [req.user.id])

  db.run(
    'INSERT INTO breeding_offers (user_id, username, pet_snapshot, price, is_active, created_at) VALUES (?,?,?,?,1,?)',
    [req.user.id, req.user.username, JSON.stringify(pet), price, Date.now()]
  )
  db.save()
  res.json({ ok: true })
})

// DELETE /breeding/offers/mine — 내 공고 취소
router.delete('/offers/mine', requireAuth, (req, res) => {
  db.run('UPDATE breeding_offers SET is_active = 0 WHERE user_id = ? AND is_active = 1', [req.user.id])
  db.save()
  res.json({ ok: true })
})

// POST /breeding/offers/:id/request — 교배 신청 (서버가 자동 배정)
router.post('/offers/:id/request', requireAuth, (req, res) => {
  const offer = db.query('SELECT * FROM breeding_offers WHERE id = ? AND is_active = 1', [req.params.id])[0]
  if (!offer) return res.status(404).json({ error: 'offer_not_found' })
  if (offer.user_id === req.user.id) return res.status(400).json({ error: 'cannot_breed_own_pet' })

  const { myPet } = req.body || {}
  if (!myPet) return res.status(400).json({ error: 'missing_pet' })

  const offerPet = JSON.parse(offer.pet_snapshot)

  // 단순 결과 생성: 부모 속성 중 하나를 50% 확률로 선택
  const childAttr = Math.random() < 0.5 ? offerPet.attribute : myPet.attribute
  const child = {
    name:            `${offerPet.name}×${myPet.name}의 자식`,
    attribute:       childAttr,
    evolution_stage: 0,
    level:           1,
    source:          'online_breeding',
    parents:         [offerPet.name, myPet.name],
  }

  // 공고 비활성화 (1회 사용)
  db.run('UPDATE breeding_offers SET is_active = 0 WHERE id = ?', [offer.id])
  db.save()

  res.json({ ok: true, child, offerPet })
})

module.exports = router
