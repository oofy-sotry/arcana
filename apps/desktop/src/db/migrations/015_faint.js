// 기절 시스템 — 지면 기절, 기절 3번 이후 패배는 죽음
// faint_count: 누적 기절 횟수(하루 지날 때마다 -1, 치료로 하루 1번 -1)
// is_fainted: 기절 상태(치료 전까지 전투 불가)
// faint_decay_day: 마지막으로 하루 감소를 적용한 날짜 키, last_treated_day: 마지막 치료로 횟수를 줄인 날짜 키
module.exports = [
  `ALTER TABLE pets ADD COLUMN faint_count INTEGER NOT NULL DEFAULT 0`,
  `ALTER TABLE pets ADD COLUMN is_fainted INTEGER NOT NULL DEFAULT 0`,
  `ALTER TABLE pets ADD COLUMN faint_decay_day TEXT`,
  `ALTER TABLE pets ADD COLUMN last_treated_day TEXT`,
]
