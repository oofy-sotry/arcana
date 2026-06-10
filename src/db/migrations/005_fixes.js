module.exports = [
  // gacha_log에 코인 소비 주체(owner) 컬럼 추가
  `ALTER TABLE gacha_log ADD COLUMN owner_pet_id INTEGER REFERENCES pets(id)`,

  // party_members.slot UNIQUE 제약 추가 (SQLite는 ALTER로 추가 불가 → 테이블 재생성)
  `CREATE TABLE party_members_new (
    id       INTEGER PRIMARY KEY AUTOINCREMENT,
    pet_id   INTEGER NOT NULL UNIQUE REFERENCES pets(id),
    slot     INTEGER NOT NULL UNIQUE,
    added_at INTEGER NOT NULL
  )`,
  `INSERT INTO party_members_new (pet_id, slot, added_at)
     SELECT pet_id, slot, MAX(added_at) FROM party_members GROUP BY slot`,
  `DROP TABLE party_members`,
  `ALTER TABLE party_members_new RENAME TO party_members`,
]
