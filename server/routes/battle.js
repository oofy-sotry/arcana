const { Router } = require('express')
const db = require('../db/database')
const { requireAuth } = require('../middleware/auth')

const router = Router()

function calcPower(pet) {
  const stage = pet.evolution_stage || 0
  const level = pet.level           || 1
  const atk   = pet.attack ?? (10 + stage * 5)
  const hp    = pet.hp     ?? (50 + stage * 20)
  return atk * level + hp
}

function runBattle(attPet, defPet) {
  let attHp = attPet.hp  || 50
  let defHp = defPet.hp  || 50
  const log  = []
  let round  = 0

  while (attHp > 0 && defHp > 0 && round < 30) {
    round++
    const attDmg = Math.max(1, (attPet.attack || 10) - Math.floor((defPet.defense || 5) * 0.5))
    const defDmg = Math.max(1, (defPet.attack || 10) - Math.floor((attPet.defense || 5) * 0.5))
    defHp -= attDmg
    if (defHp > 0) attHp -= defDmg
    log.push({ round, attHp: Math.max(0, attHp), defHp: Math.max(0, defHp) })
  }

  return { winner: attHp <= 0 ? 'defender' : defHp <= 0 ? 'attacker' : 'draw', log }
}

// POST /battle/challenge — 배틀 도전 (자동 결과)
router.post('/challenge', requireAuth, (req, res) => {
  const { targetUsername, myPet } = req.body || {}
  if (!targetUsername || !myPet) return res.status(400).json({ error: 'missing_fields' })

  const target = db.query('SELECT id, username FROM users WHERE username = ?', [targetUsername])[0]
  if (!target) return res.status(404).json({ error: 'user_not_found' })
  if (target.id === req.user.id) return res.status(400).json({ error: 'cannot_battle_self' })

  // 상대방 가장 강한 펫 조회
  const defRows = db.query('SELECT pet_snapshot FROM user_pets WHERE user_id = ?', [target.id])
  if (!defRows.length) return res.status(400).json({ error: 'target_has_no_pets' })

  const defPet = defRows
    .map(r => JSON.parse(r.pet_snapshot))
    .sort((a, b) => calcPower(b) - calcPower(a))[0]

  const { winner, log } = runBattle(myPet, defPet)
  const winnerId = winner === 'attacker' ? req.user.id : winner === 'defender' ? target.id : null

  db.run(
    `INSERT INTO battle_log
     (attacker_id, defender_id, attacker_username, defender_username, attacker_pet, defender_pet, winner_id, log, battled_at)
     VALUES (?,?,?,?,?,?,?,?,?)`,
    [
      req.user.id, target.id,
      req.user.username, target.username,
      JSON.stringify(myPet), JSON.stringify(defPet),
      winnerId, JSON.stringify(log), Date.now(),
    ]
  )
  db.save()

  res.json({
    ok: true,
    winner,
    myPet,
    defPet,
    defUsername: target.username,
    log,
  })
})

// GET /battle/history — 내 배틀 기록
router.get('/history', requireAuth, (req, res) => {
  const rows = db.query(
    `SELECT id, attacker_username, defender_username, attacker_pet, defender_pet, winner_id, battled_at
     FROM battle_log
     WHERE attacker_id = ? OR defender_id = ?
     ORDER BY battled_at DESC LIMIT 20`,
    [req.user.id, req.user.id]
  )
  res.json({
    history: rows.map(r => ({
      id:                r.id,
      attacker_username: r.attacker_username,
      defender_username: r.defender_username,
      attacker_pet:      JSON.parse(r.attacker_pet),
      defender_pet:      JSON.parse(r.defender_pet),
      won:               r.winner_id === req.user.id,
      battled_at:        r.battled_at,
    })),
  })
})

module.exports = router
