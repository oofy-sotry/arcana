const WORLD_STATE_SQL = `
  CREATE TABLE IF NOT EXISTS world_state (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`

const PETS_SQL = `
  CREATE TABLE IF NOT EXISTS pets (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    uuid            TEXT    NOT NULL UNIQUE,
    name            TEXT    NOT NULL,
    species         TEXT    NOT NULL DEFAULT 'default',
    attribute       TEXT    NOT NULL DEFAULT 'fire',
    evolution_stage INTEGER NOT NULL DEFAULT 0,
    level           INTEGER NOT NULL DEFAULT 1,
    age_seconds     INTEGER NOT NULL DEFAULT 0,
    is_alive        INTEGER NOT NULL DEFAULT 1,
    born_at         INTEGER NOT NULL,
    last_active     INTEGER NOT NULL
  );
`

const PET_CONDITIONS_SQL = `
  CREATE TABLE IF NOT EXISTS pet_conditions (
    pet_id      INTEGER PRIMARY KEY,
    hunger      REAL    NOT NULL DEFAULT 100.0,
    happiness   REAL    NOT NULL DEFAULT 100.0,
    cleanliness REAL    NOT NULL DEFAULT 100.0,
    energy      REAL    NOT NULL DEFAULT 100.0,
    last_updated INTEGER NOT NULL,
    FOREIGN KEY (pet_id) REFERENCES pets(id) ON DELETE CASCADE
  );
`

module.exports = [WORLD_STATE_SQL, PETS_SQL, PET_CONDITIONS_SQL]
