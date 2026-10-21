// 스토리 4장 충성도 판정으로 파티에서 이탈한 펫 기록
module.exports = [
  `CREATE TABLE IF NOT EXISTS party_departure_log (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    pet_id      INTEGER NOT NULL REFERENCES pets(id),
    loyalty     INTEGER NOT NULL,
    chapter     INTEGER NOT NULL,
    departed_at INTEGER NOT NULL
  )`,
]
