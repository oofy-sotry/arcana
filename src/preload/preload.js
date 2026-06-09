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
})
