const ITEMS = require('../data/items')
const db = require('../../db/database')

class ItemSystem {
  constructor({ Pet, save }) {
    this.Pet  = Pet
    this.save = save
  }
}

module.exports = ItemSystem
