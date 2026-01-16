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
  saveSelectedPrinters: (printers) => ipcRenderer.invoke('save-selected-printers', printers),
  
  // Network Printers (TCP/IP Port 9100)
  testNetworkPrinter: (ip, port) => ipcRenderer.invoke('test-network-printer', ip, port),
  testNetworkPrint: (ip, port) => ipcRenderer.invoke('test-network-print', ip, port),
  scanNetworkPrinters: () => ipcRenderer.invoke('scan-network-printers'),
  
  // Print Tests
  testPrint: (mode) => ipcRenderer.invoke('test-print', mode || 'auto'),
  testUsbDirect: () => ipcRenderer.invoke('test-usb-direct'),
  clearPendingOrders: () => ipcRenderer.invoke('clear-pending-orders'),
  
  // Stats & Status
  getStats: () => ipcRenderer.invoke('get-stats'),
  reconnect: () => ipcRenderer.invoke('reconnect'),
  refreshConfig: () => ipcRenderer.invoke('refresh-config'),
  
  // App control
  quit: () => ipcRenderer.invoke('app-quit'),
  
  // Event listeners
  onConnectionStatus: (callback) => ipcRenderer.on('connection-status', callback),
  onLog: (callback) => ipcRenderer.on('log', callback),
  onPrintSuccess: (callback) => ipcRenderer.on('print-success', callback),
  onStats: (callback) => ipcRenderer.on('stats', callback),
});
