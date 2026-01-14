const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Config
  getConfig: () => ipcRenderer.invoke('get-config'),
  saveConfig: (config) => ipcRenderer.invoke('save-config', config),
  
  // Printers
  getSystemPrinters: () => ipcRenderer.invoke('get-system-printers'),
  getUSBPrinters: () => ipcRenderer.invoke('get-usb-printers'),
  testUSBConnection: (vendorId, productId) => ipcRenderer.invoke('test-usb-connection', vendorId, productId),
  savePrinters: (printers) => ipcRenderer.invoke('save-printers', printers),
  saveLayout: (layout) => ipcRenderer.invoke('save-layout', layout),
  
  // Print
  testPrint: () => ipcRenderer.invoke('test-print'),
  testPrintLayout: (layout) => ipcRenderer.invoke('test-print-layout', layout),
  
  // Stats & Status
  getStats: () => ipcRenderer.invoke('get-stats'),
  reconnect: () => ipcRenderer.invoke('reconnect'),
  
  // App control
  quit: () => ipcRenderer.invoke('app-quit'),
  
  // Event listeners
  onConnectionStatus: (callback) => ipcRenderer.on('connection-status', callback),
  onLog: (callback) => ipcRenderer.on('log', callback),
  onPrintSuccess: (callback) => ipcRenderer.on('print-success', callback),
  onStats: (callback) => ipcRenderer.on('stats', callback),
});
