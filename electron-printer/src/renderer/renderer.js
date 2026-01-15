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
document.getElementById('btnTestPrint').addEventListener('click', testPrint);
document.getElementById('btnReconnect').addEventListener('click', reconnect);
document.getElementById('btnClearPending').addEventListener('click', clearPendingOrders);
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

async function clearPendingOrders() {
  if (!confirm('Tem certeza que deseja limpar todos os pedidos pendentes?\n\nEsses pedidos NÃO serão impressos.')) {
    return;
  }
  
  try {
    addLog('Limpando fila de pedidos pendentes...', 'info');
    
    const result = await window.electronAPI.clearPendingOrders();
    
    if (result.success) {
      addLog(`✓ ${result.cleared} pedido(s) removido(s) da fila`, 'success');
      showToast(`${result.cleared} pedido(s) removido(s) da fila`, 'success');
    } else {
      addLog('✗ Erro: ' + result.error, 'error');
      showToast('Erro ao limpar fila', 'error');
    }
  } catch (error) {
    addLog('✗ Erro: ' + error.message, 'error');
    showToast('Erro ao limpar fila', 'error');
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
