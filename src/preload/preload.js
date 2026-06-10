const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('arcana', {
  pet: {
    getAll:  ()                    => ipcRenderer.invoke('pet:get-all'),
    create:  ({ name, attribute }) => ipcRenderer.invoke('pet:create', { name, attribute }),
    addExp:  ({ petId, amount })   => ipcRenderer.invoke('pet:add-exp', { petId, amount }),
  },
  evolution: {
    attempt: ({ petId })           => ipcRenderer.invoke('evolution:attempt', { petId }),
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
})
