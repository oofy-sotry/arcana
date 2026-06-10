const AUTO_ENERGY_COST   = 25
const MANUAL_ENERGY_COST = 13

// ── 기본 탐사 이벤트 ─────────────────────────────────────────────────
const EVENTS = [
  { type: 'item',           weight: 13, items: ['pet_food', 'pet_soap', 'happy_toy', 'energy_potion'] },
  { type: 'coins',          weight: 22 },
  { type: 'trap',           weight: 12 },
  { type: 'faction_choice', weight: 8  }, // 세력 선택 이벤트 (수동 시 가중치 ×2)
  { type: 'empty',          weight: 45 },
]

// ── 세력 선택 이벤트 풀 ───────────────────────────────────────────────
// choices[n].effects: { luxis?, noctis?, hybridRescue?, loyalty?, soulFusion? }
const FACTION_EVENTS = [
  {
    id: 'fe_luxis_prisoner',
    desc: 'Luxis 병사가 폭주한 에레멘탈을 처형하려 한다.',
    choices: [
      { text: '처형에 동의한다',           effects: { luxis: +8 } },
      { text: '에레멘탈의 탈출을 돕는다',   effects: { noctis: +8, hybridRescue: 1 } },
      { text: '방관한다',                  effects: { luxis: -3, noctis: -3 } },
    ],
  },
  {
    id: 'fe_noctis_seal',
    desc: 'Noctis 부대가 고대 봉인을 해제하려 한다.',
    choices: [
      { text: '봉인 유지를 지원한다',        effects: { luxis: +8 } },
      { text: '봉인 해제에 협조한다',        effects: { noctis: +8 } },
      { text: '원인을 조사한다',             effects: { luxis: +3, noctis: +3 } },
    ],
  },
  {
    id: 'fe_hybrid_found',
    desc: '혼합속성 에레멘탈이 쫓기고 있다. Luxis는 "오염체"라 부른다.',
    choices: [
      { text: 'Luxis 분류에 동의한다',       effects: { luxis: +5 } },
      { text: '혼합체를 보호한다',            effects: { noctis: +10, hybridRescue: 1 } },
      { text: '몰래 숨겨준다',               effects: { hybridRescue: 1, soulFusion: 2 } },
    ],
  },
  {
    id: 'fe_resource_dispute',
    desc: 'Luxis와 Noctis가 에레멘탈 부족의 자원을 다투고 있다.',
    choices: [
      { text: 'Luxis를 지지한다',             effects: { luxis: +8 } },
      { text: 'Noctis를 지지한다',            effects: { noctis: +8 } },
      { text: '부족 자율에 맡긴다',           effects: { loyalty: +5 } },
    ],
  },
  {
    id: 'fe_wounded_elemental',
    desc: '쓰러진 에레멘탈이 있다. 둘 다 빛도 어둠도 아닌 눈빛이다.',
    choices: [
      { text: '치료해준다',                  effects: { soulFusion: 3, hybridRescue: 1 } },
      { text: 'Luxis에게 신고한다',           effects: { luxis: +5 } },
      { text: 'Noctis에게 데려간다',          effects: { noctis: +5 } },
    ],
  },
  {
    id: 'fe_ancient_relic',
    desc: '어느 세력에도 속하지 않은 고대 유물이 발견됐다.',
    choices: [
      { text: 'Luxis에게 넘긴다',             effects: { luxis: +6 } },
      { text: 'Noctis에게 넘긴다',            effects: { noctis: +6 } },
      { text: '혼자 보관한다',               effects: { soulFusion: 5 } },
    ],
  },
]

class ExplorationSystem {
  constructor({ Pet, save, itemSystem, factionSystem }) {
    this.Pet           = Pet
    this.save          = save
    this.itemSystem    = itemSystem
    this.factionSystem = factionSystem
  }

  // ─── 가중치 롤 ─────────────────────────────────────────────────────
  rollEvent(dropBoost = 0, factionBoost = 0) {
    const weighted = EVENTS.map(e => {
      let w = e.weight
      if ((e.type === 'item' || e.type === 'coins') && dropBoost > 0) w = Math.floor(w * (1 + dropBoost))
      if (e.type === 'faction_choice' && factionBoost > 0) w = Math.floor(w * (1 + factionBoost))
      return { ...e, w }
    })
    const total = weighted.reduce((s, e) => s + e.w, 0)
    let   roll  = Math.random() * total
    let   sel   = weighted[weighted.length - 1]
    for (const ev of weighted) { roll -= ev.w; if (roll <= 0) { sel = ev; break } }

    if (sel.type === 'item') {
      const itemId = sel.items[Math.floor(Math.random() * sel.items.length)]
      return { type: 'item', itemId }
    }
    if (sel.type === 'coins')          return { type: 'coins', coins: 5 + Math.floor(Math.random() * 20) }
    if (sel.type === 'trap')           return { type: 'trap',  damage: 5 + Math.floor(Math.random() * 15) }
    if (sel.type === 'faction_choice') {
      const ev = FACTION_EVENTS[Math.floor(Math.random() * FACTION_EVENTS.length)]
      return { type: 'faction_choice', event: ev }
    }
    return { type: 'empty' }
  }

  // ─── 자동 탐사 ─────────────────────────────────────────────────────
  startAutoExplore(pet) {
    return this._explore(pet, AUTO_ENERGY_COST, 0.05, 0, '자동 탐사: -25 필요')
  }

  // ─── 수동 탐사 ─────────────────────────────────────────────────────
  manualExplore(pet) {
    return this._explore(pet, MANUAL_ENERGY_COST, 0.5, 1.0, '수동 탐사: -13 필요')
  }

  // ─── 세력 선택 결과 처리 ───────────────────────────────────────────
  // ipcRouter에서 faction_choice 결과를 받아 호출
  resolveChoice(pet, factionEventId, choiceIndex) {
    const ev = FACTION_EVENTS.find(e => e.id === factionEventId)
    if (!ev)                             return { ok: false, error: '이벤트를 찾을 수 없습니다' }
    const choice = ev.choices[choiceIndex]
    if (!choice)                         return { ok: false, error: '선택지가 없습니다' }

    const eff    = choice.effects
    const result = { choiceText: choice.text, effects: {} }

    if (eff.luxis && this.factionSystem) {
      const r = this.factionSystem.changeRep('luxis', eff.luxis)
      result.effects.luxis = r
    }
    if (eff.noctis && this.factionSystem) {
      const r = this.factionSystem.changeRep('noctis', eff.noctis)
      result.effects.noctis = r
    }
    if (eff.hybridRescue && this.factionSystem) {
      const cnt = this.factionSystem.recordHybridRescue()
      result.effects.hybridRescue = cnt
    }
    if (eff.soulFusion && this.factionSystem) {
      const r = this.factionSystem.gainSoulFusion('hybrid_rescue')
      result.effects.soulFusion = r
    }
    if (eff.loyalty) {
      // 파티 전체 충성도 증가 (pets 테이블 직접 업데이트)
      const db = require('../../db/database')
      db.run(
        `UPDATE pets SET loyalty = MIN(100, COALESCE(loyalty, 70) + ?) WHERE is_alive = 1`,
        [eff.loyalty]
      )
      result.effects.loyalty = eff.loyalty
    }

    this.save()
    return { ok: true, ...result }
  }

  // ─── 내부 탐사 실행 ────────────────────────────────────────────────
  _explore(pet, energyCost, dropBoost, factionBoost, errLabel) {
    const db     = require('../../db/database')
    const energy = pet.conditions?.energy ?? 100
    if (energy < energyCost) return { error: `에너지 부족 (${errLabel})` }

    const newEnergy = energy - energyCost
    const result    = this.rollEvent(dropBoost, factionBoost)

    if (result.type === 'item') {
      this.itemSystem.addItem(pet.id, result.itemId, 1)
      this.Pet.updatePet(pet.id, { affinity: Math.min(100, (pet.affinity || 0) + 0.5) })
    } else if (result.type === 'coins') {
      this.Pet.updatePet(pet.id, {
        coins:   (pet.coins || 0) + result.coins,
        affinity: Math.min(100, (pet.affinity || 0) + 0.5),
      })
    } else if (result.type === 'trap') {
      this.Pet.updatePet(pet.id, { hp: Math.max(1, pet.hp - result.damage) })
    }
    // faction_choice는 결과만 반환 — 실제 효과는 resolveChoice 호출 시 처리

    db.run(`UPDATE pet_conditions SET energy=? WHERE pet_id=?`, [newEnergy, pet.id])
    this.save()
    return { ...result, finalEnergy: newEnergy }
  }
}

module.exports = ExplorationSystem
