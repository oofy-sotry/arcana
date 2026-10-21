// 전투 HP·MP를 다음 전투로 이어가기 — pets.hp/mp는 최대치 스탯, cur_hp/cur_mp는 현재치 (NULL = 가득 참)
module.exports = [
  `ALTER TABLE pets ADD COLUMN cur_hp INTEGER`,
  `ALTER TABLE pets ADD COLUMN cur_mp INTEGER`,
]
