module.exports = [
  `CREATE TABLE IF NOT EXISTS summoner (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT NOT NULL,
    created_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS one_time_events (
    event_key TEXT PRIMARY KEY
  )`,
]
