module.exports = [
  // 공개 펫 스냅샷 (랭킹·교배·배틀용)
  `CREATE TABLE IF NOT EXISTS user_pets (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id      INTEGER NOT NULL REFERENCES users(id),
    pet_snapshot TEXT    NOT NULL,
    synced_at    INTEGER NOT NULL
  )`,

  // 교배 공고
  `CREATE TABLE IF NOT EXISTS breeding_offers (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id      INTEGER NOT NULL REFERENCES users(id),
    username     TEXT    NOT NULL,
    pet_snapshot TEXT    NOT NULL,
    price        INTEGER NOT NULL DEFAULT 100,
    is_active    INTEGER NOT NULL DEFAULT 1,
    created_at   INTEGER NOT NULL
  )`,

  // PvP 배틀 로그
  `CREATE TABLE IF NOT EXISTS battle_log (
    id                 INTEGER PRIMARY KEY AUTOINCREMENT,
    attacker_id        INTEGER NOT NULL REFERENCES users(id),
    defender_id        INTEGER NOT NULL REFERENCES users(id),
    attacker_username  TEXT NOT NULL,
    defender_username  TEXT NOT NULL,
    attacker_pet       TEXT NOT NULL,
    defender_pet       TEXT NOT NULL,
    winner_id          INTEGER REFERENCES users(id),
    log                TEXT,
    battled_at         INTEGER NOT NULL
  )`,

  // 친구 관계
  `CREATE TABLE IF NOT EXISTS friendships (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER NOT NULL REFERENCES users(id),
    friend_id  INTEGER NOT NULL REFERENCES users(id),
    created_at INTEGER NOT NULL,
    UNIQUE(user_id, friend_id)
  )`,
]
