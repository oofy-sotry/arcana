module.exports = [
  `ALTER TABLE pets ADD COLUMN attribute2      TEXT`,
  `ALTER TABLE pets ADD COLUMN parent1_id      INTEGER REFERENCES pets(id)`,
  `ALTER TABLE pets ADD COLUMN parent2_id      INTEGER REFERENCES pets(id)`,
  `ALTER TABLE pets ADD COLUMN max_breeding    INTEGER NOT NULL DEFAULT 4`,
  `ALTER TABLE pets ADD COLUMN used_breeding   INTEGER NOT NULL DEFAULT 0`,
  `CREATE TABLE IF NOT EXISTS breeding_log (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    parent1_id        INTEGER NOT NULL REFERENCES pets(id),
    parent2_id        INTEGER NOT NULL REFERENCES pets(id),
    child_id          INTEGER REFERENCES pets(id),
    batch_count       INTEGER NOT NULL DEFAULT 1,
    result_attribute  TEXT,
    result_attribute2 TEXT,
    created_at        INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS gacha_log (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    pet_id     INTEGER NOT NULL REFERENCES pets(id),
    cost_coins INTEGER NOT NULL,
    roll_count INTEGER NOT NULL DEFAULT 1,
    created_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS party_members (
    id       INTEGER PRIMARY KEY AUTOINCREMENT,
    pet_id   INTEGER NOT NULL UNIQUE REFERENCES pets(id),
    slot     INTEGER NOT NULL,
    added_at INTEGER NOT NULL
  )`,
]
