const { app, BrowserWindow, Tray, Menu, ipcMain, nativeImage, shell } = require('electron');
const path = require('path');
const Store = require('electron-store');
const { createClient } = require('@supabase/supabase-js');
const PrinterService = require('./services/printer');

// Default layout configuration (will be overridden by database settings)
const defaultLayout = {
  paperSize: '80mm',
  paperWidth: 48,
  showLogo: false,
  showRestaurantName: true,
  showAddress: false,
  showPhone: false,
  showCnpj: false,
  receiptTitle: '*** PEDIDO ***',
  showOrderNumber: true,
  showOrderType: true,
  showTable: true,
  showWaiter: true,
  showItemPrices: true,
  showItemNotes: true,
  showItemSize: true,
  showCustomerName: true,
  showCustomerPhone: true,
  showDeliveryAddress: true,
  showDateTime: true,
  showTotals: true,
  showDeliveryFee: true,
  showPaymentMethod: true,
  footerMessage: 'Obrigado pela preferência!',
  fontSize: 'normal',
  boldItems: true,
  boldTotal: true,
};

// Cached restaurant info and layout
let cachedRestaurantInfo = null;
let cachedPrintLayout = null;
let cachedDbPrinters = [];

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
    // Impressoras por tipo de pedido
    printers: {
      table: '',      // Impressora para pedidos de mesa
      counter: '',    // Impressora para pedidos de balcão
      delivery: '',   // Impressora para pedidos de delivery
      default: '',    // Impressora padrão (fallback)
    },
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
    
    // Sync available printers to database
    await syncAvailablePrinters();
    
    startOrderMonitoring();
    
    return true;
  } catch (error) {
    isConnected = false;
    sendToRenderer('connection-status', { connected: false, message: error.message });
    updateTrayMenu();
    return false;
  }
}

/**
 * Sync available system printers to database for web app selection
 */
async function syncAvailablePrinters() {
  const restaurantId = store.get('restaurantId');
  if (!restaurantId || !supabase) return;

  try {
    // Get system printers using Electron API
    let systemPrinters = [];
    if (mainWindow && mainWindow.webContents) {
      systemPrinters = mainWindow.webContents.getPrintersAsync 
        ? await mainWindow.webContents.getPrintersAsync()
        : mainWindow.webContents.getPrinters();
    }

    if (systemPrinters.length === 0) {
      sendToRenderer('log', 'Nenhuma impressora do sistema encontrada');
      return;
    }

    sendToRenderer('log', `Sincronizando ${systemPrinters.length} impressora(s) com o servidor...`);

    // Upsert each printer
    for (const printer of systemPrinters) {
      const { error } = await supabase
        .from('available_printers')
        .upsert({
          restaurant_id: restaurantId,
          printer_name: printer.name,
          display_name: printer.displayName || printer.name,
          driver_name: printer.description || null,
          port_name: null,
          is_default: printer.isDefault || false,
          last_seen_at: new Date().toISOString(),
        }, {
          onConflict: 'restaurant_id,printer_name',
        });

      if (error) {
        console.error('Error syncing printer:', printer.name, error);
      }
    }

    sendToRenderer('log', `✓ Impressoras sincronizadas com sucesso`);
  } catch (error) {
    sendToRenderer('log', `Erro ao sincronizar impressoras: ${error.message}`);
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
  if (!isConnected) return;

  const restaurantId = store.get('restaurantId');
  if (!restaurantId) return;

  try {
    // Fetch restaurant info and layout if not cached
    if (!cachedRestaurantInfo || !cachedPrintLayout) {
      await refreshRestaurantConfig(restaurantId);
    }

    const supabaseUrl = store.get('supabaseUrl');
    
    // Use edge function to fetch orders (bypasses RLS)
    const response = await fetch(
      `${supabaseUrl}/functions/v1/printer-orders?restaurant_id=${restaurantId}&action=get`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'apikey': store.get('supabaseKey'),
        },
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    const orders = data.orders || [];

    if (orders.length > 0) {
      sendToRenderer('log', `Encontrados ${orders.length} pedidos para imprimir`);
      
      for (const order of orders) {
        await printOrderToAllPrinters(order, cachedDbPrinters || []);
      }
    }
  } catch (error) {
    sendToRenderer('log', `Erro ao buscar pedidos: ${error.message}`);
  }
}

/**
 * Fetch and cache restaurant info and print layout via Edge Function
 */
async function refreshRestaurantConfig(restaurantId) {
  try {
    const supabaseUrl = store.get('supabaseUrl');
    
    // Use edge function to bypass RLS
    const response = await fetch(
      `${supabaseUrl}/functions/v1/printer-config?restaurant_id=${restaurantId}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'apikey': store.get('supabaseKey'),
        },
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    if (data.restaurant) {
      cachedRestaurantInfo = data.restaurant;
    }

    if (data.settings?.printLayout) {
      cachedPrintLayout = { ...defaultLayout, ...data.settings.printLayout };
    } else {
      cachedPrintLayout = defaultLayout;
    }

    // Cache printers from config
    if (data.printers) {
      cachedDbPrinters = data.printers;
    }

    sendToRenderer('log', `✓ Configurações carregadas: ${cachedRestaurantInfo?.name || 'N/A'}`);
  } catch (error) {
    sendToRenderer('log', `Erro ao carregar config: ${error.message}`);
    cachedPrintLayout = defaultLayout;
  }
}

/**
 * Get the appropriate local printer for an order based on its type (fallback)
 */
function getLocalPrinterForOrder(order) {
  const printers = store.get('printers') || {};
  const orderType = order.order_type || 'counter';
  
  // Try to get printer for specific order type
  const printerName = printers[orderType] || printers.default || store.get('printerName') || '';
  
  return printerName;
}

/**
 * Get order type label in Portuguese
 */
function getOrderTypeLabel(orderType) {
  const labels = {
    table: 'Mesa',
    counter: 'Balcão',
    delivery: 'Delivery',
  };
  return labels[orderType] || orderType;
}

/**
 * Print order to all matching printers based on order type and categories
 */
async function printOrderToAllPrinters(order, dbPrinters) {
  const orderType = order.order_type || 'counter';
  
  // If no database printers, use local config
  if (!dbPrinters || dbPrinters.length === 0) {
    const success = await printOrder(order, getLocalPrinterForOrder(order), null, true);
    return success;
  }

  // Find printers that match this order type
  const matchingPrinters = dbPrinters.filter(printer => {
    const linkedTypes = printer.linked_order_types || ['counter', 'table', 'delivery'];
    return linkedTypes.includes(orderType);
  });

  if (matchingPrinters.length === 0) {
    // Fallback to local config
    const success = await printOrder(order, getLocalPrinterForOrder(order), null, true);
    return success;
  }

  sendToRenderer('log', `Imprimindo pedido #${order.id.slice(0, 8)} (${getOrderTypeLabel(orderType)}) em ${matchingPrinters.length} impressora(s)...`);

  let anyPrinted = false;
  let printersWithItems = 0;

  // Print to each matching printer
  for (const printer of matchingPrinters) {
    const printerName = printer.printer_name || getLocalPrinterForOrder(order);
    const linkedCategories = printer.linked_categories;
    
    // If printer has category filter, filter items
    let itemsToPrint = order.order_items;
    if (linkedCategories && linkedCategories.length > 0) {
      itemsToPrint = order.order_items.filter(item => {
        const categoryId = item.products?.category_id;
        return categoryId && linkedCategories.includes(categoryId);
      });
      
      // Skip if no items match this printer's categories
      if (itemsToPrint.length === 0) {
        sendToRenderer('log', `  → "${printer.name}": nenhum item desta categoria`);
        continue;
      }
    }

    printersWithItems++;
    sendToRenderer('log', `  → "${printer.name}": ${itemsToPrint.length} item(s)`);
    
    // Create a copy of order with filtered items
    const orderForPrinter = { ...order, order_items: itemsToPrint };
    
    // Only update order status on last printer
    const isLast = printersWithItems === matchingPrinters.length;
    const success = await printOrder(orderForPrinter, printerName, printer, isLast && !anyPrinted);
    
    if (success) anyPrinted = true;
  }

  // If we had printers but none had matching items, still mark as printed
  if (printersWithItems === 0 && matchingPrinters.length > 0) {
    sendToRenderer('log', `  → Nenhuma impressora com itens correspondentes, marcando como impresso`);
    await markOrderPrinted(order);
  }

  return anyPrinted || printersWithItems === 0;
}

/**
 * Mark order as printed in database via Edge Function
 */
async function markOrderPrinted(order) {
  try {
    const supabaseUrl = store.get('supabaseUrl');
    const restaurantId = store.get('restaurantId');
    
    await fetch(
      `${supabaseUrl}/functions/v1/printer-orders?restaurant_id=${restaurantId}&action=mark-printed`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': store.get('supabaseKey'),
        },
        body: JSON.stringify({ order_ids: [order.id] }),
      }
    );
  } catch (error) {
    sendToRenderer('log', `Erro ao marcar pedido como impresso: ${error.message}`);
  }
}

async function printOrder(order, printerName = '', dbPrinter = null, shouldUpdateStatus = true) {
  const orderType = order.order_type || 'counter';
  
  // Use provided printerName or fallback to local config
  if (!printerName) {
    printerName = getLocalPrinterForOrder(order);
  }
  
  try {
    // Use cached layout from database, or fallback to default
    const layout = cachedPrintLayout || defaultLayout;
    const restaurantInfo = cachedRestaurantInfo || { name: 'Restaurante', phone: null, address: null, cnpj: null };
    
    const success = await printerService.printOrder(order, {
      layout,
      restaurantInfo,
      printerName,
    });

    if (success) {
      // Only update order status if requested
      if (shouldUpdateStatus) {
        await markOrderPrinted(order);
      }

      // Log success
      try {
        await supabase.from('print_logs').insert({
          restaurant_id: store.get('restaurantId'),
          order_id: order.id,
          order_number: order.order_number?.toString() || order.id.slice(0, 8),
          event_type: 'auto_print',
          status: 'success',
          printer_name: dbPrinter?.name || printerName || 'default',
          items_count: order.order_items?.length || 0,
        });
      } catch (logError) {
        console.error('Error logging print success:', logError);
      }

      printedCount++;
      updateTrayMenu();
      sendToRenderer('print-success', { orderId: order.id, orderType });
      sendToRenderer('stats', { printedCount });
      sendToRenderer('log', `✓ Pedido #${order.id.slice(0, 8)} impresso com sucesso`);
      
      // Play sound notification
      if (store.get('soundNotification')) {
        // Sound will be played by the renderer
      }
      
      return true;
    }
    return false;
  } catch (error) {
    sendToRenderer('log', `✗ Erro ao imprimir pedido: ${error.message}`);
    
    try {
      await supabase.from('print_logs').insert({
        restaurant_id: store.get('restaurantId'),
        order_id: order.id,
        order_number: order.order_number?.toString() || order.id.slice(0, 8),
        event_type: 'auto_print',
        status: 'error',
        error_message: error.message,
        printer_name: dbPrinter?.name || printerName || 'default',
        items_count: order.order_items?.length || 0,
      });
    } catch (logError) {
      console.error('Error logging print failure:', logError);
    }
    
    return false;
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
    printers: store.get('printers') || { table: '', counter: '', delivery: '', default: '' },
  };
});

ipcMain.handle('save-printers', async (event, printers) => {
  store.set('printers', printers);
  return { success: true };
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
