// unlockStage: 해금 진화 단계 (0~4, H = 히든 트랙 전용)
// type: 'active' | 'passive' | 'buff'
// effect: SkillSystem이 읽는 실제 효과 구조 (Phase 2에서 구현)
//   active  → { type: 'damage', multiplier }
//   passive → { type: 'damage_reduction'|'bonus_damage'|'dodge'|'counter'|'regen', value }
//   buff    → { type: 'atk_boost'|'def_debuff'|'heal'|'speed_boost'|'stun'|'dot'|'all_boost'|'cleanse_heal',
//               value, duration }

const SKILLS = {

  // ══════════════════════════════════════════════════════════════
  // 일반 속성 8종
  // ══════════════════════════════════════════════════════════════

  // 불🔥
  fire_shot:     { name: '불꽃 발사', attribute: 'fire',  type: 'active',  power: 20, mpCost: 10, unlockStage: 1, coefficient: 1.0,
    effect: { type: 'damage', multiplier: 1.0 } },
  fire_aura:     { name: '불꽃 오라', attribute: 'fire',  type: 'passive', power: 5,  mpCost: 0,  unlockStage: 2, coefficient: 1.0,
    effect: { type: 'bonus_damage', value: 5 } },                       // 매 턴 5 추가 화염 피해
  fire_boost:    { name: '연소 강화', attribute: 'fire',  type: 'buff',    power: 0,  mpCost: 15, unlockStage: 3, coefficient: 1.0,
    effect: { type: 'atk_boost', value: 0.25, duration: 3 } },          // 공격력 25% 3턴
  fire_burst:    { name: '폭염 폭발', attribute: 'fire',  type: 'active',  power: 50, mpCost: 30, unlockStage: 4, coefficient: 1.0,
    effect: { type: 'damage', multiplier: 2.5 } },

  // 물💧
  water_jet:     { name: '물 분사',   attribute: 'water', type: 'active',  power: 18, mpCost: 10, unlockStage: 1, coefficient: 1.0,
    effect: { type: 'damage', multiplier: 0.9 } },
  water_shield:  { name: '수류 방어', attribute: 'water', type: 'passive', power: 5,  mpCost: 0,  unlockStage: 2, coefficient: 1.0,
    effect: { type: 'damage_reduction', value: 5 } },                   // 받는 피해 5 감소
  water_heal:    { name: '정수 회복', attribute: 'water', type: 'buff',    power: 20, mpCost: 20, unlockStage: 3, coefficient: 1.0,
    effect: { type: 'heal', value: 0.25, duration: 1 } },               // 최대 HP의 25% 회복
  tidal_wave:    { name: '해일',      attribute: 'water', type: 'active',  power: 55, mpCost: 35, unlockStage: 4, coefficient: 1.0,
    effect: { type: 'damage', multiplier: 2.75 } },

  // 바람🌪️
  wind_slash:    { name: '바람 베기', attribute: 'wind',  type: 'active',  power: 16, mpCost: 8,  unlockStage: 1, coefficient: 1.0,
    effect: { type: 'damage', multiplier: 0.8 } },
  wind_dodge:    { name: '기류 회피', attribute: 'wind',  type: 'passive', power: 0,  mpCost: 0,  unlockStage: 2, coefficient: 1.0,
    effect: { type: 'dodge', value: 0.15 } },                           // 회피율 15% 증가
  wind_speed:    { name: '폭풍 가속', attribute: 'wind',  type: 'buff',    power: 0,  mpCost: 12, unlockStage: 3, coefficient: 1.0,
    effect: { type: 'speed_boost', value: 6, duration: 3 } },           // 속도 +6 (3턴)
  cyclone:       { name: '사이클론', attribute: 'wind',  type: 'active',  power: 45, mpCost: 28, unlockStage: 4, coefficient: 1.0,
    effect: { type: 'damage', multiplier: 2.25 } },

  // 땅🌍
  rock_throw:    { name: '돌 던지기', attribute: 'earth', type: 'active',  power: 22, mpCost: 10, unlockStage: 1, coefficient: 1.0,
    effect: { type: 'damage', multiplier: 1.1 } },
  earth_armor:   { name: '대지 갑옷', attribute: 'earth', type: 'passive', power: 8,  mpCost: 0,  unlockStage: 2, coefficient: 1.0,
    effect: { type: 'damage_reduction', value: 8 } },                   // 받는 피해 8 감소
  quake_field:   { name: '지진 구역', attribute: 'earth', type: 'buff',    power: 0,  mpCost: 18, unlockStage: 3, coefficient: 1.0,
    effect: { type: 'def_debuff', value: 12, duration: 3 } },           // 상대 방어력 -12 (3턴)
  earthquake:    { name: '대지진',    attribute: 'earth', type: 'active',  power: 60, mpCost: 40, unlockStage: 4, coefficient: 1.0,
    effect: { type: 'damage', multiplier: 3.0 } },

  // 번개⚡
  thunder_bolt:  { name: '번개 화살',  attribute: 'thunder', type: 'active',  power: 24, mpCost: 12, unlockStage: 1, coefficient: 1.0,
    effect: { type: 'damage', multiplier: 1.2 } },
  static_field:  { name: '정전기장',   attribute: 'thunder', type: 'passive', power: 0,  mpCost: 0,  unlockStage: 2, coefficient: 1.0,
    effect: { type: 'counter', value: 8 } },                            // 공격받으면 8 번개 피해 반사
  charge_up:     { name: '차지업',     attribute: 'thunder', type: 'buff',    power: 0,  mpCost: 15, unlockStage: 3, coefficient: 1.0,
    effect: { type: 'atk_boost', value: 0.35, duration: 2 } },          // 공격력 35% (2턴) — 단기 특화
  thunder_god:   { name: '뇌신격',     attribute: 'thunder', type: 'active',  power: 65, mpCost: 42, unlockStage: 4, coefficient: 1.0,
    effect: { type: 'damage', multiplier: 3.25 } },

  // 얼음❄️
  ice_needle:    { name: '얼음 바늘',  attribute: 'ice',    type: 'active',  power: 18, mpCost: 9,  unlockStage: 1, coefficient: 1.0,
    effect: { type: 'damage', multiplier: 0.9 } },
  frost_skin:    { name: '서리 피부',  attribute: 'ice',    type: 'passive', power: 4,  mpCost: 0,  unlockStage: 2, coefficient: 1.0,
    effect: { type: 'counter', value: 4, debuff: { type: 'atk_debuff', value: 4, duration: 1 } } }, // 반사 + 상대 공격력 감소
  freeze_aura:   { name: '빙결 오라',  attribute: 'ice',    type: 'buff',    power: 0,  mpCost: 14, unlockStage: 3, coefficient: 1.0,
    effect: { type: 'stun', duration: 1 } },                            // 상대 1턴 행동 불능
  absolute_zero: { name: '절대영도',   attribute: 'ice',    type: 'active',  power: 58, mpCost: 38, unlockStage: 4, coefficient: 1.0,
    effect: { type: 'damage', multiplier: 2.9 } },

  // 독☠️
  poison_sting:  { name: '독침',       attribute: 'poison', type: 'active',  power: 14, mpCost: 8,  unlockStage: 1, coefficient: 1.0,
    effect: { type: 'damage', multiplier: 0.7 } },
  toxic_body:    { name: '독성 신체',  attribute: 'poison', type: 'passive', power: 3,  mpCost: 0,  unlockStage: 2, coefficient: 1.0,
    effect: { type: 'dot', value: 6, duration: 99 } },                  // 매 턴 상대에게 6 독 피해 (전투 내내)
  plague_mist:   { name: '역병 안개',  attribute: 'poison', type: 'buff',    power: 0,  mpCost: 16, unlockStage: 3, coefficient: 1.0,
    effect: { type: 'dot', value: 15, duration: 5 } },                  // 5턴간 매 턴 15 독 피해
  death_venom:   { name: '치사독',     attribute: 'poison', type: 'active',  power: 40, mpCost: 25, unlockStage: 4, coefficient: 1.0,
    effect: { type: 'damage', multiplier: 2.0 } },

  // 드래곤🐉
  dragon_claw:   { name: '드래곤 클로',  attribute: 'dragon', type: 'active',  power: 28, mpCost: 14, unlockStage: 1, coefficient: 1.0,
    effect: { type: 'damage', multiplier: 1.4 } },
  dragon_scale:  { name: '용린 방어',    attribute: 'dragon', type: 'passive', power: 10, mpCost: 0,  unlockStage: 2, coefficient: 1.0,
    effect: { type: 'damage_reduction', value: 10 } },                  // 받는 피해 10 감소
  dragon_roar:   { name: '용의 포효',    attribute: 'dragon', type: 'buff',    power: 0,  mpCost: 20, unlockStage: 3, coefficient: 1.0,
    effect: { type: 'all_boost', value: 0.15, duration: 3 } },          // 전체 스탯 15% (3턴)
  dragon_breath: { name: '드래곤 브레스', attribute: 'dragon', type: 'active', power: 70, mpCost: 45, unlockStage: 4, coefficient: 1.0,
    effect: { type: 'damage', multiplier: 3.5 } },


  // ══════════════════════════════════════════════════════════════
  // 히든 속성 2종 — light / dark (3장 스토리 해금)
  // ══════════════════════════════════════════════════════════════

  // 빛🌟
  light_beam:     { name: '성광 빔',    attribute: 'light', type: 'active',  power: 26, mpCost: 13, unlockStage: 1, coefficient: 1.0,
    effect: { type: 'damage', multiplier: 1.3 } },
  holy_shield:    { name: '신성 보호막', attribute: 'light', type: 'passive', power: 0,  mpCost: 0,  unlockStage: 2, coefficient: 1.0,
    effect: { type: 'damage_reduction', value: 10, regen: { value: 0.03 } } }, // 피해 감소 + 매 턴 최대 HP 3% 자동 회복
  divine_blessing:{ name: '신성 축복',  attribute: 'light', type: 'buff',    power: 0,  mpCost: 25, unlockStage: 3, coefficient: 1.0,
    effect: { type: 'cleanse_heal', healValue: 0.35, duration: 1 } },   // 상태 이상 해제 + HP 35% 회복
  sacred_wrath:   { name: '신성 분노',  attribute: 'light', type: 'active',  power: 80, mpCost: 50, unlockStage: 4, coefficient: 1.0,
    effect: { type: 'damage', multiplier: 4.0 } },
  // light 히든 특화 (히든 트랙 2단계 이상)
  light_nova:     { name: '빛의 폭발',  attribute: 'light', type: 'active',  power: 95, mpCost: 60, unlockStage: 'H2', coefficient: 1.0,
    effect: { type: 'damage', multiplier: 4.8 } },

  // 어둠🌑
  dark_pulse:     { name: '암흑 파동',  attribute: 'dark',  type: 'active',  power: 26, mpCost: 13, unlockStage: 1, coefficient: 1.0,
    effect: { type: 'damage', multiplier: 1.3 } },
  dark_veil:      { name: '암흑 장막',  attribute: 'dark',  type: 'passive', power: 0,  mpCost: 0,  unlockStage: 2, coefficient: 1.0,
    effect: { type: 'damage_reduction', value: 8, debuff_on_hit: { type: 'atk_debuff', value: 5, duration: 1 } } }, // 피해 감소 + 공격한 적 약화
  shadow_curse:   { name: '어둠의 저주', attribute: 'dark',  type: 'buff',    power: 0,  mpCost: 22, unlockStage: 3, coefficient: 1.0,
    effect: { type: 'all_debuff', value: 0.20, duration: 3 } },         // 상대 전체 스탯 20% 감소 (3턴)
  void_abyss:     { name: '공허의 심연', attribute: 'dark',  type: 'active',  power: 80, mpCost: 50, unlockStage: 4, coefficient: 1.0,
    effect: { type: 'damage', multiplier: 4.0 } },
  // dark 히든 특화 (히든 트랙 2단계 이상)
  dark_singularity:{ name: '암흑 특이점', attribute: 'dark', type: 'active',  power: 95, mpCost: 60, unlockStage: 'H2', coefficient: 1.0,
    effect: { type: 'damage', multiplier: 4.8 } },


  // ══════════════════════════════════════════════════════════════
  // 히든 트랙 전용 스킬 (unlockStage: 'H3' = 히든 3단계 이상)
  // 각 속성 히든 라인의 극한 기술
  // ══════════════════════════════════════════════════════════════

  hidden_fire_inferno: { name: '지옥불',   attribute: 'fire',    type: 'active',  power: 110, mpCost: 65, unlockStage: 'H3', coefficient: 1.0,
    effect: { type: 'damage', multiplier: 5.5 } },
  hidden_water_abyss:  { name: '망각의 조류', attribute: 'water',  type: 'active',  power: 110, mpCost: 65, unlockStage: 'H3', coefficient: 1.0,
    effect: { type: 'damage', multiplier: 5.5 } },
  hidden_wind_void:    { name: '공허 폭풍', attribute: 'wind',    type: 'active',  power: 110, mpCost: 65, unlockStage: 'H3', coefficient: 1.0,
    effect: { type: 'damage', multiplier: 5.5 } },
  hidden_earth_core:   { name: '지각 붕괴', attribute: 'earth',   type: 'active',  power: 110, mpCost: 65, unlockStage: 'H3', coefficient: 1.0,
    effect: { type: 'damage', multiplier: 5.5 } },
  hidden_thunder_ruin: { name: '뇌신의 심판', attribute: 'thunder', type: 'active', power: 110, mpCost: 65, unlockStage: 'H3', coefficient: 1.0,
    effect: { type: 'damage', multiplier: 5.5 } },
  hidden_ice_annihil:  { name: '절대 소멸', attribute: 'ice',     type: 'active',  power: 110, mpCost: 65, unlockStage: 'H3', coefficient: 1.0,
    effect: { type: 'damage', multiplier: 5.5 } },
  hidden_poison_death: { name: '죽음의 독무', attribute: 'poison', type: 'active',  power: 110, mpCost: 65, unlockStage: 'H3', coefficient: 1.0,
    effect: { type: 'damage', multiplier: 5.5 } },
  hidden_dragon_chaos: { name: '카오스 브레스', attribute: 'dragon', type: 'active', power: 110, mpCost: 65, unlockStage: 'H3', coefficient: 1.0,
    effect: { type: 'damage', multiplier: 5.5 } },


  // ══════════════════════════════════════════════════════════════
  // 옴니렉스 전용 (unlockStage: 'O1' = 옴니렉스 1단계)
  // ══════════════════════════════════════════════════════════════

  omni_genesis:   { name: '아르카 창세', attribute: 'omni', type: 'active',  power: 150, mpCost: 80, unlockStage: 'O1', coefficient: 1.0,
    effect: { type: 'damage', multiplier: 7.5 } },
  omni_balance:   { name: '전속성 균형', attribute: 'omni', type: 'passive', power: 0,   mpCost: 0,  unlockStage: 'O1', coefficient: 1.0,
    effect: { type: 'all_boost', value: 0.30 } },                        // 전체 스탯 30% 상시 증가
}

module.exports = SKILLS
