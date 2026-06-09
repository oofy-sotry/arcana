const { randomUUID } = require('crypto')
const db = require('../database')

function createPet(name, attribute, species = 'default') {
  const uuid = randomUUID()
  const now = Date.now()

  db.run(
    `INSERT INTO pets (uuid, name, species, attribute, born_at, last_active)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [uuid, name, species, attribute, now, now]
  )

  const pet = db.query('SELECT * FROM pets WHERE uuid = ?', [uuid])[0]

  db.run(
    `INSERT INTO pet_conditions (pet_id, last_updated) VALUES (?, ?)`,
    [pet.id, now]
  )

  return pet
}

function getPet(id) {
  return db.query('SELECT * FROM pets WHERE id = ?', [id])[0] || null
}

function getAllPets() {
  return db.query('SELECT * FROM pets WHERE is_alive = 1')
}

function updatePet(id, fields) {
  const entries = Object.entries(fields)
  const setClause = entries.map(([k]) => `${k} = ?`).join(', ')
  db.run(
    `UPDATE pets SET ${setClause} WHERE id = ?`,
    [...entries.map(([, v]) => v), id]
  )
}

function getConditions(petId) {
  return db.query('SELECT * FROM pet_conditions WHERE pet_id = ?', [petId])[0] || null
}

module.exports = { createPet, getPet, getAllPets, updatePet, getConditions }
