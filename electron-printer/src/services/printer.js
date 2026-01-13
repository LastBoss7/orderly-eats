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
      } else if (this.platform === 'darwin' || this.platform === 'linux') {
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
        resolve([]);
      }
    });
  }

  async printOrder(order, options = {}) {
    const { layout = {}, printerName = '' } = options;
    const receipt = this.formatReceipt(order, layout);
    
    return this.printText(receipt, printerName);
  }

  async printTest(options = {}) {
    const { layout = {}, printerName = '' } = options;
    const testText = this.formatTestReceipt(layout);
    
    return this.printText(testText, printerName);
  }

  async printTestWithLayout(options = {}) {
    const { layout = {}, printerName = '' } = options;
    
    // Create a sample order for preview
    const sampleOrder = {
      id: 'PREVIEW123456789',
      order_type: 'delivery',
      table_id: null,
      customer_name: 'João Silva',
      delivery_phone: '(11) 98888-7777',
      delivery_address: 'Av. Brasil, 456, Ap 12',
      delivery_fee: 8.00,
      total: 98.30,
      notes: 'Tocar campainha 2x',
      order_items: [
        { quantity: 2, product_name: 'X-Burguer Especial', product_price: 29.90, notes: null },
        { quantity: 1, product_name: 'Batata Frita Grande', product_price: 18.50, notes: 'Sem sal' },
        { quantity: 2, product_name: 'Refrigerante 350ml', product_price: 6.00, notes: null },
      ]
    };
    
    const receipt = this.formatReceipt(sampleOrder, layout);
    return this.printText(receipt, printerName);
  }

  formatReceipt(order, layout) {
    const width = layout.paperWidth || 48;
    const divider = '='.repeat(width);
    const thinDivider = '-'.repeat(width);
    
    const lines = [];
    
    // Header with restaurant info
    if (layout.showRestaurantName) {
      lines.push(this.center('MEU RESTAURANTE', width));
    }
    
    if (layout.showAddress) {
      lines.push(this.center('Rua Exemplo, 123 - Centro', width));
    }
    
    if (layout.showPhone) {
      lines.push(this.center('Tel: (11) 99999-9999', width));
    }
    
    if (layout.showCnpj) {
      lines.push(this.center('CNPJ: 12.345.678/0001-90', width));
    }
    
    if (layout.showRestaurantName || layout.showAddress || layout.showPhone || layout.showCnpj) {
      lines.push('');
    }
    
    // Title
    lines.push(this.center(layout.receiptTitle || '*** PEDIDO ***', width));
    lines.push('');
    lines.push(divider);
    
    // Order number
    if (layout.showOrderNumber) {
      const orderNum = order.id.slice(0, 8).toUpperCase();
      lines.push(this.center(`#${orderNum}`, width));
      lines.push('');
    }
    
    // Order type
    if (layout.showOrderType) {
      const orderTypeLabels = {
        'counter': 'BALCÃO',
        'table': 'MESA',
        'delivery': 'ENTREGA'
      };
      lines.push(`Tipo: ${orderTypeLabels[order.order_type] || order.order_type}`);
    }
    
    // Table
    if (layout.showTable && order.table_id) {
      lines.push(`Mesa: ${order.table_id}`);
    }
    
    // Customer info
    if (layout.showCustomerName && order.customer_name) {
      lines.push(`Cliente: ${order.customer_name}`);
    }
    
    if (layout.showCustomerPhone && order.delivery_phone) {
      lines.push(`Tel: ${order.delivery_phone}`);
    }
    
    if (layout.showDeliveryAddress && order.delivery_address) {
      lines.push(`End: ${order.delivery_address}`);
    }
    
    lines.push(divider);
    lines.push('');
    
    // Items
    lines.push('ITENS:');
    lines.push(thinDivider);
    
    if (order.order_items && order.order_items.length > 0) {
      for (const item of order.order_items) {
        const qty = item.quantity || 1;
        const name = item.product_name;
        
        lines.push(`${qty}x ${name}`);
        
        if (layout.showItemPrices) {
          const price = (item.product_price * qty).toFixed(2);
          lines.push(this.alignRight(`R$ ${price}`, width));
        }
        
        if (layout.showItemNotes && item.notes) {
          lines.push(`   Obs: ${item.notes}`);
        }
        lines.push('');
      }
    }
    
    lines.push(thinDivider);
    
    // Totals
    if (layout.showTotals) {
      if (layout.showDeliveryFee && order.delivery_fee && order.delivery_fee > 0) {
        lines.push(this.alignBoth('Taxa de entrega:', `R$ ${order.delivery_fee.toFixed(2)}`, width));
      }
      
      const totalLine = this.alignBoth('TOTAL:', `R$ ${(order.total || 0).toFixed(2)}`, width);
      lines.push(layout.boldTotal ? totalLine : totalLine);
    }
    
    lines.push('');
    
    // Notes
    if (order.notes) {
      lines.push(divider);
      lines.push('OBSERVAÇÕES:');
      lines.push(order.notes);
    }
    
    lines.push('');
    lines.push(divider);
    
    // Footer
    if (layout.showDateTime) {
      const now = new Date();
      const dateStr = now.toLocaleDateString('pt-BR');
      const timeStr = now.toLocaleTimeString('pt-BR');
      lines.push(this.center(`${dateStr} ${timeStr}`, width));
    }
    
    if (layout.footerMessage) {
      lines.push('');
      lines.push(this.center(layout.footerMessage, width));
    }
    
    // Add blank lines for paper cutting
    lines.push('');
    lines.push('');
    lines.push('');

    return lines.join('\n');
  }

  formatTestReceipt(layout) {
    const width = layout.paperWidth || 48;
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
    lines.push(this.center(`Largura: ${width} caracteres`, width));
    lines.push(this.center(`Papel: ${layout.paperSize || '58mm'}`, width));
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
        const fs = require('fs');
        const tmpFile = `${process.env.TEMP}\\print_${Date.now()}.txt`;
        
        fs.writeFileSync(tmpFile, text, 'utf8');
        
        const printerParam = printerName ? `-PrinterName "${printerName}"` : '';
        const psCommand = `Get-Content -Path "${tmpFile}" -Raw | Out-Printer ${printerParam}`;
        
        exec(`powershell -Command "${psCommand}"`, (error) => {
          try {
            fs.unlinkSync(tmpFile);
          } catch (e) {}
          
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
        
        fs.writeFileSync(tmpFile, text, 'utf8');
        
        const printerParam = printerName ? `-d "${printerName}"` : '';
        exec(`lp ${printerParam} "${tmpFile}"`, (error) => {
          try {
            fs.unlinkSync(tmpFile);
          } catch (e) {}
          
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
