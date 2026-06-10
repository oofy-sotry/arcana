// type: 'consumable' | 'material' | 'equip_box' | 'key'
// effect: ItemSystem.useItem switch 처리 키
// tradeable: Phase 6 교환 가능 여부

const ITEMS = {

  // ══════════════════════════════════════════════════════════════
  // 생존 아이템
  // ══════════════════════════════════════════════════════════════
  life_charm:    { name: '생명의 부적',   type: 'consumable', effect: 'death_rate_down', maxStack: 10,  tradeable: false },
  revive_stone:  { name: '부활석',        type: 'consumable', effect: 'revive',          maxStack: 3,   tradeable: false },

  // ══════════════════════════════════════════════════════════════
  // 진화 아이템
  // ══════════════════════════════════════════════════════════════
  evo_stone:          { name: '진화의 돌',    type: 'material',   effect: 'none',            maxStack: 99,  tradeable: true },
  // evo_stone는 히든 진화 분기의 has_item 조건으로 소비됨 (EvolutionSystem 처리)
  dark_evo_crystal:   { name: '진화의 저주석', type: 'material',  effect: 'none',            maxStack: 5,   tradeable: false },
  // dark_evo_crystal: dark 속성 히든 조건 전용

  // ══════════════════════════════════════════════════════════════
  // 컨디션 회복
  // ══════════════════════════════════════════════════════════════
  pet_food:      { name: '펫 사료',       type: 'consumable', effect: 'hunger_restore',  maxStack: 99,  tradeable: true },
  pet_soap:      { name: '펫 비누',       type: 'consumable', effect: 'clean_restore',   maxStack: 99,  tradeable: true },
  happy_toy:     { name: '즐거운 장난감', type: 'consumable', effect: 'happy_restore',   maxStack: 30,  tradeable: true },
  energy_potion: { name: '에너지 물약',   type: 'consumable', effect: 'energy_restore',  maxStack: 50,  tradeable: true },

  // ══════════════════════════════════════════════════════════════
  // 전투 소모품 (전투 중 사용, CombatSystem이 처리)
  // ══════════════════════════════════════════════════════════════
  hp_potion_s:   { name: 'HP 소형 물약',  type: 'consumable', effect: 'battle_hp_s',    maxStack: 30,  tradeable: true,
    battleEffect: { type: 'heal_hp', value: 0.30 } },                   // 전투 중 HP 30% 회복
  hp_potion_l:   { name: 'HP 대형 물약',  type: 'consumable', effect: 'battle_hp_l',    maxStack: 10,  tradeable: true,
    battleEffect: { type: 'heal_hp', value: 0.70 } },                   // 전투 중 HP 70% 회복
  mp_potion:     { name: 'MP 물약',       type: 'consumable', effect: 'battle_mp',      maxStack: 20,  tradeable: true,
    battleEffect: { type: 'restore_mp', value: 1.0 } },                 // MP 전량 회복
  attack_serum:  { name: '공격 세럼',     type: 'consumable', effect: 'battle_atk',     maxStack: 10,  tradeable: true,
    battleEffect: { type: 'atk_boost', value: 0.30, duration: 3 } },    // 공격력 +30% (3턴)
  defense_serum: { name: '방어 세럼',     type: 'consumable', effect: 'battle_def',     maxStack: 10,  tradeable: true,
    battleEffect: { type: 'def_boost', value: 0.30, duration: 3 } },    // 방어력 +30% (3턴)
  speed_serum:   { name: '속도 세럼',     type: 'consumable', effect: 'battle_spd',     maxStack: 10,  tradeable: true,
    battleEffect: { type: 'spd_boost', value: 0.20, duration: 3 } },    // 속도 +20% (3턴)

  // ══════════════════════════════════════════════════════════════
  // 장비 강화 재료 (EquipmentSystem이 처리)
  // ══════════════════════════════════════════════════════════════
  enhance_stone:   { name: '강화석',       type: 'material',   effect: 'none',            maxStack: 99,  tradeable: true,
    enhanceTier: 1 },   // +1~+5 강화에 사용
  enhance_crystal: { name: '강화 크리스탈', type: 'material',  effect: 'none',            maxStack: 30,  tradeable: true,
    enhanceTier: 2 },   // +6~+8 강화에 사용
  enhance_jewel:   { name: '강화 보석',    type: 'material',   effect: 'none',            maxStack: 10,  tradeable: false,
    enhanceTier: 3 },   // +9~+10 강화에 사용 (희귀)

  // ══════════════════════════════════════════════════════════════
  // 장비 상자 (사냥 드롭 → 열어서 랜덤 장비 획득)
  // EquipmentSystem.openBox 처리
  // ══════════════════════════════════════════════════════════════
  equip_box_normal:    { name: '일반 장비 상자',   type: 'equip_box',  effect: 'open_equip_box', maxStack: 99, tradeable: true,
    boxGrade: 'normal' },
  equip_box_rare:      { name: '희귀 장비 상자',   type: 'equip_box',  effect: 'open_equip_box', maxStack: 30, tradeable: true,
    boxGrade: 'rare' },
  equip_box_epic:      { name: '에픽 장비 상자',   type: 'equip_box',  effect: 'open_equip_box', maxStack: 10, tradeable: false,
    boxGrade: 'epic' },
  equip_box_legendary: { name: '전설 장비 상자',   type: 'equip_box',  effect: 'open_equip_box', maxStack: 3,  tradeable: false,
    boxGrade: 'legendary' },

  // ══════════════════════════════════════════════════════════════
  // 세력 아이템 (FactionSystem이 처리)
  // ══════════════════════════════════════════════════════════════
  luxis_pendant:   { name: 'Luxis 펜던트',  type: 'consumable', effect: 'faction_luxis',   maxStack: 10,  tradeable: false,
    factionEffect: { faction: 'luxis', rep: 5 } },
  noctis_pendant:  { name: 'Noctis 펜던트', type: 'consumable', effect: 'faction_noctis',  maxStack: 10,  tradeable: false,
    factionEffect: { faction: 'noctis', rep: 5 } },
  neutral_crystal: { name: '균형의 크리스탈', type: 'consumable', effect: 'faction_balance', maxStack: 5,  tradeable: false,
    factionEffect: { faction: 'both', rep: 3 } },                       // 양쪽 평판 +3

  // ══════════════════════════════════════════════════════════════
  // 스토리 키 아이템 (획득 후 보관, 퀘스트 조건 검사용)
  // ══════════════════════════════════════════════════════════════
  sealed_crystal:    { name: '봉인된 크리스탈', type: 'key', effect: 'none', maxStack: 1, tradeable: false,
    desc: '3장 핵심 아이템 — 혼합 에레멘탈의 비밀을 담은 결정체' },
  omnirex_fragment:  { name: '옴니렉스 조각',   type: 'key', effect: 'none', maxStack: 10, tradeable: false,
    desc: '10속성 에레멘탈에서 얻는 영혼 조각 — 10개 모으면 옴니렉스 소환 가능' },
  soul_amplifier:    { name: '영혼 증폭기',      type: 'key', effect: 'soul_boost', maxStack: 1, tradeable: false,
    desc: '영혼동화도 +20 즉시 증가 — 히든 엔딩 루트 전용' },
}

module.exports = ITEMS
