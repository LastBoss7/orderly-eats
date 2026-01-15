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
    const { layout = {}, restaurantInfo = {}, printerName = '', useEscPos = false, printerInfo = null } = options;
    
    // Check if we should use ESC/POS
    if (useEscPos && printerInfo && printerInfo.type === 'usb') {
      return this.printOrderEscPos(order, layout, restaurantInfo, printerInfo);
    }
    
    // Fallback to text printing
    const receipt = this.formatReceipt(order, layout, restaurantInfo);
    return this.printText(receipt, printerName);
  }

  /**
   * Print order using ESC/POS commands
   */
  async printOrderEscPos(order, layout, restaurantInfo, printerInfo) {
    if (!this.usbPrinter) {
      throw new Error('Módulo USB não disponível');
    }

    // Connect if not connected
    if (!this.usbPrinter.isConnected) {
      await this.usbPrinter.connect(printerInfo.vendorId, printerInfo.productId);
    }

    const commands = this.buildEscPosReceipt(order, layout, restaurantInfo);
    await this.usbPrinter.write(commands);
    
    return true;
  }

  /**
   * Build ESC/POS receipt commands
   */
  buildEscPosReceipt(order, layout, restaurantInfo = {}) {
    const buffers = [];
    const width = layout.paperWidth || (layout.paperSize === '58mm' ? 32 : 48);
    const encoding = 'cp860'; // Portuguese encoding
    
    // Initialize printer
    buffers.push(ESCPOS.HW_INIT);
    
    // Set default font
    buffers.push(ESCPOS.TXT_FONT_A);
    buffers.push(ESCPOS.TXT_SIZE_NORMAL);
    
    // Header - Restaurant info
    buffers.push(ESCPOS.TXT_ALIGN_CENTER);
    
    if (layout.showRestaurantName && restaurantInfo.name) {
      buffers.push(ESCPOS.TXT_SIZE_2H);
      buffers.push(ESCPOS.TXT_BOLD_ON);
      buffers.push(Buffer.from(this.removeAccents(restaurantInfo.name.toUpperCase()) + '\n', encoding));
      buffers.push(ESCPOS.TXT_BOLD_OFF);
      buffers.push(ESCPOS.TXT_SIZE_NORMAL);
    }
    
    if (layout.showAddress && restaurantInfo.address) {
      buffers.push(Buffer.from(this.removeAccents(restaurantInfo.address) + '\n', encoding));
    }
    
    if (layout.showPhone && restaurantInfo.phone) {
      buffers.push(Buffer.from('Tel: ' + restaurantInfo.phone + '\n', encoding));
    }
    
    if (layout.showCnpj && restaurantInfo.cnpj) {
      buffers.push(Buffer.from('CNPJ: ' + restaurantInfo.cnpj + '\n', encoding));
    }
    
    buffers.push(lineFeed(1));
    
    // Title
    buffers.push(ESCPOS.TXT_BOLD_ON);
    buffers.push(ESCPOS.TXT_SIZE_2H);
    buffers.push(Buffer.from((layout.receiptTitle || '*** PEDIDO ***') + '\n', encoding));
    buffers.push(ESCPOS.TXT_SIZE_NORMAL);
    buffers.push(ESCPOS.TXT_BOLD_OFF);
    
    // Divider
    buffers.push(Buffer.from('='.repeat(width) + '\n', encoding));
    
    // Order number - LARGE and BOLD
    if (layout.showOrderNumber) {
      buffers.push(ESCPOS.TXT_SIZE_2X);
      buffers.push(ESCPOS.TXT_BOLD_ON);
      const orderNum = order.order_number || order.id.slice(0, 8).toUpperCase();
      buffers.push(Buffer.from(`#${orderNum}\n`, encoding));
      buffers.push(ESCPOS.TXT_BOLD_OFF);
      buffers.push(ESCPOS.TXT_SIZE_NORMAL);
      buffers.push(lineFeed(1));
    }
    
    // Order info - left aligned
    buffers.push(ESCPOS.TXT_ALIGN_LEFT);
    
    if (layout.showOrderType) {
      const orderTypeLabels = {
        'counter': 'BALCAO',
        'table': 'MESA',
        'delivery': 'ENTREGA'
      };
      buffers.push(Buffer.from(`Tipo: ${orderTypeLabels[order.order_type] || order.order_type}\n`, encoding));
    }
    
    if (layout.showTable && (order.table_number || order.table_id)) {
      buffers.push(Buffer.from(`Mesa: ${order.table_number || order.table_id}\n`, encoding));
    }

    if (layout.showWaiter && order.waiter_name) {
      buffers.push(Buffer.from(`Garcom: ${this.removeAccents(order.waiter_name)}\n`, encoding));
    }
    
    // Customer info
    if (layout.showCustomerName && order.customer_name) {
      buffers.push(Buffer.from(`Cliente: ${this.removeAccents(order.customer_name)}\n`, encoding));
    }
    
    if (layout.showCustomerPhone && order.delivery_phone) {
      buffers.push(Buffer.from(`Tel: ${order.delivery_phone}\n`, encoding));
    }
    
    if (layout.showDeliveryAddress && order.delivery_address) {
      const addr = this.removeAccents(order.delivery_address);
      if (addr.length > width - 5) {
        buffers.push(Buffer.from(`End: ${addr.slice(0, width - 5)}\n`, encoding));
        buffers.push(Buffer.from(`     ${addr.slice(width - 5)}\n`, encoding));
      } else {
        buffers.push(Buffer.from(`End: ${addr}\n`, encoding));
      }
    }
    
    // Divider
    buffers.push(Buffer.from('='.repeat(width) + '\n', encoding));
    buffers.push(lineFeed(1));
    
    // Items header
    buffers.push(ESCPOS.TXT_BOLD_ON);
    buffers.push(Buffer.from('ITENS:\n', encoding));
    buffers.push(ESCPOS.TXT_BOLD_OFF);
    buffers.push(Buffer.from('-'.repeat(width) + '\n', encoding));
    
    // Items
    if (order.order_items && order.order_items.length > 0) {
      for (const item of order.order_items) {
        const qty = item.quantity || 1;
        let itemName = this.removeAccents(item.product_name);
        
        // Add size if enabled
        if (layout.showItemSize && item.product_size) {
          itemName += ` (${this.removeAccents(item.product_size)})`;
        }
        
        // Item line - normal size for better readability
        if (layout.boldItems) {
          buffers.push(ESCPOS.TXT_BOLD_ON);
        }
        
        // Use normal size to fit more characters per line
        const itemLine = `${qty}x ${itemName}`;
        // Use width - 4 for margin, no truncation unless really needed
        const maxItemLen = width - 4;
        if (itemLine.length > maxItemLen) {
          buffers.push(Buffer.from(`${itemLine.slice(0, maxItemLen - 3)}...\n`, encoding));
        } else {
          buffers.push(Buffer.from(`${itemLine}\n`, encoding));
        }
        
        if (layout.boldItems) {
          buffers.push(ESCPOS.TXT_BOLD_OFF);
        }
        
        if (layout.showItemPrices) {
          const price = (item.product_price * qty).toFixed(2);
          buffers.push(ESCPOS.TXT_ALIGN_RIGHT);
          buffers.push(Buffer.from(`R$ ${price}\n`, encoding));
          buffers.push(ESCPOS.TXT_ALIGN_LEFT);
        }
        
        if (layout.showItemNotes && item.notes) {
          buffers.push(Buffer.from(`   -> ${this.removeAccents(item.notes)}\n`, encoding));
        }
        
        buffers.push(lineFeed(1));
      }
    }
    
    buffers.push(Buffer.from('-'.repeat(width) + '\n', encoding));
    
    // Notes
    if (order.notes) {
      buffers.push(lineFeed(1));
      buffers.push(ESCPOS.TXT_BOLD_ON);
      buffers.push(Buffer.from('OBS: ', encoding));
      buffers.push(ESCPOS.TXT_BOLD_OFF);
      buffers.push(Buffer.from(this.removeAccents(order.notes) + '\n', encoding));
      buffers.push(lineFeed(1));
    }
    
    // Totals
    if (layout.showTotals) {
      if (layout.showDeliveryFee && order.delivery_fee && order.delivery_fee > 0) {
        const line = this.formatLineItem('Taxa entrega:', `R$ ${order.delivery_fee.toFixed(2)}`, width);
        buffers.push(Buffer.from(line + '\n', encoding));
      }
      
      // Total with larger font
      buffers.push(lineFeed(1));
      if (layout.boldTotal) {
        buffers.push(ESCPOS.TXT_BOLD_ON);
      }
      buffers.push(ESCPOS.TXT_SIZE_2X);
      const totalLine = this.formatLineItem('TOTAL:', `R$ ${(order.total || 0).toFixed(2)}`, Math.floor(width / 2));
      buffers.push(Buffer.from(totalLine + '\n', encoding));
      buffers.push(ESCPOS.TXT_SIZE_NORMAL);
      if (layout.boldTotal) {
        buffers.push(ESCPOS.TXT_BOLD_OFF);
      }
    }

    // Payment method
    if (layout.showPaymentMethod && order.payment_method) {
      const paymentLabels = {
        'cash': 'Dinheiro',
        'credit': 'Credito',
        'debit': 'Debito',
        'pix': 'PIX',
      };
      buffers.push(Buffer.from(this.formatLineItem('Pagamento:', paymentLabels[order.payment_method] || order.payment_method, width) + '\n', encoding));
    }
    
    buffers.push(lineFeed(1));
    buffers.push(Buffer.from('='.repeat(width) + '\n', encoding));
    
    // Footer
    buffers.push(ESCPOS.TXT_ALIGN_CENTER);
    
    if (layout.showDateTime) {
      const now = new Date();
      const dateStr = now.toLocaleDateString('pt-BR');
      const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      buffers.push(Buffer.from(`${dateStr} ${timeStr}\n`, encoding));
    }
    
    if (layout.footerMessage) {
      buffers.push(lineFeed(1));
      buffers.push(Buffer.from(this.removeAccents(layout.footerMessage) + '\n', encoding));
    }
    
    // Feed and cut
    buffers.push(lineFeed(4));
    buffers.push(ESCPOS.PAPER_PARTIAL_CUT);
    
    return Buffer.concat(buffers);
  }

  /**
   * Remove accents for better thermal printer compatibility
   */
  removeAccents(str) {
    if (!str) return '';
    return str
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/ç/g, 'c')
      .replace(/Ç/g, 'C');
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

  formatReceipt(order, layout, restaurantInfo = {}) {
    // For thermal printers via text mode, use fixed width chars
    // Common widths: 32 (58mm), 42 (80mm standard), 48 (80mm compact)
    // IMPORTANT: Use layout.paperWidth exactly as configured by user
    const width = parseInt(layout.paperWidth, 10) || 42;
    const divider = '='.repeat(width);
    const thinDivider = '-'.repeat(width);
    
    const lines = [];
    
    // Header - center text properly for better formatting
    if (layout.showRestaurantName && restaurantInfo.name) {
      const name = this.removeAccents(restaurantInfo.name.toUpperCase());
      lines.push(this.center(name, width));
    }
    
    if (layout.showAddress && restaurantInfo.address) {
      const addr = this.removeAccents(restaurantInfo.address);
      // Word wrap if too long
      this.wrapText(addr, width).forEach(line => lines.push(this.center(line, width)));
    }
    
    if (layout.showPhone && restaurantInfo.phone) {
      lines.push(this.center('Tel: ' + restaurantInfo.phone, width));
    }
    
    if (layout.showCnpj && restaurantInfo.cnpj) {
      lines.push(this.center('CNPJ: ' + restaurantInfo.cnpj, width));
    }
    
    if (layout.showRestaurantName || layout.showAddress || layout.showPhone || layout.showCnpj) {
      lines.push('');
    }
    
    // Title - centered
    lines.push(this.center(layout.receiptTitle || '*** PEDIDO ***', width));
    lines.push(divider);
    
    // Order number - prominent
    if (layout.showOrderNumber) {
      const orderNum = order.order_number || order.id.slice(0, 8).toUpperCase();
      lines.push(`PEDIDO #${orderNum}`);
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
    if (layout.showTable && (order.table_number || order.table_id)) {
      lines.push(`Mesa: ${order.table_number || order.table_id}`);
    }
    
    // Waiter
    if (layout.showWaiter && order.waiter_name) {
      lines.push(`Garcom: ${this.removeAccents(order.waiter_name)}`);
    }
    
    // Customer info
    if (layout.showCustomerName && order.customer_name) {
      lines.push(`Cliente: ${this.removeAccents(order.customer_name)}`);
    }
    
    if (layout.showCustomerPhone && order.delivery_phone) {
      lines.push(`Tel: ${order.delivery_phone}`);
    }
    
    if (layout.showDeliveryAddress && order.delivery_address) {
      const addr = this.removeAccents(order.delivery_address);
      // Word wrap long addresses
      if (addr.length > width - 5) {
        lines.push(`End: ${addr.slice(0, width - 5)}`);
        lines.push(`     ${addr.slice(width - 5)}`);
      } else {
        lines.push(`End: ${addr}`);
      }
    }
    
    lines.push(divider);
    
    // Items
    lines.push('ITENS:');
    lines.push(thinDivider);
    
    if (order.order_items && order.order_items.length > 0) {
      for (const item of order.order_items) {
        const qty = item.quantity || 1;
        let name = this.removeAccents(item.product_name);
        
        // Add size if available
        if (layout.showItemSize && item.product_size) {
          name += ` (${this.removeAccents(item.product_size)})`;
        }
        
        // Truncate if needed
        const itemLine = `${qty}x ${name}`;
        if (itemLine.length > width - 2) {
          lines.push(itemLine.slice(0, width - 2));
        } else {
          lines.push(itemLine);
        }
        
        if (layout.showItemPrices) {
          const price = (item.product_price * qty).toFixed(2);
          lines.push(`   R$ ${price}`);
        }
        
        if (layout.showItemNotes && item.notes) {
          lines.push(`   Obs: ${this.removeAccents(item.notes)}`);
        }
      }
    }
    
    lines.push(thinDivider);
    
    // Totals
    if (layout.showTotals) {
      if (layout.showDeliveryFee && order.delivery_fee && order.delivery_fee > 0) {
        lines.push(`Taxa entrega: R$ ${order.delivery_fee.toFixed(2)}`);
      }
      
      lines.push(`TOTAL: R$ ${(order.total || 0).toFixed(2)}`);
    }
    
    // Payment method
    if (layout.showPaymentMethod && order.payment_method) {
      const paymentLabels = {
        'cash': 'Dinheiro',
        'credit': 'Credito',
        'debit': 'Debito',
        'pix': 'PIX',
      };
      lines.push(`Pagamento: ${paymentLabels[order.payment_method] || order.payment_method}`);
    }
    
    // Notes
    if (order.notes) {
      lines.push('');
      lines.push('OBSERVACOES:');
      lines.push(this.removeAccents(order.notes));
    }
    
    lines.push('');
    lines.push(divider);
    
    // Footer
    if (layout.showDateTime) {
      const now = new Date();
      const dateStr = now.toLocaleDateString('pt-BR');
      const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      lines.push(`${dateStr} ${timeStr}`);
    }
    
    if (layout.footerMessage) {
      lines.push(this.removeAccents(layout.footerMessage));
    }
    
    // Extra line feeds for paper feed
    lines.push('');
    lines.push('');
    lines.push('');
    lines.push('');

    return lines.join('\r\n');
  }

  /**
   * Word wrap text to fit width
   */
  wrapText(text, width) {
    if (!text || text.length <= width) return [text || ''];
    
    const words = text.split(' ');
    const lines = [];
    let currentLine = '';
    
    for (const word of words) {
      if (currentLine.length + word.length + 1 <= width) {
        currentLine += (currentLine ? ' ' : '') + word;
      } else {
        if (currentLine) lines.push(currentLine);
        currentLine = word.length <= width ? word : word.slice(0, width);
      }
    }
    if (currentLine) lines.push(currentLine);
    
    return lines;
  }

  formatTestReceipt(layout) {
    const width = parseInt(layout.paperWidth, 10) || 48;
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
    lines.push(this.center(`Papel: ${layout.paperSize || '80mm'}`, width));
    lines.push('');
    
    const now = new Date();
    lines.push(this.center(now.toLocaleString('pt-BR'), width));
    lines.push('');
    lines.push('');
    lines.push('');

    return lines.join('\n');
  }

  center(text, width) {
    if (!text) return ' '.repeat(width);
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

  removeAccents(str) {
    if (!str) return '';
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }
}

module.exports = PrinterService;
