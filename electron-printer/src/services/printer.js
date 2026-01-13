const { exec } = require('child_process');
const os = require('os');

class PrinterService {
  constructor() {
    this.platform = os.platform();
  }

  async getAvailablePrinters() {
    return new Promise((resolve, reject) => {
      if (this.platform === 'win32') {
        exec('wmic printer get name', (error, stdout) => {
          if (error) {
            resolve([]);
            return;
          }
          const printers = stdout
            .split('\n')
            .slice(1)
            .map(line => line.trim())
            .filter(line => line.length > 0);
          resolve(printers);
        });
      } else if (this.platform === 'darwin') {
        exec('lpstat -p', (error, stdout) => {
          if (error) {
            resolve([]);
            return;
          }
          const printers = stdout
            .split('\n')
            .filter(line => line.startsWith('printer'))
            .map(line => line.split(' ')[1]);
          resolve(printers);
        });
      } else {
        exec('lpstat -p', (error, stdout) => {
          if (error) {
            resolve([]);
            return;
          }
          const printers = stdout
            .split('\n')
            .filter(line => line.startsWith('printer'))
            .map(line => line.split(' ')[1]);
          resolve(printers);
        });
      }
    });
  }

  async printOrder(order, options = {}) {
    const { paperWidth = 48, printerName = '' } = options;
    const receipt = this.formatReceipt(order, paperWidth);
    
    return this.printText(receipt, printerName);
  }

  async printTest(options = {}) {
    const { paperWidth = 48, printerName = '' } = options;
    const testText = this.formatTestReceipt(paperWidth);
    
    return this.printText(testText, printerName);
  }

  formatReceipt(order, width) {
    const divider = '='.repeat(width);
    const thinDivider = '-'.repeat(width);
    
    const lines = [];
    
    // Cabeçalho
    lines.push(this.center('*** PEDIDO ***', width));
    lines.push('');
    lines.push(divider);
    
    // Informações do pedido
    const orderNum = order.id.slice(0, 8).toUpperCase();
    lines.push(this.center(`#${orderNum}`, width));
    lines.push('');
    
    // Tipo de pedido
    const orderTypeLabels = {
      'counter': 'BALCÃO',
      'table': 'MESA',
      'delivery': 'ENTREGA'
    };
    lines.push(`Tipo: ${orderTypeLabels[order.order_type] || order.order_type}`);
    
    // Mesa (se aplicável)
    if (order.table_id) {
      lines.push(`Mesa: ${order.table_id}`);
    }
    
    // Cliente (se aplicável)
    if (order.customer_name) {
      lines.push(`Cliente: ${order.customer_name}`);
    }
    if (order.delivery_phone) {
      lines.push(`Tel: ${order.delivery_phone}`);
    }
    if (order.delivery_address) {
      lines.push(`End: ${order.delivery_address}`);
    }
    
    lines.push(divider);
    lines.push('');
    
    // Itens
    lines.push('ITENS:');
    lines.push(thinDivider);
    
    if (order.order_items && order.order_items.length > 0) {
      for (const item of order.order_items) {
        const qty = item.quantity || 1;
        const name = item.product_name;
        const price = (item.product_price * qty).toFixed(2);
        
        lines.push(`${qty}x ${name}`);
        lines.push(this.alignRight(`R$ ${price}`, width));
        
        if (item.notes) {
          lines.push(`   Obs: ${item.notes}`);
        }
        lines.push('');
      }
    }
    
    lines.push(thinDivider);
    
    // Totais
    if (order.delivery_fee && order.delivery_fee > 0) {
      lines.push(this.alignBoth('Taxa de entrega:', `R$ ${order.delivery_fee.toFixed(2)}`, width));
    }
    
    lines.push(this.alignBoth('TOTAL:', `R$ ${(order.total || 0).toFixed(2)}`, width));
    lines.push('');
    
    // Observações
    if (order.notes) {
      lines.push(divider);
      lines.push('OBSERVAÇÕES:');
      lines.push(order.notes);
    }
    
    lines.push('');
    lines.push(divider);
    
    // Rodapé
    const now = new Date();
    const dateStr = now.toLocaleDateString('pt-BR');
    const timeStr = now.toLocaleTimeString('pt-BR');
    lines.push(this.center(`${dateStr} ${timeStr}`, width));
    lines.push('');
    lines.push('');
    lines.push('');

    return lines.join('\n');
  }

  formatTestReceipt(width) {
    const divider = '='.repeat(width);
    const lines = [];
    
    lines.push(this.center('*** TESTE DE IMPRESSÃO ***', width));
    lines.push('');
    lines.push(divider);
    lines.push('');
    lines.push(this.center('Impressora configurada', width));
    lines.push(this.center('com sucesso!', width));
    lines.push('');
    lines.push(divider);
    lines.push('');
    
    const now = new Date();
    lines.push(this.center(now.toLocaleString('pt-BR'), width));
    lines.push('');
    lines.push('');
    lines.push('');

    return lines.join('\n');
  }

  center(text, width) {
    if (text.length >= width) return text.slice(0, width);
    const padding = Math.floor((width - text.length) / 2);
    return ' '.repeat(padding) + text;
  }

  alignRight(text, width) {
    if (text.length >= width) return text.slice(0, width);
    const padding = width - text.length;
    return ' '.repeat(padding) + text;
  }

  alignBoth(left, right, width) {
    const totalLen = left.length + right.length;
    if (totalLen >= width) return left + right;
    const padding = width - totalLen;
    return left + ' '.repeat(padding) + right;
  }

  async printText(text, printerName = '') {
    return new Promise((resolve, reject) => {
      if (this.platform === 'win32') {
        // Windows: usar PowerShell para imprimir
        const escapedText = text.replace(/"/g, '`"').replace(/\n/g, '`n');
        const printerParam = printerName ? `-PrinterName "${printerName}"` : '';
        
        const psCommand = `
          $text = "${escapedText}"
          $text | Out-Printer ${printerParam}
        `;
        
        exec(`powershell -Command "${psCommand}"`, (error) => {
          if (error) {
            reject(new Error(`Erro ao imprimir: ${error.message}`));
          } else {
            resolve(true);
          }
        });
      } else {
        // macOS/Linux: usar lp
        const fs = require('fs');
        const tmpFile = `/tmp/print_${Date.now()}.txt`;
        
        fs.writeFileSync(tmpFile, text);
        
        const printerParam = printerName ? `-d "${printerName}"` : '';
        exec(`lp ${printerParam} "${tmpFile}"`, (error) => {
          fs.unlinkSync(tmpFile);
          if (error) {
            reject(new Error(`Erro ao imprimir: ${error.message}`));
          } else {
            resolve(true);
          }
        });
      }
    });
  }
}

module.exports = PrinterService;
