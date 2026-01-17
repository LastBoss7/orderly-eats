const { app, BrowserWindow, Tray, Menu, ipcMain, nativeImage, shell } = require('electron');
const path = require('path');
const Store = require('electron-store');
const { createClient } = require('@supabase/supabase-js');
const PrinterService = require('./services/printer');

/**
 * GAMAKO PRINT SERVICE - Professional Thermal Printing
 * 
 * This app monitors Supabase for pending orders and prints them automatically.
 * Similar to iFood, Saipos, Anota AI printing apps.
 */

// Default layout configuration (will be overridden by database settings)
// IMPORTANT: paperWidth should match your thermal printer
// - 58mm paper: use 32 characters per line
// - 80mm paper: use 42-48 characters per line
const defaultLayout = {
  paperSize: '80mm',
  paperWidth: 48, // 32 for 58mm, 42-48 for 80mm
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
  footerMessage: 'Obrigado pela preferencia!',
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
let heartbeatInterval = null;
let isConnected = false;
let printedCount = 0;
let isPrinting = false;
let pendingOrdersCount = 0;
const clientId = require('crypto').randomBytes(8).toString('hex');

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
  const iconPath = path.join(__dirname, '../assets/icon.png');
  let icon;
  
  try {
    icon = nativeImage.createFromPath(iconPath);
    // Resize for tray (16x16 on Windows, 22x22 on macOS)
    const isWin = process.platform === 'win32';
    icon = icon.resize({ width: isWin ? 16 : 22, height: isWin ? 16 : 22 });
  } catch (e) {
    // Fallback if icon doesn't exist
    console.error('Failed to load tray icon:', e);
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
    
    // Start heartbeat system
    startHeartbeat();
    
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
 * Sync available system printers to database via Edge Function (bypasses RLS)
 */
async function syncAvailablePrinters() {
  const restaurantId = store.get('restaurantId');
  const supabaseUrl = store.get('supabaseUrl');
  const supabaseKey = store.get('supabaseKey');
  
  if (!restaurantId || !supabaseUrl) {
    sendToRenderer('log', '⚠ Configuração incompleta para sincronizar impressoras');
    return;
  }

  try {
    // Get system printers using Electron API
    let systemPrinters = [];
    if (mainWindow && mainWindow.webContents) {
      systemPrinters = mainWindow.webContents.getPrintersAsync 
        ? await mainWindow.webContents.getPrintersAsync()
        : mainWindow.webContents.getPrinters();
    }

    if (systemPrinters.length === 0) {
      sendToRenderer('log', '⚠ Nenhuma impressora do sistema encontrada');
      return;
    }

    sendToRenderer('log', `🖨️ Sincronizando ${systemPrinters.length} impressora(s) com o servidor...`);

    // Format printers for the edge function
    const printersData = systemPrinters.map(printer => ({
      name: printer.name,
      displayName: printer.displayName || printer.name,
      description: printer.description || null,
      isDefault: printer.isDefault || false,
    }));

    // Use edge function to sync (bypasses RLS)
    const response = await fetch(
      `${supabaseUrl}/functions/v1/printer-sync?restaurant_id=${restaurantId}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseKey}`,
          'apikey': supabaseKey,
        },
        body: JSON.stringify({
          printers: printersData,
          clientId: clientId,
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    const result = await response.json();
    
    if (result.success) {
      sendToRenderer('log', `✓ ${result.synced} impressora(s) sincronizadas`);
      if (result.registered > 0) {
        sendToRenderer('log', `✓ ${result.registered} nova(s) impressora(s) cadastrada(s)`);
      }
      if (result.errors && result.errors.length > 0) {
        sendToRenderer('log', `⚠ ${result.errors.length} erro(s) durante sincronização`);
      }
    } else {
      throw new Error(result.error || 'Falha ao sincronizar');
    }
  } catch (error) {
    sendToRenderer('log', `✗ Erro ao sincronizar impressoras: ${error.message}`);
    console.error('Printer sync error:', error);
  }
}

/**
 * Send heartbeat to server to indicate client is alive
 */
let heartbeatRetryCount = 0;
const MAX_HEARTBEAT_RETRIES = 3;

async function sendHeartbeat() {
  const restaurantId = store.get('restaurantId');
  if (!restaurantId || !supabase) return;

  try {
    // Get current printers count
    let printersCount = 0;
    if (mainWindow && mainWindow.webContents) {
      const printers = mainWindow.webContents.getPrintersAsync 
        ? await mainWindow.webContents.getPrintersAsync()
        : mainWindow.webContents.getPrinters();
      printersCount = printers.length;
    }

    const { error } = await supabase
      .from('printer_heartbeats')
      .upsert({
        restaurant_id: restaurantId,
        client_id: clientId,
        client_name: 'Impressora de Pedidos',
        client_version: app.getVersion ? app.getVersion() : '1.0.0',
        platform: process.platform,
        last_heartbeat_at: new Date().toISOString(),
        is_printing: isPrinting,
        pending_orders: pendingOrdersCount,
        printers_count: printersCount,
      }, {
        onConflict: 'restaurant_id,client_id',
      });

    if (error) {
      console.error('Heartbeat error:', error);
      heartbeatRetryCount++;
      if (heartbeatRetryCount >= MAX_HEARTBEAT_RETRIES) {
        sendToRenderer('log', `⚠ Falha ao enviar heartbeat: ${error.message}`);
      }
    } else {
      heartbeatRetryCount = 0;
    }
  } catch (error) {
    console.error('Heartbeat exception:', error);
  }
}

function startHeartbeat() {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
  }

  // Send heartbeat every 10 seconds
  heartbeatInterval = setInterval(sendHeartbeat, 10000);
  
  // Send initial heartbeat
  sendHeartbeat();
  sendToRenderer('log', '♥ Sistema de heartbeat iniciado');
}

function stopHeartbeat() {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }
}

// Track orders currently being printed to prevent duplicates
const printingOrders = new Set();

// Lock to prevent concurrent checkPendingOrders calls
let isCheckingOrders = false;

// Track last config refresh time
let lastConfigRefresh = 0;
const CONFIG_REFRESH_INTERVAL = 60000; // Refresh config every 60 seconds

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
  // Prevent concurrent execution
  if (isCheckingOrders) return;
  if (!isConnected) return;

  const restaurantId = store.get('restaurantId');
  if (!restaurantId) {
    // Silently skip - no restaurant configured
    return;
  }

  isCheckingOrders = true;

  try {
    const now = Date.now();
    
    // Refresh restaurant config periodically or if not cached
    if (!cachedRestaurantInfo || !cachedPrintLayout || (now - lastConfigRefresh > CONFIG_REFRESH_INTERVAL)) {
      await refreshRestaurantConfig(restaurantId);
      lastConfigRefresh = now;
    }

    const supabaseUrl = store.get('supabaseUrl');
    const supabaseKey = store.get('supabaseKey');
    
    if (!supabaseUrl || !supabaseKey) {
      console.log('[CheckOrders] Missing Supabase config');
      return;
    }
    
    // Use edge function to fetch orders (bypasses RLS)
    const response = await fetch(
      `${supabaseUrl}/functions/v1/printer-orders?restaurant_id=${restaurantId}&action=get`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new Error(`HTTP ${response.status}: ${errorText || response.statusText}`);
    }

    const data = await response.json();
    const orders = data.orders || [];

    // Update pending orders count for heartbeat
    pendingOrdersCount = orders.length;

    if (orders.length > 0) {
      // Filter out orders already being printed (using Set)
      const newOrders = orders.filter(order => !printingOrders.has(order.id));
      
      if (newOrders.length > 0) {
        sendToRenderer('log', `📋 ${newOrders.length} pedido(s) pendente(s)`);
        
        // Process orders ONE AT A TIME to avoid race conditions
        for (const order of newOrders) {
          // Double-check not already processing
          if (printingOrders.has(order.id)) continue;
          
          // Mark as being printed IMMEDIATELY
          printingOrders.add(order.id);
          isPrinting = true;
          
          try {
            const orderLabel = `#${order.order_number || order.id.slice(0, 8)}`;
            sendToRenderer('log', `🖨️ Imprimindo pedido ${orderLabel}...`);
            
            const success = await printOrderToAllPrinters(order, cachedDbPrinters || []);
            
            if (success) {
              sendToRenderer('log', `✓ Pedido ${orderLabel} impresso!`);
            }
          } catch (err) {
            sendToRenderer('log', `✗ Erro: ${err.message}`);
            console.error('[CheckOrders] Print error:', err);
          }
          
          isPrinting = false;
          
          // Keep in set for 30 seconds to prevent re-processing
          setTimeout(() => {
            printingOrders.delete(order.id);
          }, 30000);
        }
      }
    }
  } catch (error) {
    // Only show error if it's not a network timeout
    if (!error.message.includes('timeout') && !error.message.includes('ECONNREFUSED')) {
      sendToRenderer('log', `⚠ ${error.message}`);
    }
    console.error('[CheckOrders] Error:', error.message);
  } finally {
    isCheckingOrders = false;
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

    if (data.settings?.printLayout && Object.keys(data.settings.printLayout).length > 0) {
      cachedPrintLayout = { ...defaultLayout, ...data.settings.printLayout };
      sendToRenderer('log', `✓ Layout de impressão carregado do servidor (${cachedPrintLayout.paperSize}, ${cachedPrintLayout.paperWidth} colunas)`);
    } else {
      cachedPrintLayout = defaultLayout;
      sendToRenderer('log', `ℹ Usando layout padrão (nenhum salvo no servidor)`);
    }

    // Cache printers from config
    if (data.printers) {
      cachedDbPrinters = data.printers;
      sendToRenderer('log', `✓ ${data.printers.length} impressora(s) configurada(s) no servidor`);
    }

    sendToRenderer('log', `✓ Restaurante: ${cachedRestaurantInfo?.name || 'N/A'}`);
  } catch (error) {
    sendToRenderer('log', `Erro ao carregar config: ${error.message}`);
    cachedPrintLayout = defaultLayout;
  }
}

/**
 * Get the appropriate local printer for an order based on its type (fallback)
 * Priority: 1. Order type specific printer, 2. Default printer, 3. First selected printer
 */
function getLocalPrinterForOrder(order) {
  const printers = store.get('printers') || {};
  const selectedPrinters = store.get('selectedPrinters') || [];
  const orderType = order?.order_type || 'counter';
  
  // Try order-type specific printer first
  if (printers[orderType]) {
    return printers[orderType];
  }
  
  // Then try default
  if (printers.default) {
    return printers.default;
  }
  
  // Then printerName setting
  const printerName = store.get('printerName');
  if (printerName) {
    return printerName;
  }
  
  // Finally, use first selected printer
  if (selectedPrinters.length > 0) {
    return selectedPrinters[0];
  }
  
  return '';
}

/**
 * Get order type label in Portuguese
 */
function getOrderTypeLabel(orderType) {
  const labels = {
    table: 'Mesa',
    counter: 'Balcão',
    delivery: 'Delivery',
    conference: 'Conferência',
  };
  return labels[orderType] || orderType;
}

/**
 * Print order - Simplified and robust
 */
async function printOrderToAllPrinters(order, dbPrinters) {
  const orderType = order.order_type || 'counter';
  const orderNum = order.order_number || order.id?.slice(0, 8) || '?';
  const orderLabel = `#${orderNum}`;
  
  // Determine which printer to use
  // Priority: 1. DB printers that match order type, 2. Local config, 3. First available
  let printerName = '';
  let printerConfig = null;
  
  // Check DB printers first
  if (dbPrinters && dbPrinters.length > 0) {
    // Find printer matching order type
    const matching = dbPrinters.find(p => {
      const types = p.linked_order_types || ['counter', 'table', 'delivery'];
      return types.includes(orderType);
    });
    
    if (matching && matching.printer_name) {
      printerName = matching.printer_name;
      printerConfig = matching;
    } else if (dbPrinters[0]?.printer_name) {
      // Fallback to first DB printer
      printerName = dbPrinters[0].printer_name;
      printerConfig = dbPrinters[0];
    }
  }
  
  // Fallback to local config
  if (!printerName) {
    printerName = getLocalPrinterForOrder(order);
  }
  
  // Final check
  if (!printerName) {
    sendToRenderer('log', `✗ ${orderLabel}: Nenhuma impressora configurada!`);
    return false;
  }
  
  console.log(`[PrintOrder] ${orderLabel} -> ${printerName}`);
  
  // Build layout
  const baseLayout = cachedPrintLayout || defaultLayout;
  const layout = printerConfig?.paper_width 
    ? { ...baseLayout, paperWidth: printerConfig.paper_width }
    : baseLayout;
  const restaurantInfo = cachedRestaurantInfo || { name: '', phone: '', address: '', cnpj: '' };
  
  try {
    // Print!
    const success = await printerService.printOrder(order, {
      layout,
      restaurantInfo,
      printerName,
    });
    
    if (success) {
      // Mark as printed
      await markOrderPrinted(order);
      
      // Update stats
      printedCount++;
      updateTrayMenu();
      sendToRenderer('print-success', { orderId: order.id, orderType });
      sendToRenderer('stats', { printedCount });
      
      // Log success
      try {
        await supabase?.from('print_logs').insert({
          restaurant_id: store.get('restaurantId'),
          order_id: order.id,
          order_number: String(orderNum),
          event_type: 'auto_print',
          status: 'success',
          printer_name: printerName,
          items_count: order.order_items?.length || 0,
        });
      } catch (e) {
        // Ignore log errors
      }
      
      return true;
    } else {
      sendToRenderer('log', `✗ ${orderLabel}: Impressão falhou`);
      return false;
    }
  } catch (error) {
    sendToRenderer('log', `✗ ${orderLabel}: ${error.message}`);
    console.error('[PrintOrder] Error:', error);
    
    // Log failure
    try {
      await supabase?.from('print_logs').insert({
        restaurant_id: store.get('restaurantId'),
        order_id: order.id,
        order_number: String(orderNum),
        event_type: 'auto_print',
        status: 'error',
        error_message: error.message,
        printer_name: printerName,
        items_count: order.order_items?.length || 0,
      });
    } catch (e) {
      // Ignore
    }
    
    return false;
  }
}

/**
 * Mark order as printed in database via Edge Function (bypasses RLS)
 */
async function markOrderPrinted(order) {
  const restaurantId = store.get('restaurantId');
  const supabaseUrl = store.get('supabaseUrl');
  const supabaseKey = store.get('supabaseKey');
  
  if (!supabaseUrl || !restaurantId) {
    sendToRenderer('log', `✗ Configuração incompleta, não foi possível marcar como impresso`);
    return false;
  }

  try {
    // Use edge function which has service role key and bypasses RLS
    const response = await fetch(
      `${supabaseUrl}/functions/v1/printer-orders?restaurant_id=${restaurantId}&action=mark-printed`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseKey}`,
          'apikey': supabaseKey,
        },
        body: JSON.stringify({ order_ids: [order.id] }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    const result = await response.json();
    
    if (result.success) {
      sendToRenderer('log', `✓ Pedido #${order.order_number || order.id.slice(0, 8)} marcado como impresso`);
      return true;
    } else {
      throw new Error(result.error || 'Falha desconhecida');
    }
  } catch (error) {
    sendToRenderer('log', `✗ Erro ao marcar pedido como impresso: ${error.message}`);
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
    // New simple config fields
    paperWidth: store.get('paperWidth') || 48,
    fontSize: store.get('fontSize') || 1,
    fontType: store.get('fontType') || '1',
    cnpj: store.get('cnpj') || '',
    phone: store.get('phone') || '',
    info: store.get('info') || '',
    logoUrl: store.get('logoUrl') || '',
    copies: store.get('copies') || 1,
    escpos: store.get('escpos') !== false,
    encoding: store.get('encoding') || '0',
    extraLines: store.get('extraLines') || 0,
    cutCommand: store.get('cutCommand') || '',
    cashDrawer: store.get('cashDrawer') || '',
    bold: store.get('bold') !== false,
    removeAccents: store.get('removeAccents') !== false,
    selectedPrinters: store.get('selectedPrinters') || [],
    // Network printer config
    networkIp: store.get('networkIp') || '',
    networkPort: store.get('networkPort') || 9100,
  };
});

ipcMain.handle('save-printers', async (event, printers) => {
  store.set('printers', printers);
  return { success: true };
});

ipcMain.handle('save-selected-printers', async (event, printerNames) => {
  store.set('selectedPrinters', printerNames);
  
  // Sync to database - update printers table with is_active status
  const restaurantId = store.get('restaurantId');
  if (restaurantId && supabase) {
    try {
      // Get all printers for this restaurant
      const { data: existingPrinters } = await supabase
        .from('printers')
        .select('id, printer_name')
        .eq('restaurant_id', restaurantId);
      
      if (existingPrinters) {
        // Update is_active based on selection
        for (const printer of existingPrinters) {
          const isActive = printerNames.includes(printer.printer_name);
          await supabase
            .from('printers')
            .update({ 
              is_active: isActive,
              status: isActive ? 'connected' : 'disconnected',
              last_seen_at: new Date().toISOString(),
            })
            .eq('id', printer.id);
        }
        sendToRenderer('log', `✓ Status das impressoras sincronizado com o servidor`);
      }
    } catch (error) {
      sendToRenderer('log', `Erro ao sincronizar impressoras: ${error.message}`);
    }
  }
  
  return { success: true };
});

ipcMain.handle('save-config', async (event, config) => {
  // Save all config fields
  Object.keys(config).forEach(key => {
    store.set(key, config[key]);
  });
  
  // Update layout based on new config
  const updatedLayout = {
    ...defaultLayout,
    paperWidth: config.paperWidth || 48,
    fontSize: config.fontSize === 2 ? 'large' : 'normal',
    boldItems: config.bold !== false,
    boldTotal: config.bold !== false,
  };
  store.set('layout', updatedLayout);
  
  // Update cached layout
  cachedPrintLayout = updatedLayout;
  
  // Reconnect if we have restaurant ID
  if (config.restaurantId || store.get('restaurantId')) {
    await initializeSupabase();
  }
  
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

ipcMain.handle('test-print', async (event, mode = 'auto') => {
  try {
    const configPaperWidth = store.get('paperWidth') || 48;
    const layout = {
      ...(store.get('layout') || defaultLayout),
      paperWidth: configPaperWidth,
    };
    
    sendToRenderer('log', `🖨️ TESTE DE IMPRESSÃO`);
    
    // Windows Spooler (reliable method for installed printers)
    const printerName = store.get('printerName') || '';
    const selectedPrinters = store.get('selectedPrinters') || [];
    const targetPrinter = printerName || (selectedPrinters.length > 0 ? selectedPrinters[0] : '');
    
    if (!targetPrinter) {
      sendToRenderer('log', '   ✗ Nenhuma impressora configurada!');
      sendToRenderer('log', '   → Configure uma impressora no menu principal');
      return { success: false, error: 'Nenhuma impressora configurada' };
    }
    
    sendToRenderer('log', `   → Impressora: "${targetPrinter}"`);
    sendToRenderer('log', `   → Largura: ${configPaperWidth} caracteres`);
    sendToRenderer('log', `   → Modo: Windows Spooler RAW`);
    
    const success = await printerService.printTest({
      layout,
      printerName: targetPrinter,
      useEscPos: false,
      printerInfo: null,
    });
    
    if (success) {
      sendToRenderer('log', `   ✓ Impressão enviada com sucesso!`);
      return { success: true, method: 'spooler' };
    } else {
      sendToRenderer('log', `   ✗ Falha na impressão`);
      return { success: false, error: 'Impressão falhou' };
    }
  } catch (error) {
    sendToRenderer('log', `   ✗ ERRO: ${error.message}`);
    console.error('Test print error:', error);
    return { success: false, error: error.message };
  }
});

// USB direct removed - using Windows Spooler only for reliability

// ============================================
// SYNC PRINTERS HANDLER
// ============================================

// Manually trigger printer sync
ipcMain.handle('sync-printers', async () => {
  sendToRenderer('log', `🔄 SINCRONIZANDO IMPRESSORAS...`);
  
  try {
    await syncAvailablePrinters();
    return { success: true };
  } catch (error) {
    sendToRenderer('log', `   ✗ ERRO: ${error.message}`);
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

ipcMain.handle('refresh-config', async () => {
  const restaurantId = store.get('restaurantId');
  if (!restaurantId) {
    return { success: false, error: 'Restaurant ID não configurado' };
  }
  
  try {
    // Force cache refresh
    cachedRestaurantInfo = null;
    cachedPrintLayout = null;
    cachedDbPrinters = [];
    lastConfigRefresh = 0;
    
    await refreshRestaurantConfig(restaurantId);
    
    return { 
      success: true, 
      layout: cachedPrintLayout,
      restaurant: cachedRestaurantInfo,
      printers: cachedDbPrinters.length,
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('clear-pending-orders', async () => {
  const restaurantId = store.get('restaurantId');
  if (!restaurantId) {
    return { success: false, error: 'Restaurant ID não configurado' };
  }
  
  try {
    const supabaseUrl = store.get('supabaseUrl');
    
    const response = await fetch(
      `${supabaseUrl}/functions/v1/printer-orders?restaurant_id=${restaurantId}&action=clear-pending`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': store.get('supabaseKey'),
        },
        body: JSON.stringify({}),
      }
    );
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }
    
    const result = await response.json();
    sendToRenderer('log', `✓ Fila limpa: ${result.cleared} pedido(s)`);
    return { success: true, cleared: result.cleared };
  } catch (error) {
    sendToRenderer('log', `✗ Erro ao limpar fila: ${error.message}`);
    return { success: false, error: error.message };
  }
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
  stopHeartbeat();
});
