// Tab Navigation
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    
    tab.classList.add('active');
    const tabId = tab.dataset.tab;
    document.getElementById(tabId).classList.add('active');
    
    // Update preview when switching to layout tab
    if (tabId === 'layout') {
      updatePreview();
    }
  });
});

// ============================================
// LOGS
// ============================================
function addLog(message, type = 'info') {
  const logPanel = document.getElementById('logPanel');
  const now = new Date().toLocaleTimeString('pt-BR');
  
  const entry = document.createElement('div');
  entry.className = `log-entry ${type}`;
  entry.innerHTML = `<span class="log-time">[${now}]</span> ${message}`;
  
  logPanel.appendChild(entry);
  logPanel.scrollTop = logPanel.scrollHeight;
  
  while (logPanel.children.length > 100) {
    logPanel.removeChild(logPanel.firstChild);
  }
}

function clearLogs() {
  const logPanel = document.getElementById('logPanel');
  logPanel.innerHTML = '<div class="log-entry info">Log limpo</div>';
}

// ============================================
// STATUS
// ============================================
function updateStatus(connected, message) {
  const statusDot = document.getElementById('statusDot');
  const statusText = document.getElementById('statusText');
  
  statusDot.className = `status-dot ${connected ? 'connected' : 'disconnected'}`;
  statusText.textContent = message || (connected ? 'Conectado' : 'Desconectado');
  
  addLog(connected ? '✓ Conectado ao sistema' : `✗ ${message}`, connected ? 'success' : 'error');
}

function updateStats(stats) {
  document.getElementById('printedCount').textContent = stats.printedCount || 0;
}

// ============================================
// CONFIG
// ============================================
let usbPrinters = [];

async function loadConfig() {
  try {
    const config = await window.electronAPI.getConfig();
    
    // Connection config
    document.getElementById('supabaseUrl').value = config.supabaseUrl || '';
    document.getElementById('supabaseKey').value = config.supabaseKey || '';
    document.getElementById('restaurantId').value = config.restaurantId || '';
    document.getElementById('printerName').value = config.printerName || '';
    document.getElementById('checkInterval').value = config.checkInterval || 5;
    document.getElementById('minimizeToTray').checked = config.minimizeToTray !== false;
    document.getElementById('autoStart').checked = config.autoStart === true;
    document.getElementById('soundNotification').checked = config.soundNotification !== false;
    document.getElementById('useEscPos').checked = config.useEscPos === true;
    document.getElementById('autoCut').checked = config.autoCut !== false;
    document.getElementById('openDrawer').checked = config.openDrawer === true;
    
    // Show correct printer section
    togglePrinterMode();
    
    // Layout config
    if (config.layout) {
      loadLayoutConfig(config.layout);
    }
    
    // Load printers list
    await loadPrinters();
    await loadUSBPrinters();
    
    // Restore USB printer selection
    if (config.usbPrinter) {
      document.getElementById('usbPrinterSelect').value = config.usbPrinter;
    }
    
    // Load stats
    const stats = await window.electronAPI.getStats();
    updateStats(stats);
    
    // Update preview
    updatePreview();
    
  } catch (error) {
    addLog('Erro ao carregar configurações: ' + error.message, 'error');
  }
}

function loadLayoutConfig(layout) {
  // Paper
  document.getElementById('layoutPaperSize').value = layout.paperSize || '58mm';
  document.getElementById('layoutWidth').value = layout.paperWidth || 48;
  document.getElementById('layoutWidthValue').textContent = layout.paperWidth || 48;
  
  // Logo
  document.getElementById('showLogo').checked = layout.showLogo === true;
  if (layout.logoData) {
    showLogoPreview(layout.logoData);
  }
  
  // Header
  document.getElementById('showRestaurantName').checked = layout.showRestaurantName !== false;
  document.getElementById('showAddress').checked = layout.showAddress === true;
  document.getElementById('showPhone').checked = layout.showPhone === true;
  document.getElementById('showCnpj').checked = layout.showCnpj === true;
  document.getElementById('receiptTitle').value = layout.receiptTitle || '*** PEDIDO ***';
  
  // Order Info
  document.getElementById('showOrderNumber').checked = layout.showOrderNumber !== false;
  document.getElementById('showOrderType').checked = layout.showOrderType !== false;
  document.getElementById('showTable').checked = layout.showTable !== false;
  document.getElementById('showItemPrices').checked = layout.showItemPrices !== false;
  document.getElementById('showItemNotes').checked = layout.showItemNotes !== false;
  
  // Customer Info
  document.getElementById('showCustomerName').checked = layout.showCustomerName !== false;
  document.getElementById('showCustomerPhone').checked = layout.showCustomerPhone !== false;
  document.getElementById('showDeliveryAddress').checked = layout.showDeliveryAddress !== false;
  
  // Footer
  document.getElementById('showDateTime').checked = layout.showDateTime !== false;
  document.getElementById('showTotals').checked = layout.showTotals !== false;
  document.getElementById('showDeliveryFee').checked = layout.showDeliveryFee !== false;
  document.getElementById('footerMessage').value = layout.footerMessage || 'Obrigado pela preferência!';
  
  // Font
  document.getElementById('fontSize').value = layout.fontSize || 12;
  document.getElementById('fontSizeValue').textContent = layout.fontSize || 12;
  document.getElementById('boldTotal').checked = layout.boldTotal !== false;
}

async function loadPrinters() {
  try {
    const printers = await window.electronAPI.getSystemPrinters();
    const select = document.getElementById('printerName');
    const currentValue = select.value;
    
    select.innerHTML = '<option value="">Padrão do Sistema</option>';
    
    printers.forEach(printer => {
      const option = document.createElement('option');
      option.value = printer;
      option.textContent = printer;
      select.appendChild(option);
    });
    
    if (currentValue) {
      select.value = currentValue;
    }
    
    document.getElementById('printerStatus').textContent = printers.length > 0 ? 'OK' : '!';
    
  } catch (error) {
    addLog('Erro ao listar impressoras: ' + error.message, 'error');
  }
}

async function loadUSBPrinters() {
  try {
    usbPrinters = await window.electronAPI.getUSBPrinters();
    const select = document.getElementById('usbPrinterSelect');
    const currentValue = select.value;
    
    select.innerHTML = '<option value="">Selecione uma impressora USB...</option>';
    
    usbPrinters.forEach(printer => {
      const option = document.createElement('option');
      option.value = `${printer.vendorId}:${printer.productId}`;
      option.textContent = printer.name;
      select.appendChild(option);
    });
    
    if (currentValue) {
      select.value = currentValue;
    }
    
    if (usbPrinters.length === 0) {
      showUSBStatus('Nenhuma impressora USB encontrada', 'warning');
    } else {
      hideUSBStatus();
    }
    
  } catch (error) {
    showUSBStatus('Erro ao listar impressoras USB: ' + error.message, 'error');
  }
}

async function refreshUSBPrinters() {
  addLog('Atualizando lista de impressoras USB...', 'info');
  await loadUSBPrinters();
  addLog(`Encontradas ${usbPrinters.length} impressoras USB`, 'info');
}

async function testUSBConnection() {
  const select = document.getElementById('usbPrinterSelect');
  const value = select.value;
  
  if (!value) {
    showUSBStatus('Selecione uma impressora primeiro', 'warning');
    return;
  }
  
  const [vendorId, productId] = value.split(':');
  
  try {
    showUSBStatus('Testando conexão...', 'info');
    const result = await window.electronAPI.testUSBConnection(vendorId, productId);
    
    if (result.success) {
      showUSBStatus('✓ Conexão USB estabelecida com sucesso!', 'success');
      addLog('✓ Impressora USB conectada', 'success');
    } else {
      showUSBStatus('✗ ' + result.error, 'error');
    }
  } catch (error) {
    showUSBStatus('✗ Erro: ' + error.message, 'error');
  }
}

function togglePrinterMode() {
  const useEscPos = document.getElementById('useEscPos').checked;
  document.getElementById('systemPrinterSection').style.display = useEscPos ? 'none' : 'block';
  document.getElementById('usbPrinterSection').style.display = useEscPos ? 'block' : 'none';
}

function showUSBStatus(message, type) {
  const status = document.getElementById('usbStatus');
  status.style.display = 'block';
  status.className = `message ${type}`;
  status.textContent = message;
}

function hideUSBStatus() {
  document.getElementById('usbStatus').style.display = 'none';
}

async function saveConfig() {
  try {
    const useEscPos = document.getElementById('useEscPos').checked;
    const usbPrinterValue = document.getElementById('usbPrinterSelect').value;
    
    const config = {
      supabaseUrl: document.getElementById('supabaseUrl').value.trim(),
      supabaseKey: document.getElementById('supabaseKey').value.trim(),
      restaurantId: document.getElementById('restaurantId').value.trim(),
      printerName: document.getElementById('printerName').value,
      checkInterval: parseInt(document.getElementById('checkInterval').value),
      minimizeToTray: document.getElementById('minimizeToTray').checked,
      autoStart: document.getElementById('autoStart').checked,
      soundNotification: document.getElementById('soundNotification').checked,
      useEscPos,
      usbPrinter: usbPrinterValue,
      autoCut: document.getElementById('autoCut').checked,
      openDrawer: document.getElementById('openDrawer').checked,
    };
    
    await window.electronAPI.saveConfig(config);
    addLog('✓ Configurações salvas com sucesso', 'success');
    
  } catch (error) {
    addLog('Erro ao salvar: ' + error.message, 'error');
  }
}

// ============================================
// LAYOUT
// ============================================
let currentLogoData = null;

function getLayoutConfig() {
  return {
    // Paper
    paperSize: document.getElementById('layoutPaperSize').value,
    paperWidth: parseInt(document.getElementById('layoutWidth').value),
    
    // Logo
    showLogo: document.getElementById('showLogo').checked,
    logoData: currentLogoData,
    
    // Header
    showRestaurantName: document.getElementById('showRestaurantName').checked,
    showAddress: document.getElementById('showAddress').checked,
    showPhone: document.getElementById('showPhone').checked,
    showCnpj: document.getElementById('showCnpj').checked,
    receiptTitle: document.getElementById('receiptTitle').value,
    
    // Order Info
    showOrderNumber: document.getElementById('showOrderNumber').checked,
    showOrderType: document.getElementById('showOrderType').checked,
    showTable: document.getElementById('showTable').checked,
    showItemPrices: document.getElementById('showItemPrices').checked,
    showItemNotes: document.getElementById('showItemNotes').checked,
    
    // Customer Info
    showCustomerName: document.getElementById('showCustomerName').checked,
    showCustomerPhone: document.getElementById('showCustomerPhone').checked,
    showDeliveryAddress: document.getElementById('showDeliveryAddress').checked,
    
    // Footer
    showDateTime: document.getElementById('showDateTime').checked,
    showTotals: document.getElementById('showTotals').checked,
    showDeliveryFee: document.getElementById('showDeliveryFee').checked,
    footerMessage: document.getElementById('footerMessage').value,
    
    // Font
    fontSize: parseInt(document.getElementById('fontSize').value),
    boldTotal: document.getElementById('boldTotal').checked,
  };
}

async function saveLayout() {
  try {
    const layout = getLayoutConfig();
    await window.electronAPI.saveLayout(layout);
    addLog('✓ Layout salvo com sucesso', 'success');
  } catch (error) {
    addLog('Erro ao salvar layout: ' + error.message, 'error');
  }
}

function handleLogoUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = function(e) {
    currentLogoData = e.target.result;
    showLogoPreview(currentLogoData);
    updatePreview();
  };
  reader.readAsDataURL(file);
}

function showLogoPreview(dataUrl) {
  const container = document.getElementById('logoPreviewContainer');
  container.innerHTML = `<img src="${dataUrl}" class="logo-preview" alt="Logo">`;
}

function updatePreview() {
  const config = getLayoutConfig();
  const preview = document.getElementById('receiptPreview');
  
  // Update paper size class
  preview.className = `receipt-preview paper-${config.paperSize}`;
  preview.style.fontSize = `${config.fontSize}px`;
  
  // Generate preview content
  const width = config.paperWidth;
  const divider = '='.repeat(Math.min(width, 32));
  const thinDivider = '-'.repeat(Math.min(width, 32));
  
  let html = '';
  
  // Header
  html += '<div class="receipt-header">';
  
  if (config.showLogo && currentLogoData) {
    html += `<img src="${currentLogoData}" class="receipt-logo" alt="Logo">`;
  }
  
  if (config.showRestaurantName) {
    html += '<div class="receipt-restaurant-name">MEU RESTAURANTE</div>';
  }
  
  if (config.showAddress) {
    html += '<div>Rua Exemplo, 123 - Centro</div>';
  }
  
  if (config.showPhone) {
    html += '<div>Tel: (11) 99999-9999</div>';
  }
  
  if (config.showCnpj) {
    html += '<div>CNPJ: 12.345.678/0001-90</div>';
  }
  
  html += '</div>';
  
  // Title
  html += `<div style="text-align:center; font-weight:bold; margin: 8px 0;">${config.receiptTitle}</div>`;
  html += `<div class="receipt-divider-double"></div>`;
  
  // Order info
  if (config.showOrderNumber) {
    html += '<div style="text-align:center; font-size:1.2em; font-weight:bold;">#A1B2C3D4</div>';
  }
  
  if (config.showOrderType) {
    html += '<div>Tipo: ENTREGA</div>';
  }
  
  if (config.showTable) {
    html += '<div>Mesa: 5</div>';
  }
  
  // Customer info
  if (config.showCustomerName || config.showCustomerPhone || config.showDeliveryAddress) {
    html += `<div class="receipt-divider"></div>`;
    
    if (config.showCustomerName) {
      html += '<div>Cliente: João Silva</div>';
    }
    
    if (config.showCustomerPhone) {
      html += '<div>Tel: (11) 98888-7777</div>';
    }
    
    if (config.showDeliveryAddress) {
      html += '<div>End: Av. Brasil, 456, Ap 12</div>';
    }
  }
  
  // Items
  html += `<div class="receipt-divider-double"></div>`;
  html += '<div class="receipt-section-title">ITENS:</div>';
  html += `<div class="receipt-divider"></div>`;
  
  // Sample items
  const items = [
    { qty: 2, name: 'X-Burguer Especial', price: 29.90 },
    { qty: 1, name: 'Batata Frita G', price: 18.50, notes: 'Sem sal' },
    { qty: 2, name: 'Refrigerante 350ml', price: 6.00 },
  ];
  
  items.forEach(item => {
    html += `<div>${item.qty}x ${item.name}</div>`;
    if (config.showItemPrices) {
      html += `<div style="text-align:right">R$ ${(item.price * item.qty).toFixed(2)}</div>`;
    }
    if (config.showItemNotes && item.notes) {
      html += `<div style="padding-left:12px; font-style:italic">Obs: ${item.notes}</div>`;
    }
  });
  
  // Totals
  if (config.showTotals) {
    html += `<div class="receipt-divider"></div>`;
    
    const subtotal = items.reduce((sum, item) => sum + (item.price * item.qty), 0);
    html += `<div class="receipt-item"><span>Subtotal:</span><span>R$ ${subtotal.toFixed(2)}</span></div>`;
    
    if (config.showDeliveryFee) {
      html += `<div class="receipt-item"><span>Taxa de entrega:</span><span>R$ 8.00</span></div>`;
    }
    
    const total = subtotal + (config.showDeliveryFee ? 8 : 0);
    const totalStyle = config.boldTotal ? 'font-weight:bold;font-size:1.1em;' : '';
    html += `<div class="receipt-item receipt-total" style="${totalStyle}"><span>TOTAL:</span><span>R$ ${total.toFixed(2)}</span></div>`;
  }
  
  // Footer
  html += `<div class="receipt-divider-double"></div>`;
  
  if (config.showDateTime) {
    const now = new Date();
    html += `<div style="text-align:center">${now.toLocaleDateString('pt-BR')} ${now.toLocaleTimeString('pt-BR')}</div>`;
  }
  
  if (config.footerMessage) {
    html += `<div class="receipt-footer">${config.footerMessage}</div>`;
  }
  
  preview.innerHTML = html;
}

async function testPrintLayout() {
  addLog('Imprimindo preview do layout...', 'info');
  
  try {
    const layout = getLayoutConfig();
    const result = await window.electronAPI.testPrintLayout(layout);
    
    if (result.success) {
      addLog('✓ Preview impresso com sucesso!', 'success');
    } else {
      addLog('✗ Erro ao imprimir: ' + result.error, 'error');
    }
  } catch (error) {
    addLog('✗ Erro: ' + error.message, 'error');
  }
}

// ============================================
// ACTIONS
// ============================================
async function reconnect() {
  addLog('Reconectando...', 'info');
  document.getElementById('statusDot').className = 'status-dot connecting';
  
  try {
    await window.electronAPI.reconnect();
  } catch (error) {
    addLog('Erro ao reconectar: ' + error.message, 'error');
  }
}

async function testPrint() {
  addLog('Enviando impressão de teste...', 'info');
  
  try {
    const result = await window.electronAPI.testPrint();
    if (result.success) {
      addLog('✓ Teste de impressão enviado!', 'success');
    } else {
      addLog('✗ Erro no teste: ' + result.error, 'error');
    }
  } catch (error) {
    addLog('✗ Erro: ' + error.message, 'error');
  }
}

// ============================================
// EVENT LISTENERS
// ============================================
window.electronAPI.onConnectionStatus((data) => {
  updateStatus(data.connected, data.message);
});

window.electronAPI.onLog((message) => {
  const isError = message.includes('Erro') || message.includes('✗');
  const isSuccess = message.includes('sucesso') || message.includes('✓');
  addLog(message, isError ? 'error' : isSuccess ? 'success' : 'info');
});

window.electronAPI.onPrintSuccess((data) => {
  addLog(`✓ Pedido #${data.orderId.slice(0, 8)} impresso!`, 'success');
});

window.electronAPI.onStats((data) => {
  updateStats(data);
});

// ============================================
// INIT
// ============================================
document.addEventListener('DOMContentLoaded', () => {
  loadConfig();
  addLog('Aplicativo iniciado', 'info');
});
