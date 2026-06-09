module.exports = [
  `ALTER TABLE pets ADD COLUMN coins INTEGER NOT NULL DEFAULT 0`,

  `CREATE TABLE IF NOT EXISTS hunt_log (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    pet_id     INTEGER NOT NULL REFERENCES pets(id),
    zone_id    TEXT    NOT NULL,
    mode       TEXT    NOT NULL DEFAULT 'auto',
    started_at INTEGER NOT NULL,
    ended_at   INTEGER,
    result     TEXT
  )`,

  `CREATE TABLE IF NOT EXISTS drop_log (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    pet_id      INTEGER NOT NULL REFERENCES pets(id),
    hunt_log_id INTEGER REFERENCES hunt_log(id),
    item_id     TEXT,
    quantity    INTEGER NOT NULL DEFAULT 0,
    coins       INTEGER NOT NULL DEFAULT 0,
    dropped_at  INTEGER NOT NULL
  )`,
]
