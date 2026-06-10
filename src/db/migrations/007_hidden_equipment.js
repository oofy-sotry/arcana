module.exports = [
  // pets: 히든 트랙 여부 + 동료 충성도
  `ALTER TABLE pets ADD COLUMN is_hidden INTEGER NOT NULL DEFAULT 0`,
  `ALTER TABLE pets ADD COLUMN loyalty   INTEGER NOT NULL DEFAULT 70`,

  // 장비 정의 테이블 (아이템 종류 마스터 데이터)
  `CREATE TABLE IF NOT EXISTS equipment_defs (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT    NOT NULL,
    slot        TEXT    NOT NULL,
    grade       TEXT    NOT NULL DEFAULT 'normal',
    attribute   TEXT,
    set_id      TEXT,
    stats_json  TEXT    NOT NULL DEFAULT '{}',
    obtain_type TEXT    NOT NULL DEFAULT 'drop'
  )`,

  // 펫 장비 인벤토리 (보유 장비 인스턴스)
  `CREATE TABLE IF NOT EXISTS equipment_inventory (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    pet_id        INTEGER NOT NULL REFERENCES pets(id),
    def_id        INTEGER NOT NULL REFERENCES equipment_defs(id),
    enhance_level INTEGER NOT NULL DEFAULT 0,
    is_equipped   INTEGER NOT NULL DEFAULT 0,
    obtained_at   INTEGER NOT NULL
  )`,

  // 펫 장착 슬롯 (weapon / armor / accessory 각 1개)
  `CREATE TABLE IF NOT EXISTS pet_equipped_slots (
    pet_id       INTEGER NOT NULL REFERENCES pets(id),
    slot         TEXT    NOT NULL,
    inventory_id INTEGER REFERENCES equipment_inventory(id),
    PRIMARY KEY (pet_id, slot)
  )`,

  // 강화 로그
  `CREATE TABLE IF NOT EXISTS equipment_enhance_log (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    inventory_id INTEGER NOT NULL REFERENCES equipment_inventory(id),
    from_level   INTEGER NOT NULL,
    to_level     INTEGER NOT NULL,
    success      INTEGER NOT NULL DEFAULT 1,
    enhanced_at  INTEGER NOT NULL
  )`,
]
