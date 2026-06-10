const { Router } = require('express')
const db = require('../db/database')

const router = Router()

// GET /ranking/:category  — category: level | stage | collection
router.get('/:category', (req, res) => {
  const { category } = req.params
  const rows = db.query(
    `SELECT u.username, up.pet_snapshot, up.synced_at
     FROM user_pets up
     JOIN users u ON u.id = up.user_id`
  )

  // 유저별 best pet 집계
  const byUser = {}
  rows.forEach(r => {
    const pet = JSON.parse(r.pet_snapshot)
    const entry = byUser[r.username] || { username: r.username, pets: [], synced_at: r.synced_at }
    entry.pets.push(pet)
    byUser[r.username] = entry
  })

  const users = Object.values(byUser).map(u => {
    const maxLevel = Math.max(...u.pets.map(p => p.level || 0))
    const maxStage = Math.max(...u.pets.map(p => p.evolution_stage || 0))
    return {
      username:   u.username,
      total_pets: u.pets.length,
      max_level:  maxLevel,
      max_stage:  maxStage,
      synced_at:  u.synced_at,
    }
  })

  const sorted = users.sort((a, b) => {
    if (category === 'stage')      return b.max_stage - a.max_stage
    if (category === 'collection') return b.total_pets - a.total_pets
    return b.max_level - a.max_level
  })

  res.json({ category, ranking: sorted.slice(0, 100) })
})

module.exports = router
