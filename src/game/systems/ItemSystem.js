const ITEMS = require('../data/items')
const db = require('../../db/database')

class ItemSystem {
  constructor({ Pet, save }) {
    this.Pet  = Pet
    this.save = save
  }

  addItem(petId, itemId, quantity = 1) {
    const item = ITEMS[itemId]
    if (!item) return false

    db.run(
      `INSERT INTO pet_inventory (pet_id, item_id, quantity) VALUES (?, ?, ?)
       ON CONFLICT(pet_id, item_id) DO UPDATE SET quantity = MIN(quantity + ?, ?)`,
      [petId, itemId, quantity, quantity, item.maxStack]
    )
    this.save()
    return true
  }

  getInventory(petId) {
    const rows = db.query(
      'SELECT * FROM pet_inventory WHERE pet_id = ? AND quantity > 0',
      [petId]
    )
    return rows.map(row => ({
      ...row,
      data: ITEMS[row.item_id] || null,
    }))
  }

  useItem(pet, itemId) {
    const inv = db.query(
      'SELECT * FROM pet_inventory WHERE pet_id = ? AND item_id = ?',
      [pet.id, itemId]
    )
    if (inv.length === 0 || inv[0].quantity < 1) return { ok: false, reason: 'not_owned' }

    const item = ITEMS[itemId]
    if (!item) return { ok: false, reason: 'unknown_item' }

    const Pet = this.Pet
    switch (item.effect) {
      case 'hunger_restore': {
        const cond = Pet.getConditions(pet.id)
        Pet.updateConditions(pet.id, { hunger: Math.min(100, cond.hunger + 40) })
        Pet.updatePet(pet.id, { affinity: Math.min(100, (pet.affinity || 0) + 0.3) })
        break
      }
      case 'clean_restore': {
        const cond = Pet.getConditions(pet.id)
        Pet.updateConditions(pet.id, { cleanliness: Math.min(100, cond.cleanliness + 50) })
        Pet.updatePet(pet.id, { affinity: Math.min(100, (pet.affinity || 0) + 0.2) })
        break
      }
      case 'happy_restore': {
        const cond = Pet.getConditions(pet.id)
        Pet.updateConditions(pet.id, { happiness: Math.min(100, cond.happiness + 30) })
        Pet.updatePet(pet.id, { affinity: Math.min(100, (pet.affinity || 0) + 0.5) })
        break
      }
      case 'energy_restore': {
        const cond = Pet.getConditions(pet.id)
        Pet.updateConditions(pet.id, { energy: Math.min(100, (cond.energy || 0) + 50) })
        break
      }
      case 'evolve_boost':
        break

      case 'death_rate_down': {
        // 다음 사망 1회를 HP 1 생존으로 전환 — CombatSystem에서 소비
        db.run(
          "INSERT OR REPLACE INTO world_state (key, value) VALUES (?, '1')",
          [`death_shield_${pet.id}`]
        )
        break
      }

      case 'revive': {
        // 사망 후 HP 50%로 자동 부활 — CombatSystem에서 소비
        db.run(
          "INSERT OR REPLACE INTO world_state (key, value) VALUES (?, '1')",
          [`auto_revive_${pet.id}`]
        )
        break
      }

      case 'dark_evolve': {
        if ((pet.evolution_stage || 0) >= 4) return { ok: false, reason: 'max_stage' }
        const CHARACTERS = require('../data/characters')
        const DARK_BONUS = 0.20
        const fromStage  = pet.evolution_stage || 0
        const toStage    = fromStage + 1
        const nextChar   = Object.values(CHARACTERS).find(
          c => c.attribute === pet.attribute && c.stage === toStage
        )
        const updates = {
          evolution_stage: toStage,
          attribute2: 'dark',
          hp:      Math.ceil((pet.hp      || 100) * (1 + DARK_BONUS)),
          mp:      Math.ceil((pet.mp      || 100) * (1 + DARK_BONUS)),
          attack:  Math.ceil((pet.attack  || 10)  * (1 + DARK_BONUS)),
          defense: Math.ceil((pet.defense || 5)   * (1 + DARK_BONUS)),
          speed:   Math.ceil((pet.speed   || 10)  * (1 + DARK_BONUS)),
        }
        if (nextChar) updates.name = nextChar.name
        Pet.updatePet(pet.id, updates)
        db.run(
          `INSERT INTO evolution_log (pet_id, from_stage, to_stage, evo_type, evolved_at) VALUES (?,?,?,?,?)`,
          [pet.id, fromStage, toStage, 'dark', Date.now()]
        )
        break
      }

      default:
        return { ok: false, reason: 'unhandled_effect' }
    }

    db.run(
      'UPDATE pet_inventory SET quantity = quantity - 1 WHERE pet_id = ? AND item_id = ?',
      [pet.id, itemId]
    )
    this.save()
    return { ok: true, effect: item.effect }
  }
}

module.exports = ItemSystem
