const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('arcana', {
  pet: {
    getAll:  ()                    => ipcRenderer.invoke('pet:get-all'),
    create:  ({ name, attribute }) => ipcRenderer.invoke('pet:create', { name, attribute }),
    addExp:  ({ petId, amount })   => ipcRenderer.invoke('pet:add-exp', { petId, amount }),
  },
  evolution: {
    attempt: ({ petId, forceType }) => ipcRenderer.invoke('evolution:attempt', { petId, forceType }),
  },
  skill: {
    get:     ({ petId })           => ipcRenderer.invoke('skill:get', { petId }),
    upgrade: ({ petId, skillId })  => ipcRenderer.invoke('skill:upgrade', { petId, skillId }),
  },
  item: {
    getInventory: ({ petId })      => ipcRenderer.invoke('item:get-inventory', { petId }),
    use:          ({ petId, itemId }) => ipcRenderer.invoke('item:use', { petId, itemId }),
  },
  overlay: {
    toggleMouse: (ignore)          => ipcRenderer.send('overlay:toggle-mouse', ignore),
  },
  hunting: {
    getZones:     ()                           => ipcRenderer.invoke('hunting:get-zones'),
    startAuto:    ({ petId, zoneId })          => ipcRenderer.invoke('hunting:start-auto', { petId, zoneId }),
    stopAuto:     ({ petId })                  => ipcRenderer.invoke('hunting:stop-auto', { petId }),
    manualBattle: ({ petId, zoneId })          => ipcRenderer.invoke('hunting:manual-battle', { petId, zoneId }),
    explore:      ({ petId, mode })            => ipcRenderer.invoke('hunting:explore', { petId, mode }),
    open:         ()                           => ipcRenderer.invoke('hunting:open'),
    zoneMonsters: ({ zoneId })                 => ipcRenderer.invoke('hunting:zone-monsters', { zoneId }),
  },
  breeding: {
    compatInfo: ({ petId1, petId2 })             => ipcRenderer.invoke('breeding:compat-info', { petId1, petId2 }),
    breed:      ({ petId1, petId2, batchCount }) => ipcRenderer.invoke('breeding:breed', { petId1, petId2, batchCount }),
    getLineage: ({ petId })                      => ipcRenderer.invoke('breeding:get-lineage', { petId }),
  },
  gacha: {
    rollSingle: ({ ownerPetId }) => ipcRenderer.invoke('gacha:roll-single', { ownerPetId }),
    rollTen:    ({ ownerPetId }) => ipcRenderer.invoke('gacha:roll-ten',    { ownerPetId }),
  },
  party: {
    get:    ()                => ipcRenderer.invoke('party:get'),
    add:    ({ petId, slot }) => ipcRenderer.invoke('party:add',    { petId, slot }),
    remove: ({ petId })       => ipcRenderer.invoke('party:remove', { petId }),
    clear:  ()                => ipcRenderer.invoke('party:clear'),
  },
  quest: {
    getAll:     ()                        => ipcRenderer.invoke('quest:get-all'),
    claim:      ({ questId, petId })      => ipcRenderer.invoke('quest:claim', { questId, petId }),
    factionRep: ()                        => ipcRenderer.invoke('quest:faction-rep'),
  },
  online: {
    status:          ()                               => ipcRenderer.invoke('online:status'),
    serverPing:      ()                               => ipcRenderer.invoke('online:server-ping'),
    register:        ({ username, email, password })  => ipcRenderer.invoke('online:register', { username, email, password }),
    login:           ({ email, password })            => ipcRenderer.invoke('online:login', { email, password }),
    logout:          ()                               => ipcRenderer.invoke('online:logout'),
    syncPets:        ()                               => ipcRenderer.invoke('online:sync-pets'),
    ranking:         ({ category })                   => ipcRenderer.invoke('online:ranking', { category }),
    breedingOffers:  ()                               => ipcRenderer.invoke('online:breeding-offers'),
    breedingPost:    ({ pet, price })                 => ipcRenderer.invoke('online:breeding-post', { pet, price }),
    breedingCancel:  ()                               => ipcRenderer.invoke('online:breeding-cancel'),
    breedingRequest: ({ offerId, myPet })             => ipcRenderer.invoke('online:breeding-request', { offerId, myPet }),
    battleChallenge: ({ targetUsername, myPet })      => ipcRenderer.invoke('online:battle-challenge', { targetUsername, myPet }),
    battleHistory:   ()                               => ipcRenderer.invoke('online:battle-history'),
    friends:         ()                               => ipcRenderer.invoke('online:friends'),
    friendsAdd:      ({ username })                   => ipcRenderer.invoke('online:friends-add', { username }),
    friendsRemove:   ({ friendId })                   => ipcRenderer.invoke('online:friends-remove', { friendId }),
    friendsPets:     ({ username })                   => ipcRenderer.invoke('online:friends-pets', { username }),
  },
  equipment: {
    getInventory: ({ petId })              => ipcRenderer.invoke('equipment:get-inventory', { petId }),
    getEquipped:  ({ petId })              => ipcRenderer.invoke('equipment:get-equipped',  { petId }),
    equip:        ({ petId, inventoryId }) => ipcRenderer.invoke('equipment:equip',         { petId, inventoryId }),
    unequip:      ({ petId, slot })        => ipcRenderer.invoke('equipment:unequip',        { petId, slot }),
    enhance:      ({ petId, inventoryId }) => ipcRenderer.invoke('equipment:enhance',        { petId, inventoryId }),
    openBox:      ({ petId, itemId })      => ipcRenderer.invoke('equipment:open-box',       { petId, itemId }),
    setBonuses:   ({ petId })              => ipcRenderer.invoke('equipment:set-bonuses',    { petId }),
  },
  faction: {
    getAll:          ()              => ipcRenderer.invoke('faction:get-all'),
    getTier:         ({ faction })   => ipcRenderer.invoke('faction:get-tier',       { faction }),
    useItem:         ({ itemId })    => ipcRenderer.invoke('faction:use-item',       { itemId }),
    hiddenEnding:    ()              => ipcRenderer.invoke('faction:hidden-ending'),
    soulFusion:      ()              => ipcRenderer.invoke('faction:soul-fusion'),
    chapter:         ()              => ipcRenderer.invoke('faction:chapter'),
    advanceChapter:  ({ chapter, effects }) => ipcRenderer.invoke('faction:advance-chapter', { chapter, effects }),
  },
  explore: {
    resolveChoice: ({ petId, eventId, choiceIndex }) =>
      ipcRenderer.invoke('explore:resolve-choice', { petId, eventId, choiceIndex }),
  },
  pvp: {
    currentSeason: ()               => ipcRenderer.invoke('pvp:current-season'),
    ranking:       ({ seasonNum } = {}) => ipcRenderer.invoke('pvp:ranking', { seasonNum }),
    endSeason:     ()               => ipcRenderer.invoke('pvp:end-season'),
  },
})
