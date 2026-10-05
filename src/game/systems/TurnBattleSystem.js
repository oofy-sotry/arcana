const ITEMS = require('../data/items')
const { getMonster } = require('../data/monsters')
const { calcDamage } = require('../utils/formula')

// 골드버전식 턴제 전투 — 매 턴 싸우다(기술) / 가방 / 교체 / 도망 중 하나를 고른다
const ENERGY_COST  = 15   // 전투 1회 선두 펫 에너지 (기존 수동 사냥과 같음)
const MAX_SKILLS   = 3    // 기본 공격 + 기술 3개 = 4칸
const DROP_BONUS   = 0.20 // 직접 싸우는 전투 드롭 보너스 (기존 수동 사냥과 같음)
const BASIC_MOVE   = { id: 'basic', name: '몸통 박치기', type: 'active', mpCost: 0, level: 1, effect: { type: 'damage', multiplier: 1.0 } }
const HEAL_POINT   = { mapId: 'center1', x: 5, y: 6 } // 맵에 healPoint가 없을 때 돌아갈 회복소

// 야생 도망 — 속도가 빠를수록, 여러 번 시도할수록 쉬움
function runChance(petSpeed, monSpeed, attempts) {
  return Math.max(0.2, Math.min(0.95, 0.5 + (petSpeed - monSpeed) * 0.03 + attempts * 0.2))
}

// 포획 — 남은 HP가 적을수록, tier가 낮을수록 쉬움. 보스 ×0.3, 히든 ×0.1
function captureChance(monster, hpRatio) {
  const tierFactor = Math.max(0.15, 1 - 0.1 * (monster.tier - 1))
  const special    = monster.isHidden ? 0.1 : monster.isBoss ? 0.3 : 1
  return Math.min(0.95, tierFactor * (1 - 0.7 * hpRatio) * special)
}

// 전멸 시 펫마다 도망칠 확률 — tier 1 90%, tier마다 -10%, 최소 20%
function wipeEscapeChance(tier) {
  return Math.max(0.2, 1 - 0.1 * tier)
}

class TurnBattleSystem {
  constructor({ Pet, save, combatSystem, skillSystem, itemSystem, partySystem, faintSystem, huntingSystem, questSystem, summonerSystem }) {
    this.Pet            = Pet
    this.save           = save
    this.combatSystem   = combatSystem
    this.skillSystem    = skillSystem
    this.itemSystem     = itemSystem
    this.partySystem    = partySystem
    this.faintSystem    = faintSystem
    this.huntingSystem  = huntingSystem
    this.questSystem    = questSystem || null
    this.summonerSystem = summonerSystem || null
    this.session        = null
  }

  // ─── 시작 ──────────────────────────────────────────────────────────
  start({ zoneId, monsterId }) {
    const zone = this.huntingSystem.canEnterZone(zoneId)
    if (!zone) return { error: '들어갈 수 없는 구역입니다' }
    if (monsterId !== zone.bossId && !zone.monsterIds.includes(monsterId)) return { error: '이 구역의 몬스터가 아닙니다' }
    const monster = getMonster(monsterId)
    if (!monster) return { error: '몬스터를 찾을 수 없습니다' }

    const pets = this._battleParty()
    if (!pets.length) return { error: '싸울 수 있는 에레멘탈이 없습니다 — 회복소에서 치료하세요' }

    const energy = this.Pet.getConditions(pets[0].id)?.energy ?? 100
    if (energy < ENERGY_COST) return { error: `에너지 부족 (전투: -${ENERGY_COST} 필요)` }
    this.Pet.updateConditions(pets[0].id, { energy: energy - ENERGY_COST })

    this.session = {
      zoneId,
      monster: { ...monster, maxHp: monster.hp, buffs: [], dots: [], stun: 0 },
      party:   pets.map(p => this._combatant(p)),
      active:  0,
      runAttempts: 0,
      over:    false,
    }
    this.save()
    return { state: this.view(), events: [{ type: 'appear', name: monster.name }] }
  }

  // 파티(살아 있고 기절 안 한 펫)가 있으면 파티, 없으면 기절 안 한 펫 앞에서 3마리
  _battleParty() {
    const ok = p => Number(p.is_alive) === 1 && Number(p.is_fainted) !== 1
    const members = (this.partySystem?.getParty().members || []).filter(ok)
    if (members.length) return members
    return this.Pet.getAllPets().filter(ok).slice(0, 3)
  }

  _combatant(pet) {
    const { effectivePet, maxHp, passives, dotPerTurn } = this.combatSystem.buildCombatant(pet)
    const skills = this.skillSystem.getUnlockedActives(pet).slice(0, MAX_SKILLS).map(r => ({
      id: r.skill_id, name: r.data.name, type: r.data.type, level: r.skill_level,
      mpCost: this.skillSystem.getSkillMpCost(r.skill_id, r.skill_level), effect: r.data.effect,
    }))
    const maxMp = pet.mp || 100
    // 이전 전투에서 남은 HP·MP로 시작 (NULL = 가득 참, 장비가 바뀌어 최대치가 줄었으면 최대치로)
    const hp = Math.min(maxHp, pet.cur_hp ?? maxHp)
    const mp = Math.min(maxMp, pet.cur_mp ?? maxMp)
    return {
      id: pet.id, name: pet.name, attribute: pet.attribute, stage: pet.evolution_stage, level: pet.level,
      species: pet.species, base: effectivePet, maxHp, hp, maxMp, mp,
      passives, dotPerTurn, buffs: [], ko: false, moves: [BASIC_MOVE, ...skills],
    }
  }

  // ─── 화면에 보낼 상태 ──────────────────────────────────────────────
  view() {
    const s = this.session
    if (!s) return null
    const m = s.monster
    const lead = s.party[0]
    const bag = this.itemSystem.getInventory(lead.id)
      .filter(row => row.data?.battleEffect)
      .map(row => ({ itemId: row.item_id, name: row.data.name, quantity: row.quantity, kind: row.data.battleEffect.type }))
    return {
      monster: { id: m.id, name: m.name, attribute: m.attribute, tier: m.tier, isBoss: !!m.isBoss, hp: Math.max(0, Math.round(m.hp)), maxHp: m.maxHp },
      party: s.party.map(c => ({
        id: c.id, name: c.name, attribute: c.attribute, stage: c.stage, level: c.level, species: c.species,
        hp: Math.max(0, Math.round(c.hp)), maxHp: c.maxHp, mp: Math.round(c.mp), maxMp: c.maxMp, ko: c.ko,
      })),
      active: s.active,
      moves: s.party[s.active].moves.map(mv => ({ id: mv.id, name: mv.name, mpCost: mv.mpCost, usable: s.party[s.active].mp >= mv.mpCost })),
      bag,
      needSwitch: s.party[s.active].ko && !s.over,
      over: s.over,
    }
  }

  // ─── 행동 ──────────────────────────────────────────────────────────
  // action: { type: 'skill', moveId } | { type: 'auto' } | { type: 'item', itemId } | { type: 'switch', index } | { type: 'run' }
  act(action = {}) {
    const s = this.session
    if (!s || s.over) return { error: '진행 중인 전투가 없습니다' }
    const me     = s.party[s.active]
    const events = []

    if (me.ko && action.type !== 'switch') return { error: '교체할 에레멘탈을 고르세요' }

    switch (action.type) {
      case 'switch': {
        const next = s.party[action.index]
        if (!next || next.ko || action.index === s.active) return { error: '그 에레멘탈로는 교체할 수 없습니다' }
        const forced = me.ko
        s.active = action.index
        events.push({ type: 'switch', name: next.name })
        if (!forced) this._monsterTurn(events)
        break
      }
      case 'run': {
        s.runAttempts++
        if (Math.random() < runChance(this._stat(me, 'speed'), this._stat(s.monster, 'speed'), s.runAttempts - 1)) {
          events.push({ type: 'run', ok: true })
          return this._finish('ran', events)
        }
        events.push({ type: 'run', ok: false })
        this._monsterTurn(events)
        break
      }
      case 'item': {
        const item = ITEMS[action.itemId]
        if (!item?.battleEffect) return { error: '전투에서 쓸 수 없는 아이템입니다' }
        if (!this.itemSystem.consumeItem(s.party[0].id, action.itemId)) return { error: '가방에 그 아이템이 없습니다' }
        if (item.battleEffect.type === 'capture') {
          const ok = Math.random() < captureChance(s.monster, s.monster.hp / s.monster.maxHp)
          events.push({ type: 'capture', ok, name: s.monster.name })
          if (ok) return this._finish('captured', events)
        } else {
          this._applyItem(me, item, events)
        }
        this._monsterTurn(events)
        break
      }
      case 'skill':
      case 'auto': {
        const move = action.type === 'auto' ? this._autoMove(me) : me.moves.find(mv => mv.id === action.moveId)
        if (!move) return { error: '모르는 기술입니다' }
        if (me.mp < move.mpCost) return { error: 'MP가 부족합니다' }
        const petFirst = this._stat(me, 'speed') >= this._stat(s.monster, 'speed')
        if (petFirst) {
          this._petMove(me, move, events)
          if (s.monster.hp > 0) this._monsterTurn(events)
        } else {
          this._monsterTurn(events)
          if (!me.ko) this._petMove(me, move, events)
        }
        break
      }
      default:
        return { error: '알 수 없는 행동입니다' }
    }

    if (s.monster.hp <= 0) return this._finish('won', events)
    this._endOfRound(events)
    if (s.monster.hp <= 0) return this._finish('won', events)
    if (s.party.every(c => c.ko)) return this._finish('lost', events)
    return { state: this.view(), events }
  }

  // 자동: 쓸 수 있는 공격 기술 중 배율이 가장 높은 것, 없으면 기본 공격
  _autoMove(me) {
    return me.moves
      .filter(mv => mv.effect?.type === 'damage' && me.mp >= mv.mpCost)
      .sort((a, b) => b.effect.multiplier - a.effect.multiplier)[0] || BASIC_MOVE
  }

  // 버프 반영 스탯 — mult는 곱하고 add는 더함
  _stat(unit, key) {
    const base = unit.base ? unit.base[key] : unit[key]
    let mult = 1, add = 0
    for (const b of unit.buffs) {
      if (b.stat !== key && b.stat !== 'all') continue
      if (b.mult) mult *= b.mult
      if (b.add)  add  += b.add
    }
    return Math.max(1, Math.round((base || 0) * mult + add))
  }

  _petMove(me, move, events) {
    const s = this.session
    const m = s.monster
    me.mp -= move.mpCost
    const eff = move.effect || BASIC_MOVE.effect

    if (eff.type === 'damage') {
      const hit = calcDamage({
        attack:  this._stat(me, 'attack') * eff.multiplier,
        defense: this._stat(m, 'defense'),
        skillLevel: move.level || 1,
        attackerAttr: me.attribute, defenderAttr: m.attribute,
      })
      const bonus  = me.passives.filter(p => p.type === 'bonus_damage').reduce((sum, p) => sum + p.value, 0)
      const damage = hit.damage + bonus
      m.hp -= damage
      events.push({ type: 'attack', actor: 'pet', name: me.name, move: move.name, damage, isCrit: hit.isCrit, attrMult: hit.attrMult })
      if (me.dotPerTurn > 0) {
        m.hp -= me.dotPerTurn
        events.push({ type: 'dot', target: 'monster', name: m.name, damage: Math.round(me.dotPerTurn) })
      }
      return
    }

    events.push({ type: 'buff', actor: 'pet', name: me.name, move: move.name, effect: eff.type })
    const turns = eff.duration || 3
    switch (eff.type) {
      case 'atk_boost':    me.buffs.push({ stat: 'attack', mult: 1 + eff.value, turns }); break
      case 'speed_boost':  me.buffs.push({ stat: 'speed',  add: eff.value, turns }); break
      case 'all_boost':    me.buffs.push({ stat: 'all',    mult: 1 + eff.value, turns }); break
      case 'def_debuff':   m.buffs.push({ stat: 'defense', add: -eff.value, turns }); break
      case 'stun':         m.stun = Math.max(m.stun, eff.duration || 1); break
      case 'dot':          m.dots.push({ value: eff.value, turns: Math.min(turns, 99) }); break
      case 'heal':         me.hp = Math.min(me.maxHp, me.hp + me.maxHp * eff.value); break
      case 'cleanse_heal': me.hp = Math.min(me.maxHp, me.hp + me.maxHp * (eff.healValue || 0.35)); break
    }
  }

  _monsterTurn(events) {
    const s  = this.session
    const m  = s.monster
    const me = s.party[s.active]
    if (me.ko) return
    if (m.stun > 0) {
      m.stun--
      events.push({ type: 'stunned', name: m.name })
      return
    }
    const dodge = me.passives.filter(p => p.type === 'dodge').reduce((sum, p) => sum + p.value, 0)
    if (dodge > 0 && Math.random() < dodge) {
      events.push({ type: 'attack', actor: 'monster', name: m.name, damage: 0, dodged: true })
      return
    }
    const hit = calcDamage({
      attack: this._stat(m, 'attack'), defense: this._stat(me, 'defense'),
      skillLevel: 1, attackerAttr: m.attribute, defenderAttr: me.attribute,
    })
    const reduction = me.passives.filter(p => p.type === 'damage_reduction').reduce((sum, p) => sum + p.value, 0)
    const damage    = Math.max(1, hit.damage - reduction)
    me.hp -= damage
    events.push({ type: 'attack', actor: 'monster', name: m.name, damage, isCrit: hit.isCrit, attrMult: hit.attrMult })

    const counter = me.passives.filter(p => p.type === 'counter').reduce((sum, p) => sum + p.value, 0)
    if (counter > 0) {
      m.hp -= counter
      events.push({ type: 'counter', name: me.name, damage: counter })
    }
    if (me.hp <= 0) {
      me.ko = true
      events.push({ type: 'ko', name: me.name })
    }
  }

  _applyItem(me, item, events) {
    const eff = item.battleEffect
    switch (eff.type) {
      case 'heal_hp':    me.hp = Math.min(me.maxHp, me.hp + me.maxHp * eff.value); break
      case 'restore_mp': me.mp = Math.min(me.maxMp, me.mp + me.maxMp * eff.value); break
      case 'atk_boost':  me.buffs.push({ stat: 'attack',  mult: 1 + eff.value, turns: eff.duration }); break
      case 'def_boost':  me.buffs.push({ stat: 'defense', mult: 1 + eff.value, turns: eff.duration }); break
      case 'spd_boost':  me.buffs.push({ stat: 'speed',   mult: 1 + eff.value, turns: eff.duration }); break
    }
    events.push({ type: 'item', name: me.name, item: item.name })
  }

  // 라운드 끝 — 지속 피해, 버프 지속 시간 감소
  _endOfRound(events) {
    const m = this.session.monster
    for (const d of m.dots) {
      m.hp -= d.value
      events.push({ type: 'dot', target: 'monster', name: m.name, damage: d.value })
      d.turns--
    }
    m.dots = m.dots.filter(d => d.turns > 0)
    for (const unit of [m, ...this.session.party]) {
      unit.buffs.forEach(b => b.turns--)
      unit.buffs = unit.buffs.filter(b => b.turns > 0)
    }
  }

  // ─── 종료 ──────────────────────────────────────────────────────────
  _finish(result, events) {
    const s = this.session
    s.over = true
    const outcome = { result }
    const active  = s.party[s.active]

    if (result === 'won') {
      const pet    = this.Pet.getPet(active.id)
      const reward = this.combatSystem.grantVictory(pet, s.monster, { dropRateBonus: DROP_BONUS })
      Object.assign(outcome, { exp: s.monster.exp, coins: reward.coins, drops: reward.drops, winner: active.name })
      this.Pet.updatePet(active.id, { affinity: Math.min(100, (pet.affinity || 0) + 1.0) })
      this.questSystem?.recordActivity('hunt', 1)
    }
    if (result === 'captured') {
      outcome.captured = this._capture(s.monster)
    }
    if (result === 'lost') {
      // 전멸 — 펫마다 도망 판정, 실패하면 기절(3번 넘으면 죽음). 끝나면 가장 가까운 회복소로
      const chance = wipeEscapeChance(s.monster.tier)
      outcome.wipe = s.party.map(c => {
        const escaped = Math.random() < chance
        // 도망친 펫은 HP 1로 버팀, 실패한 펫은 HP 0으로 기절 처리
        this.Pet.updatePet(c.id, { cur_hp: escaped ? 1 : 0, cur_mp: Math.round(c.mp) })
        return { name: c.name, escaped, faint: escaped ? null : this.faintSystem.recordLoss(c.id) }
      })
      outcome.healPoint = this._sendToNearestCenter()
    } else {
      // 남은 HP·MP를 다음 전투로 이어감. 쓰러진 펫은 기절 상태만(횟수는 안 셈 — 진 게 아니므로)
      s.party.forEach(c => this.Pet.updatePet(c.id, {
        cur_hp: Math.max(0, Math.round(c.hp)), cur_mp: Math.round(c.mp), ...(c.ko ? { is_fainted: 1 } : {}),
      }))
    }
    this.save()
    events.push({ type: 'end', result })
    const state = this.view()
    this.session = null
    return { state, events, outcome }
  }

  // 잡은 몬스터는 그 속성의 펫이 된다 — 스탯은 몬스터 그대로, 레벨은 tier 시작 레벨
  _capture(monster) {
    const pet = this.Pet.createPet(monster.name, monster.attribute, 'default')
    this.Pet.updatePet(pet.id, {
      level: (monster.tier - 1) * 10 + 1,
      hp: monster.maxHp, attack: monster.attack, defense: monster.defense, speed: monster.speed,
    })
    return { id: pet.id, name: monster.name, attribute: monster.attribute }
  }

  // 지금 있는 맵의 healPoint(없으면 마을 회복소)로 소환사 위치를 옮김
  _sendToNearestCenter() {
    const summoner = this.summonerSystem?.getSummoner()
    if (!summoner) return HEAL_POINT
    const state = this.summonerSystem.getMapState(summoner.id)
    let point = HEAL_POINT
    try { point = require(`../data/maps/${state.map_id}`).healPoint || HEAL_POINT } catch { /* 모르는 맵 → 기본 회복소 */ }
    this.summonerSystem.saveMapState(summoner.id, point.mapId, point.x, point.y)
    return point
  }
}

TurnBattleSystem.runChance        = runChance
TurnBattleSystem.captureChance    = captureChance
TurnBattleSystem.wipeEscapeChance = wipeEscapeChance
module.exports = TurnBattleSystem
