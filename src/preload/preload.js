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
})
