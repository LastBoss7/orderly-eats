const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { ESCPOS, textCommand, lineFeed } = require('./escpos-commands');

// Try to load USB module (optional but preferred for direct printing)
let USBPrinterService = null;
let usbAvailable = false;
try {
  USBPrinterService = require('./usb-printer');
  usbAvailable = true;
  console.log('[PrinterService] USB module loaded - Direct USB printing available!');
} catch (e) {
  console.log('[PrinterService] USB module not available, using spooler fallback');
}

class PrinterService {
  constructor() {
    this.platform = os.platform();
    this.usbPrinter = usbAvailable ? new USBPrinterService() : null;
    this.useEscPos = false;
    this.connectedPrinter = null;
    this.cachedUsbPrinters = null;
    this.lastUsbScan = 0;
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
   * Print order - tries USB direct first, then falls back to spooler
   */
  async printOrder(order, options = {}) {
    const { layout = {}, restaurantInfo = {}, printerName = '', useEscPos = false, printerInfo = null } = options;
    
    // Check if this is a conference/receipt print
    const isConference = order.order_type === 'conference';
    
    // PRIORITY 1: Try USB direct if available (fastest, no spooler)
    if (this.usbPrinter) {
      const usbResult = await this.tryUsbDirectPrint(order, layout, restaurantInfo, isConference);
      if (usbResult.success) {
        console.log('[PrintOrder] USB direct print SUCCESS!');
        return true;
      }
      console.log('[PrintOrder] USB direct not available, using spooler...');
    }
    
    // PRIORITY 2: Use ESC/POS via USB if explicitly configured
    if (useEscPos && printerInfo && printerInfo.type === 'usb') {
      if (isConference) {
        return this.printConferenceEscPos(order, layout, restaurantInfo, printerInfo);
      }
      return this.printOrderEscPos(order, layout, restaurantInfo, printerInfo);
    }
    
    // PRIORITY 3: Fallback to RAW spooler printing (still ESC/POS, but via Windows)
    if (isConference) {
      const receipt = this.formatConferenceReceipt(order, layout, restaurantInfo);
      return this.printText(receipt, printerName, layout);
    }
    
    const receipt = this.formatReceipt(order, layout, restaurantInfo);
    return this.printText(receipt, printerName, layout);
  }

  /**
   * Try to print directly via USB (bypasses Windows spooler completely)
   * This is the FASTEST method - like professional POS systems
   */
  async tryUsbDirectPrint(order, layout, restaurantInfo, isConference) {
    if (!this.usbPrinter) {
      return { success: false, reason: 'USB module not available' };
    }

    try {
      // Scan for USB printers (cache for 30 seconds)
      const now = Date.now();
      if (!this.cachedUsbPrinters || (now - this.lastUsbScan > 30000)) {
        this.cachedUsbPrinters = this.usbPrinter.listPrinters();
        this.lastUsbScan = now;
      }

      if (this.cachedUsbPrinters.length === 0) {
        return { success: false, reason: 'No USB printers found' };
      }

      // Use first available USB printer
      const printer = this.cachedUsbPrinters[0];
      console.log(`[USB Direct] Found printer: ${printer.name} (${printer.vendorId}:${printer.productId})`);

      // Connect if not connected
      if (!this.usbPrinter.isConnected) {
        await this.usbPrinter.connect(printer.vendorId, printer.productId);
        console.log('[USB Direct] Connected to printer');
      }

      // Build ESC/POS commands
      let commands;
      if (isConference) {
        commands = this.buildConferenceEscPos(order, layout, restaurantInfo);
      } else {
        commands = this.buildEscPosReceipt(order, layout, restaurantInfo);
      }

      // Send directly to USB (NO SPOOLER!)
      await this.usbPrinter.write(commands);
      console.log(`[USB Direct] Sent ${commands.length} bytes directly to printer`);

      return { success: true };

    } catch (error) {
      console.log('[USB Direct] Failed:', error.message);
      
      // Disconnect on error to allow reconnection
      try {
        this.usbPrinter.disconnect();
      } catch (e) {}
      
      return { success: false, reason: error.message };
    }
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
    const width = layout.paperWidth || 48; // Fixed 80mm = 48 chars
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
    buffers.push(Buffer.from(this.createLine('=', width) + '\n', encoding));
    
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
    buffers.push(Buffer.from(this.createLine('=', width) + '\n', encoding));
    buffers.push(lineFeed(1));
    
    // Items header
    buffers.push(ESCPOS.TXT_BOLD_ON);
    buffers.push(Buffer.from('ITENS:\n', encoding));
    buffers.push(ESCPOS.TXT_BOLD_OFF);
    buffers.push(Buffer.from(this.createLine('-', width) + '\n', encoding));
    
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
    
    buffers.push(Buffer.from(this.createLine('-', width) + '\n', encoding));
    
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
    buffers.push(Buffer.from(this.createLine('=', width) + '\n', encoding));
    
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
    
    // Feed and cut based on layout setting
    buffers.push(lineFeed(4));
    
    // Paper cut command based on setting
    const cutType = layout.paperCut || 'partial';
    if (cutType === 'full') {
      buffers.push(ESCPOS.PAPER_FULL_CUT);
    } else if (cutType === 'partial') {
      buffers.push(ESCPOS.PAPER_PARTIAL_CUT);
    }
    // If 'none', don't send any cut command
    
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
   * Create a line using a single character repeated
   * This ensures consistent character output for thermal printers
   */
  createLine(char, width) {
    // Use simple ASCII characters for maximum compatibility
    const safeChar = char === '=' ? '=' : '-';
    return safeChar.repeat(width);
  }

  /**
   * Print test page
   */
  async printTest(options = {}) {
    const { layout = {}, printerName = '', useEscPos = false, printerInfo = null } = options;
    
    // Debug log
    console.log('[PrintTest] Layout paperWidth:', layout.paperWidth);
    
    if (useEscPos && printerInfo && printerInfo.type === 'usb') {
      return this.printTestEscPos(layout, printerInfo);
    }
    
    const testText = this.formatTestReceipt(layout);
    console.log('[PrintTest] Generated text length per line:', testText.split('\n').map(l => l.length).join(', '));
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
    buffers.push(Buffer.from(this.createLine('=', Math.min(width, 32)) + '\n', encoding));
    buffers.push(lineFeed(1));
    
    buffers.push(Buffer.from('Impressora ESC/POS\n', encoding));
    buffers.push(Buffer.from('configurada com sucesso!\n', encoding));
    
    buffers.push(lineFeed(1));
    buffers.push(Buffer.from(this.createLine('=', Math.min(width, 32)) + '\n', encoding));
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
    buffers.push(Buffer.from(this.createLine('=', Math.min(width, 32)) + '\n', encoding));
    
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
  // TEXT PRINTING (Fallback) - FIXED WORD WRAP
  // ============================================

  /**
   * Word wrap text to fit width - NEVER breaks words in the middle
   */
  wrapText(text, width) {
    if (!text) return [''];
    
    const cleanText = String(text).trim();
    if (cleanText.length <= width) return [cleanText];
    
    const words = cleanText.split(/\s+/);
    const lines = [];
    let currentLine = '';
    
    for (const word of words) {
      // If word itself is longer than width, we must break it
      if (word.length > width) {
        // Push current line if exists
        if (currentLine) {
          lines.push(currentLine);
          currentLine = '';
        }
        // Break long word into chunks
        for (let i = 0; i < word.length; i += width) {
          lines.push(word.slice(i, i + width));
        }
        continue;
      }
      
      // Check if word fits in current line
      const testLine = currentLine ? currentLine + ' ' + word : word;
      if (testLine.length <= width) {
        currentLine = testLine;
      } else {
        // Word doesn't fit - push current line and start new one
        if (currentLine) {
          lines.push(currentLine);
        }
        currentLine = word;
      }
    }
    
    // Don't forget the last line
    if (currentLine) {
      lines.push(currentLine);
    }
    
    return lines.length > 0 ? lines : [''];
  }

  /**
   * Pad line to exact width (fill with spaces on the right)
   */
  padLine(text, width) {
    if (!text) return ' '.repeat(width);
    const str = String(text);
    if (str.length >= width) return str.slice(0, width);
    return str + ' '.repeat(width - str.length);
  }

  /**
   * Center text with padding on both sides
   */
  center(text, width) {
    if (!text) return ' '.repeat(width);
    const str = String(text);
    if (str.length >= width) return str.slice(0, width);
    const leftPad = Math.floor((width - str.length) / 2);
    const rightPad = width - str.length - leftPad;
    return ' '.repeat(leftPad) + str + ' '.repeat(rightPad);
  }

  /**
   * Align text to the right
   */
  alignRight(text, width) {
    const str = String(text || '');
    if (str.length >= width) return str.slice(0, width);
    return ' '.repeat(width - str.length) + str;
  }

  /**
   * Align left and right text on the same line
   */
  alignBoth(left, right, width) {
    const leftStr = String(left || '');
    const rightStr = String(right || '');
    
    // Minimum 1 space between left and right
    const minGap = 1;
    const maxLeftLen = width - rightStr.length - minGap;
    
    if (maxLeftLen <= 0) {
      // Right text is too long, just return it
      return rightStr.slice(0, width);
    }
    
    // Truncate left if needed
    const finalLeft = leftStr.length > maxLeftLen ? leftStr.slice(0, maxLeftLen) : leftStr;
    const gap = width - finalLeft.length - rightStr.length;
    
    return finalLeft + ' '.repeat(gap) + rightStr;
  }

  /**
   * Format receipt following proper structure with word wrapping
   */
  formatReceipt(order, layout, restaurantInfo = {}) {
    // Paper width in characters - default 48 for 80mm thermal
    const width = parseInt(layout.paperWidth, 10) || 48;
    const divider = this.createLine('-', width);
    
    const lines = [];
    
    // Helper to add a single line (padded to width)
    const addLine = (text) => {
      lines.push(this.padLine(text || '', width));
    };
    
    // Helper to add centered text with word wrap
    const addCentered = (text) => {
      const wrapped = this.wrapText(this.removeAccents(text), width);
      wrapped.forEach(line => {
        lines.push(this.center(line, width));
      });
    };
    
    // Helper to add left-aligned text with word wrap
    const addLeft = (text) => {
      const wrapped = this.wrapText(this.removeAccents(text), width);
      wrapped.forEach(line => {
        lines.push(this.padLine(line, width));
      });
    };
    
    // Helper to add divider
    const addDivider = () => {
      lines.push(divider);
    };
    
    // ============================================
    // HEADER - Date/Time
    // ============================================
    if (layout.showDateTime !== false) {
      const now = new Date(order.created_at || Date.now());
      const dateStr = now.toLocaleDateString('pt-BR');
      const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      lines.push(this.center(dateStr + ' ' + timeStr, width));
    }
    
    // Restaurant Name (with word wrap for long names)
    if (layout.showRestaurantName !== false && restaurantInfo.name) {
      addCentered(restaurantInfo.name.toUpperCase());
    }
    
    addDivider();
    
    // ============================================
    // ORDER NUMBER (centered)
    // ============================================
    if (layout.showOrderNumber !== false) {
      const orderNum = order.order_number || (order.id ? order.id.slice(0, 8).toUpperCase() : '0');
      lines.push(this.center('Pedido ' + orderNum, width));
    }
    
    addLine('');
    
    // ============================================
    // ITEMS SECTION
    // ============================================
    if (layout.showItems !== false) {
      addLine('Itens:');
      
      if (order.order_items && order.order_items.length > 0) {
        for (let i = 0; i < order.order_items.length; i++) {
          const item = order.order_items[i];
          const qty = item.quantity || 1;
          const name = this.removeAccents(item.product_name || 'Item');
          const size = item.product_size ? ' (' + item.product_size + ')' : '';
          const price = item.product_price || 0;
          
          // Item name with quantity - may need word wrap
          const itemName = '(' + qty + ') ' + name + size;
          const priceStr = layout.showItemPrices !== false ? 'R$ ' + (price * qty).toFixed(2).replace('.', ',') : '';
          
          // If item name + price fits in one line
          if (itemName.length + priceStr.length + 1 <= width) {
            lines.push(this.alignBoth(itemName, priceStr, width));
          } else {
            // Item name on first line(s), price on last line aligned right
            const wrappedName = this.wrapText(itemName, width - (priceStr ? 1 : 0));
            wrappedName.forEach((line, idx) => {
              if (idx === wrappedName.length - 1 && priceStr) {
                // Last line with price
                if (line.length + priceStr.length + 1 <= width) {
                  lines.push(this.alignBoth(line, priceStr, width));
                } else {
                  lines.push(this.padLine(line, width));
                  lines.push(this.alignRight(priceStr, width));
                }
              } else {
                lines.push(this.padLine(line, width));
              }
            });
          }
          
          // Observation (OBS:)
          if (layout.showItemNotes !== false && item.notes) {
            addLeft('  OBS: ' + item.notes);
          }
          
          // Separator between items (except last)
          if (i < order.order_items.length - 1) {
            addDivider();
          }
        }
      }
    }
    
    addLine('');
    
    // ============================================
    // CUSTOMER / DELIVERY INFO
    // ============================================
    if (layout.showCustomerName !== false && order.customer_name) {
      addLeft('Cliente: ' + order.customer_name);
    }
    
    if (layout.showCustomerPhone !== false && order.delivery_phone) {
      addLeft('Tel: ' + order.delivery_phone);
    }
    
    // Order type / Delivery info
    if (layout.showOrderType !== false) {
      if (order.order_type === 'delivery' && order.delivery_address) {
        addLeft('Entrega: ' + order.delivery_address);
      } else if (order.order_type === 'table' && (order.table_number || order.table_id)) {
        addLeft('Mesa: ' + (order.table_number || order.table_id));
      } else if (order.order_type === 'takeaway' || order.order_type === 'counter') {
        addLeft('Entrega: Retirada no balcao');
      }
    }
    
    addLine('');
    
    // ============================================
    // PAYMENT METHOD
    // ============================================
    if (layout.showPaymentMethod !== false && order.payment_method) {
      addDivider();
      const paymentLabels = {
        'cash': 'Dinheiro',
        'credit': 'Cartao Credito',
        'debit': 'Cartao Debito',
        'pix': 'PIX',
      };
      const paymentLabel = paymentLabels[order.payment_method] || order.payment_method;
      addLeft('Pagamento: ' + paymentLabel);
      addLine('');
    }
    
    // ============================================
    // TOTALS
    // ============================================
    if (layout.showTotals !== false) {
      addDivider();
      
      // Calculate subtotal
      let subtotal = 0;
      if (order.order_items) {
        for (const item of order.order_items) {
          subtotal += (item.product_price || 0) * (item.quantity || 1);
        }
      }
      
      // Delivery fee
      if (layout.showDeliveryFee !== false && order.delivery_fee && order.delivery_fee > 0) {
        lines.push(this.alignBoth('Taxa Entrega:', 'R$ ' + order.delivery_fee.toFixed(2).replace('.', ','), width));
      }
      
      // Subtotal
      lines.push(this.alignBoth('Subtotal:', 'R$ ' + subtotal.toFixed(2).replace('.', ','), width));
      
      // Total
      const total = order.total || (subtotal + (order.delivery_fee || 0));
      lines.push(this.alignBoth('Total:', 'R$ ' + total.toFixed(2).replace('.', ','), width));
    }
    
    addLine('');
    addDivider();
    
    // ============================================
    // FOOTER
    // ============================================
    if (layout.footerMessage) {
      addCentered(layout.footerMessage);
    } else {
      lines.push(this.center('Obrigado pela preferencia!', width));
    }
    
    // Extra line feeds for paper feed
    addLine('');
    addLine('');
    addLine('');
    addLine('');

    // Use LF only for thermal printers (they don't need CR)
    return lines.join('\n');
  }

  formatTestReceipt(layout) {
    // Default 48 chars for 80mm thermal printers
    const width = parseInt(layout.paperWidth, 10) || 48;
    const divider = this.createLine('-', width);
    const lines = [];
    
    lines.push(divider);
    lines.push(this.center('TESTE DE IMPRESSAO', width));
    lines.push(divider);
    lines.push(this.padLine('', width));
    lines.push(this.center('Impressora OK!', width));
    lines.push(this.padLine('', width));
    lines.push(this.alignBoth('Largura:', width + ' chars', width));
    lines.push(this.padLine('', width));
    
    // Test alignment
    lines.push(divider);
    lines.push(this.alignBoth('(2) X-Burguer', 'R$ 29,90', width));
    lines.push(this.alignBoth('(1) Batata Frita', 'R$ 12,50', width));
    lines.push(this.alignBoth('(1) Refrigerante', 'R$ 6,00', width));
    lines.push(divider);
    lines.push(this.alignBoth('Subtotal:', 'R$ 48,40', width));
    lines.push(this.alignBoth('Taxa:', 'R$ 5,00', width));
    lines.push(this.alignBoth('Total:', 'R$ 53,40', width));
    lines.push(divider);
    lines.push(this.padLine('', width));
    
    const now = new Date();
    lines.push(this.center(now.toLocaleString('pt-BR'), width));
    lines.push(this.padLine('', width));
    lines.push(this.center('Powered By: Gamako', width));
    lines.push(this.padLine('', width));
    lines.push(this.padLine('', width));
    lines.push(this.padLine('', width));
    lines.push(this.padLine('', width));

    // Use LF only for thermal printers
    return lines.join('\n');
  }

  /**
   * Print text to thermal printer using RAW ESC/POS mode
   * This method sends bytes DIRECTLY to the printer port - like Anota AI, Saipos, iFood
   * The printer uses its internal fonts (super sharp!)
   */
  async printText(text, printerName = '', layout = {}) {
    console.log('[PrintText] ========================================');
    console.log('[PrintText] RAW ESC/POS PRINTING (Professional Mode)');
    console.log('[PrintText] Printer:', printerName || 'default');
    console.log('[PrintText] Platform:', this.platform);
    
    // Build raw ESC/POS data (pure bytes)
    const rawData = this.buildRawEscPosData(text, layout);
    
    console.log('[PrintText] Data size:', rawData.length, 'bytes');
    
    if (this.platform === 'win32') {
      return this.printRawWindows(rawData, printerName, layout);
    } else {
      return this.printRawUnix(rawData, printerName);
    }
  }

  /**
   * Build RAW ESC/POS data buffer - Pure bytes for thermal printer
   * This is what makes the print SHARP - uses printer's internal font
   */
  buildRawEscPosData(text, layout = {}) {
    const buffers = [];
    const width = layout.paperWidth || 48;
    
    // ESC/POS Commands (pure bytes)
    const ESC = 0x1B;
    const GS = 0x1D;
    const LF = 0x0A;
    
    // Initialize printer (ESC @)
    buffers.push(Buffer.from([ESC, 0x40]));
    
    // Select character code table: PC850 Multilingual (ESC t n)
    buffers.push(Buffer.from([ESC, 0x74, 0x02]));
    
    // Set line spacing to default (ESC 2)
    buffers.push(Buffer.from([ESC, 0x32]));
    
    // Convert text lines to ESC/POS
    const lines = text.split('\n');
    for (const line of lines) {
      // Remove accents for thermal printer compatibility
      const cleanLine = this.removeAccentsForPrinter(line);
      
      // Convert to buffer with proper encoding
      const lineBuffer = Buffer.from(cleanLine, 'latin1');
      buffers.push(lineBuffer);
      buffers.push(Buffer.from([LF])); // Line feed
    }
    
    // Feed paper before cut
    buffers.push(Buffer.from([LF, LF, LF, LF]));
    
    // Paper cut command
    const cutType = layout.paperCut || 'partial';
    if (cutType === 'full') {
      // GS V 0 - Full cut
      buffers.push(Buffer.from([GS, 0x56, 0x00]));
    } else if (cutType === 'partial') {
      // GS V 1 - Partial cut
      buffers.push(Buffer.from([GS, 0x56, 0x01]));
    }
    // If 'none', no cut command
    
    return Buffer.concat(buffers);
  }

  /**
   * Remove accents - optimized for thermal printer code pages
   */
  removeAccentsForPrinter(str) {
    if (!str) return '';
    return str
      .replace(/[áàâãä]/g, 'a')
      .replace(/[ÁÀÂÃÄ]/g, 'A')
      .replace(/[éèêë]/g, 'e')
      .replace(/[ÉÈÊË]/g, 'E')
      .replace(/[íìîï]/g, 'i')
      .replace(/[ÍÌÎÏ]/g, 'I')
      .replace(/[óòôõö]/g, 'o')
      .replace(/[ÓÒÔÕÖ]/g, 'O')
      .replace(/[úùûü]/g, 'u')
      .replace(/[ÚÙÛÜ]/g, 'U')
      .replace(/ç/g, 'c')
      .replace(/Ç/g, 'C')
      .replace(/ñ/g, 'n')
      .replace(/Ñ/g, 'N')
      .replace(/[^\x00-\x7F]/g, ''); // Remove any other non-ASCII
  }

  /**
   * Print RAW data on Windows - Direct port communication
   * This is how professional POS systems work!
   */
  async printRawWindows(rawData, printerName, layout = {}) {
    const tmpFile = path.join(os.tmpdir(), `escpos_${Date.now()}.bin`);
    
    return new Promise(async (resolve, reject) => {
      try {
        // Write raw binary data
        fs.writeFileSync(tmpFile, rawData);
        console.log('[PrintText] Binary file created:', tmpFile, '- Size:', rawData.length, 'bytes');
        
        const escapedPrinter = printerName ? printerName.replace(/"/g, '').replace(/'/g, '') : '';
        
        if (!escapedPrinter) {
          console.log('[PrintText] ERROR: No printer specified!');
          this.cleanupFile(tmpFile);
          reject(new Error('Nenhuma impressora especificada'));
          return;
        }
        
        console.log('[PrintText] Target printer:', escapedPrinter);
        
        // Try RAW printing methods in order of reliability
        // These methods send bytes DIRECTLY to the printer port
        const methods = [
          // Method 1: PowerShell RawPrinterHelper (most reliable for RAW)
          {
            name: 'PowerShell RAW Direct',
            fn: () => this.printRawPowerShell(tmpFile, escapedPrinter),
          },
          // Method 2: Direct file write to printer share
          {
            name: 'UNC Share Copy',
            fn: () => this.execWithTimeout(
              `copy /b "${tmpFile}" "\\\\%COMPUTERNAME%\\${escapedPrinter}"`, 
              10000
            ),
          },
          // Method 3: Type redirect
          {
            name: 'Type Redirect',
            fn: () => this.execWithTimeout(
              `type "${tmpFile}" > "\\\\%COMPUTERNAME%\\${escapedPrinter}"`, 
              10000
            ),
          },
          // Method 4: Net use + copy (for network printers)
          {
            name: 'NET USE + LPT1',
            fn: () => this.printViaNetUse(tmpFile, escapedPrinter),
          },
          // Method 5: PowerShell Out-Printer (last resort - may not be truly RAW)
          {
            name: 'PowerShell Out-Printer',
            fn: () => this.execWithTimeout(
              `powershell -Command "Get-Content -Path '${tmpFile}' -Encoding Byte -ReadCount 0 | ` +
              `Set-Content -Path '\\\\localhost\\${escapedPrinter}' -Encoding Byte"`,
              15000
            ),
          },
        ];
        
        let success = false;
        let lastError = null;
        
        for (const method of methods) {
          try {
            console.log(`[PrintText] Trying: ${method.name}...`);
            await method.fn();
            console.log(`[PrintText] SUCCESS with: ${method.name}`);
            success = true;
            break;
          } catch (error) {
            console.log(`[PrintText] FAILED: ${method.name} -`, error.message);
            lastError = error;
          }
        }
        
        this.cleanupFile(tmpFile);
        
        if (success) {
          resolve(true);
        } else {
          reject(new Error(`Falha em todos os métodos. Último: ${lastError?.message || 'desconhecido'}`));
        }
        
      } catch (error) {
        this.cleanupFile(tmpFile);
        reject(error);
      }
    });
  }

  /**
   * Print using PowerShell RawPrinterHelper (TRUE RAW printing)
   * This sends bytes directly to the printer spooler in RAW mode
   */
  async printRawPowerShell(filePath, printerName) {
    // This PowerShell script sends RAW bytes to the printer
    // It's equivalent to what professional POS systems do
    const psScript = `
$printerName = '${printerName}'
$filePath = '${filePath}'

# Read raw bytes
$bytes = [System.IO.File]::ReadAllBytes($filePath)

# Open printer in RAW mode
$printerHandle = [System.Runtime.InteropServices.Marshal]::StringToHGlobalUni($printerName)

Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;

public class RawPrinter {
    [StructLayout(LayoutKind.Sequential)]
    public struct DOCINFO {
        [MarshalAs(UnmanagedType.LPWStr)] public string pDocName;
        [MarshalAs(UnmanagedType.LPWStr)] public string pOutputFile;
        [MarshalAs(UnmanagedType.LPWStr)] public string pDataType;
    }

    [DllImport("winspool.drv", CharSet = CharSet.Unicode, SetLastError = true)]
    public static extern bool OpenPrinter(string pPrinterName, out IntPtr phPrinter, IntPtr pDefault);

    [DllImport("winspool.drv", SetLastError = true)]
    public static extern bool StartDocPrinter(IntPtr hPrinter, int Level, ref DOCINFO pDocInfo);

    [DllImport("winspool.drv", SetLastError = true)]
    public static extern bool StartPagePrinter(IntPtr hPrinter);

    [DllImport("winspool.drv", SetLastError = true)]
    public static extern bool WritePrinter(IntPtr hPrinter, byte[] pBytes, int dwCount, out int dwWritten);

    [DllImport("winspool.drv", SetLastError = true)]
    public static extern bool EndPagePrinter(IntPtr hPrinter);

    [DllImport("winspool.drv", SetLastError = true)]
    public static extern bool EndDocPrinter(IntPtr hPrinter);

    [DllImport("winspool.drv", SetLastError = true)]
    public static extern bool ClosePrinter(IntPtr hPrinter);

    public static bool SendRawData(string printerName, byte[] data) {
        IntPtr hPrinter;
        if (!OpenPrinter(printerName, out hPrinter, IntPtr.Zero)) {
            throw new Exception("Falha ao abrir impressora: " + Marshal.GetLastWin32Error());
        }

        var docInfo = new DOCINFO { 
            pDocName = "RAW Document", 
            pOutputFile = null, 
            pDataType = "RAW" 
        };

        if (!StartDocPrinter(hPrinter, 1, ref docInfo)) {
            ClosePrinter(hPrinter);
            throw new Exception("Falha ao iniciar documento: " + Marshal.GetLastWin32Error());
        }

        if (!StartPagePrinter(hPrinter)) {
            EndDocPrinter(hPrinter);
            ClosePrinter(hPrinter);
            throw new Exception("Falha ao iniciar pagina: " + Marshal.GetLastWin32Error());
        }

        int written;
        if (!WritePrinter(hPrinter, data, data.Length, out written)) {
            EndPagePrinter(hPrinter);
            EndDocPrinter(hPrinter);
            ClosePrinter(hPrinter);
            throw new Exception("Falha ao escrever: " + Marshal.GetLastWin32Error());
        }

        EndPagePrinter(hPrinter);
        EndDocPrinter(hPrinter);
        ClosePrinter(hPrinter);
        return true;
    }
}
"@

[RawPrinter]::SendRawData($printerName, $bytes)
Write-Output "RAW print successful"
`;

    // Write PS script to temp file
    const psFile = path.join(os.tmpdir(), `rawprint_${Date.now()}.ps1`);
    fs.writeFileSync(psFile, psScript);
    
    try {
      await this.execWithTimeout(
        `powershell -ExecutionPolicy Bypass -File "${psFile}"`,
        20000
      );
      this.cleanupFile(psFile);
      return true;
    } catch (error) {
      this.cleanupFile(psFile);
      throw error;
    }
  }

  /**
   * Print via NET USE (maps printer to LPT port)
   */
  async printViaNetUse(filePath, printerName) {
    // First, disconnect any existing LPT1 mapping
    try {
      await this.execWithTimeout('net use LPT1: /delete /y', 3000);
    } catch (e) {
      // Ignore - might not be mapped
    }
    
    // Map printer to LPT1
    await this.execWithTimeout(
      `net use LPT1: "\\\\%COMPUTERNAME%\\${printerName}"`,
      5000
    );
    
    // Copy to LPT1 (direct port)
    await this.execWithTimeout(
      `copy /b "${filePath}" LPT1:`,
      10000
    );
    
    // Cleanup mapping
    try {
      await this.execWithTimeout('net use LPT1: /delete /y', 3000);
    } catch (e) {
      // Ignore
    }
    
    return true;
  }

  /**
   * Print RAW data on Unix (Linux/Mac) - Direct to device
   */
  async printRawUnix(rawData, printerName) {
    const tmpFile = path.join(os.tmpdir(), `escpos_${Date.now()}.bin`);
    
    return new Promise(async (resolve, reject) => {
      try {
        fs.writeFileSync(tmpFile, rawData);
        
        // lp with -o raw sends data directly without processing
        const printerParam = printerName ? `-d "${printerName}"` : '';
        await this.execWithTimeout(`lp -o raw ${printerParam} "${tmpFile}"`, 10000);
        
        this.cleanupFile(tmpFile);
        resolve(true);
      } catch (error) {
        this.cleanupFile(tmpFile);
        reject(error);
      }
    });
  }

  /**
   * Execute command with timeout
   */
  execWithTimeout(command, timeout) {
    return new Promise((resolve, reject) => {
      const shortCmd = command.length > 80 ? command.substring(0, 80) + '...' : command;
      console.log('[PrintText] Exec:', shortCmd);
      
      const proc = exec(command, { 
        shell: this.platform === 'win32' ? 'cmd.exe' : '/bin/sh', 
        encoding: 'buffer',
        timeout: timeout,
        windowsHide: true,
      }, (error, stdout, stderr) => {
        if (error) {
          reject(error);
        } else {
          resolve(true);
        }
      });
      
      // Force timeout
      setTimeout(() => {
        try { proc.kill(); } catch (e) {}
        reject(new Error('Timeout'));
      }, timeout);
    });
  }

  /**
   * Cleanup temp file after delay
   */
  cleanupFile(filePath) {
    setTimeout(() => {
      try { 
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath); 
        }
      } catch (e) {
        // Ignore cleanup errors
      }
    }, 5000);
  }

  // ============================================
  // CONFERENCE / RECEIPT PRINTING
  // ============================================

  /**
   * Print conference using ESC/POS
   */
  async printConferenceEscPos(order, layout, restaurantInfo, printerInfo) {
    if (!this.usbPrinter) {
      throw new Error('Módulo USB não disponível');
    }

    if (!this.usbPrinter.isConnected) {
      await this.usbPrinter.connect(printerInfo.vendorId, printerInfo.productId);
    }

    const commands = this.buildConferenceEscPos(order, layout, restaurantInfo);
    await this.usbPrinter.write(commands);
    
    return true;
  }

  /**
   * Build ESC/POS commands for conference receipt
   */
  buildConferenceEscPos(order, layout, restaurantInfo = {}) {
    const buffers = [];
    const width = layout.paperWidth || 48;
    const encoding = 'cp860';
    
    // Parse notes for conference data
    let conferenceData = {};
    try {
      conferenceData = JSON.parse(order.notes || '{}');
    } catch (e) {
      conferenceData = {};
    }
    
    const isFinalReceipt = conferenceData.isFinalReceipt || false;
    const payments = conferenceData.payments || [];
    const discount = conferenceData.discount || 0;
    const addition = conferenceData.addition || 0;
    const splitCount = conferenceData.splitCount || 1;
    const entityType = conferenceData.entityType || 'table';
    const entityNumber = conferenceData.entityNumber || '';
    
    // Initialize printer
    buffers.push(ESCPOS.HW_INIT);
    buffers.push(ESCPOS.TXT_FONT_A);
    buffers.push(ESCPOS.TXT_SIZE_NORMAL);
    
    // Header
    buffers.push(ESCPOS.TXT_ALIGN_CENTER);
    
    if (restaurantInfo.name) {
      buffers.push(ESCPOS.TXT_SIZE_2H);
      buffers.push(ESCPOS.TXT_BOLD_ON);
      buffers.push(Buffer.from(this.removeAccents(restaurantInfo.name.toUpperCase()) + '\n', encoding));
      buffers.push(ESCPOS.TXT_BOLD_OFF);
      buffers.push(ESCPOS.TXT_SIZE_NORMAL);
    }
    
    buffers.push(lineFeed(1));
    
    // Title - Different for conference vs final receipt
    buffers.push(ESCPOS.TXT_BOLD_ON);
    buffers.push(ESCPOS.TXT_SIZE_2H);
    if (isFinalReceipt) {
      buffers.push(Buffer.from('*** CONTA PAGA ***\n', encoding));
    } else {
      buffers.push(Buffer.from('*** CONFERENCIA ***\n', encoding));
    }
    buffers.push(ESCPOS.TXT_SIZE_NORMAL);
    buffers.push(ESCPOS.TXT_BOLD_OFF);
    
    // Entity (Table/Tab)
    buffers.push(ESCPOS.TXT_SIZE_2X);
    buffers.push(ESCPOS.TXT_BOLD_ON);
    const entityLabel = entityType === 'table' ? 'MESA' : 'COMANDA';
    buffers.push(Buffer.from(`${entityLabel} ${entityNumber}\n`, encoding));
    buffers.push(ESCPOS.TXT_BOLD_OFF);
    buffers.push(ESCPOS.TXT_SIZE_NORMAL);
    
    // Customer name
    if (order.customer_name) {
      buffers.push(Buffer.from(this.removeAccents(order.customer_name) + '\n', encoding));
    }
    
    // Date/Time
    const now = new Date();
    buffers.push(Buffer.from(now.toLocaleString('pt-BR') + '\n', encoding));
    
    buffers.push(Buffer.from(this.createLine('=', width) + '\n', encoding));
    buffers.push(lineFeed(1));
    
    // Items
    buffers.push(ESCPOS.TXT_ALIGN_LEFT);
    buffers.push(ESCPOS.TXT_BOLD_ON);
    buffers.push(Buffer.from('ITENS:\n', encoding));
    buffers.push(ESCPOS.TXT_BOLD_OFF);
    buffers.push(Buffer.from(this.createLine('-', width) + '\n', encoding));
    
    if (order.order_items && order.order_items.length > 0) {
      for (const item of order.order_items) {
        const qty = item.quantity || 1;
        const name = this.removeAccents(item.product_name);
        const price = (item.product_price * qty).toFixed(2);
        
        // Item line
        const itemLine = `${qty}x ${name}`;
        const maxLen = width - 12;
        const displayName = itemLine.length > maxLen ? itemLine.slice(0, maxLen - 3) + '...' : itemLine;
        
        buffers.push(Buffer.from(displayName + '\n', encoding));
        buffers.push(ESCPOS.TXT_ALIGN_RIGHT);
        buffers.push(Buffer.from(`R$ ${price}\n`, encoding));
        buffers.push(ESCPOS.TXT_ALIGN_LEFT);
      }
    }
    
    buffers.push(Buffer.from(this.createLine('-', width) + '\n', encoding));
    buffers.push(lineFeed(1));
    
    // Subtotal, discount, addition
    let subtotal = 0;
    if (order.order_items) {
      for (const item of order.order_items) {
        subtotal += (item.product_price || 0) * (item.quantity || 1);
      }
    }
    
    buffers.push(Buffer.from(this.formatLineItem('Subtotal:', `R$ ${subtotal.toFixed(2)}`, width) + '\n', encoding));
    
    if (discount > 0) {
      buffers.push(Buffer.from(this.formatLineItem('Desconto:', `-R$ ${discount.toFixed(2)}`, width) + '\n', encoding));
    }
    
    if (addition > 0) {
      buffers.push(Buffer.from(this.formatLineItem('Acrescimo:', `+R$ ${addition.toFixed(2)}`, width) + '\n', encoding));
    }
    
    buffers.push(lineFeed(1));
    
    // Total
    buffers.push(ESCPOS.TXT_BOLD_ON);
    buffers.push(ESCPOS.TXT_SIZE_2X);
    buffers.push(ESCPOS.TXT_ALIGN_CENTER);
    const total = order.total || 0;
    buffers.push(Buffer.from(`TOTAL: R$ ${total.toFixed(2)}\n`, encoding));
    buffers.push(ESCPOS.TXT_SIZE_NORMAL);
    buffers.push(ESCPOS.TXT_BOLD_OFF);
    buffers.push(ESCPOS.TXT_ALIGN_LEFT);
    
    // Split info
    if (splitCount > 1) {
      const perPerson = (total / splitCount).toFixed(2);
      buffers.push(Buffer.from(this.formatLineItem(`Por pessoa (${splitCount}):`, `R$ ${perPerson}`, width) + '\n', encoding));
    }
    
    buffers.push(lineFeed(1));
    
    // Payments (only for final receipt)
    if (isFinalReceipt && payments.length > 0) {
      buffers.push(Buffer.from(this.createLine('=', width) + '\n', encoding));
      buffers.push(ESCPOS.TXT_BOLD_ON);
      buffers.push(Buffer.from('PAGAMENTOS:\n', encoding));
      buffers.push(ESCPOS.TXT_BOLD_OFF);
      
      for (const payment of payments) {
        const method = this.removeAccents(payment.method || 'Dinheiro');
        const amount = (payment.amount || 0).toFixed(2);
        buffers.push(Buffer.from(this.formatLineItem(method + ':', `R$ ${amount}`, width) + '\n', encoding));
      }
      
      buffers.push(lineFeed(1));
    }
    
    buffers.push(Buffer.from(this.createLine('=', width) + '\n', encoding));
    
    // Footer
    buffers.push(ESCPOS.TXT_ALIGN_CENTER);
    buffers.push(lineFeed(1));
    
    if (isFinalReceipt) {
      buffers.push(ESCPOS.TXT_SIZE_2H);
      buffers.push(ESCPOS.TXT_BOLD_ON);
      buffers.push(Buffer.from('OBRIGADO!\n', encoding));
      buffers.push(ESCPOS.TXT_BOLD_OFF);
      buffers.push(ESCPOS.TXT_SIZE_NORMAL);
    } else {
      buffers.push(Buffer.from('Aguardando pagamento\n', encoding));
    }
    
    buffers.push(Buffer.from(layout.footerMessage || 'Obrigado pela preferencia!' + '\n', encoding));
    
    // Feed and cut
    buffers.push(lineFeed(4));
    const cutType = layout.paperCut || 'partial';
    if (cutType === 'full') {
      buffers.push(ESCPOS.PAPER_FULL_CUT);
    } else if (cutType === 'partial') {
      buffers.push(ESCPOS.PAPER_PARTIAL_CUT);
    }
    
    return Buffer.concat(buffers);
  }

  /**
   * Format conference receipt for text printing
   */
  formatConferenceReceipt(order, layout, restaurantInfo = {}) {
    const width = parseInt(layout.paperWidth, 10) || 48;
    const divider = this.createLine('-', width);
    const doubleDivider = this.createLine('=', width);
    const lines = [];
    
    // Parse notes for conference data
    let conferenceData = {};
    try {
      conferenceData = JSON.parse(order.notes || '{}');
    } catch (e) {
      conferenceData = {};
    }
    
    const isFinalReceipt = conferenceData.isFinalReceipt || false;
    const payments = conferenceData.payments || [];
    const discount = conferenceData.discount || 0;
    const addition = conferenceData.addition || 0;
    const splitCount = conferenceData.splitCount || 1;
    const entityType = conferenceData.entityType || 'table';
    const entityNumber = conferenceData.entityNumber || '';
    
    // Header
    if (restaurantInfo.name) {
      lines.push(this.center(this.removeAccents(restaurantInfo.name.toUpperCase()), width));
    }
    
    lines.push(this.padLine('', width));
    
    // Title
    if (isFinalReceipt) {
      lines.push(this.center('*** CONTA PAGA ***', width));
    } else {
      lines.push(this.center('*** CONFERENCIA ***', width));
    }
    
    // Entity
    const entityLabel = entityType === 'table' ? 'MESA' : 'COMANDA';
    lines.push(this.center(`${entityLabel} ${entityNumber}`, width));
    
    // Customer
    if (order.customer_name) {
      lines.push(this.center(this.removeAccents(order.customer_name), width));
    }
    
    // Date/Time
    const now = new Date();
    lines.push(this.center(now.toLocaleString('pt-BR'), width));
    
    lines.push(doubleDivider);
    lines.push(this.padLine('', width));
    
    // Items
    lines.push(this.padLine('ITENS:', width));
    lines.push(divider);
    
    let subtotal = 0;
    if (order.order_items && order.order_items.length > 0) {
      for (const item of order.order_items) {
        const qty = item.quantity || 1;
        const name = this.removeAccents(item.product_name);
        const price = item.product_price * qty;
        subtotal += price;
        
        const itemLine = `${qty}x ${name}`;
        const priceStr = `R$ ${price.toFixed(2).replace('.', ',')}`;
        
        if (itemLine.length + priceStr.length + 1 <= width) {
          lines.push(this.alignBoth(itemLine, priceStr, width));
        } else {
          const wrapped = this.wrapText(itemLine, width - 1);
          wrapped.forEach((line, idx) => {
            if (idx === wrapped.length - 1) {
              if (line.length + priceStr.length + 1 <= width) {
                lines.push(this.alignBoth(line, priceStr, width));
              } else {
                lines.push(this.padLine(line, width));
                lines.push(this.alignRight(priceStr, width));
              }
            } else {
              lines.push(this.padLine(line, width));
            }
          });
        }
      }
    }
    
    lines.push(divider);
    lines.push(this.padLine('', width));
    
    // Totals
    lines.push(this.alignBoth('Subtotal:', `R$ ${subtotal.toFixed(2).replace('.', ',')}`, width));
    
    if (discount > 0) {
      lines.push(this.alignBoth('Desconto:', `-R$ ${discount.toFixed(2).replace('.', ',')}`, width));
    }
    
    if (addition > 0) {
      lines.push(this.alignBoth('Acrescimo:', `+R$ ${addition.toFixed(2).replace('.', ',')}`, width));
    }
    
    lines.push(this.padLine('', width));
    
    const total = order.total || 0;
    lines.push(this.alignBoth('TOTAL:', `R$ ${total.toFixed(2).replace('.', ',')}`, width));
    
    if (splitCount > 1) {
      const perPerson = (total / splitCount).toFixed(2).replace('.', ',');
      lines.push(this.alignBoth(`Por pessoa (${splitCount}):`, `R$ ${perPerson}`, width));
    }
    
    lines.push(this.padLine('', width));
    
    // Payments (only for final receipt)
    if (isFinalReceipt && payments.length > 0) {
      lines.push(doubleDivider);
      lines.push(this.padLine('PAGAMENTOS:', width));
      
      for (const payment of payments) {
        const method = this.removeAccents(payment.method || 'Dinheiro');
        const amount = (payment.amount || 0).toFixed(2).replace('.', ',');
        lines.push(this.alignBoth(method + ':', `R$ ${amount}`, width));
      }
      
      lines.push(this.padLine('', width));
    }
    
    lines.push(doubleDivider);
    lines.push(this.padLine('', width));
    
    // Footer
    if (isFinalReceipt) {
      lines.push(this.center('*** OBRIGADO! ***', width));
    } else {
      lines.push(this.center('Aguardando pagamento', width));
    }
    
    lines.push(this.center(this.removeAccents(layout.footerMessage || 'Obrigado pela preferencia!'), width));
    
    // Extra lines for paper feed
    lines.push(this.padLine('', width));
    lines.push(this.padLine('', width));
    lines.push(this.padLine('', width));
    lines.push(this.padLine('', width));
    
    return lines.join('\n');
  }
}

module.exports = PrinterService;
