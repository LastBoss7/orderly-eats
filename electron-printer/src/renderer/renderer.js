// Tab Navigation
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    // Remove active from all tabs and contents
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    
    // Add active to clicked tab and corresponding content
    tab.classList.add('active');
    const tabId = tab.dataset.tab;
    document.getElementById(tabId).classList.add('active');
  });
});

// Logs
function addLog(message, type = 'info') {
  const logPanel = document.getElementById('logPanel');
  const now = new Date().toLocaleTimeString('pt-BR');
  
  const entry = document.createElement('div');
  entry.className = `log-entry ${type}`;
  entry.innerHTML = `<span class="log-time">[${now}]</span> ${message}`;
  
  logPanel.appendChild(entry);
  logPanel.scrollTop = logPanel.scrollHeight;
  
  // Limitar a 100 entradas
  while (logPanel.children.length > 100) {
    logPanel.removeChild(logPanel.firstChild);
  }
}

function clearLogs() {
  const logPanel = document.getElementById('logPanel');
  logPanel.innerHTML = '<div class="log-entry info">Log limpo</div>';
}

// Status
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

// Load Config
async function loadConfig() {
  try {
    const config = await window.electronAPI.getConfig();
    
    document.getElementById('supabaseUrl').value = config.supabaseUrl || '';
    document.getElementById('supabaseKey').value = config.supabaseKey || '';
    document.getElementById('restaurantId').value = config.restaurantId || '';
    document.getElementById('printerName').value = config.printerName || '';
    document.getElementById('paperWidth').value = config.paperWidth || 48;
    document.getElementById('checkInterval').value = config.checkInterval || 5;
    document.getElementById('minimizeToTray').checked = config.minimizeToTray !== false;
    document.getElementById('autoStart').checked = config.autoStart === true;
    
    // Load printers list
    await loadPrinters();
    
    // Load stats
    const stats = await window.electronAPI.getStats();
    updateStats(stats);
    
  } catch (error) {
    addLog('Erro ao carregar configurações: ' + error.message, 'error');
  }
}

async function loadPrinters() {
  try {
    const printers = await window.electronAPI.getPrinters();
    const select = document.getElementById('printerName');
    const currentValue = select.value;
    
    // Clear existing options except default
    select.innerHTML = '<option value="">Padrão do Sistema</option>';
    
    printers.forEach(printer => {
      const option = document.createElement('option');
      option.value = printer;
      option.textContent = printer;
      select.appendChild(option);
    });
    
    // Restore previous selection
    if (currentValue) {
      select.value = currentValue;
    }
    
    document.getElementById('printerStatus').textContent = printers.length > 0 ? 'OK' : '!';
    
  } catch (error) {
    addLog('Erro ao listar impressoras: ' + error.message, 'error');
  }
}

async function saveConfig() {
  try {
    const config = {
      supabaseUrl: document.getElementById('supabaseUrl').value.trim(),
      supabaseKey: document.getElementById('supabaseKey').value.trim(),
      restaurantId: document.getElementById('restaurantId').value.trim(),
      printerName: document.getElementById('printerName').value,
      paperWidth: parseInt(document.getElementById('paperWidth').value),
      checkInterval: parseInt(document.getElementById('checkInterval').value),
      minimizeToTray: document.getElementById('minimizeToTray').checked,
      autoStart: document.getElementById('autoStart').checked,
    };
    
    await window.electronAPI.saveConfig(config);
    addLog('✓ Configurações salvas com sucesso', 'success');
    
  } catch (error) {
    addLog('Erro ao salvar: ' + error.message, 'error');
  }
}

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

// Event Listeners from Main Process
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

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  loadConfig();
  addLog('Aplicativo iniciado', 'info');
});
