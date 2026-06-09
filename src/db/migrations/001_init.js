const WORLD_STATE_SQL = `
  CREATE TABLE IF NOT EXISTS world_state (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`

module.exports = [WORLD_STATE_SQL]
