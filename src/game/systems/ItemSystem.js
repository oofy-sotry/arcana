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
        break
      }
      case 'clean_restore': {
        const cond = Pet.getConditions(pet.id)
        Pet.updateConditions(pet.id, { cleanliness: Math.min(100, cond.cleanliness + 50) })
        break
      }
      case 'happy_restore': {
        const cond = Pet.getConditions(pet.id)
        Pet.updateConditions(pet.id, { happiness: Math.min(100, cond.happiness + 30) })
        break
      }
      case 'energy_restore': {
        const cond = Pet.getConditions(pet.id)
        Pet.updateConditions(pet.id, { energy: Math.min(100, (cond.energy || 0) + 50) })
        break
      }
      case 'evolve_boost':
        // EvolutionSystem에서 아이템 보유 여부만 체크, 소모는 여기서
        break
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
