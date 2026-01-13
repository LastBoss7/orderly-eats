const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { ESCPOS, textCommand, lineFeed } = require('./escpos-commands');

// Try to load USB module (optional)
let USBPrinterService = null;
try {
  USBPrinterService = require('./usb-printer');
} catch (e) {
  console.log('USB module not available, using system printing only');
}

class PrinterService {
  constructor() {
    this.platform = os.platform();
    this.usbPrinter = USBPrinterService ? new USBPrinterService() : null;
    this.useEscPos = false;
    this.connectedPrinter = null;
  }

  /**
   * Get all available printers (system + USB)
   */
  async getAvailablePrinters() {
    const printers = [];
    
    // Get system printers
    const systemPrinters = await this.getSystemPrinters();
    printers.push(...systemPrinters.map(name => ({
      name,
      type: 'system',
      path: name,
    })));
    
    // Get USB printers
    if (this.usbPrinter) {
      try {
        const usbPrinters = this.usbPrinter.listPrinters();
        printers.push(...usbPrinters.map(p => ({
          name: p.name,
          type: 'usb',
          path: p.path,
          vendorId: p.vendorId,
          productId: p.productId,
        })));
      } catch (e) {
        console.error('Error listing USB printers:', e);
      }
    }
    
    return printers;
  }

  /**
   * Get system printers
   */
  async getSystemPrinters() {
    return new Promise((resolve) => {
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

  /**
   * Connect to USB printer for ESC/POS printing
   */
  async connectUSB(vendorId, productId) {
    if (!this.usbPrinter) {
      throw new Error('Módulo USB não disponível');
    }
    
    await this.usbPrinter.connect(vendorId, productId);
    this.useEscPos = true;
    this.connectedPrinter = { vendorId, productId };
    
    return true;
  }

  /**
   * Disconnect USB printer
   */
  disconnectUSB() {
    if (this.usbPrinter) {
      this.usbPrinter.disconnect();
    }
    this.useEscPos = false;
    this.connectedPrinter = null;
  }

  /**
   * Print order
   */
  async printOrder(order, options = {}) {
    const { layout = {}, printerName = '', useEscPos = false, printerInfo = null } = options;
    
    // Check if we should use ESC/POS
    if (useEscPos && printerInfo && printerInfo.type === 'usb') {
      return this.printOrderEscPos(order, layout, printerInfo);
    }
    
    // Fallback to text printing
    const receipt = this.formatReceipt(order, layout);
    return this.printText(receipt, printerName);
  }

  /**
   * Print order using ESC/POS commands
   */
  async printOrderEscPos(order, layout, printerInfo) {
    if (!this.usbPrinter) {
      throw new Error('Módulo USB não disponível');
    }

    // Connect if not connected
    if (!this.usbPrinter.isConnected) {
      await this.usbPrinter.connect(printerInfo.vendorId, printerInfo.productId);
    }

    const commands = this.buildEscPosReceipt(order, layout);
    await this.usbPrinter.write(commands);
    
    return true;
  }

  /**
   * Build ESC/POS receipt commands
   */
  buildEscPosReceipt(order, layout) {
    const buffers = [];
    const width = layout.paperWidth || 48;
    const encoding = 'cp860'; // Portuguese encoding
    
    // Initialize printer
    buffers.push(ESCPOS.HW_INIT);
    
    // Set default font
    buffers.push(ESCPOS.TXT_FONT_A);
    buffers.push(ESCPOS.TXT_SIZE_NORMAL);
    
    // Header - Restaurant info
    buffers.push(ESCPOS.TXT_ALIGN_CENTER);
    
    // TODO: Add logo support
    // if (layout.showLogo && layout.logoData) {
    //   buffers.push(this.imageToEscPos(layout.logoData, width));
    // }
    
    if (layout.showRestaurantName) {
      buffers.push(ESCPOS.TXT_SIZE_2X);
      buffers.push(ESCPOS.TXT_BOLD_ON);
      buffers.push(Buffer.from('MEU RESTAURANTE\n', encoding));
      buffers.push(ESCPOS.TXT_BOLD_OFF);
      buffers.push(ESCPOS.TXT_SIZE_NORMAL);
    }
    
    if (layout.showAddress) {
      buffers.push(Buffer.from('Rua Exemplo, 123 - Centro\n', encoding));
    }
    
    if (layout.showPhone) {
      buffers.push(Buffer.from('Tel: (11) 99999-9999\n', encoding));
    }
    
    if (layout.showCnpj) {
      buffers.push(Buffer.from('CNPJ: 12.345.678/0001-90\n', encoding));
    }
    
    buffers.push(lineFeed(1));
    
    // Title
    buffers.push(ESCPOS.TXT_BOLD_ON);
    buffers.push(ESCPOS.TXT_SIZE_2H);
    buffers.push(Buffer.from((layout.receiptTitle || '*** PEDIDO ***') + '\n', encoding));
    buffers.push(ESCPOS.TXT_SIZE_NORMAL);
    buffers.push(ESCPOS.TXT_BOLD_OFF);
    
    // Divider
    buffers.push(Buffer.from('='.repeat(Math.min(width, 42)) + '\n', encoding));
    
    // Order number
    if (layout.showOrderNumber) {
      buffers.push(ESCPOS.TXT_SIZE_2X);
      buffers.push(ESCPOS.TXT_BOLD_ON);
      const orderNum = order.id.slice(0, 8).toUpperCase();
      buffers.push(Buffer.from(`#${orderNum}\n`, encoding));
      buffers.push(ESCPOS.TXT_BOLD_OFF);
      buffers.push(ESCPOS.TXT_SIZE_NORMAL);
      buffers.push(lineFeed(1));
    }
    
    // Order type and table - left aligned
    buffers.push(ESCPOS.TXT_ALIGN_LEFT);
    
    if (layout.showOrderType) {
      const orderTypeLabels = {
        'counter': 'BALCAO',
        'table': 'MESA',
        'delivery': 'ENTREGA'
      };
      buffers.push(Buffer.from(`Tipo: ${orderTypeLabels[order.order_type] || order.order_type}\n`, encoding));
    }
    
    if (layout.showTable && order.table_id) {
      buffers.push(Buffer.from(`Mesa: ${order.table_id}\n`, encoding));
    }
    
    // Customer info
    if (layout.showCustomerName && order.customer_name) {
      buffers.push(Buffer.from(`Cliente: ${order.customer_name}\n`, encoding));
    }
    
    if (layout.showCustomerPhone && order.delivery_phone) {
      buffers.push(Buffer.from(`Tel: ${order.delivery_phone}\n`, encoding));
    }
    
    if (layout.showDeliveryAddress && order.delivery_address) {
      buffers.push(Buffer.from(`End: ${order.delivery_address}\n`, encoding));
    }
    
    // Divider
    buffers.push(Buffer.from('='.repeat(Math.min(width, 42)) + '\n', encoding));
    buffers.push(lineFeed(1));
    
    // Items header
    buffers.push(ESCPOS.TXT_BOLD_ON);
    buffers.push(Buffer.from('ITENS:\n', encoding));
    buffers.push(ESCPOS.TXT_BOLD_OFF);
    buffers.push(Buffer.from('-'.repeat(Math.min(width, 42)) + '\n', encoding));
    
    // Items
    if (order.order_items && order.order_items.length > 0) {
      for (const item of order.order_items) {
        const qty = item.quantity || 1;
        const name = item.product_name;
        
        // Item line
        buffers.push(ESCPOS.TXT_SIZE_2H);
        buffers.push(Buffer.from(`${qty}x ${name}\n`, encoding));
        buffers.push(ESCPOS.TXT_SIZE_NORMAL);
        
        if (layout.showItemPrices) {
          const price = (item.product_price * qty).toFixed(2);
          buffers.push(ESCPOS.TXT_ALIGN_RIGHT);
          buffers.push(Buffer.from(`R$ ${price}\n`, encoding));
          buffers.push(ESCPOS.TXT_ALIGN_LEFT);
        }
        
        if (layout.showItemNotes && item.notes) {
          buffers.push(Buffer.from(`   Obs: ${item.notes}\n`, encoding));
        }
        
        buffers.push(lineFeed(1));
      }
    }
    
    buffers.push(Buffer.from('-'.repeat(Math.min(width, 42)) + '\n', encoding));
    
    // Totals
    if (layout.showTotals) {
      if (layout.showDeliveryFee && order.delivery_fee && order.delivery_fee > 0) {
        const line = this.formatLineItem('Taxa de entrega:', `R$ ${order.delivery_fee.toFixed(2)}`, width);
        buffers.push(Buffer.from(line + '\n', encoding));
      }
      
      // Total with larger font
      buffers.push(ESCPOS.TXT_SIZE_2X);
      buffers.push(ESCPOS.TXT_BOLD_ON);
      const totalLine = this.formatLineItem('TOTAL:', `R$ ${(order.total || 0).toFixed(2)}`, Math.floor(width / 2));
      buffers.push(Buffer.from(totalLine + '\n', encoding));
      buffers.push(ESCPOS.TXT_BOLD_OFF);
      buffers.push(ESCPOS.TXT_SIZE_NORMAL);
    }
    
    buffers.push(lineFeed(1));
    
    // Notes
    if (order.notes) {
      buffers.push(Buffer.from('='.repeat(Math.min(width, 42)) + '\n', encoding));
      buffers.push(ESCPOS.TXT_BOLD_ON);
      buffers.push(Buffer.from('OBSERVACOES:\n', encoding));
      buffers.push(ESCPOS.TXT_BOLD_OFF);
      buffers.push(Buffer.from(order.notes + '\n', encoding));
    }
    
    buffers.push(lineFeed(1));
    buffers.push(Buffer.from('='.repeat(Math.min(width, 42)) + '\n', encoding));
    
    // Footer
    buffers.push(ESCPOS.TXT_ALIGN_CENTER);
    
    if (layout.showDateTime) {
      const now = new Date();
      const dateStr = now.toLocaleDateString('pt-BR');
      const timeStr = now.toLocaleTimeString('pt-BR');
      buffers.push(Buffer.from(`${dateStr} ${timeStr}\n`, encoding));
    }
    
    if (layout.footerMessage) {
      buffers.push(lineFeed(1));
      buffers.push(Buffer.from(layout.footerMessage + '\n', encoding));
    }
    
    // Feed and cut
    buffers.push(lineFeed(4));
    buffers.push(ESCPOS.PAPER_PARTIAL_CUT);
    
    return Buffer.concat(buffers);
  }

  /**
   * Format a line item with left and right text
   */
  formatLineItem(left, right, width) {
    const totalLen = left.length + right.length;
    if (totalLen >= width) return left + right;
    const padding = width - totalLen;
    return left + ' '.repeat(padding) + right;
  }

  /**
   * Print test page
   */
  async printTest(options = {}) {
    const { layout = {}, printerName = '', useEscPos = false, printerInfo = null } = options;
    
    if (useEscPos && printerInfo && printerInfo.type === 'usb') {
      return this.printTestEscPos(layout, printerInfo);
    }
    
    const testText = this.formatTestReceipt(layout);
    return this.printText(testText, printerName);
  }

  /**
   * Print test using ESC/POS
   */
  async printTestEscPos(layout, printerInfo) {
    if (!this.usbPrinter) {
      throw new Error('Módulo USB não disponível');
    }

    if (!this.usbPrinter.isConnected) {
      await this.usbPrinter.connect(printerInfo.vendorId, printerInfo.productId);
    }

    const width = layout.paperWidth || 48;
    const encoding = 'cp860';
    const buffers = [];
    
    // Initialize
    buffers.push(ESCPOS.HW_INIT);
    buffers.push(ESCPOS.TXT_ALIGN_CENTER);
    
    // Title
    buffers.push(ESCPOS.TXT_SIZE_2X);
    buffers.push(ESCPOS.TXT_BOLD_ON);
    buffers.push(Buffer.from('TESTE DE IMPRESSAO\n', encoding));
    buffers.push(ESCPOS.TXT_BOLD_OFF);
    buffers.push(ESCPOS.TXT_SIZE_NORMAL);
    
    buffers.push(lineFeed(1));
    buffers.push(Buffer.from('='.repeat(Math.min(width, 32)) + '\n', encoding));
    buffers.push(lineFeed(1));
    
    buffers.push(Buffer.from('Impressora ESC/POS\n', encoding));
    buffers.push(Buffer.from('configurada com sucesso!\n', encoding));
    
    buffers.push(lineFeed(1));
    buffers.push(Buffer.from('='.repeat(Math.min(width, 32)) + '\n', encoding));
    buffers.push(lineFeed(1));
    
    // Test font sizes
    buffers.push(ESCPOS.TXT_ALIGN_LEFT);
    buffers.push(Buffer.from('Tamanhos de fonte:\n', encoding));
    
    buffers.push(ESCPOS.TXT_SIZE_NORMAL);
    buffers.push(Buffer.from('Normal\n', encoding));
    
    buffers.push(ESCPOS.TXT_SIZE_2H);
    buffers.push(Buffer.from('Altura 2x\n', encoding));
    
    buffers.push(ESCPOS.TXT_SIZE_2W);
    buffers.push(Buffer.from('Largura 2x\n', encoding));
    
    buffers.push(ESCPOS.TXT_SIZE_2X);
    buffers.push(Buffer.from('2x2\n', encoding));
    
    buffers.push(ESCPOS.TXT_SIZE_NORMAL);
    buffers.push(lineFeed(1));
    
    // Test styles
    buffers.push(Buffer.from('Estilos:\n', encoding));
    
    buffers.push(ESCPOS.TXT_BOLD_ON);
    buffers.push(Buffer.from('Texto em negrito\n', encoding));
    buffers.push(ESCPOS.TXT_BOLD_OFF);
    
    buffers.push(ESCPOS.TXT_UNDERL_ON);
    buffers.push(Buffer.from('Texto sublinhado\n', encoding));
    buffers.push(ESCPOS.TXT_UNDERL_OFF);
    
    buffers.push(lineFeed(1));
    buffers.push(Buffer.from('='.repeat(Math.min(width, 32)) + '\n', encoding));
    
    // Date/time
    buffers.push(ESCPOS.TXT_ALIGN_CENTER);
    const now = new Date();
    buffers.push(Buffer.from(now.toLocaleString('pt-BR') + '\n', encoding));
    
    // Feed and cut
    buffers.push(lineFeed(4));
    buffers.push(ESCPOS.PAPER_PARTIAL_CUT);
    
    await this.usbPrinter.write(Buffer.concat(buffers));
    return true;
  }

  /**
   * Print test with custom layout
   */
  async printTestWithLayout(options = {}) {
    const { layout = {}, printerName = '', useEscPos = false, printerInfo = null } = options;
    
    // Create sample order
    const sampleOrder = {
      id: 'PREVIEW123456789',
      order_type: 'delivery',
      table_id: null,
      customer_name: 'Joao Silva',
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
    
    return this.printOrder(sampleOrder, { layout, printerName, useEscPos, printerInfo });
  }

  // ============================================
  // TEXT PRINTING (Fallback)
  // ============================================

  formatReceipt(order, layout) {
    const width = layout.paperWidth || 48;
    const divider = '='.repeat(width);
    const thinDivider = '-'.repeat(width);
    
    const lines = [];
    
    // Header
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
        'counter': 'BALCAO',
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
      
      lines.push(this.alignBoth('TOTAL:', `R$ ${(order.total || 0).toFixed(2)}`, width));
    }
    
    lines.push('');
    
    // Notes
    if (order.notes) {
      lines.push(divider);
      lines.push('OBSERVACOES:');
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
    
    lines.push('');
    lines.push('');
    lines.push('');

    return lines.join('\n');
  }

  formatTestReceipt(layout) {
    const width = layout.paperWidth || 48;
    const divider = '='.repeat(width);
    const lines = [];
    
    lines.push(this.center('*** TESTE DE IMPRESSAO ***', width));
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
      const tmpFile = path.join(os.tmpdir(), `print_${Date.now()}.txt`);
      fs.writeFileSync(tmpFile, text, 'utf8');
      
      if (this.platform === 'win32') {
        const printerParam = printerName ? `-PrinterName "${printerName}"` : '';
        const psCommand = `Get-Content -Path "${tmpFile}" -Raw | Out-Printer ${printerParam}`;
        
        exec(`powershell -Command "${psCommand}"`, (error) => {
          try { fs.unlinkSync(tmpFile); } catch (e) {}
          
          if (error) {
            reject(new Error(`Erro ao imprimir: ${error.message}`));
          } else {
            resolve(true);
          }
        });
      } else {
        const printerParam = printerName ? `-d "${printerName}"` : '';
        exec(`lp ${printerParam} "${tmpFile}"`, (error) => {
          try { fs.unlinkSync(tmpFile); } catch (e) {}
          
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
