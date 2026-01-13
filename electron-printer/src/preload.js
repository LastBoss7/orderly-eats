const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Configurações
  getConfig: () => ipcRenderer.invoke('get-config'),
  saveConfig: (config) => ipcRenderer.invoke('save-config', config),
  
  // Impressoras
  getPrinters: () => ipcRenderer.invoke('get-printers'),
  testPrint: () => ipcRenderer.invoke('test-print'),
  
  // Status
  getStats: () => ipcRenderer.invoke('get-stats'),
  reconnect: () => ipcRenderer.invoke('reconnect'),
  
  // Eventos do main process
  onConnectionStatus: (callback) => {
    ipcRenderer.on('connection-status', (event, data) => callback(data));
  },
  onLog: (callback) => {
    ipcRenderer.on('log', (event, data) => callback(data));
  },
  onPrintSuccess: (callback) => {
    ipcRenderer.on('print-success', (event, data) => callback(data));
  },
  onStats: (callback) => {
    ipcRenderer.on('stats', (event, data) => callback(data));
  },
});
