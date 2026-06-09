const db = require('../database')

function get(key) {
  const rows = db.query('SELECT value FROM world_state WHERE key = ?', [key])
  return rows.length > 0 ? rows[0].value : null
}

function set(key, value) {
  db.run(
    `INSERT INTO world_state (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    [key, String(value)]
  )
}

module.exports = { get, set }
