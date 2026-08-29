const { ipcMain } = require('electron')

class IpcRouter {
  constructor({ petSystem, levelSystem, evolutionSystem, skillSystem, itemSystem,
                huntingSystem, explorationSystem,
                breedingSystem, gachaSystem, partySystem, questSystem, onlineSystem,
                equipmentSystem, factionSystem, pvpSystem, summonerSystem,
                windowManager }) {
    this.petSystem         = petSystem
    this.levelSystem       = levelSystem
    this.evolutionSystem   = evolutionSystem
    this.skillSystem       = skillSystem
    this.itemSystem        = itemSystem
    this.huntingSystem     = huntingSystem
    this.explorationSystem = explorationSystem
    this.breedingSystem    = breedingSystem
    this.gachaSystem       = gachaSystem
    this.partySystem       = partySystem
    this.questSystem       = questSystem
    this.onlineSystem      = onlineSystem
    this.equipmentSystem   = equipmentSystem
    this.factionSystem     = factionSystem
    this.pvpSystem         = pvpSystem
    this.summonerSystem    = summonerSystem
    this.windowManager     = windowManager
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
    // forceType: undefined=자동판단 / 'hidden'=히든강제 / 'normal'=일반강제
    ipcMain.handle('evolution:attempt', (_e, { petId, forceType }) => {
      const pets = this.petSystem.getAll()
      const pet  = pets.find(p => p.id === petId)
      if (!pet) return { ok: false, reason: 'not_found' }
      const canEvo   = this.evolutionSystem.canEvolve(pet)
      const isHidden = this.evolutionSystem.checkHiddenConditions(pet)

      // 히든 가능 + forceType 미지정 → UI에서 confirm 필요
      if (isHidden && !forceType) {
        return { ok: false, reason: 'confirm_hidden', canNormal: canEvo }
      }

      const useHidden = forceType === 'hidden' ? true
                      : forceType === 'normal' ? false
                      : isHidden
      if (!canEvo && !useHidden) return { ok: false, reason: 'conditions_not_met' }

      const result = this.evolutionSystem.evolve(pet, useHidden ? 'hidden' : 'normal')
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
      const result = this.itemSystem.useItem(pet, itemId)
      if (result.ok && result.effect === 'dark_evolve') {
        const freshPet = this.petSystem.getAll().find(p => p.id === petId)
        if (freshPet) this.skillSystem.unlockForStage(freshPet)
      }
      return result
    })
    ipcMain.handle('item:get-shop', () => this.itemSystem.getShopCatalog())
    ipcMain.handle('item:buy', (_e, { petId, itemId, quantity }) =>
      this.itemSystem.buyItem(petId, itemId, quantity)
    )

    ipcMain.on('overlay:toggle-mouse', (_event, ignore) => {
      this.windowManager.toggleMouseEvents(ignore)
    })

    ipcMain.handle('hunting:zone-monsters', (_e, { zoneId }) =>
      this.huntingSystem.getZoneMonsters(zoneId)
    )
    ipcMain.handle('hunting:get-zones', (_e, { petId } = {}) => {
      const pet = petId ? this.petSystem.getAll().find(p => p.id === petId) : null
      return this.huntingSystem.getZones(pet)
    })
    ipcMain.handle('hunting:stop-auto', (_e, { petId }) => this.huntingSystem.stopAutoHunt(petId))
    // 실시간 파티 사냥 — 서버가 이미 계산한 보상을 로컬 DB에 반영 (CombatSystem.endBattle의 'won' 분기와 동일한 시스템 재사용)
    ipcMain.handle('hunting:apply-realtime-reward', (_e, { petId, exp, coins, drops }) => {
      const pet = this.petSystem.getAll().find(p => p.id === petId)
      if (!pet) return { ok: false, error: 'pet_not_found' }

      if (exp) this.levelSystem.addExperience(pet, exp)
      if (coins) {
        const freshPet = this.petSystem.getAll().find(p => p.id === petId) || pet
        this.petSystem.Pet.updatePet(petId, { coins: (freshPet.coins || 0) + coins })
      }
      for (const drop of drops || []) {
        this.itemSystem.addItem(petId, drop.itemId, drop.quantity)
      }
      return { ok: true }
    })
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
      if (result.pets) this.questSystem?.recordActivity('gacha', 1)
      return result
    })
    ipcMain.handle('gacha:roll-ten', (_e, { ownerPetId }) => {
      const result = this.gachaSystem.rollTen(ownerPetId)
      if (result.pets) this.questSystem?.recordActivity('gacha10', 1)
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
        const newChild = this.petSystem.createPet(res.child.name, res.child.attribute)
        const updates  = { parent1_id: myPet.id }
        if (res.child.attribute2) updates.attribute2 = res.child.attribute2
        this.petSystem.Pet.updatePet(newChild.id, updates)
      }
      return res
    })

    ipcMain.handle('online:battle-challenge', async (_e, { targetUsername, myPet }) => {
      const res = await this.onlineSystem.challengeBattle(targetUsername, myPet)
      if (res.ok) {
        const username = this.onlineSystem.getUsername()
        if (username) {
          this.pvpSystem?.recordResult(username, res.winner === 'attacker')
        }
      }
      return res
    })
    ipcMain.handle('online:battle-history', () => this.onlineSystem.getBattleHistory())

    ipcMain.handle('online:friends', () => this.onlineSystem.getFriends())
    ipcMain.handle('online:friends-add', (_e, { username }) => this.onlineSystem.addFriend(username))
    ipcMain.handle('online:friends-remove', (_e, { friendId }) => this.onlineSystem.removeFriend(friendId))
    ipcMain.handle('online:friends-pets', (_e, { username }) => this.onlineSystem.getFriendPets(username))
    ipcMain.handle('online:get-ws-info', () => this.onlineSystem.getWsConnectionInfo())
    ipcMain.handle('online:realtime-ranking', () => this.onlineSystem.getRealtimeRanking())

    // ── Exploration choice ────────────────────────────────────────────
    ipcMain.handle('explore:resolve-choice', (_e, { petId, eventId, choiceIndex }) => {
      const pet = this.petSystem.getAll().find(p => p.id === petId)
      if (!pet) return { ok: false, error: 'not_found' }
      return this.explorationSystem.resolveChoice(pet, eventId, choiceIndex)
    })

    // ── Equipment ─────────────────────────────────────────────────────
    ipcMain.handle('equipment:get-inventory', (_e, { petId }) =>
      this.equipmentSystem.getInventory(petId)
    )
    ipcMain.handle('equipment:get-equipped', (_e, { petId }) =>
      this.equipmentSystem.getEquipped(petId)
    )
    ipcMain.handle('equipment:equip', (_e, { petId, inventoryId }) =>
      this.equipmentSystem.equip(petId, inventoryId)
    )
    ipcMain.handle('equipment:unequip', (_e, { petId, slot }) =>
      this.equipmentSystem.unequip(petId, slot)
    )
    ipcMain.handle('equipment:enhance', (_e, { petId, inventoryId }) =>
      this.equipmentSystem.enhance(petId, inventoryId)
    )
    ipcMain.handle('equipment:open-box', (_e, { petId, itemId }) =>
      this.equipmentSystem.openBox(petId, itemId)
    )
    ipcMain.handle('equipment:set-bonuses', (_e, { petId }) =>
      this.equipmentSystem.getSetBonuses(petId)
    )

    // ── Summoner ──────────────────────────────────────────────────────
    ipcMain.handle('summoner:get', () => this.summonerSystem.getSummoner())
    ipcMain.handle('summoner:create', (_e, { name, appearance }) =>
      this.summonerSystem.createSummoner(name, appearance)
    )
    ipcMain.handle('summoner:has-free-gacha-used', () =>
      this.summonerSystem.hasFreeGachaUsed()
    )
    ipcMain.handle('summoner:free-gacha', () => this.summonerSystem.rollFreeGacha())
    ipcMain.handle('summoner:set-personality', (_e, { summonerId, personality }) =>
      this.summonerSystem.setPersonality(summonerId, personality)
    )
    ipcMain.handle('summoner:get-stats', (_e, { summonerId }) =>
      this.summonerSystem.getSummonerStats(summonerId)
    )
    ipcMain.handle('summoner:invest-stat', (_e, { summonerId, statKey }) =>
      this.summonerSystem.investStat(summonerId, statKey)
    )
    ipcMain.handle('summoner:add-exp', (_e, { summonerId, amount }) =>
      this.summonerSystem.addExp(summonerId, amount)
    )
    ipcMain.handle('summoner:get-map-state', (_e, { summonerId }) =>
      this.summonerSystem.getMapState(summonerId)
    )
    ipcMain.handle('summoner:save-map-state', (_e, { summonerId, mapId, tileX, tileY }) =>
      this.summonerSystem.saveMapState(summonerId, mapId, tileX, tileY)
    )

    // ── World Map ─────────────────────────────────────────────────────
    ipcMain.handle('world:get-map', (_e, { mapId }) => {
      try {
        const mapData = require(`../game/data/maps/${mapId}`)
        return { ok: true, map: mapData }
      } catch {
        return { ok: false, error: `맵을 찾을 수 없습니다: ${mapId}` }
      }
    })

    // ── PvP ───────────────────────────────────────────────────────────
    ipcMain.handle('pvp:current-season', () => this.pvpSystem.getCurrentSeason())
    ipcMain.handle('pvp:ranking', (_e, { seasonNum } = {}) =>
      this.pvpSystem.getRanking(seasonNum)
    )
    ipcMain.handle('pvp:end-season', () => this.pvpSystem.endSeason())

    // ── Faction ───────────────────────────────────────────────────────
    ipcMain.handle('faction:get-all', () => this.factionSystem.getAllRep())
    ipcMain.handle('faction:get-tier', (_e, { faction }) =>
      this.factionSystem.getTierInfo(faction)
    )
    ipcMain.handle('faction:use-item', (_e, { itemId }) =>
      this.factionSystem.useFactionItem(itemId)
    )
    ipcMain.handle('faction:hidden-ending', () =>
      this.factionSystem.checkHiddenEndingConditions()
    )
    ipcMain.handle('faction:soul-fusion', () =>
      ({ value: this.factionSystem.getSoulFusion() })
    )
    ipcMain.handle('faction:chapter', () =>
      ({ chapter: this.factionSystem.getCurrentChapter() })
    )
    ipcMain.handle('faction:advance-chapter', (_e, { chapter, effects }) => {
      const result = this.factionSystem.advanceChapter(chapter, effects)
      // 챕터 4(거짓된 전면전) 진입 시 파티 펫 충성도 판정 — 이탈/설득 필요
      if (result.ok && chapter === 4) {
        result.loyaltyResolution = this._resolveChapter4Loyalty()
      }
      // 챕터 6(스토리 완료) + 히든 엔딩(soulFusion 포함) 시 chaosrex_4 → omnirex_0 변환
      if (result.ok && chapter === 6 && effects?.soulFusion) {
        const transformed = this._triggerHiddenOmnirex()
        if (transformed.length > 0) result.omnirexTransformed = true
      }
      return result
    })
  }

  // 4장 진입 시 파티 펫 충성도 판정: 70+ 유지, 30~70 설득 필요, 30 미만 이탈
  _resolveChapter4Loyalty() {
    const db     = require('../db/database')
    const { members } = this.partySystem.getParty()
    const result = { kept: [], persuasionNeeded: [], departed: [] }

    for (const pet of members) {
      const loyalty = pet.loyalty ?? 70
      if (loyalty >= 70) {
        result.kept.push({ id: pet.id, name: pet.name })
      } else if (loyalty >= 30) {
        db.run(
          `INSERT INTO world_state (key, value) VALUES (?, '1')
           ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
          [`persuasion_needed_${pet.id}`]
        )
        result.persuasionNeeded.push({ id: pet.id, name: pet.name, loyalty })
      } else {
        this.partySystem.removeFromParty(pet.id)
        db.run(
          `INSERT INTO party_departure_log (pet_id, loyalty, chapter, departed_at) VALUES (?, ?, 4, ?)`,
          [pet.id, loyalty, Date.now()]
        )
        result.departed.push({ id: pet.id, name: pet.name, loyalty })
      }
    }
    return result
  }

  _triggerHiddenOmnirex() {
    const pets        = this.petSystem.getAll()
    const transformed = []
    for (const pet of pets) {
      if (pet.species === 'Chaosrex' && pet.evolution_stage === 4) {
        const r = this.evolutionSystem.transformToOmnirex(pet)
        if (r.ok) transformed.push(r.pet)
      }
    }
    return transformed
  }
}

module.exports = IpcRouter
