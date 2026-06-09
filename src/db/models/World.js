const db = require('../database')

function get(key) {
  const rows = db.query('SELECT value FROM world_state WHERE key = ?', [key])
  return rows.length > 0 ? rows[0].value : null
}

module.exports = { get }
