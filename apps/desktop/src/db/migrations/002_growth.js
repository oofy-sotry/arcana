module.exports = [
  // level 컬럼은 001_init.js의 pets 테이블 DDL에 이미 포함됨
  `ALTER TABLE pets ADD COLUMN exp        INTEGER NOT NULL DEFAULT 0`,
  `ALTER TABLE pets ADD COLUMN skill_points INTEGER NOT NULL DEFAULT 0`,
  `ALTER TABLE pets ADD COLUMN affinity   REAL    NOT NULL DEFAULT 50`,
  `ALTER TABLE pets ADD COLUMN hp         INTEGER NOT NULL DEFAULT 100`,
  `ALTER TABLE pets ADD COLUMN mp         INTEGER NOT NULL DEFAULT 100`,
  `ALTER TABLE pets ADD COLUMN attack     INTEGER NOT NULL DEFAULT 10`,
  `ALTER TABLE pets ADD COLUMN defense    INTEGER NOT NULL DEFAULT 5`,
  `ALTER TABLE pets ADD COLUMN speed      INTEGER NOT NULL DEFAULT 10`,

  `CREATE TABLE IF NOT EXISTS pet_skills (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    pet_id      INTEGER NOT NULL REFERENCES pets(id),
    skill_id    TEXT    NOT NULL,
    skill_level INTEGER NOT NULL DEFAULT 1,
    unlocked_at INTEGER NOT NULL,
    UNIQUE(pet_id, skill_id)
  )`,

  `CREATE TABLE IF NOT EXISTS items (
    id        TEXT    PRIMARY KEY,
    name      TEXT    NOT NULL,
    type      TEXT    NOT NULL,
    effect    TEXT    NOT NULL,
    max_stack INTEGER NOT NULL DEFAULT 99,
    tradeable INTEGER NOT NULL DEFAULT 0
  )`,

  `CREATE TABLE IF NOT EXISTS pet_inventory (
    id       INTEGER PRIMARY KEY AUTOINCREMENT,
    pet_id   INTEGER NOT NULL REFERENCES pets(id),
    item_id  TEXT    NOT NULL REFERENCES items(id),
    quantity INTEGER NOT NULL DEFAULT 1,
    UNIQUE(pet_id, item_id)
  )`,

  `CREATE TABLE IF NOT EXISTS evolution_log (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    pet_id     INTEGER NOT NULL REFERENCES pets(id),
    from_stage INTEGER NOT NULL,
    to_stage   INTEGER NOT NULL,
    evo_type   TEXT    NOT NULL DEFAULT 'normal',
    evolved_at INTEGER NOT NULL
  )`,
]
