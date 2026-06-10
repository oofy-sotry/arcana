module.exports = [
  `CREATE TABLE IF NOT EXISTS quest_progress (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    quest_id     TEXT    NOT NULL UNIQUE,
    completed_at INTEGER,
    claimed_at   INTEGER,
    reset_date   TEXT
  )`,

  `CREATE TABLE IF NOT EXISTS faction_rep (
    faction     TEXT    PRIMARY KEY,
    reputation  INTEGER NOT NULL DEFAULT 50
  )`,

  `INSERT OR IGNORE INTO faction_rep (faction, reputation) VALUES ('luxis', 50)`,
  `INSERT OR IGNORE INTO faction_rep (faction, reputation) VALUES ('noctis', 50)`,

  `CREATE TABLE IF NOT EXISTS daily_activity (
    date     TEXT NOT NULL,
    activity TEXT NOT NULL,
    count    INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (date, activity)
  )`,

  `CREATE TABLE IF NOT EXISTS quest_reward_log (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    quest_id   TEXT    NOT NULL,
    pet_id     INTEGER REFERENCES pets(id),
    coins      INTEGER NOT NULL DEFAULT 0,
    exp        INTEGER NOT NULL DEFAULT 0,
    claimed_at INTEGER NOT NULL
  )`,
]
