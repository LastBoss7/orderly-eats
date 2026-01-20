/**
 * PrinterService - Impressão Térmica Profissional
 * 
 * Este serviço usa o Windows Spooler com ESC/POS para impressão térmica.
 * Similar ao iFood, Saipos, Anota AI.
 */

const { exec, execFile } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

class PrinterService {
  constructor() {
    this.platform = os.platform();
    console.log('[PrinterService] Platform:', this.platform);
  }

  // ============================================
  // PRINT ORDER - Entry Point
  // ============================================
  
  /**
   * Print an order
   */
  async printOrder(order, options = {}) {
    const { layout = {}, restaurantInfo = {}, printerName = '' } = options;
    const isConference = order.order_type === 'conference';
    const isClosing = order.order_type === 'closing';
    
    console.log('[PrintOrder] Order: #' + (order.order_number || (order.id ? order.id.slice(0, 8) : '?')));
    console.log('[PrintOrder] Printer: "' + printerName + '"');
    console.log('[PrintOrder] Type: ' + order.order_type);
    
    // Format receipt based on type
    let receipt;
    if (isClosing) {
      receipt = this.formatClosingReceipt(order, layout, restaurantInfo);
    } else if (isConference) {
      receipt = this.formatConferenceReceipt(order, layout, restaurantInfo);
    } else {
      receipt = this.formatReceipt(order, layout, restaurantInfo);
    }
    
    // Print
    return this.printText(receipt, printerName, layout);
  }

  // ============================================
  // PRINT TEST - Test page
  // ============================================
  
  async printTest(options = {}) {
    const { layout = {}, printerName = '' } = options;
    const width = layout.paperWidth || 48;
    
    const lines = [];
    const div = '='.repeat(width);
    const divSmall = '-'.repeat(width);
    
    lines.push(this.center('TESTE DE IMPRESSAO', width));
    lines.push(div);
    lines.push('');
    lines.push(this.center('Impressora configurada!', width));
    lines.push('');
    lines.push('Largura: ' + width + ' caracteres');
    lines.push('Impressora: ' + (printerName || 'padrao'));
    lines.push('');
    lines.push(divSmall);
    lines.push(this.alignBoth('(2) X-Burguer', 'R$ 29,90', width));
    lines.push(this.alignBoth('(1) Batata Frita', 'R$ 12,50', width));
    lines.push(this.alignBoth('(1) Refrigerante', 'R$ 6,00', width));
    lines.push(divSmall);
    lines.push(this.alignBoth('Total:', 'R$ 53,40', width));
    lines.push(div);
    lines.push('');
    lines.push(this.center(new Date().toLocaleString('pt-BR'), width));
    lines.push('');
    lines.push(this.center('powered by https://gamako.com.br', width));
    lines.push('');
    lines.push('');
    lines.push('');
    lines.push('');
    
    return this.printText(lines.join('\n'), printerName, layout);
  }

  // ============================================
  // PRINT TEXT - Core printing function
  // ============================================
  
  /**
   * Print text to thermal printer
   * Uses multiple methods for maximum compatibility
   */
  async printText(text, printerName = '', layout = {}) {
    console.log('[PrintText] =====================================');
    console.log('[PrintText] Starting print job');
    console.log('[PrintText] Printer:', printerName || 'default');
    console.log('[PrintText] Text length:', text.length, 'chars');
    
    if (!printerName) {
      console.log('[PrintText] ERROR: No printer specified');
      throw new Error('Nenhuma impressora especificada');
    }
    
    // Build ESC/POS data
    const data = this.buildEscPosData(text, layout);
    console.log('[PrintText] ESC/POS data size:', data.length, 'bytes');
    
    if (this.platform === 'win32') {
      return this.printWindows(data, printerName);
    } else {
      return this.printUnix(data, printerName);
    }
  }

  // ============================================
  // ESC/POS DATA BUILDER
  // ============================================
  
  buildEscPosData(text, layout = {}) {
    const buffers = [];
    
    // ESC/POS commands
    const ESC = 0x1B;
    const GS = 0x1D;
    const LF = 0x0A;
    
    // Initialize printer
    buffers.push(Buffer.from([ESC, 0x40])); // ESC @ - Initialize
    
    // Set character code table to PC850 (better Portuguese support)
    buffers.push(Buffer.from([ESC, 0x74, 0x02])); // ESC t 2
    
    // Convert text to printer-safe format
    const lines = text.split('\n');
    for (const line of lines) {
      const cleanLine = this.sanitizeText(line);
      buffers.push(Buffer.from(cleanLine, 'latin1'));
      buffers.push(Buffer.from([LF]));
    }
    
    // Paper feed before cut
    buffers.push(Buffer.from([LF, LF, LF, LF]));
    
    // Partial cut
    const cutType = layout.paperCut || 'partial';
    if (cutType === 'full') {
      buffers.push(Buffer.from([GS, 0x56, 0x00]));
    } else if (cutType === 'partial') {
      buffers.push(Buffer.from([GS, 0x56, 0x01]));
    }
    
    return Buffer.concat(buffers);
  }

  // ============================================
  // WINDOWS PRINTING - Multiple methods
  // ============================================
  
  async printWindows(data, printerName) {
    const tmpFile = path.join(os.tmpdir(), 'gamako_print_' + Date.now() + '.bin');
    
    try {
      // Write binary data to temp file
      fs.writeFileSync(tmpFile, data);
      console.log('[PrintText] Temp file:', tmpFile);
      console.log('[PrintText] Target printer:', printerName);
      console.log('[PrintText] Data size:', data.length, 'bytes');
      
      // Escape printer name for commands
      const safePrinter = printerName.replace(/"/g, '').replace(/'/g, '');
      
      // Try methods in order of reliability - Win32 API first (most reliable for thermal printers)
      const methods = [
        { name: 'Win32 API', fn: () => this.printWin32Api(tmpFile, safePrinter) },
        { name: 'RawPrint (PowerShell)', fn: () => this.printRawSimple(tmpFile, safePrinter) },
        { name: 'Copy Share', fn: () => this.printCopyToShare(tmpFile, safePrinter) },
        { name: 'LPR', fn: () => this.printLpr(tmpFile, safePrinter) },
      ];
      
      const errors = [];
      
      for (let i = 0; i < methods.length; i++) {
        try {
          console.log('[PrintText] Method ' + (i + 1) + '/' + methods.length + ': ' + methods[i].name + '...');
          await methods[i].fn();
          console.log('[PrintText] SUCCESS with', methods[i].name);
          this.cleanup(tmpFile);
          return true;
        } catch (err) {
          const errMsg = methods[i].name + ': ' + err.message;
          console.log('[PrintText] ' + errMsg);
          errors.push(errMsg);
        }
      }
      
      this.cleanup(tmpFile);
      throw new Error('Todos falharam - ' + errors.join('; '));
      
    } catch (error) {
      this.cleanup(tmpFile);
      throw error;
    }
  }

  /**
   * Method 0: Simple RAW print via PowerShell Out-Printer (most compatible)
   */
  async printRawSimple(filePath, printerName) {
    return new Promise((resolve, reject) => {
      // Use simpler PowerShell approach without Add-Type
      // Note: Using string concatenation to avoid backtick issues with template literals
      const escapedFilePath = filePath.replace(/\\/g, '\\\\');
      const psScript = [
        '$ErrorActionPreference = "Stop"',
        '$printerName = "' + printerName + '"',
        '$filePath = "' + escapedFilePath + '"',
        '',
        '# Read binary data',
        '$bytes = [System.IO.File]::ReadAllBytes($filePath)',
        '',
        '# Get printer',
        '$printerPath = Get-Printer -Name "$printerName" -ErrorAction SilentlyContinue | Select-Object -ExpandProperty PortName',
        '',
        'if (-not $printerPath) {',
        '    # Try direct port',
        '    $printerPath = (Get-WmiObject -Query "SELECT * FROM Win32_Printer WHERE Name=\'$printerName\'" | Select-Object -First 1).PortName',
        '}',
        '',
        'if (-not $printerPath) {',
        '    throw "Impressora \'$printerName\' nao encontrada"',
        '}',
        '',
        '# Write directly to port if it is a file-like port (LPT, COM, or USB)',
        'if ($printerPath -match "^(LPT|COM|USB)") {',
        '    [System.IO.File]::WriteAllBytes($printerPath, $bytes)',
        '    Write-Host "OK"',
        '    exit 0',
        '}',
        '',
        '# Otherwise use copy to printer share',
        '$sharePath = "\\\\\\\\localhost\\\\" + $printerName',
        '$copyCmd = "copy /b """ + $filePath + """ """ + $sharePath + """"',
        '$null = & cmd.exe /c $copyCmd 2>&1',
        'if ($LASTEXITCODE -eq 0) {',
        '    Write-Host "OK"',
        '} else {',
        '    throw "Falha ao enviar para spooler"',
        '}',
      ].join('\r\n');
      
      const psFile = path.join(os.tmpdir(), 'gamako_simple_' + Date.now() + '.ps1');
      fs.writeFileSync(psFile, psScript, 'utf8');

      exec(
        'powershell -NoProfile -ExecutionPolicy Bypass -File "' + psFile + '"',
        { timeout: 20000, windowsHide: true },
        (error, stdout, stderr) => {
          this.cleanup(psFile);
          
          if (error) {
            reject(new Error(stderr?.trim() || error.message));
          } else if (stdout.includes('OK')) {
            resolve(true);
          } else {
            reject(new Error(stderr?.trim() || stdout?.trim() || 'Erro desconhecido'));
          }
        }
      );
    });
  }

  /**
   * Method 1: Windows Print API via PowerShell (most reliable for thermal printers)
   */
  async printWin32Api(filePath, printerName) {
    return new Promise((resolve, reject) => {
      console.log('[PrintWin32Api] Starting with printer:', printerName);
      console.log('[PrintWin32Api] File:', filePath);
      
      // PowerShell script that uses Windows API for RAW printing
      // Using array join to avoid template literal issues with special characters
      const escapedFilePath = filePath.replace(/\\/g, '\\\\');
      const psScript = [
        "$ErrorActionPreference = 'Stop'",
        "$printerName = '" + printerName + "'",
        "$filePath = '" + escapedFilePath + "'",
        "",
        "Write-Host 'Printer:' $printerName",
        "Write-Host 'File:' $filePath",
        "",
        "# Read the binary data",
        "$bytes = [System.IO.File]::ReadAllBytes($filePath)",
        "Write-Host 'Bytes read:' $bytes.Length",
        "",
        "# Add the required type for RAW printing",
        'Add-Type -TypeDefinition @"',
        "using System;",
        "using System.Runtime.InteropServices;",
        "",
        "public class RawPrinterHelper {",
        "    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]",
        "    public struct DOCINFO {",
        "        [MarshalAs(UnmanagedType.LPWStr)] public string pDocName;",
        "        [MarshalAs(UnmanagedType.LPWStr)] public string pOutputFile;",
        "        [MarshalAs(UnmanagedType.LPWStr)] public string pDataType;",
        "    }",
        "",
        '    [DllImport("winspool.drv", CharSet = CharSet.Unicode, SetLastError = true)]',
        "    public static extern bool OpenPrinter(string pPrinterName, out IntPtr phPrinter, IntPtr pDefault);",
        "",
        '    [DllImport("winspool.drv", CharSet = CharSet.Unicode, SetLastError = true)]',
        "    public static extern bool StartDocPrinter(IntPtr hPrinter, int Level, ref DOCINFO pDocInfo);",
        "",
        '    [DllImport("winspool.drv", SetLastError = true)]',
        "    public static extern bool StartPagePrinter(IntPtr hPrinter);",
        "",
        '    [DllImport("winspool.drv", SetLastError = true)]',
        "    public static extern bool WritePrinter(IntPtr hPrinter, byte[] pBytes, int dwCount, out int dwWritten);",
        "",
        '    [DllImport("winspool.drv", SetLastError = true)]',
        "    public static extern bool EndPagePrinter(IntPtr hPrinter);",
        "",
        '    [DllImport("winspool.drv", SetLastError = true)]',
        "    public static extern bool EndDocPrinter(IntPtr hPrinter);",
        "",
        '    [DllImport("winspool.drv", SetLastError = true)]',
        "    public static extern bool ClosePrinter(IntPtr hPrinter);",
        "",
        "    public static int SendRawData(string printerName, byte[] data) {",
        "        IntPtr hPrinter;",
        "        if (!OpenPrinter(printerName, out hPrinter, IntPtr.Zero)) {",
        "            int error = Marshal.GetLastWin32Error();",
        '            throw new Exception("OpenPrinter failed. Error: " + error);',
        "        }",
        "",
        "        try {",
        "            var docInfo = new DOCINFO { ",
        '                pDocName = "Gamako Order", ',
        "                pOutputFile = null, ",
        '                pDataType = "RAW" ',
        "            };",
        "",
        "            if (!StartDocPrinter(hPrinter, 1, ref docInfo)) {",
        "                int error = Marshal.GetLastWin32Error();",
        '                throw new Exception("StartDocPrinter failed. Error: " + error);',
        "            }",
        "",
        "            try {",
        "                if (!StartPagePrinter(hPrinter)) {",
        "                    int error = Marshal.GetLastWin32Error();",
        '                    throw new Exception("StartPagePrinter failed. Error: " + error);',
        "                }",
        "",
        "                try {",
        "                    int written;",
        "                    if (!WritePrinter(hPrinter, data, data.Length, out written)) {",
        "                        int error = Marshal.GetLastWin32Error();",
        '                        throw new Exception("WritePrinter failed. Error: " + error);',
        "                    }",
        "                    return written;",
        "                } finally {",
        "                    EndPagePrinter(hPrinter);",
        "                }",
        "            } finally {",
        "                EndDocPrinter(hPrinter);",
        "            }",
        "        } finally {",
        "            ClosePrinter(hPrinter);",
        "        }",
        "    }",
        "}",
        '"@',
        "",
        "try {",
        "    $written = [RawPrinterHelper]::SendRawData($printerName, $bytes)",
        "    Write-Host 'Bytes written:' $written",
        "    if ($written -gt 0) {",
        "        Write-Host 'OK'",
        "    } else {",
        "        throw 'Zero bytes written to printer'",
        "    }",
        "} catch {",
        "    Write-Host 'ERROR:' $_.Exception.Message",
        "    throw",
        "}",
      ].join("\r\n");

      // Save script to temp file
      const psFile = path.join(os.tmpdir(), "gamako_ps_" + Date.now() + ".ps1");
      fs.writeFileSync(psFile, psScript, 'utf8');
      console.log('[PrintWin32Api] Script file:', psFile);

      exec(
        'powershell -NoProfile -ExecutionPolicy Bypass -File "' + psFile + '"',
        { timeout: 30000, windowsHide: true },
        (error, stdout, stderr) => {
          console.log('[PrintWin32Api] stdout:', stdout);
          console.log('[PrintWin32Api] stderr:', stderr);
          console.log('[PrintWin32Api] error:', error?.message);
          
          this.cleanup(psFile);
          
          if (error) {
            reject(new Error(stderr?.trim() || error.message));
          } else if (stdout.includes('OK')) {
            resolve(true);
          } else {
            reject(new Error(stderr?.trim() || stdout?.trim() || 'Unknown error'));
          }
        }
      );
    });
  }

  /**
   * Method 2: Copy to printer share
   */
  async printCopyToShare(filePath, printerName) {
    return new Promise((resolve, reject) => {
      // Get computer name
      const computerName = process.env.COMPUTERNAME || 'localhost';
      const sharePath = '\\\\' + computerName + '\\' + printerName;
      
      console.log('[PrintText] Copy to:', sharePath);
      
      exec(
        'copy /b "' + filePath + '" "' + sharePath + '"',
        { timeout: 15000, shell: 'cmd.exe', windowsHide: true },
        (error, stdout, stderr) => {
          if (error) {
            reject(new Error(stderr || error.message));
          } else {
            resolve(true);
          }
        }
      );
    });
  }

  /**
   * Method 3: LPR command (requires LPR feature enabled)
   */
  async printLpr(filePath, printerName) {
    return new Promise((resolve, reject) => {
      exec(
        'lpr -S localhost -P "' + printerName + '" "' + filePath + '"',
        { timeout: 15000, windowsHide: true },
        (error, stdout, stderr) => {
          if (error) {
            reject(new Error(stderr || error.message));
          } else {
            resolve(true);
          }
        }
      );
    });
  }

  // ============================================
  // UNIX PRINTING (Linux/Mac)
  // ============================================
  
  async printUnix(data, printerName) {
    const tmpFile = path.join(os.tmpdir(), 'gamako_print_' + Date.now() + '.bin');
    
    try {
      fs.writeFileSync(tmpFile, data);
      
      const printerArg = printerName ? '-d "' + printerName + '"' : '';
      
      return new Promise((resolve, reject) => {
        exec(
          'lp -o raw ' + printerArg + ' "' + tmpFile + '"',
          { timeout: 15000 },
          (error, stdout, stderr) => {
            this.cleanup(tmpFile);
            
            if (error) {
              reject(new Error(stderr || error.message));
            } else {
              resolve(true);
            }
          }
        );
      });
    } catch (error) {
      this.cleanup(tmpFile);
      throw error;
    }
  }

  // ============================================
  // RECEIPT FORMATTING
  // ============================================
  
  formatReceipt(order, layout, restaurantInfo = {}) {
    const width = parseInt(layout.paperWidth, 10) || 48;
    const div = '='.repeat(width);
    const divSmall = '-'.repeat(width);
    const lines = [];
    
    // Date/Time
    if (layout.showDateTime !== false) {
      const now = new Date(order.created_at || Date.now());
      lines.push(this.center(
        now.toLocaleDateString('pt-BR') + ' ' + 
        now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        width
      ));
    }
    
    // Restaurant name
    if (layout.showRestaurantName !== false && restaurantInfo.name) {
      lines.push(this.center(this.sanitizeText(restaurantInfo.name.toUpperCase()), width));
    }
    
    // Restaurant Address (from layout settings)
    if (layout.showAddress !== false && restaurantInfo.address) {
      this.wrapText(this.sanitizeText(restaurantInfo.address), width).forEach(line => {
        lines.push(this.center(line, width));
      });
    }
    
    // Restaurant Phone (from layout settings)
    if (layout.showPhone !== false && restaurantInfo.phone) {
      lines.push(this.center('Tel: ' + restaurantInfo.phone, width));
    }
    
    // Restaurant CNPJ (from layout settings)
    if (layout.showCnpj !== false && restaurantInfo.cnpj) {
      lines.push(this.center('CNPJ: ' + restaurantInfo.cnpj, width));
    }
    
    lines.push(div);
    
    // Receipt title (customizable)
    if (layout.receiptTitle) {
      lines.push(this.center(layout.receiptTitle, width));
      lines.push('');
    }
    
    // Order number - BIG
    if (layout.showOrderNumber !== false) {
      const num = order.order_number || (order.id ? order.id.slice(0, 8).toUpperCase() : '0');
      lines.push(this.center('Pedido #' + num, width));
    }
    
    lines.push('');
    
    // Order type
    if (layout.showOrderType !== false) {
      const typeLabels = {
        counter: 'BALCAO',
        table: 'MESA',
        delivery: 'ENTREGA',
        takeaway: 'RETIRADA',
      };
      lines.push('Tipo: ' + (typeLabels[order.order_type] || order.order_type || 'N/A'));
    }
    
    // Table - Only show the number, not "Mesa X Mesa X"
    if (layout.showTable !== false && (order.table_number || order.table_id)) {
      const tableNum = order.table_number || order.table_id;
      // Check if tableNum already contains "Mesa" to avoid duplication
      const tableLabel = String(tableNum).toLowerCase().includes('mesa') 
        ? tableNum 
        : 'Mesa ' + tableNum;
      lines.push(tableLabel);
    }
    
    // Waiter or system user
    if (layout.showWaiter !== false) {
      if (order.waiter_name) {
        lines.push('Garcom: ' + this.sanitizeText(order.waiter_name));
      } else if (order.created_by_name) {
        lines.push('Atendente: ' + this.sanitizeText(order.created_by_name));
      }
    }
    
    // Customer
    if (layout.showCustomerName !== false && order.customer_name) {
      lines.push('Cliente: ' + this.sanitizeText(order.customer_name));
    }
    
    // Phone
    if (layout.showCustomerPhone !== false && order.delivery_phone) {
      lines.push('Tel: ' + order.delivery_phone);
    }
    
    // Address
    if (layout.showDeliveryAddress !== false && order.delivery_address) {
      const addr = this.sanitizeText(order.delivery_address);
      this.wrapText(addr, width - 5).forEach((line, i) => {
        lines.push((i === 0 ? 'End: ' : '     ') + line);
      });
    }
    
    lines.push('');
    lines.push(div);
    lines.push('ITENS:');
    lines.push(divSmall);
    
    // Items
    if (order.order_items && order.order_items.length > 0) {
      for (const item of order.order_items) {
        const qty = item.quantity || 1;
        let name = this.sanitizeText(item.product_name || 'Item');
        
        // Only add size if it's NOT already in the product_name
        // (to avoid duplication like "Salada Mista (G) (G)")
        if (layout.showItemSize !== false && item.product_size) {
          const sizePattern = new RegExp('\\(' + item.product_size + '\\)', 'i');
          if (!sizePattern.test(name)) {
            name += ' (' + item.product_size + ')';
          }
        }
        
        const itemText = '(' + qty + ') ' + name;
        const price = layout.showItemPrices !== false 
          ? 'R$ ' + (item.product_price * qty).toFixed(2).replace('.', ',')
          : '';
        
        if (itemText.length + price.length + 1 <= width) {
          lines.push(this.alignBoth(itemText, price, width));
        } else {
          // Wrap long item names
          const wrapped = this.wrapText(itemText, width - (price.length > 0 ? price.length + 1 : 0));
          wrapped.forEach((line, i) => {
            if (i === wrapped.length - 1 && price) {
              lines.push(this.alignBoth(line, price, width));
            } else {
              lines.push(line);
            }
          });
        }
        
        // Item notes
        if (layout.showItemNotes !== false && item.notes) {
          lines.push('  OBS: ' + this.sanitizeText(item.notes));
        }
      }
    }
    
    lines.push(divSmall);
    
    // Notes
    if (order.notes) {
      lines.push('');
      lines.push('OBS: ' + this.sanitizeText(order.notes));
      lines.push('');
    }
    
    // Totals
    if (layout.showTotals !== false) {
      if (layout.showDeliveryFee !== false && order.delivery_fee && order.delivery_fee > 0) {
        lines.push(this.alignBoth('Taxa entrega:', 'R$ ' + order.delivery_fee.toFixed(2).replace('.', ','), width));
      }
      
      lines.push(this.alignBoth('TOTAL:', 'R$ ' + (order.total || 0).toFixed(2).replace('.', ','), width));
    }
    
    // Payment
    if (layout.showPaymentMethod !== false && order.payment_method) {
      const paymentLabels = {
        cash: 'Dinheiro',
        credit: 'Cartao Credito',
        debit: 'Cartao Debito',
        pix: 'PIX',
        voucher: 'Voucher',
      };
      lines.push('Pagamento: ' + (paymentLabels[order.payment_method] || order.payment_method));
    }
    
    lines.push('');
    lines.push(div);
    
    // Footer
    if (layout.footerMessage) {
      lines.push(this.center(this.sanitizeText(layout.footerMessage), width));
    }
    
    // Custom footer lines
    if (layout.customFooterLine1) {
      lines.push(this.center(this.sanitizeText(layout.customFooterLine1), width));
    }
    if (layout.customFooterLine2) {
      lines.push(this.center(this.sanitizeText(layout.customFooterLine2), width));
    }
    if (layout.customFooterLine3) {
      lines.push(this.center(this.sanitizeText(layout.customFooterLine3), width));
    }
    
    // Default footer (Powered by Gamako)
    if (layout.showDefaultFooter !== false) {
      lines.push('');
      lines.push(this.center('powered by https://gamako.com.br', width));
    }
    
    // Extra lines for paper feed
    lines.push('');
    lines.push('');
    lines.push('');
    lines.push('');
    
    return lines.join('\n');
  }

  formatConferenceReceipt(order, layout, restaurantInfo = {}) {
    const width = parseInt(layout.paperWidth, 10) || 48;
    const div = '='.repeat(width);
    const divSmall = '-'.repeat(width);
    const lines = [];
    
    // Parse conference data from notes
    let conf = {};
    try {
      conf = JSON.parse(order.notes || '{}');
    } catch (e) {
      conf = {};
    }
    
    const isFinal = conf.isFinalReceipt || false;
    const entityType = conf.entityType || 'table';
    const entityNumber = conf.entityNumber || '';
    const discount = conf.discount || 0;
    const addition = conf.addition || 0;
    const serviceCharge = conf.serviceCharge || order.service_charge || 0;
    const payments = conf.payments || [];
    
    // Header
    if (restaurantInfo.name) {
      lines.push(this.center(this.sanitizeText(restaurantInfo.name.toUpperCase()), width));
    }
    
    lines.push('');
    lines.push(this.center(isFinal ? '*** CONTA PAGA ***' : '*** CONFERENCIA ***', width));
    
    const entityLabel = entityType === 'table' ? 'MESA' : 'COMANDA';
    lines.push(this.center(entityLabel + ' ' + entityNumber, width));
    
    // Only show customer_name if it's NOT just "Mesa X" or "Comanda X" (avoid duplication)
    if (order.customer_name) {
      const nameStr = String(order.customer_name).toLowerCase();
      const isDefaultName = nameStr.startsWith('mesa ') || nameStr.startsWith('comanda ');
      if (!isDefaultName) {
        lines.push(this.center(this.sanitizeText(order.customer_name), width));
      }
    }
    
    lines.push(this.center(new Date().toLocaleString('pt-BR'), width));
    
    lines.push(div);
    lines.push('ITENS:');
    lines.push(divSmall);
    
    // Items
    let subtotal = 0;
    if (order.order_items && order.order_items.length > 0) {
      for (const item of order.order_items) {
        const qty = item.quantity || 1;
        const price = item.product_price || 0;
        subtotal += price * qty;
        
        const name = this.sanitizeText(item.product_name || 'Item');
        const priceStr = 'R$ ' + (price * qty).toFixed(2).replace('.', ',');
        
        lines.push(this.alignBoth('(' + qty + ') ' + name, priceStr, width));
      }
    }
    
    lines.push(divSmall);
    
    // Subtotal
    lines.push(this.alignBoth('Subtotal:', 'R$ ' + subtotal.toFixed(2).replace('.', ','), width));
    
    // Discount
    if (discount > 0) {
      lines.push(this.alignBoth('Desconto:', '-R$ ' + discount.toFixed(2).replace('.', ','), width));
    }
    
    // Addition
    if (addition > 0) {
      lines.push(this.alignBoth('Acrescimo:', '+R$ ' + addition.toFixed(2).replace('.', ','), width));
    }
    
    // Service charge (10%)
    if (serviceCharge > 0) {
      lines.push(this.alignBoth('Taxa de Servico (10%):', '+R$ ' + serviceCharge.toFixed(2).replace('.', ','), width));
    }
    
    // Total
    lines.push(div);
    lines.push(this.alignBoth('TOTAL:', 'R$ ' + (order.total || 0).toFixed(2).replace('.', ','), width));
    lines.push(div);
    
    // Payments (for final receipt)
    if (isFinal && payments.length > 0) {
      lines.push('');
      lines.push('PAGAMENTOS:');
      for (const pay of payments) {
        const methodLabels = {
          cash: 'Dinheiro',
          credit: 'Credito',
          debit: 'Debito',
          pix: 'PIX',
        };
        const method = methodLabels[pay.method] || pay.method;
        lines.push(this.alignBoth(method + ':', 'R$ ' + (pay.amount || 0).toFixed(2).replace('.', ','), width));
      }
    }
    
    lines.push('');
    lines.push(this.center('Obrigado pela preferencia!', width));
    lines.push('');
    lines.push(this.center('powered by https://gamako.com.br', width));
    lines.push('');
    lines.push('');
    lines.push('');
    
    return lines.join('\n');
  }

  /**
   * Format closing/daily report receipt
   */
  formatClosingReceipt(order, layout, restaurantInfo = {}) {
    const width = parseInt(layout.paperWidth, 10) || 48;
    const div = '='.repeat(width);
    const divSmall = '-'.repeat(width);
    const lines = [];
    
    // Parse closing data from notes
    let data = {};
    try {
      data = JSON.parse(order.notes || '{}');
    } catch (e) {
      data = {};
    }
    
    const settings = data.receiptSettings || {};
    
    // Header
    if (restaurantInfo.name || data.restaurantName) {
      lines.push(this.center(this.sanitizeText((restaurantInfo.name || data.restaurantName).toUpperCase()), width));
    }
    
    if (settings.showAddress && (settings.address || restaurantInfo.address)) {
      const addr = settings.address || restaurantInfo.address;
      this.wrapText(this.sanitizeText(addr), width).forEach(line => lines.push(this.center(line, width)));
    }
    
    if (settings.showPhone && (settings.phone || restaurantInfo.phone)) {
      lines.push(this.center('Tel: ' + (settings.phone || restaurantInfo.phone), width));
    }
    
    if (settings.showCnpj && (settings.cnpj || restaurantInfo.cnpj)) {
      lines.push(this.center('CNPJ: ' + (settings.cnpj || restaurantInfo.cnpj), width));
    }
    
    lines.push('');
    lines.push(div);
    lines.push(this.center('RELATORIO DE FECHAMENTO', width));
    lines.push(this.center(data.date || new Date().toLocaleDateString('pt-BR'), width));
    lines.push(div);
    
    // Period
    lines.push('');
    lines.push('PERIODO:');
    lines.push(this.alignBoth('Abertura:', data.openedAt || '--:--', width));
    lines.push(this.alignBoth('Fechamento:', data.closedAt || '--:--', width));
    
    lines.push('');
    lines.push(divSmall);
    
    // Summary
    lines.push('RESUMO:');
    lines.push(this.alignBoth('Total de Pedidos:', String(data.totalOrders || 0), width));
    lines.push(this.alignBoth('Pedidos Cancelados:', String(data.cancelledOrders || 0), width));
    lines.push(this.alignBoth('Ticket Medio:', 'R$ ' + (data.averageTicket || 0).toFixed(2).replace('.', ','), width));
    
    lines.push('');
    lines.push(div);
    lines.push(this.alignBoth('FATURAMENTO TOTAL:', 'R$ ' + (data.totalRevenue || 0).toFixed(2).replace('.', ','), width));
    lines.push(div);
    
    // Payment breakdown
    if (data.paymentBreakdown && data.paymentBreakdown.length > 0) {
      lines.push('');
      lines.push('FORMAS DE PAGAMENTO:');
      lines.push(divSmall);
      
      for (const pay of data.paymentBreakdown) {
        const label = pay.method + ' (' + pay.count + 'x)';
        const value = 'R$ ' + (pay.total || 0).toFixed(2).replace('.', ',');
        lines.push(this.alignBoth(this.sanitizeText(label), value, width));
      }
    }
    
    // Order type breakdown
    if (data.orderTypeBreakdown && data.orderTypeBreakdown.length > 0) {
      lines.push('');
      lines.push('TIPOS DE PEDIDO:');
      lines.push(divSmall);
      
      for (const type of data.orderTypeBreakdown) {
        const label = type.type + ' (' + type.count + 'x)';
        const value = 'R$ ' + (type.total || 0).toFixed(2).replace('.', ',');
        lines.push(this.alignBoth(this.sanitizeText(label), value, width));
      }
    }
    
    // Footer
    lines.push('');
    lines.push(div);
    
    if (settings.receiptFooter) {
      this.wrapText(this.sanitizeText(settings.receiptFooter), width).forEach(line => {
        lines.push(this.center(line, width));
      });
    }
    
    lines.push(this.center('Relatorio gerado automaticamente', width));
    lines.push(this.center(new Date().toLocaleString('pt-BR'), width));
    
    lines.push('');
    lines.push(this.center('powered by https://gamako.com.br', width));
    lines.push('');
    lines.push('');
    lines.push('');
    
    return lines.join('\n');
  }

  // ============================================
  // HELPER FUNCTIONS
  // ============================================
  
  sanitizeText(str) {
    if (!str) return '';
    return String(str)
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
      .replace(/[^\x20-\x7E]/g, ''); // Keep only printable ASCII
  }

  center(text, width) {
    const str = String(text || '');
    if (str.length >= width) return str.slice(0, width);
    const left = Math.floor((width - str.length) / 2);
    return ' '.repeat(left) + str + ' '.repeat(width - left - str.length);
  }

  alignBoth(left, right, width) {
    const leftStr = String(left || '');
    const rightStr = String(right || '');
    const gap = width - leftStr.length - rightStr.length;
    if (gap <= 0) return (leftStr + ' ' + rightStr).slice(0, width);
    return leftStr + ' '.repeat(gap) + rightStr;
  }

  wrapText(text, maxWidth) {
    if (!text) return [''];
    const words = String(text).split(/\s+/);
    const lines = [];
    let current = '';
    
    for (const word of words) {
      if (current.length + word.length + 1 <= maxWidth) {
        current = current ? current + ' ' + word : word;
      } else {
        if (current) lines.push(current);
        current = word;
      }
    }
    if (current) lines.push(current);
    
    return lines.length > 0 ? lines : [''];
  }

  cleanup(filePath) {
    setTimeout(() => {
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (e) {
        // Ignore
      }
    }, 5000);
  }
}

module.exports = PrinterService;
