const { app, BrowserWindow, Tray, Menu, ipcMain, nativeImage, shell } = require('electron');
const path = require('path');
const Store = require('electron-store');
const { createClient } = require('@supabase/supabase-js');
const PrinterService = require('./services/printer');

// Configuração persistente
const store = new Store({
  defaults: {
    supabaseUrl: '',
    supabaseKey: '',
    restaurantId: '',
    printerName: '',
    paperWidth: 48,
    checkInterval: 5,
    autoStart: false,
    minimizeToTray: true,
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
    width: 480,
    height: 600,
    minWidth: 400,
    minHeight: 500,
    resizable: true,
    icon: path.join(__dirname, '../assets/icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer/index.html'));

  mainWindow.on('close', (event) => {
    if (store.get('minimizeToTray') && !app.isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });

  // Abrir links externos no navegador
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

function createTray() {
  const iconPath = path.join(__dirname, '../assets/tray-icon.png');
  const icon = nativeImage.createFromPath(iconPath);
  
  tray = new Tray(icon.resize({ width: 16, height: 16 }));
  
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

  tray.setToolTip('Impressora de Pedidos');
  tray.setContextMenu(contextMenu);
  
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
    
    // Testar conexão
    const { error } = await supabase.from('orders').select('id').limit(1);
    
    if (error) throw error;
    
    isConnected = true;
    sendToRenderer('connection-status', { connected: true, message: 'Conectado' });
    updateTrayMenu();
    
    // Iniciar monitoramento de pedidos
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

  // Verificar imediatamente
  checkPendingOrders();
}

async function checkPendingOrders() {
  if (!supabase || !isConnected) return;

  const restaurantId = store.get('restaurantId');
  if (!restaurantId) return;

  try {
    // Buscar pedidos pendentes de impressão
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
    
    // Imprimir
    const success = await printerService.printOrder(order, {
      paperWidth: store.get('paperWidth'),
      printerName: store.get('printerName'),
    });

    if (success) {
      // Atualizar status no banco
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
    }
  } catch (error) {
    sendToRenderer('log', `✗ Erro ao imprimir pedido: ${error.message}`);
    
    // Registrar erro no banco
    await supabase.from('print_logs').insert({
      restaurant_id: store.get('restaurantId'),
      order_id: order.id,
      event_type: 'print_error',
      status: 'error',
      error_message: error.message,
      printer_name: store.get('printerName') || 'default',
    });
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
    paperWidth: store.get('paperWidth'),
    checkInterval: store.get('checkInterval'),
    autoStart: store.get('autoStart'),
    minimizeToTray: store.get('minimizeToTray'),
  };
});

ipcMain.handle('save-config', async (event, config) => {
  Object.keys(config).forEach(key => {
    store.set(key, config[key]);
  });
  
  // Reiniciar conexão
  await initializeSupabase();
  
  return { success: true };
});

ipcMain.handle('get-printers', async () => {
  return await printerService.getAvailablePrinters();
});

ipcMain.handle('test-print', async () => {
  try {
    await printerService.printTest({
      paperWidth: store.get('paperWidth'),
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
    // No Windows/Linux, minimizar para tray em vez de fechar
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
