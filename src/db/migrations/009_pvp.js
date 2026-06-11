module.exports = [
  `CREATE TABLE IF NOT EXISTS pvp_season (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    season_num INTEGER NOT NULL UNIQUE,
    started_at INTEGER NOT NULL,
    ended_at   INTEGER,
    is_active  INTEGER NOT NULL DEFAULT 1
  )`,
  `CREATE TABLE IF NOT EXISTS pvp_stats (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    season_id INTEGER NOT NULL,
    username  TEXT NOT NULL,
    wins      INTEGER NOT NULL DEFAULT 0,
    losses    INTEGER NOT NULL DEFAULT 0,
    rank      INTEGER,
    UNIQUE(season_id, username)
  )`,
]
