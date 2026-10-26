const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  login: (email, senha) => ipcRenderer.invoke('login', email, senha),
  logout: () => ipcRenderer.invoke('logout'),
  list: (ent) => ipcRenderer.invoke('list', ent),
  save: (ent, dados) => ipcRenderer.invoke('save', ent, dados),
  remove: (ent, id) => ipcRenderer.invoke('remove', ent, id),
});
