// ============================================
// MENU HANDLING
// ============================================
document.querySelectorAll('.menu-item').forEach(item => {
  item.addEventListener('click', (e) => {
    e.stopPropagation();
    const wasActive = item.classList.contains('active');
    document.querySelectorAll('.menu-item').forEach(i => i.classList.remove('active'));
    if (!wasActive) {
      item.classList.add('active');
    }
  });
});

document.addEventListener('click', () => {
  document.querySelectorAll('.menu-item').forEach(i => i.classList.remove('active'));
});

// Menu actions
document.getElementById('btnConfigurar').addEventListener('click', () => openModal('configModal'));
document.getElementById('btnPrinters').addEventListener('click', () => openPrintersModal());
document.getElementById('btnLayoutEditor').addEventListener('click', () => openLayoutModal());
document.getElementById('btnTestPrint').addEventListener('click', testPrint);
document.getElementById('btnReconnect').addEventListener('click', reconnect);
document.getElementById('btnQuit').addEventListener('click', () => window.electronAPI.quit());
document.getElementById('btnLogs').addEventListener('click', openLog);
document.getElementById('btnAbout').addEventListener('click', () => openModal('aboutModal'));

// ============================================
// MODAL HANDLING
// ============================================
function openModal(id) {
  document.getElementById(id).classList.add('active');
  if (id === 'configModal') {
    loadConfig();
  } else if (id === 'layoutModal') {
    loadLayoutConfig();
  }
}

function closeModal(id) {
  document.getElementById(id).classList.remove('active');
}

// Close modal on escape key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal-overlay.active').forEach(m => m.classList.remove('active'));
    closeLog();
  }
});

// ============================================
// LOG PANEL
// ============================================
function openLog() {
  document.getElementById('logOverlay').classList.add('active');
}

function closeLog() {
  document.getElementById('logOverlay').classList.remove('active');
}

function addLog(message, type = 'info') {
  const logContent = document.getElementById('logContent');
  const now = new Date().toLocaleTimeString('pt-BR');
  
  const entry = document.createElement('div');
  entry.className = `log-entry ${type}`;
  entry.innerHTML = `<span class="log-time">[${now}]</span> ${message}`;
  
  logContent.appendChild(entry);
  logContent.scrollTop = logContent.scrollHeight;
  
  // Keep only last 100 entries
  while (logContent.children.length > 100) {
    logContent.removeChild(logContent.firstChild);
  }
}

// ============================================
// TOAST NOTIFICATIONS
// ============================================
function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  
  const icons = {
    success: '✓',
    error: '✗',
    info: 'ℹ'
  };
  
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `
    <div class="toast-icon ${type}">${icons[type]}</div>
    <div class="toast-message">${message}</div>
  `;
  
  container.appendChild(toast);
  
  setTimeout(() => {
    toast.style.animation = 'slideIn 0.3s ease reverse';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// ============================================
// STATUS UPDATES
// ============================================
function updateStatus(connected, message) {
  const statusDot = document.getElementById('statusDot');
  const statusText = document.getElementById('statusText');
  
  statusDot.className = `status-dot ${connected ? 'connected' : 'disconnected'}`;
  statusText.textContent = message || (connected ? 'Conectado' : 'Desconectado');
  
  addLog(connected ? '✓ Conectado ao sistema' : `✗ ${message || 'Desconectado'}`, connected ? 'success' : 'error');
}

function updateStats(stats) {
  document.getElementById('printedCount').textContent = stats.printedCount || 0;
}

// ============================================
// CONFIGURATION
// ============================================
async function loadConfig() {
  try {
    const config = await window.electronAPI.getConfig();
    
    document.getElementById('supabaseUrl').value = config.supabaseUrl || '';
    document.getElementById('supabaseKey').value = config.supabaseKey || '';
    document.getElementById('restaurantId').value = config.restaurantId || '';
    document.getElementById('checkInterval').value = config.checkInterval || 5;
    document.getElementById('minimizeToTray').checked = config.minimizeToTray !== false;
    document.getElementById('autoStart').checked = config.autoStart === true;
    document.getElementById('soundNotification').checked = config.soundNotification !== false;
    
    // Load stats
    const stats = await window.electronAPI.getStats();
    updateStats(stats);
    
    // Update printer status
    const printers = await window.electronAPI.getSystemPrinters();
    document.getElementById('printerStatus').value = printers.length > 0 
      ? `${printers.length} encontrada(s)` 
      : 'Nenhuma';
    
  } catch (error) {
    addLog('Erro ao carregar configurações: ' + error.message, 'error');
    showToast('Erro ao carregar configurações', 'error');
  }
}

// ============================================
// PRINTERS BY TYPE
// ============================================
let systemPrinters = [];

async function openPrintersModal() {
  openModal('printersModal');
  await loadPrintersConfig();
}

async function loadPrintersConfig() {
  try {
    // Load system printers
    systemPrinters = await window.electronAPI.getSystemPrinters();
    const config = await window.electronAPI.getConfig();
    const printers = config.printers || { table: '', counter: '', delivery: '', default: '' };
    
    // Populate all printer selects
    const selects = ['printerTable', 'printerCounter', 'printerDelivery', 'printerDefault'];
    
    selects.forEach(selectId => {
      const select = document.getElementById(selectId);
      select.innerHTML = '<option value="">Padrão do Sistema</option>';
      
      systemPrinters.forEach(printer => {
        const option = document.createElement('option');
        option.value = printer.name;
        option.textContent = printer.isDefault 
          ? `${printer.displayName} (Padrão)` 
          : printer.displayName;
        select.appendChild(option);
      });
    });
    
    // Set current values
    document.getElementById('printerTable').value = printers.table || '';
    document.getElementById('printerCounter').value = printers.counter || '';
    document.getElementById('printerDelivery').value = printers.delivery || '';
    document.getElementById('printerDefault').value = printers.default || '';
    
    addLog(`Encontradas ${systemPrinters.length} impressora(s)`, 'info');
    
  } catch (error) {
    addLog('Erro ao carregar impressoras: ' + error.message, 'error');
    showToast('Erro ao carregar impressoras', 'error');
  }
}

async function refreshAllPrinters() {
  addLog('Atualizando lista de impressoras...', 'info');
  await loadPrintersConfig();
  showToast('Lista de impressoras atualizada', 'success');
}

async function savePrinters() {
  try {
    const printers = {
      table: document.getElementById('printerTable').value,
      counter: document.getElementById('printerCounter').value,
      delivery: document.getElementById('printerDelivery').value,
      default: document.getElementById('printerDefault').value,
    };
    
    await window.electronAPI.savePrinters(printers);
    
    addLog('✓ Impressoras configuradas', 'success');
    showToast('Impressoras salvas com sucesso!', 'success');
    closeModal('printersModal');
    
  } catch (error) {
    addLog('Erro ao salvar impressoras: ' + error.message, 'error');
    showToast('Erro ao salvar impressoras', 'error');
  }
}

// ============================================
// LAYOUT EDITOR
// ============================================
let currentLayout = {
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

async function openLayoutModal() {
  openModal('layoutModal');
}

async function loadLayoutConfig() {
  try {
    const config = await window.electronAPI.getConfig();
    currentLayout = { ...currentLayout, ...config.layout };
    
    // Set form values
    document.getElementById('layoutPaperSize').value = currentLayout.paperSize || '58mm';
    document.getElementById('layoutPaperWidth').value = currentLayout.paperWidth || 48;
    document.getElementById('layoutShowRestaurantName').checked = currentLayout.showRestaurantName !== false;
    document.getElementById('layoutShowAddress').checked = currentLayout.showAddress === true;
    document.getElementById('layoutShowPhone').checked = currentLayout.showPhone === true;
    document.getElementById('layoutShowCnpj').checked = currentLayout.showCnpj === true;
    document.getElementById('layoutReceiptTitle').value = currentLayout.receiptTitle || '*** PEDIDO ***';
    document.getElementById('layoutShowOrderNumber').checked = currentLayout.showOrderNumber !== false;
    document.getElementById('layoutShowOrderType').checked = currentLayout.showOrderType !== false;
    document.getElementById('layoutShowTable').checked = currentLayout.showTable !== false;
    document.getElementById('layoutShowDateTime').checked = currentLayout.showDateTime !== false;
    document.getElementById('layoutShowCustomerName').checked = currentLayout.showCustomerName !== false;
    document.getElementById('layoutShowCustomerPhone').checked = currentLayout.showCustomerPhone !== false;
    document.getElementById('layoutShowDeliveryAddress').checked = currentLayout.showDeliveryAddress !== false;
    document.getElementById('layoutShowItemPrices').checked = currentLayout.showItemPrices !== false;
    document.getElementById('layoutShowItemNotes').checked = currentLayout.showItemNotes !== false;
    document.getElementById('layoutShowTotals').checked = currentLayout.showTotals !== false;
    document.getElementById('layoutShowDeliveryFee').checked = currentLayout.showDeliveryFee !== false;
    document.getElementById('layoutBoldTotal').checked = currentLayout.boldTotal !== false;
    document.getElementById('layoutFooterMessage').value = currentLayout.footerMessage || 'Obrigado pela preferência!';
    
    // Update preview class
    const preview = document.getElementById('receiptPreview');
    preview.className = `receipt-preview paper-${currentLayout.paperSize || '58mm'}`;
    
    updatePreview();
    
  } catch (error) {
    addLog('Erro ao carregar layout: ' + error.message, 'error');
  }
}

function getLayoutFromForm() {
  return {
    paperSize: document.getElementById('layoutPaperSize').value,
    paperWidth: parseInt(document.getElementById('layoutPaperWidth').value) || 48,
    showRestaurantName: document.getElementById('layoutShowRestaurantName').checked,
    showAddress: document.getElementById('layoutShowAddress').checked,
    showPhone: document.getElementById('layoutShowPhone').checked,
    showCnpj: document.getElementById('layoutShowCnpj').checked,
    receiptTitle: document.getElementById('layoutReceiptTitle').value,
    showOrderNumber: document.getElementById('layoutShowOrderNumber').checked,
    showOrderType: document.getElementById('layoutShowOrderType').checked,
    showTable: document.getElementById('layoutShowTable').checked,
    showDateTime: document.getElementById('layoutShowDateTime').checked,
    showCustomerName: document.getElementById('layoutShowCustomerName').checked,
    showCustomerPhone: document.getElementById('layoutShowCustomerPhone').checked,
    showDeliveryAddress: document.getElementById('layoutShowDeliveryAddress').checked,
    showItemPrices: document.getElementById('layoutShowItemPrices').checked,
    showItemNotes: document.getElementById('layoutShowItemNotes').checked,
    showTotals: document.getElementById('layoutShowTotals').checked,
    showDeliveryFee: document.getElementById('layoutShowDeliveryFee').checked,
    boldTotal: document.getElementById('layoutBoldTotal').checked,
    footerMessage: document.getElementById('layoutFooterMessage').value,
  };
}

function updatePreview() {
  const layout = getLayoutFromForm();
  const width = layout.paperWidth || 48;
  const divider = '='.repeat(Math.min(width, 32));
  const thinDivider = '-'.repeat(Math.min(width, 32));
  
  // Update preview paper size class
  const preview = document.getElementById('receiptPreview');
  preview.className = `receipt-preview paper-${layout.paperSize || '58mm'}`;
  
  let lines = [];
  
  // Helper functions
  const center = (text) => {
    const padding = Math.max(0, Math.floor((width - text.length) / 2));
    return ' '.repeat(padding) + text;
  };
  
  const alignRight = (left, right) => {
    const padding = Math.max(1, width - left.length - right.length);
    return left + ' '.repeat(padding) + right;
  };
  
  // Header
  if (layout.showRestaurantName) {
    lines.push(center('MEU RESTAURANTE'));
  }
  if (layout.showAddress) {
    lines.push(center('Rua Exemplo, 123 - Centro'));
  }
  if (layout.showPhone) {
    lines.push(center('Tel: (11) 99999-9999'));
  }
  if (layout.showCnpj) {
    lines.push(center('CNPJ: 12.345.678/0001-90'));
  }
  
  if (lines.length > 0) lines.push('');
  
  // Title
  lines.push(center(layout.receiptTitle || '*** PEDIDO ***'));
  lines.push(divider);
  
  // Order number
  if (layout.showOrderNumber) {
    lines.push(center('#PREV1234'));
    lines.push('');
  }
  
  // Order info
  if (layout.showOrderType) {
    lines.push('Tipo: DELIVERY');
  }
  if (layout.showTable) {
    lines.push('Mesa: --');
  }
  
  // Customer info
  if (layout.showCustomerName) {
    lines.push('Cliente: João Silva');
  }
  if (layout.showCustomerPhone) {
    lines.push('Tel: (11) 98888-7777');
  }
  if (layout.showDeliveryAddress) {
    lines.push('End: Av. Brasil, 456, Ap 12');
  }
  
  lines.push(divider);
  lines.push('');
  lines.push('ITENS:');
  lines.push(thinDivider);
  
  // Sample items
  const items = [
    { qty: 2, name: 'X-Burguer Especial', price: 29.90, note: null },
    { qty: 1, name: 'Batata Frita Grande', price: 18.50, note: 'Sem sal' },
    { qty: 2, name: 'Refrigerante 350ml', price: 6.00, note: null },
  ];
  
  items.forEach(item => {
    lines.push(`${item.qty}x ${item.name}`);
    if (layout.showItemPrices) {
      const total = (item.price * item.qty).toFixed(2);
      lines.push(alignRight('', `R$ ${total}`));
    }
    if (layout.showItemNotes && item.note) {
      lines.push(`   Obs: ${item.note}`);
    }
  });
  
  lines.push(thinDivider);
  
  // Totals
  if (layout.showTotals) {
    if (layout.showDeliveryFee) {
      lines.push(alignRight('Taxa de entrega:', 'R$ 8,00'));
    }
    const totalLine = alignRight('TOTAL:', 'R$ 98,30');
    lines.push(layout.boldTotal ? `[${totalLine}]` : totalLine);
  }
  
  lines.push('');
  lines.push('Obs: Tocar campainha 2x');
  lines.push('');
  lines.push(divider);
  
  // Footer
  if (layout.showDateTime) {
    const now = new Date();
    lines.push(center(now.toLocaleString('pt-BR')));
  }
  
  if (layout.footerMessage) {
    lines.push('');
    lines.push(center(layout.footerMessage));
  }
  
  preview.textContent = lines.join('\n');
}

async function testPrintLayout() {
  try {
    const layout = getLayoutFromForm();
    addLog('Enviando impressão de teste do layout...', 'info');
    showToast('Enviando impressão de teste...', 'info');
    
    const result = await window.electronAPI.testPrintLayout(layout);
    
    if (result.success) {
      addLog('✓ Impressão de teste enviada', 'success');
      showToast('Impressão de teste enviada!', 'success');
    } else {
      addLog('✗ Erro: ' + result.error, 'error');
      showToast('Erro: ' + result.error, 'error');
    }
  } catch (error) {
    addLog('✗ Erro: ' + error.message, 'error');
    showToast('Erro ao imprimir', 'error');
  }
}

async function saveLayout() {
  try {
    const layout = getLayoutFromForm();
    await window.electronAPI.saveLayout(layout);
    
    addLog('✓ Layout salvo com sucesso', 'success');
    showToast('Layout salvo com sucesso!', 'success');
    closeModal('layoutModal');
    
  } catch (error) {
    addLog('Erro ao salvar layout: ' + error.message, 'error');
    showToast('Erro ao salvar layout', 'error');
  }
}

async function saveConfig() {
  try {
    const config = {
      supabaseUrl: document.getElementById('supabaseUrl').value.trim(),
      supabaseKey: document.getElementById('supabaseKey').value.trim(),
      restaurantId: document.getElementById('restaurantId').value.trim(),
      checkInterval: parseInt(document.getElementById('checkInterval').value),
      minimizeToTray: document.getElementById('minimizeToTray').checked,
      autoStart: document.getElementById('autoStart').checked,
      soundNotification: document.getElementById('soundNotification').checked,
    };
    
    await window.electronAPI.saveConfig(config);
    addLog('✓ Configurações salvas', 'success');
    showToast('Configurações salvas com sucesso!', 'success');
    closeModal('configModal');
    
  } catch (error) {
    addLog('Erro ao salvar: ' + error.message, 'error');
    showToast('Erro ao salvar configurações', 'error');
  }
}

// ============================================
// ACTIONS
// ============================================
async function testPrint() {
  try {
    addLog('Enviando impressão de teste...', 'info');
    showToast('Enviando impressão de teste...', 'info');
    
    const result = await window.electronAPI.testPrint();
    
    if (result.success) {
      addLog('✓ Impressão de teste enviada', 'success');
      showToast('Impressão de teste enviada!', 'success');
    } else {
      addLog('✗ Erro: ' + result.error, 'error');
      showToast('Erro: ' + result.error, 'error');
    }
  } catch (error) {
    addLog('✗ Erro: ' + error.message, 'error');
    showToast('Erro ao imprimir', 'error');
  }
}

async function reconnect() {
  try {
    const statusDot = document.getElementById('statusDot');
    const statusText = document.getElementById('statusText');
    
    statusDot.className = 'status-dot connecting';
    statusText.textContent = 'Conectando...';
    addLog('Reconectando...', 'info');
    
    const success = await window.electronAPI.reconnect();
    
    if (success) {
      showToast('Conectado com sucesso!', 'success');
    } else {
      showToast('Falha na conexão', 'error');
    }
  } catch (error) {
    addLog('Erro ao reconectar: ' + error.message, 'error');
    showToast('Erro ao reconectar', 'error');
  }
}

// ============================================
// IPC LISTENERS
// ============================================
window.electronAPI.onConnectionStatus((event, data) => {
  updateStatus(data.connected, data.message);
});

window.electronAPI.onLog((event, message) => {
  if (message.includes('✓')) {
    addLog(message, 'success');
  } else if (message.includes('✗') || message.includes('Erro')) {
    addLog(message, 'error');
  } else {
    addLog(message, 'info');
  }
});

window.electronAPI.onPrintSuccess((event, data) => {
  showToast(`Pedido #${data.orderId.slice(0, 8)} impresso!`, 'success');
  
  // Play sound if enabled
  try {
    const audio = new Audio('data:audio/wav;base64,UklGRhQFAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YfAEAACAAAAAgAAAAIAAAACAAACAAAAAAIAAAIAAAACAAAAAgAAAgAAAAACAAAAAgAAAgAAAgACAAAAAAICAAAAAgAAAAIAAAIAAAAAAgAAAAIAAAACAAACAAAAAgAAAAIAAgACAAAAAAIAAAIAAAIAAAIAAAAAAgAAAgAAAgAAAgAAAAICAAAAAgAAAAIAAAIAAAAAAgAAAAIAAAACAAACAAAAAgAAAAIAAgACAAAAAAIAAAIAAAIAAAIAAAAAAgAAAgAAAgAAAgAAAAICAAAAAgAAAAIAAAIAAAAAAgAAAAIAAAACAAACAAAAAgAAAAIAAgACAAAAAAIAAAIAAAIAAAIAAAAAAgAAAgAAAgAAAgAAAAICAAAAAgAAAAIAAAIAAAAAAgAAAAIAAAACAAACAAAAAgAAAAIAAgACAAAAAAIAAAIAAAIAAAIAAAAAAgAAAgAAAgAAAgAAAAA==');
    audio.volume = 0.5;
    audio.play().catch(() => {});
  } catch (e) {}
});

window.electronAPI.onStats((event, stats) => {
  updateStats(stats);
});

// ============================================
// INITIALIZATION
// ============================================
async function init() {
  addLog('Aplicativo iniciado', 'info');
  
  try {
    const stats = await window.electronAPI.getStats();
    updateStats(stats);
    updateStatus(stats.isConnected, stats.isConnected ? 'Conectado' : 'Desconectado');
  } catch (error) {
    addLog('Erro ao carregar status inicial', 'error');
  }
}

init();
