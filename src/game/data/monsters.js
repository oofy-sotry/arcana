// 몬스터 스탯 기준: 레벨 × 계수로 스케일링
// tier 1=입문(Lv1-15), tier 2=일반(Lv16-35), tier 3=고급(Lv36+)

const MONSTERS = []

const ZONES = []

function getMonster(id) {
  return MONSTERS.find(m => m.id === id) || null
}

function getZone(id) {
  return ZONES.find(z => z.id === id) || null
}

module.exports = { MONSTERS, ZONES, getMonster, getZone }
