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
}

module.exports = ItemSystem
