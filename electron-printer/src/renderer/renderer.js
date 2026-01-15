// ============================================
// STATE
// ============================================
let systemPrinters = [];
let selectedPrinters = [];

// ============================================
// LOG
// ============================================
function addLog(message, type = 'info') {
  const logContent = document.getElementById('logContent');
  const now = new Date().toLocaleTimeString('pt-BR');
  
  const entry = document.createElement('div');
  entry.className = `log-entry ${type}`;
  entry.textContent = `[${now}] ${message}`;
  
  logContent.appendChild(entry);
  logContent.scrollTop = logContent.scrollHeight;
  
  // Keep only last 50 entries
  while (logContent.children.length > 50) {
    logContent.removeChild(logContent.firstChild);
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
    select.innerHTML = '<option value="">Padrão do Sistema</option>';
    
    systemPrinters.forEach(printer => {
      const option = document.createElement('option');
      option.value = printer.name;
      option.textContent = printer.isDefault 
        ? `{${printer.displayName}}` 
        : printer.displayName;
      select.appendChild(option);
    });
    
    // Set current printer
    if (config.printerName) {
      select.value = config.printerName;
    }
    
    addLog(`${systemPrinters.length} impressora(s) encontrada(s)`, 'info');
  } catch (error) {
    addLog('Erro ao carregar impressoras: ' + error.message, 'error');
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
  
  try {
    await window.electronAPI.saveSelectedPrinters(selectedPrinters);
    addLog(`${selectedPrinters.length} impressora(s) ativada(s)`, 'success');
    closePrinterListModal();
  } catch (error) {
    addLog('Erro ao salvar impressoras: ' + error.message, 'error');
  }
}

// ============================================
// CONFIGURATION
// ============================================
async function loadConfig() {
  try {
    const config = await window.electronAPI.getConfig();
    
    // Load form values
    document.getElementById('printerSelect').value = config.printerName || '';
    document.getElementById('paperWidth').value = config.paperWidth || 46;
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
    addLog('Erro ao carregar configurações: ' + error.message, 'error');
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
    const config = {
      printerName: document.getElementById('printerSelect').value,
      paperWidth: parseInt(document.getElementById('paperWidth').value) || 46,
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
    addLog('✓ Configurações salvas', 'success');
    
  } catch (error) {
    addLog('Erro ao salvar: ' + error.message, 'error');
  }
}

// ============================================
// ACTIONS
// ============================================
async function testPrint() {
  try {
    addLog('Enviando impressão de teste...', 'info');
    const result = await window.electronAPI.testPrint();
    
    if (result.success) {
      addLog('✓ Impressão de teste enviada', 'success');
    } else {
      addLog('✗ Erro: ' + result.error, 'error');
    }
  } catch (error) {
    addLog('✗ Erro: ' + error.message, 'error');
  }
}

async function reconnect() {
  try {
    const statusDot = document.getElementById('statusDot');
    statusDot.className = 'status-dot';
    statusDot.style.background = '#f59e0b';
    document.getElementById('statusText').textContent = 'Conectando...';
    
    addLog('Reconectando...', 'info');
    const success = await window.electronAPI.reconnect();
    
    if (success) {
      addLog('✓ Conectado', 'success');
    } else {
      addLog('✗ Falha na conexão', 'error');
    }
  } catch (error) {
    addLog('Erro ao reconectar: ' + error.message, 'error');
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
  addLog(`✓ Pedido #${data.orderId.slice(0, 8)} impresso`, 'success');
});

// ============================================
// INITIALIZATION
// ============================================
async function init() {
  addLog('Aplicativo iniciado', 'info');
  
  try {
    await loadPrinters();
    await loadConfig();
    
    const stats = await window.electronAPI.getStats();
    updateStatus(stats.isConnected, stats.isConnected ? 'Conectado' : 'Desconectado');
  } catch (error) {
    addLog('Erro ao inicializar: ' + error.message, 'error');
  }
}

init();
