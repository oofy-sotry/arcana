// 전투 패배 처리 버그로 망가진 펫 복구 (CombatSystem.endBattle 수정과 짝)
// - 자동 사냥 패배 = 영구 사망(is_alive=0)이었음 → is_alive=0이 되는 경로는 이것뿐이라 전부 부활
// - 패배 시 최대 HP 스탯(pets.hp)을 1로 덮어썼음 → 기본 100에서 줄어드는 경로가 없으므로
//   100 미만은 전부 손상분: 100 + (레벨-1)×5(최소 성장치)로 보수적 복구
module.exports = [
  `UPDATE pets SET is_alive = 1 WHERE is_alive = 0`,
  `UPDATE pets SET hp = 100 + (level - 1) * 5 WHERE hp < 100`,
]
