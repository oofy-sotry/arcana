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
const { TICK_INTERVAL_SECONDS, getElapsedSeconds } = require('../game/utils/time')

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
    this._tickTimer          = null
  }

  async init() {
    await db.init()
    db.runMigrations()

    this.petSystem   = new PetSystem({ Pet, World, save: db.save })
    this.levelSystem     = new LevelSystem({ Pet, save: db.save })
    this.evolutionSystem = new EvolutionSystem({ Pet, save: db.save })
    this.skillSystem     = new SkillSystem({ Pet, save: db.save })
    this.itemSystem      = new ItemSystem({ Pet, save: db.save })
    this.combatSystem    = new CombatSystem({ Pet, save: db.save, levelSystem: this.levelSystem, itemSystem: this.itemSystem })
    this.factionSystem       = new FactionSystem({ save: db.save })
    this.equipmentSystem     = new EquipmentSystem({ save: db.save, itemSystem: this.itemSystem })
    this.explorationSystem   = new ExplorationSystem({ Pet, save: db.save, itemSystem: this.itemSystem, factionSystem: this.factionSystem })
    this.breedingSystem      = new BreedingSystem({ Pet, save: db.save })
    this.gachaSystem         = new GachaSystem({ Pet, save: db.save })
    this.partySystem         = new PartySystem({ Pet, save: db.save })
    this.questSystem         = new QuestSystem({ Pet, save: db.save, levelSystem: this.levelSystem })
    this.huntingSystem       = new HuntingSystem({
      Pet, save: db.save,
      combatSystem:  this.combatSystem,
      questSystem:   this.questSystem,
      partySystem:   this.partySystem,
      factionSystem: this.factionSystem,
    })
    this.onlineSystem        = new OnlineSystem({ Pet, save: db.save })

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

    for (const pet of pets) {
      const canEvo   = this.evolutionSystem.canEvolve(pet)
      const isHidden = this.evolutionSystem.checkHiddenConditions(pet)
      if (canEvo || isHidden) {
        const evoResult = this.evolutionSystem.evolve(pet, isHidden ? 'hidden' : 'normal')
        const freshPet  = this.petSystem.getAll().find(p => p.id === pet.id)
        if (freshPet) this.skillSystem.unlockForStage(freshPet)
        // 히든 진화 시 영혼동화도 증가
        if (evoResult.evoType === 'hidden') this.factionSystem.gainSoulFusion('hidden_evolution')
      }
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
