module.exports = [
  `ALTER TABLE summoner ADD COLUMN level       INTEGER NOT NULL DEFAULT 1`,
  `ALTER TABLE summoner ADD COLUMN exp         INTEGER NOT NULL DEFAULT 0`,
  `ALTER TABLE summoner ADD COLUMN stat_points INTEGER NOT NULL DEFAULT 0`,
  `ALTER TABLE summoner ADD COLUMN personality TEXT`,
  `ALTER TABLE summoner ADD COLUMN appearance  TEXT NOT NULL DEFAULT 'male_a'`,
  `CREATE TABLE IF NOT EXISTS summoner_stats (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    summoner_id INTEGER NOT NULL,
    stat_key    TEXT NOT NULL,
    value       INTEGER NOT NULL DEFAULT 0,
    UNIQUE(summoner_id, stat_key)
  )`,
  `CREATE TABLE IF NOT EXISTS map_state (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    summoner_id INTEGER NOT NULL UNIQUE,
    map_id      TEXT NOT NULL DEFAULT 'town',
    tile_x      INTEGER NOT NULL DEFAULT 7,
    tile_y      INTEGER NOT NULL DEFAULT 7
  )`,
]
