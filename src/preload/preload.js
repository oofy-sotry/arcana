const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('arcana', {
  pet: {
    getAll: () => ipcRenderer.invoke('pet:get-all'),
  },
  overlay: {
    toggleMouse: (ignore) => ipcRenderer.send('overlay:toggle-mouse', ignore),
  },
})
