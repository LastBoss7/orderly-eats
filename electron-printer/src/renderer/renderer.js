// ============================================
// STATE
// ============================================
let systemPrinters = [];
let selectedPrinters = [];
let logsVisible = false;

// ============================================
// STATUS MESSAGE (clean UI)
// ============================================
function showStatus(message, type = 'info') {
  const statusEl = document.getElementById('statusMessage');
  statusEl.textContent = message;
  statusEl.className = `status-message ${type}`;
  
  // Also add to hidden log
  addLog(message, type);
}

// ============================================
// LOG (hidden by default)
// ============================================
function addLog(message, type = 'info') {
  const logContent = document.getElementById('logContent');
  const now = new Date().toLocaleTimeString('pt-BR');
  
  const entry = document.createElement('div');
  entry.className = `log-entry ${type}`;
  entry.textContent = `[${now}] ${message}`;
  
  logContent.appendChild(entry);
  logContent.scrollTop = logContent.scrollHeight;
  
  // Keep only last 30 entries
  while (logContent.children.length > 30) {
    logContent.removeChild(logContent.firstChild);
  }
}

function toggleLogs() {
  const logArea = document.getElementById('logContent');
  const toggleBtn = document.querySelector('.toggle-logs');
  
  logsVisible = !logsVisible;
  
  if (logsVisible) {
    logArea.classList.add('visible');
    toggleBtn.textContent = '▲ Ocultar logs';
  } else {
    logArea.classList.remove('visible');
    toggleBtn.textContent = '▼ Mostrar logs';
  }
}

// ============================================
// STATUS
// ============================================
function updateStatus(connected, message) {
  const statusDot = document.getElementById('statusDot');
  const statusText = document.getElementById('statusText');
  
  statusDot.className = `status-dot ${connected ? 'connected' : 'disconnected'}`;
  statusText.textContent = message || (connected ? 'Conectado' : 'Desconectado');
  
  showStatus(connected ? 'Sistema conectado e pronto' : 'Aguardando conexão', connected ? 'success' : 'info');
}

// ============================================
// PRINTER LIST
// ============================================
async function loadPrinters() {
  try {
    systemPrinters = await window.electronAPI.getSystemPrinters();
    const config = await window.electronAPI.getConfig();
    selectedPrinters = config.selectedPrinters || [];
    
    const select = document.getElementById('printerSelect');
    select.innerHTML = '<option value="">Selecione...</option>';
    
    systemPrinters.forEach(printer => {
      const option = document.createElement('option');
      option.value = printer.name;
      option.textContent = printer.isDefault 
        ? `★ ${printer.displayName}` 
        : printer.displayName;
      select.appendChild(option);
    });
    
    // Set current printer
    if (config.printerName) {
      select.value = config.printerName;
    }
    
    showStatus(`${systemPrinters.length} impressora(s) disponíveis`, 'info');
  } catch (error) {
    showStatus('Erro ao carregar impressoras', 'error');
  }
}

function openPrinterListModal() {
  const printerList = document.getElementById('printerList');
  printerList.innerHTML = '';
  
  systemPrinters.forEach(printer => {
    const isSelected = selectedPrinters.includes(printer.name);
    
    const item = document.createElement('div');
    item.className = 'printer-item';
    item.innerHTML = `
      <input type="checkbox" id="printer_${printer.name}" value="${printer.name}" ${isSelected ? 'checked' : ''}>
      <label for="printer_${printer.name}">${printer.displayName}</label>
    `;
    printerList.appendChild(item);
  });
  
  document.getElementById('printerListModal').classList.add('active');
}

function closePrinterListModal() {
  document.getElementById('printerListModal').classList.remove('active');
}

async function selectPrinters() {
  const checkboxes = document.querySelectorAll('#printerList input[type="checkbox"]:checked');
  selectedPrinters = Array.from(checkboxes).map(cb => cb.value);
  
  if (selectedPrinters.length === 0) {
    showStatus('Selecione pelo menos uma impressora', 'error');
    return;
  }
  
  try {
    await window.electronAPI.saveSelectedPrinters(selectedPrinters);
    
    // Also set the first selected printer as the main printer if none is set
    const currentPrinter = document.getElementById('printerSelect').value;
    if (!currentPrinter && selectedPrinters.length > 0) {
      document.getElementById('printerSelect').value = selectedPrinters[0];
    }
    
    showStatus(`${selectedPrinters.length} impressora(s) selecionada(s)`, 'success');
    closePrinterListModal();
    
    // Trigger save to persist the printer selection
    await saveConfig();
  } catch (error) {
    showStatus('Erro ao salvar', 'error');
  }
}

// ============================================
// CONFIGURATION
// ============================================
async function loadConfig() {
  try {
    const config = await window.electronAPI.getConfig();
    
    // Load form values
    document.getElementById('restaurantId').value = config.restaurantId || '';
    document.getElementById('printerSelect').value = config.printerName || '';
    document.getElementById('paperWidth').value = config.paperWidth || 48;
    document.getElementById('fontSize').value = config.fontSize || 1;
    document.getElementById('cnpj').value = config.cnpj || '';
    document.getElementById('phone').value = config.phone || '';
    document.getElementById('info').value = config.info || '';
    document.getElementById('logoUrl').value = config.logoUrl || '';
    document.getElementById('copies').value = config.copies || 1;
    document.getElementById('encoding').value = config.encoding || '0';
    document.getElementById('extraLines').value = config.extraLines || 0;
    document.getElementById('cutCommand').value = config.cutCommand || '';
    document.getElementById('cashDrawer').value = config.cashDrawer || '';
    
    // Radio buttons
    setRadioValue('fontType', config.fontType || '1');
    setRadioValue('escpos', config.escpos !== false ? '1' : '0');
    setRadioValue('bold', config.bold !== false ? '1' : '0');
    setRadioValue('removeAccents', config.removeAccents !== false ? '1' : '0');
    
    selectedPrinters = config.selectedPrinters || [];
    
  } catch (error) {
    showStatus('Erro ao carregar configurações', 'error');
  }
}

function setRadioValue(name, value) {
  const radio = document.querySelector(`input[name="${name}"][value="${value}"]`);
  if (radio) radio.checked = true;
}

function getRadioValue(name) {
  const radio = document.querySelector(`input[name="${name}"]:checked`);
  return radio ? radio.value : null;
}

async function saveConfig() {
  try {
    const restaurantId = document.getElementById('restaurantId').value.trim();
    
    if (!restaurantId) {
      showStatus('ID do Restaurante é obrigatório', 'error');
      return;
    }
    
    const config = {
      restaurantId: restaurantId,
      printerName: document.getElementById('printerSelect').value,
      paperWidth: parseInt(document.getElementById('paperWidth').value) || 48,
      fontSize: parseInt(document.getElementById('fontSize').value) || 1,
      fontType: getRadioValue('fontType'),
      cnpj: document.getElementById('cnpj').value.trim(),
      phone: document.getElementById('phone').value.trim(),
      info: document.getElementById('info').value.trim(),
      logoUrl: document.getElementById('logoUrl').value.trim(),
      copies: parseInt(document.getElementById('copies').value) || 1,
      escpos: getRadioValue('escpos') === '1',
      encoding: document.getElementById('encoding').value,
      extraLines: parseInt(document.getElementById('extraLines').value) || 0,
      cutCommand: document.getElementById('cutCommand').value.trim(),
      cashDrawer: document.getElementById('cashDrawer').value.trim(),
      bold: getRadioValue('bold') === '1',
      removeAccents: getRadioValue('removeAccents') === '1',
      selectedPrinters: selectedPrinters,
    };
    
    await window.electronAPI.saveConfig(config);
    showStatus('Configurações salvas!', 'success');
    
    // Sincroniza impressoras após salvar
    await syncPrintersToServer();
    
  } catch (error) {
    showStatus('Erro ao salvar: ' + error.message, 'error');
  }
}

// ============================================
// SYNC PRINTERS (called on init)
// ============================================
async function syncPrintersToServer() {
  try {
    showStatus('Sincronizando impressoras...', 'info');
    await window.electronAPI.syncPrinters();
    showStatus('Impressoras sincronizadas!', 'success');
  } catch (error) {
    showStatus('Erro ao sincronizar', 'error');
  }
}

// ============================================
// ACTIONS
// ============================================
async function testPrint() {
  try {
    showStatus('Enviando teste de impressão...', 'info');
    const result = await window.electronAPI.testPrint('auto');
    
    if (result.success) {
      const methodLabel = result.method === 'usb-direct' ? 'USB Direto' : 'Spooler';
      showStatus(`✓ Teste enviado via ${methodLabel}`, 'success');
    } else {
      showStatus('✗ Falha: ' + result.error, 'error');
    }
  } catch (error) {
    showStatus('✗ Erro: ' + error.message, 'error');
  }
}

async function reconnect() {
  try {
    const statusDot = document.getElementById('statusDot');
    statusDot.className = 'status-dot';
    statusDot.style.background = '#f59e0b';
    document.getElementById('statusText').textContent = 'Conectando...';
    
    showStatus('Reconectando...', 'info');
    const success = await window.electronAPI.reconnect();
    
    if (success) {
      showStatus('Conectado com sucesso!', 'success');
    } else {
      showStatus('Falha na conexão', 'error');
    }
  } catch (error) {
    showStatus('Erro: ' + error.message, 'error');
  }
}

// ============================================
// IPC LISTENERS
// ============================================
window.electronAPI.onConnectionStatus((event, data) => {
  updateStatus(data.connected, data.message);
});

window.electronAPI.onLog((event, message) => {
  // Only show important messages in status
  if (message.includes('✓') || message.includes('SUCESSO')) {
    showStatus(message.replace(/\[.*?\]/g, '').trim(), 'success');
  } else if (message.includes('✗') || message.includes('ERRO') || message.includes('FALHA')) {
    showStatus(message.replace(/\[.*?\]/g, '').trim(), 'error');
  } else if (message.includes('pedido(s) para imprimir')) {
    showStatus(message, 'info');
  }
  
  // Always add to hidden log
  if (message.includes('✓')) {
    addLog(message, 'success');
  } else if (message.includes('✗') || message.includes('Erro')) {
    addLog(message, 'error');
  } else {
    addLog(message, 'info');
  }
});

window.electronAPI.onPrintSuccess((event, data) => {
  showStatus(`✓ Pedido impresso!`, 'success');
});

// ============================================
// INITIALIZATION
// ============================================
async function init() {
  showStatus('Iniciando...', 'info');
  
  try {
    await loadPrinters();
    await loadConfig();
    
    const stats = await window.electronAPI.getStats();
    updateStatus(stats.isConnected, stats.isConnected ? 'Conectado' : 'Desconectado');
  } catch (error) {
    showStatus('Erro ao inicializar', 'error');
  }
}

init();
