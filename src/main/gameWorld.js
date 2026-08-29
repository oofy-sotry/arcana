const { Notification } = require('electron')
const db          = require('../db/database')
const Pet         = require('../db/models/Pet')
const World       = require('../db/models/World')
const PetSystem   = require('../game/systems/PetSystem')
const LevelSystem     = require('../game/systems/LevelSystem')
const EvolutionSystem = require('../game/systems/EvolutionSystem')
const SkillSystem     = require('../game/systems/SkillSystem')
const ItemSystem      = require('../game/systems/ItemSystem')
const CombatSystem    = require('../game/systems/CombatSystem')
const HuntingSystem     = require('../game/systems/HuntingSystem')
const ExplorationSystem = require('../game/systems/ExplorationSystem')
const BreedingSystem    = require('../game/systems/BreedingSystem')
const GachaSystem       = require('../game/systems/GachaSystem')
const PartySystem       = require('../game/systems/PartySystem')
const QuestSystem       = require('../game/systems/QuestSystem')
const OnlineSystem       = require('../game/systems/OnlineSystem')
const EquipmentSystem    = require('../game/systems/EquipmentSystem')
const FactionSystem      = require('../game/systems/FactionSystem')
const PvpSystem          = require('../game/systems/PvpSystem')
const SummonerSystem     = require('../game/systems/SummonerSystem')
const { TICK_INTERVAL_SECONDS, getElapsedSeconds, secondsToAge } = require('../game/utils/time')

class GameWorld {
  constructor() {
    this.petSystem       = null
    this.levelSystem     = null
    this.evolutionSystem = null
    this.skillSystem     = null
    this.itemSystem      = null
    this.combatSystem    = null
    this.huntingSystem      = null
    this.explorationSystem  = null
    this.breedingSystem     = null
    this.gachaSystem        = null
    this.partySystem        = null
    this.questSystem        = null
    this.onlineSystem        = null
    this.equipmentSystem     = null
    this.factionSystem       = null
    this.pvpSystem           = null
    this.summonerSystem      = null
    this._tickTimer          = null
  }

  async init() {
    await db.init()
    db.runMigrations()

    this.petSystem   = new PetSystem({ Pet, World, save: db.save })
    this.factionSystem       = new FactionSystem({ save: db.save })
    this.summonerSystem      = new SummonerSystem({ Pet, save: db.save, factionSystem: this.factionSystem })
    this.levelSystem     = new LevelSystem({ Pet, save: db.save, summonerSystem: this.summonerSystem })
    this.evolutionSystem = new EvolutionSystem({ Pet, save: db.save, summonerSystem: this.summonerSystem })
    this.skillSystem     = new SkillSystem({ Pet, save: db.save })
    this.itemSystem      = new ItemSystem({ Pet, save: db.save })
    this.equipmentSystem     = new EquipmentSystem({ save: db.save, itemSystem: this.itemSystem })
    this.combatSystem    = new CombatSystem({ Pet, save: db.save, levelSystem: this.levelSystem, itemSystem: this.itemSystem, equipmentSystem: this.equipmentSystem, summonerSystem: this.summonerSystem })
    this.explorationSystem   = new ExplorationSystem({ Pet, save: db.save, itemSystem: this.itemSystem, factionSystem: this.factionSystem, summonerSystem: this.summonerSystem })
    this.breedingSystem      = new BreedingSystem({ Pet, save: db.save })
    this.gachaSystem         = new GachaSystem({ Pet, save: db.save })
    this.partySystem         = new PartySystem({ Pet, save: db.save, summonerSystem: this.summonerSystem })
    this.questSystem         = new QuestSystem({ Pet, save: db.save, levelSystem: this.levelSystem })
    this.huntingSystem       = new HuntingSystem({
      Pet, save: db.save,
      combatSystem:  this.combatSystem,
      questSystem:   this.questSystem,
      partySystem:   this.partySystem,
      factionSystem: this.factionSystem,
    })
    this.onlineSystem        = new OnlineSystem({ Pet, save: db.save })
    this.pvpSystem           = new PvpSystem({ save: db.save })

    const pets = this.petSystem.getAll()
    if (pets.length > 0) {
      this.petSystem.applyOfflineProgress(pets)
      this._applyOfflineEnergyRecovery(pets)
    }

    db.save()
  }

  startTick() {
    this._tickTimer = setInterval(
      () => this.onTick(),
      TICK_INTERVAL_SECONDS * 1000
    )
  }

  onTick() {
    const pets = this.petSystem.getAll()
    if (pets.length === 0) return

    this.petSystem.tickConditions(pets)
    this.petSystem.tickAge(pets)
    this._tickEnergyRecovery(pets)
    this._checkNotifications(this.petSystem.getAll())

    for (const pet of pets) {
      const canEvo   = this.evolutionSystem.canEvolve(pet)
      const isHidden = this.evolutionSystem.checkHiddenConditions(pet)
      // 히든 조건 충족 시 자동 진화 금지 — UI confirm 후 진화
      if (isHidden) continue
      if (canEvo) {
        const evoResult = this.evolutionSystem.evolve(pet, 'normal')
        const freshPet  = this.petSystem.getAll().find(p => p.id === pet.id)
        if (freshPet) this.skillSystem.unlockForStage(freshPet)
      }
      this.skillSystem.unlockFactionHiddenSkills(pet, this.factionSystem)
    }

    // 영혼동화도 시간 경과 증가 (+0.01/tick)
    this.factionSystem.gainSoulFusion('time_tick')

    World.set('last_save', String(Date.now()))
    db.save()
  }

  // 오프라인 시간만큼 에너지 회복 (+10/hour, 최대 100)
  _applyOfflineEnergyRecovery(pets) {
    const lastSaveMs = parseInt(World.get('last_save') || '0', 10)
    if (!lastSaveMs) return
    const elapsed     = getElapsedSeconds(lastSaveMs)
    const energyGain  = (elapsed / 3600) * 10
    for (const pet of pets) {
      const row = db.query('SELECT energy FROM pet_conditions WHERE pet_id=?', [pet.id])[0]
      if (!row) continue
      const newEnergy = Math.min(100, (row.energy || 0) + energyGain)
      db.run('UPDATE pet_conditions SET energy=? WHERE pet_id=?', [newEnergy, pet.id])
    }
  }

  // GDD 10절: 에너지 +10/hour = +10/60 per tick(60s)
  _tickEnergyRecovery(pets) {
    const energyPerTick = 10 / 60
    for (const pet of pets) {
      const row = db.query('SELECT energy FROM pet_conditions WHERE pet_id=?', [pet.id])[0]
      if (!row) continue
      const newEnergy = Math.min(100, (row.energy || 0) + energyPerTick)
      db.run('UPDATE pet_conditions SET energy=? WHERE pet_id=?', [newEnergy, pet.id])
    }
  }

  // GDD 23절 즉시 알림 — 임계값을 넘는 순간 1회만 발송, 회복하면 재발송 가능하도록 플래그 초기화
  _checkNotifications(pets) {
    const isSupported = typeof Notification !== 'undefined' && Notification.isSupported?.()
    const send = (title, body) => { if (isSupported) new Notification({ title, body }).show() }

    const flagKey  = (type, petId) => `notif_${type}_${petId}`
    const isFlagged = key => db.query('SELECT value FROM world_state WHERE key = ?', [key])[0]?.value === '1'
    const setFlag   = (key, on) => db.run(
      `INSERT INTO world_state (key, value) VALUES (?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
      [key, on ? '1' : '0']
    )

    for (const pet of pets) {
      const cond = pet.conditions || {}
      const checks = [
        { type: 'hunger',      active: cond.hunger      < 30, title: `${pet.name}이(가) 배고파요!` },
        { type: 'happiness',   active: cond.happiness   < 30, title: `${pet.name}이(가) 슬퍼해요!` },
        { type: 'cleanliness', active: cond.cleanliness < 30, title: `${pet.name}을(를) 씻겨주세요!` },
        { type: 'energy_full', active: (cond.energy ?? 0) >= 100, title: '에너지가 완충됐어요!' },
        { type: 'age',         active: secondsToAge(pet.age_seconds) >= 70, title: `${pet.name}이(가) 노령이에요. 잘 돌봐주세요` },
        { type: 'evolve_hidden', active: this.evolutionSystem.checkHiddenConditions(pet), title: `${pet.name}이(가) 진화할 준비가 됐어요!` },
      ]

      for (const c of checks) {
        const key     = flagKey(c.type, pet.id)
        const flagged = isFlagged(key)
        if (c.active && !flagged) {
          send(c.title, '')
          setFlag(key, true)
        } else if (!c.active && flagged) {
          setFlag(key, false)
        }
      }
    }
  }

  shutdown() {
    if (this._tickTimer) {
      clearInterval(this._tickTimer)
      this._tickTimer = null
    }
    World.set('last_save', String(Date.now()))
    db.save()
  }
}

module.exports = GameWorld
