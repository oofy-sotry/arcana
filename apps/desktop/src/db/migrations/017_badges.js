// 체육관 배지 — 관장(leader_id)별 tier 단계마다 하나
module.exports = [
  `CREATE TABLE IF NOT EXISTS badges (
    badge_id  TEXT    PRIMARY KEY,
    leader_id TEXT    NOT NULL,
    attribute TEXT    NOT NULL,
    tier      INTEGER NOT NULL,
    earned_at INTEGER NOT NULL
  )`,
]
