const { ipcMain } = require('electron')

class IpcRouter {
  constructor({ petSystem, levelSystem, evolutionSystem, skillSystem, itemSystem,
                huntingSystem, explorationSystem,
                breedingSystem, gachaSystem, partySystem,
                windowManager }) {
    this.petSystem        = petSystem
    this.levelSystem      = levelSystem
    this.evolutionSystem  = evolutionSystem
    this.skillSystem      = skillSystem
    this.itemSystem       = itemSystem
    this.huntingSystem    = huntingSystem
    this.explorationSystem = explorationSystem
    this.breedingSystem   = breedingSystem
    this.gachaSystem      = gachaSystem
    this.partySystem      = partySystem
    this.windowManager    = windowManager
  }

  register() {
    ipcMain.handle('pet:get-all', () => this.petSystem.getAll())
    ipcMain.handle('pet:create', (_e, { name, attribute }) =>
      this.petSystem.createPet(name, attribute)
    )
    ipcMain.handle('pet:add-exp', (_e, { petId, amount }) => {
      const pets = this.petSystem.getAll()
      const pet  = pets.find(p => p.id === petId)
      if (!pet) return null
      return this.levelSystem.addExperience(pet, amount)
    })
    ipcMain.handle('evolution:attempt', (_e, { petId }) => {
      const pets = this.petSystem.getAll()
      const pet  = pets.find(p => p.id === petId)
      if (!pet) return { ok: false, reason: 'not_found' }
      if (!this.evolutionSystem.canEvolve(pet)) return { ok: false, reason: 'conditions_not_met' }
      return { ok: true, result: this.evolutionSystem.evolve(pet) }
    })

    ipcMain.handle('skill:get', (_e, { petId }) =>
      this.skillSystem.getPetSkills(petId)
    )
    ipcMain.handle('skill:upgrade', (_e, { petId, skillId }) => {
      const pets = this.petSystem.getAll()
      const pet  = pets.find(p => p.id === petId)
      if (!pet) return { ok: false, reason: 'not_found' }
      return this.skillSystem.upgradeSkill(pet, skillId)
    })
    ipcMain.handle('item:get-inventory', (_e, { petId }) =>
      this.itemSystem.getInventory(petId)
    )
    ipcMain.handle('item:use', (_e, { petId, itemId }) => {
      const pets = this.petSystem.getAll()
      const pet  = pets.find(p => p.id === petId)
      if (!pet) return { ok: false, reason: 'not_found' }
      return this.itemSystem.useItem(pet, itemId)
    })

    ipcMain.on('overlay:toggle-mouse', (_event, ignore) => {
      this.windowManager.toggleMouseEvents(ignore)
    })

    ipcMain.handle('hunting:get-zones', () => this.huntingSystem.getZones())
    ipcMain.handle('hunting:stop-auto', (_e, { petId }) => this.huntingSystem.stopAutoHunt(petId))
    ipcMain.handle('hunting:manual-battle', (_e, { petId, zoneId }) => {
      const pets = this.petSystem.getAll()
      const pet  = pets.find(p => p.id === petId)
      if (!pet) return { error: 'not_found' }
      return this.huntingSystem.processManualBattle(pet, zoneId)
    })
    ipcMain.handle('hunting:explore', (_e, { petId, mode }) => {
      const pets = this.petSystem.getAll()
      const pet  = pets.find(p => p.id === petId)
      if (!pet) return { error: 'not_found' }
      return mode === 'manual'
        ? this.explorationSystem.manualExplore(pet)
        : this.explorationSystem.startAutoExplore(pet)
    })
    ipcMain.handle('hunting:open', () => this.windowManager.createHuntingWindow())
    ipcMain.handle('hunting:start-auto', (_e, { petId, zoneId }) => {
      const pets = this.petSystem.getAll()
      const pet  = pets.find(p => p.id === petId)
      if (!pet) return { error: 'not_found' }
      return this.huntingSystem.startAutoHunt(pet, zoneId)
    })

    // ── Breeding ──────────────────────────────────────────────────────────
    ipcMain.handle('breeding:compat-info', (_e, { petId1, petId2 }) => {
      const pets = this.petSystem.getAll()
      const pet1 = pets.find(p => p.id === petId1)
      const pet2 = pets.find(p => p.id === petId2)
      if (!pet1 || !pet2) return { error: 'not_found' }
      return this.breedingSystem.getCompatInfo(pet1, pet2)
    })
    ipcMain.handle('breeding:breed', (_e, { petId1, petId2, batchCount }) => {
      const pets = this.petSystem.getAll()
      const pet1 = pets.find(p => p.id === petId1)
      const pet2 = pets.find(p => p.id === petId2)
      if (!pet1 || !pet2) return { error: 'not_found' }
      return this.breedingSystem.breed(pet1, pet2, batchCount ?? 1)
    })
    ipcMain.handle('breeding:get-lineage', (_e, { petId }) =>
      this.breedingSystem.getLineage(petId)
    )

    // ── Gacha ─────────────────────────────────────────────────────────────
    ipcMain.handle('gacha:roll-single', (_e, { ownerPetId }) =>
      this.gachaSystem.rollSingle(ownerPetId)
    )
    ipcMain.handle('gacha:roll-ten', (_e, { ownerPetId }) =>
      this.gachaSystem.rollTen(ownerPetId)
    )

    // ── Party ─────────────────────────────────────────────────────────────
    ipcMain.handle('party:get', () => this.partySystem.getParty())
    ipcMain.handle('party:add', (_e, { petId, slot }) =>
      this.partySystem.addToParty(petId, slot)
    )
    ipcMain.handle('party:remove', (_e, { petId }) =>
      this.partySystem.removeFromParty(petId)
    )
    ipcMain.handle('party:clear', () => this.partySystem.clearParty())
  }
}

module.exports = IpcRouter
