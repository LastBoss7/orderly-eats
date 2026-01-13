const { app, BrowserWindow, Tray, Menu, ipcMain, nativeImage, shell } = require('electron');
const path = require('path');
const Store = require('electron-store');
const { createClient } = require('@supabase/supabase-js');
const PrinterService = require('./services/printer');

// Default layout configuration
const defaultLayout = {
  paperSize: '58mm',
  paperWidth: 48,
  showLogo: false,
  logoData: null,
  showRestaurantName: true,
  showAddress: false,
  showPhone: false,
  showCnpj: false,
  receiptTitle: '*** PEDIDO ***',
  showOrderNumber: true,
  showOrderType: true,
  showTable: true,
  showItemPrices: true,
  showItemNotes: true,
  showCustomerName: true,
  showCustomerPhone: true,
  showDeliveryAddress: true,
  showDateTime: true,
  showTotals: true,
  showDeliveryFee: true,
  footerMessage: 'Obrigado pela preferência!',
  fontSize: 12,
  boldTotal: true,
};

// Configuração persistente
const store = new Store({
  defaults: {
    supabaseUrl: 'https://ueddnccouuevidwrcjaa.supabase.co',
    supabaseKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVlZGRuY2NvdXVldmlkd3JjamFhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgxNjc1ODcsImV4cCI6MjA4Mzc0MzU4N30.tBeOzLyv4qcjb5wySPJWgCR7Fjzk0PEtLPxX9jp99ZI',
    restaurantId: '',
    printerName: '',
    checkInterval: 5,
    autoStart: false,
    minimizeToTray: true,
    soundNotification: true,
    layout: defaultLayout,
  }
});

let mainWindow = null;
let tray = null;
let supabase = null;
let printerService = null;
let checkInterval = null;
let isConnected = false;
let printedCount = 0;

// Prevenir múltiplas instâncias
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
}

app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  }
});

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 420,
    height: 500,
    minWidth: 400,
    minHeight: 450,
    maxWidth: 500,
    maxHeight: 600,
    resizable: true,
    frame: true,
    icon: path.join(__dirname, '../assets/icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Remove menu bar
  mainWindow.setMenuBarVisibility(false);

  mainWindow.loadFile(path.join(__dirname, 'renderer/index.html'));

  mainWindow.on('close', (event) => {
    if (store.get('minimizeToTray') && !app.isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

function createTray() {
  const iconPath = path.join(__dirname, '../assets/tray-icon.png');
  let icon;
  
  try {
    icon = nativeImage.createFromPath(iconPath);
    icon = icon.resize({ width: 16, height: 16 });
  } catch (e) {
    // Fallback if icon doesn't exist
    icon = nativeImage.createEmpty();
  }
  
  tray = new Tray(icon);
  updateTrayMenu();
  tray.setToolTip('Impressora de Pedidos');
  
  tray.on('double-click', () => {
    mainWindow.show();
    mainWindow.focus();
  });
}

function updateTrayMenu() {
  if (!tray) return;
  
  const contextMenu = Menu.buildFromTemplate([
    { 
      label: 'Abrir', 
      click: () => {
        mainWindow.show();
        mainWindow.focus();
      }
    },
    { 
      label: isConnected ? '● Conectado' : '○ Desconectado',
      enabled: false 
    },
    { type: 'separator' },
    { 
      label: `Pedidos impressos: ${printedCount}`,
      enabled: false 
    },
    { type: 'separator' },
    { 
      label: 'Sair', 
      click: () => {
        app.isQuitting = true;
        app.quit();
      }
    }
  ]);
  
  tray.setContextMenu(contextMenu);
}

async function initializeSupabase() {
  const url = store.get('supabaseUrl');
  const key = store.get('supabaseKey');
  
  if (!url || !key) {
    sendToRenderer('connection-status', { connected: false, message: 'Configure as credenciais' });
    return false;
  }

  try {
    supabase = createClient(url, key);
    
    const { error } = await supabase.from('orders').select('id').limit(1);
    
    if (error) throw error;
    
    isConnected = true;
    sendToRenderer('connection-status', { connected: true, message: 'Conectado' });
    updateTrayMenu();
    
    startOrderMonitoring();
    
    return true;
  } catch (error) {
    isConnected = false;
    sendToRenderer('connection-status', { connected: false, message: error.message });
    updateTrayMenu();
    return false;
  }
}

function startOrderMonitoring() {
  if (checkInterval) {
    clearInterval(checkInterval);
  }

  const interval = (store.get('checkInterval') || 5) * 1000;
  
  checkInterval = setInterval(async () => {
    await checkPendingOrders();
  }, interval);

  checkPendingOrders();
}

async function checkPendingOrders() {
  if (!supabase || !isConnected) return;

  const restaurantId = store.get('restaurantId');
  if (!restaurantId) return;

  try {
    const { data: orders, error } = await supabase
      .from('orders')
      .select(`
        *,
        order_items (*)
      `)
      .eq('restaurant_id', restaurantId)
      .eq('print_status', 'pending')
      .order('created_at', { ascending: true });

    if (error) throw error;

    if (orders && orders.length > 0) {
      sendToRenderer('log', `Encontrados ${orders.length} pedidos para imprimir`);
      
      for (const order of orders) {
        await printOrder(order);
      }
    }
  } catch (error) {
    sendToRenderer('log', `Erro ao buscar pedidos: ${error.message}`);
  }
}

async function printOrder(order) {
  try {
    sendToRenderer('log', `Imprimindo pedido #${order.id.slice(0, 8)}...`);
    
    const layout = store.get('layout') || defaultLayout;
    
    const success = await printerService.printOrder(order, {
      layout,
      printerName: store.get('printerName'),
    });

    if (success) {
      await supabase
        .from('orders')
        .update({ 
          print_status: 'printed',
          printed_at: new Date().toISOString(),
          print_count: (order.print_count || 0) + 1
        })
        .eq('id', order.id);

      printedCount++;
      updateTrayMenu();
      sendToRenderer('print-success', { orderId: order.id });
      sendToRenderer('stats', { printedCount });
      sendToRenderer('log', `✓ Pedido #${order.id.slice(0, 8)} impresso com sucesso`);
      
      // Play sound notification
      if (store.get('soundNotification')) {
        // Sound will be played by the renderer
      }
    }
  } catch (error) {
    sendToRenderer('log', `✗ Erro ao imprimir pedido: ${error.message}`);
    
    try {
      await supabase.from('print_logs').insert({
        restaurant_id: store.get('restaurantId'),
        order_id: order.id,
        event_type: 'print_error',
        status: 'error',
        error_message: error.message,
        printer_name: store.get('printerName') || 'default',
      });
    } catch (logError) {
      console.error('Error logging print failure:', logError);
    }
  }
}

function sendToRenderer(channel, data) {
  if (mainWindow && mainWindow.webContents) {
    mainWindow.webContents.send(channel, data);
  }
}

// IPC Handlers
ipcMain.handle('get-config', () => {
  return {
    supabaseUrl: store.get('supabaseUrl'),
    supabaseKey: store.get('supabaseKey'),
    restaurantId: store.get('restaurantId'),
    printerName: store.get('printerName'),
    checkInterval: store.get('checkInterval'),
    autoStart: store.get('autoStart'),
    minimizeToTray: store.get('minimizeToTray'),
    soundNotification: store.get('soundNotification'),
    useEscPos: store.get('useEscPos'),
    usbPrinter: store.get('usbPrinter'),
    autoCut: store.get('autoCut'),
    openDrawer: store.get('openDrawer'),
    layout: store.get('layout') || defaultLayout,
  };
});

ipcMain.handle('save-config', async (event, config) => {
  Object.keys(config).forEach(key => {
    if (key !== 'layout') {
      store.set(key, config[key]);
    }
  });
  
  await initializeSupabase();
  return { success: true };
});

ipcMain.handle('save-layout', async (event, layout) => {
  store.set('layout', layout);
  return { success: true };
});

ipcMain.handle('get-system-printers', async () => {
  try {
    // Use electron's built-in printer API
    const printers = mainWindow.webContents.getPrintersAsync 
      ? await mainWindow.webContents.getPrintersAsync()
      : mainWindow.webContents.getPrinters();
    
    return printers.map(p => ({
      name: p.name,
      displayName: p.displayName || p.name,
      description: p.description || '',
      status: p.status,
      isDefault: p.isDefault,
    }));
  } catch (error) {
    console.error('Error getting printers:', error);
    return [];
  }
});

ipcMain.handle('get-usb-printers', async () => {
  if (printerService.usbPrinter) {
    return printerService.usbPrinter.listPrinters();
  }
  return [];
});

ipcMain.handle('test-usb-connection', async (event, vendorId, productId) => {
  try {
    await printerService.connectUSB(vendorId, productId);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('test-print', async () => {
  try {
    const layout = store.get('layout') || defaultLayout;
    const useEscPos = store.get('useEscPos');
    const usbPrinter = store.get('usbPrinter');
    
    let printerInfo = null;
    if (useEscPos && usbPrinter) {
      const [vendorId, productId] = usbPrinter.split(':');
      printerInfo = { type: 'usb', vendorId, productId };
    }
    
    await printerService.printTest({
      layout,
      printerName: store.get('printerName'),
      useEscPos,
      printerInfo,
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('test-print-layout', async (event, layout) => {
  try {
    const useEscPos = store.get('useEscPos');
    const usbPrinter = store.get('usbPrinter');
    
    let printerInfo = null;
    if (useEscPos && usbPrinter) {
      const [vendorId, productId] = usbPrinter.split(':');
      printerInfo = { type: 'usb', vendorId, productId };
    }
    
    await printerService.printTestWithLayout({
      layout,
      printerName: store.get('printerName'),
      useEscPos,
      printerInfo,
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-stats', () => {
  return { printedCount, isConnected };
});

ipcMain.handle('reconnect', async () => {
  return await initializeSupabase();
});

ipcMain.handle('test-print', async () => {
  try {
    const layout = store.get('layout') || defaultLayout;
    await printerService.printTest({
      layout,
      printerName: store.get('printerName'),
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('test-print-layout', async (event, layout) => {
  try {
    await printerService.printTestWithLayout({
      layout,
      printerName: store.get('printerName'),
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-stats', () => {
  return {
    printedCount,
    isConnected,
  };
});

ipcMain.handle('reconnect', async () => {
  return await initializeSupabase();
});

ipcMain.handle('app-quit', () => {
  app.isQuitting = true;
  app.quit();
});

// App Events
app.whenReady().then(() => {
  printerService = new PrinterService();
  createWindow();
  createTray();
  initializeSupabase();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    if (!store.get('minimizeToTray')) {
      app.quit();
    }
  }
});

app.on('before-quit', () => {
  app.isQuitting = true;
  if (checkInterval) {
    clearInterval(checkInterval);
  }
});
