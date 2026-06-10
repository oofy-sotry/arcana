const { ipcMain } = require('electron')

class IpcRouter {
  constructor({ petSystem, levelSystem, evolutionSystem, skillSystem, itemSystem,
                huntingSystem, explorationSystem,
                breedingSystem, gachaSystem, partySystem, questSystem, onlineSystem,
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
    this.questSystem      = questSystem
    this.onlineSystem     = onlineSystem
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
      const result = this.levelSystem.addExperience(pet, amount)
      this.questSystem?.recordActivity('exp', amount)
      return result
    })
    ipcMain.handle('evolution:attempt', (_e, { petId }) => {
      const pets = this.petSystem.getAll()
      const pet  = pets.find(p => p.id === petId)
      if (!pet) return { ok: false, reason: 'not_found' }
      if (!this.evolutionSystem.canEvolve(pet)) return { ok: false, reason: 'conditions_not_met' }
      const result   = this.evolutionSystem.evolve(pet)
      this.questSystem?.recordActivity('evolve', 1)
      const freshPet = this.petSystem.getAll().find(p => p.id === petId)
      if (freshPet) this.skillSystem.unlockForStage(freshPet)
      return { ok: true, result }
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
      const result = mode === 'manual'
        ? this.explorationSystem.manualExplore(pet)
        : this.explorationSystem.startAutoExplore(pet)
      if (!result.error) this.questSystem?.recordActivity('explore', 1)
      return result
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
      const result = this.breedingSystem.breed(pet1, pet2, batchCount ?? 1)
      if (result.ok) this.questSystem?.recordActivity('breed', 1)
      return result
    })
    ipcMain.handle('breeding:get-lineage', (_e, { petId }) =>
      this.breedingSystem.getLineage(petId)
    )

    // ── Gacha ─────────────────────────────────────────────────────────────
    ipcMain.handle('gacha:roll-single', (_e, { ownerPetId }) => {
      const result = this.gachaSystem.rollSingle(ownerPetId)
      if (result.ok) this.questSystem?.recordActivity('gacha', 1)
      return result
    })
    ipcMain.handle('gacha:roll-ten', (_e, { ownerPetId }) => {
      const result = this.gachaSystem.rollTen(ownerPetId)
      if (result.ok) this.questSystem?.recordActivity('gacha10', 1)
      return result
    })

    // ── Party ─────────────────────────────────────────────────────────────
    ipcMain.handle('party:get', () => this.partySystem.getParty())
    ipcMain.handle('party:add', (_e, { petId, slot }) =>
      this.partySystem.addToParty(petId, slot)
    )
    ipcMain.handle('party:remove', (_e, { petId }) =>
      this.partySystem.removeFromParty(petId)
    )
    ipcMain.handle('party:clear', () => this.partySystem.clearParty())

    // ── Quest ─────────────────────────────────────────────────────────────
    ipcMain.handle('quest:get-all', () => this.questSystem.getAllStatuses())
    ipcMain.handle('quest:claim', (_e, { questId, petId }) =>
      this.questSystem.claimReward(questId, petId)
    )
    ipcMain.handle('quest:faction-rep', () => this.questSystem.getFactionRep())

    // ── Online ────────────────────────────────────────────────────────────
    ipcMain.handle('online:status', () => ({
      loggedIn: this.onlineSystem.isLoggedIn(),
      username: this.onlineSystem.getUsername(),
    }))
    ipcMain.handle('online:server-ping', () => this.onlineSystem.isServerReachable())
    ipcMain.handle('online:register', (_e, { username, email, password }) =>
      this.onlineSystem.register(username, email, password)
    )
    ipcMain.handle('online:login', (_e, { email, password }) =>
      this.onlineSystem.login(email, password)
    )
    ipcMain.handle('online:logout', () => { this.onlineSystem.logout(); return { ok: true } })
    ipcMain.handle('online:sync-pets', () => this.onlineSystem.syncPets())
    ipcMain.handle('online:ranking', (_e, { category }) => this.onlineSystem.getRanking(category))

    ipcMain.handle('online:breeding-offers', () => this.onlineSystem.listBreedingOffers())
    ipcMain.handle('online:breeding-post', (_e, { pet, price }) =>
      this.onlineSystem.postBreedingOffer(pet, price)
    )
    ipcMain.handle('online:breeding-cancel', () => this.onlineSystem.cancelBreedingOffer())
    ipcMain.handle('online:breeding-request', async (_e, { offerId, myPet }) => {
      const res = await this.onlineSystem.requestBreeding(offerId, myPet)
      if (res.ok && res.child) {
        this.petSystem.createPet(res.child.name, res.child.attribute)
      }
      return res
    })

    ipcMain.handle('online:battle-challenge', (_e, { targetUsername, myPet }) =>
      this.onlineSystem.challengeBattle(targetUsername, myPet)
    )
    ipcMain.handle('online:battle-history', () => this.onlineSystem.getBattleHistory())

    ipcMain.handle('online:friends', () => this.onlineSystem.getFriends())
    ipcMain.handle('online:friends-add', (_e, { username }) => this.onlineSystem.addFriend(username))
    ipcMain.handle('online:friends-remove', (_e, { friendId }) => this.onlineSystem.removeFriend(friendId))
    ipcMain.handle('online:friends-pets', (_e, { username }) => this.onlineSystem.getFriendPets(username))
  }
}

module.exports = IpcRouter
