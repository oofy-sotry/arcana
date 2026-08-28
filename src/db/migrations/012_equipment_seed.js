// 장비 정의 시드 데이터 — 슬롯(weapon/armor/accessory) × 등급(normal/rare/epic/legendary) 12종
// 스탯 스케일: EquipmentSystem.GRADE_STAT_MULT(1.0/1.5/2.2/3.5)를 기준으로 산출,
// monsters.js tier 1~3 기준치(attack 12~42, defense 5~18, hp 65~215)에 맞춘 보조 스탯 수준.
// 속성 전용/세트 장비는 이번 범위에 포함하지 않음(후속 작업으로 확장 가능).
module.exports = [
  `INSERT INTO equipment_defs (name, slot, grade, stats_json, obtain_type) VALUES
    ('낡은 검',       'weapon',    'normal',    '{"attack":8}',              'box'),
    ('강철 검',       'weapon',    'rare',      '{"attack":12}',             'box'),
    ('정예의 검',     'weapon',    'epic',      '{"attack":18}',             'box'),
    ('전설의 검',     'weapon',    'legendary', '{"attack":28}',             'box'),
    ('가죽 갑옷',     'armor',     'normal',    '{"defense":5,"hp":20}',     'box'),
    ('강철 갑옷',     'armor',     'rare',      '{"defense":8,"hp":30}',     'box'),
    ('정예의 갑옷',   'armor',     'epic',      '{"defense":11,"hp":44}',    'box'),
    ('전설의 갑옷',   'armor',     'legendary', '{"defense":18,"hp":70}',    'box'),
    ('낡은 반지',     'accessory', 'normal',    '{"speed":2,"hp":10}',       'box'),
    ('은 반지',       'accessory', 'rare',      '{"speed":3,"hp":15}',       'box'),
    ('정예의 목걸이', 'accessory', 'epic',      '{"speed":4,"hp":22}',       'box'),
    ('전설의 목걸이', 'accessory', 'legendary', '{"speed":7,"hp":35}',       'box')`,
]
