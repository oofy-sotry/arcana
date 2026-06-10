const { ZONES, MONSTERS, getMonster } = require('../data/monsters')

const AUTO_ENERGY_COST   = 30
const MANUAL_ENERGY_COST = 15
const MANUAL_DROP_BONUS  = 0.20

const BOSS_CHANCE_AUTO   = 0.10   // 자동 사냥 보스 조우 확률
const BOSS_CHANCE_MANUAL = 0.30   // 수동 사냥 보스 조우 확률
const HIDDEN_STAGE_CHANCE = 0.00001 // 수동 사냥 히든 스테이지 진입 확률 (0.001%)
const HIDDEN_STAGE_BATTLES = 4    // 히든 스테이지 내 연속 전투 수

class HuntingSystem {
  constructor({ Pet, save, combatSystem, questSystem, partySystem, factionSystem }) {
    this.Pet           = Pet
    this.save          = save
    this.combatSystem  = combatSystem
    this.questSystem   = questSystem
    this.partySystem   = partySystem
    this.factionSystem = factionSystem
    this._activeHunts  = new Map()
  }

  // ─── 시너지 배율 ────────────────────────────────────────────────────
  _getSynergyMult(pet) {
    if (!this.partySystem) return 1.0
    const { synergy } = this.partySystem.getParty()
    const match = synergy.find(s => s.attr === pet.attribute)
    return match ? match.damageMult : 1.0
  }

  // ─── 접근 가능한 구역 목록 ─────────────────────────────────────────
  // petLevel 기준 ±10 레벨 구간을 추천으로 표시, 전체 목록은 항상 반환
  getZones(pet) {
    return ZONES.map(z => ({
      ...z,
      accessible: this._canAccess(z),
      recommended: pet ? (pet.level >= z.minLevel - 5 && pet.level <= z.maxLevel + 5) : true,
    }))
  }

  _canAccess(zone) {
    if (!zone.unlock) return true
    if (!this.factionSystem) return true
    return this.factionSystem.canAccessZone(zone.unlock)
  }

  // ─── 몬스터 스폰 ───────────────────────────────────────────────────
  _spawnRegular(zone) {
    const chosen = zone.monsterIds[Math.floor(Math.random() * zone.monsterIds.length)]
    return getMonster(chosen)
  }

  _spawnBoss(zone) {
    return getMonster(zone.bossId)
  }

  _spawnHiddenElemental(zone) {
    return getMonster(zone.hiddenMonsterId)
  }

  // ─── 렌더러용: 구역 몬스터 목록 (id·name·attribute·tier) ──────────
  // tier → 리스폰 딜레이(ms): 1-2=2s, 3-4=3s, 5-6=5s, 7+=8s
  getZoneMonsters(zoneId) {
    const RESPAWN_MS = { 1: 2000, 2: 2000, 3: 3000, 4: 3000, 5: 5000, 6: 5000, 7: 8000 }
    const zone = ZONES.find(z => z.id === zoneId)
    if (!zone) return []
    const ids = [...zone.monsterIds, zone.bossId]
    return ids.map(id => {
      const m = getMonster(id)
      if (!m) return null
      return { id: m.id, name: m.name, attribute: m.attribute, tier: m.tier, isBoss: m.isBoss,
               respawnMs: RESPAWN_MS[m.tier] || 8000 }
    }).filter(Boolean)
  }

  // ─── 자동 사냥 ─────────────────────────────────────────────────────
  startAutoHunt(pet, zoneId) {
    const db    = require('../../db/database')
    const zone  = ZONES.find(z => z.id === zoneId)
    if (!zone) return { error: '존재하지 않는 구역입니다' }
    if (!this._canAccess(zone)) return { error: '접근 불가 구역입니다 (세력 평판 조건 미충족)' }

    const energy = pet.conditions?.energy ?? 100
    if (energy < AUTO_ENERGY_COST) return { error: '에너지 부족 (자동 사냥: -30 필요)' }

    const synergyMult = this._getSynergyMult(pet)
    const startedAt   = Date.now()
    db.run(
      `INSERT INTO hunt_log (pet_id, zone_id, mode, started_at) VALUES (?,?,?,?)`,
      [pet.id, zoneId, 'auto', startedAt]
    )
    const huntLogId = db.query('SELECT last_insert_rowid() AS id')[0]?.id

    let currentEnergy = energy
    const battles = []

    while (currentEnergy >= AUTO_ENERGY_COST) {
      // 보스 조우 판정
      const isBoss  = Math.random() < BOSS_CHANCE_AUTO
      const monster = isBoss ? this._spawnBoss(zone) : this._spawnRegular(zone)
      if (!monster) break

      currentEnergy -= AUTO_ENERGY_COST
      const outcome = this.combatSystem.runAutoFight(
        { ...pet, energy: currentEnergy },
        monster,
        { mode: 'auto', huntLogId, synergyMult }
      )
      battles.push({ monster: monster.name, isBoss, ...outcome })
      if (outcome.result === 'lost') break

      pet = this.Pet.getPet(pet.id)
      if (!pet) break
    }

    db.run(
      `UPDATE hunt_log SET ended_at=?, result=? WHERE id=?`,
      [Date.now(), battles.at(-1)?.result || 'stopped', huntLogId]
    )
    db.run(`UPDATE pet_conditions SET energy=? WHERE pet_id=?`, [currentEnergy, pet.id])
    this.questSystem?.recordActivity('hunt', battles.length)

    const wins = battles.filter(b => b.result === 'won').length
    if (wins > 0) {
      const latestPet = this.Pet.getPet(pet.id)
      if (latestPet) {
        this.Pet.updatePet(pet.id, { affinity: Math.min(100, (latestPet.affinity || 0) + wins * 0.3) })
      }
    }

    this.save()
    return { battles, finalEnergy: currentEnergy }
  }

  stopAutoHunt(petId) {
    this._activeHunts.delete(petId)
  }

  // ─── 수동 사냥 (1회 전투) ──────────────────────────────────────────
  processManualBattle(pet, zoneId) {
    const db   = require('../../db/database')
    const zone = ZONES.find(z => z.id === zoneId)
    if (!zone) return { error: '존재하지 않는 구역입니다' }
    if (!this._canAccess(zone)) return { error: '접근 불가 구역입니다' }

    const energy = pet.conditions?.energy ?? 100
    if (energy < MANUAL_ENERGY_COST) return { error: '에너지 부족 (수동 사냥: -15 필요)' }

    const newEnergy = energy - MANUAL_ENERGY_COST

    // 히든 스테이지 진입 판정 (수동 전용)
    if (Math.random() < HIDDEN_STAGE_CHANCE) {
      return this._runHiddenStage(pet, zone, newEnergy)
    }

    // 보스 조우 판정
    const isBoss  = Math.random() < BOSS_CHANCE_MANUAL
    const monster = isBoss ? this._spawnBoss(zone) : this._spawnRegular(zone)
    if (!monster) return { error: '몬스터를 찾을 수 없습니다' }

    const synergyMult = this._getSynergyMult(pet)
    const outcome     = this.combatSystem.runAutoFight(pet, monster, {
      mode: 'manual',
      dropRateBonus: MANUAL_DROP_BONUS,
      synergyMult,
    })

    db.run(`UPDATE pet_conditions SET energy=? WHERE pet_id=?`, [newEnergy, pet.id])
    this.questSystem?.recordActivity('hunt', 1)
    if (outcome.result !== 'lost') {
      this.Pet.updatePet(pet.id, { affinity: Math.min(100, (pet.affinity || 0) + 1.0) })
    }
    this.save()
    return { monster: monster.name, isBoss, ...outcome, finalEnergy: newEnergy }
  }

  // ─── 히든 스테이지 실행 ────────────────────────────────────────────
  // 수동 사냥 0.001% 확률 진입, 연속 HIDDEN_STAGE_BATTLES회 전투
  // 성공 시 evo_stone 확정 드롭 + 히든 장비 낮은 확률
  _runHiddenStage(pet, zone, energyAfter) {
    const db      = require('../../db/database')
    const battles = []
    let   petSnap = pet

    db.run(`UPDATE pet_conditions SET energy=? WHERE pet_id=?`, [energyAfter, pet.id])

    for (let i = 0; i < HIDDEN_STAGE_BATTLES; i++) {
      const monster = this._spawnHiddenElemental(zone)
      if (!monster) break

      const outcome = this.combatSystem.runAutoFight(petSnap, monster, {
        mode: 'manual',
        dropRateBonus: MANUAL_DROP_BONUS,
        synergyMult: this._getSynergyMult(petSnap),
      })
      battles.push({ monster: monster.name, isHidden: true, ...outcome })

      if (outcome.result === 'lost') break
      petSnap = this.Pet.getPet(pet.id)
      if (!petSnap) break
    }

    const allWon = battles.every(b => b.result === 'won')
    if (allWon) {
      // evo_stone 확정 드롭은 monster.drops에 이미 정의되어 있어 combatSystem이 처리
      // 히든 장비 상자 5% 추가 드롭
      if (Math.random() < 0.05) {
        // itemSystem은 DI가 없으므로 직접 DB 처리
        db.run(
          `INSERT INTO pet_inventory (pet_id, item_id, quantity)
           VALUES (?, 'equip_box_epic', 1)
           ON CONFLICT(pet_id, item_id) DO UPDATE SET quantity = quantity + 1`,
          [pet.id]
        )
      }
    }

    this.questSystem?.recordActivity('hunt', battles.length)
    this.save()
    return {
      hiddenStage: true,
      battles,
      allWon,
      finalEnergy: energyAfter,
    }
  }
}

module.exports = HuntingSystem
