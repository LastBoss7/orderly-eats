/**
 * USB Direct Printer Service
 * Sends ESC/POS bytes DIRECTLY to USB thermal printers
 * NO Windows spooler = FASTEST possible printing
 * 
 * This is how professional POS systems (iFood, Anota AI, Saipos) work!
 */

let usb = null;
try {
  usb = require('usb');
} catch (e) {
  console.log('[USBPrinter] usb module not installed');
}

// Common thermal printer vendor IDs
const KNOWN_PRINTER_VENDORS = {
  0x04B8: 'Epson',
  0x0519: 'Star Micronics',
  0x0DD4: 'Custom',
  0x0FE6: 'Bematech',
  0x0483: 'Elgin',
  0x1504: 'Citizen',
  0x1FC9: 'HOIN',
  0x6868: 'Generic POS',
  0x0416: 'Winbond (Generic)',
  0x0493: 'SNBC',
  0x20D1: 'Daruma',
  0x0B00: 'Sweda',
  0x0525: 'Generic Thermal',
  0x1A86: 'QinHeng (CH340)',
  0x067B: 'Prolific (USB-Serial)',
};

class USBPrinterService {
  constructor() {
    this.device = null;
    this.iface = null;
    this.endpoint = null;
    this.isConnected = false;
    this.lastVendorId = null;
    this.lastProductId = null;
    this.connectionAttempts = 0;
    this.maxRetries = 3;
  }

  /**
   * List all available USB thermal printers
   */
  listPrinters() {
    if (!usb) {
      console.log('[USBPrinter] USB module not available');
      return [];
    }

    const devices = usb.getDeviceList();
    const printers = [];

    for (const device of devices) {
      const descriptor = device.deviceDescriptor;
      const vendorId = descriptor.idVendor;
      
      // Check if it's a known printer vendor or has printer interface class
      const isKnownVendor = KNOWN_PRINTER_VENDORS[vendorId];
      const isPrinterClass = this.isPrinterDevice(device);
      
      if (isKnownVendor || isPrinterClass) {
        let manufacturer = KNOWN_PRINTER_VENDORS[vendorId] || 'Unknown';
        let product = 'Thermal Printer';
        
        try {
          device.open();
          if (descriptor.iManufacturer) {
            const mfr = device.getStringDescriptor(descriptor.iManufacturer);
            if (mfr) manufacturer = mfr;
          }
          if (descriptor.iProduct) {
            const prod = device.getStringDescriptor(descriptor.iProduct);
            if (prod) product = prod;
          }
          device.close();
        } catch (e) {
          // Device might be in use - that's OK
        }
        
        printers.push({
          vendorId: vendorId.toString(16).padStart(4, '0'),
          productId: descriptor.idProduct.toString(16).padStart(4, '0'),
          vendorIdNum: vendorId,
          productIdNum: descriptor.idProduct,
          manufacturer,
          product,
          name: `${manufacturer} - ${product}`,
          path: `USB:${vendorId.toString(16)}:${descriptor.idProduct.toString(16)}`,
          isKnownVendor: !!isKnownVendor,
        });
      }
    }

    console.log(`[USBPrinter] Found ${printers.length} thermal printer(s)`);
    return printers;
  }

  /**
   * Check if device is a printer by interface class
   */
  isPrinterDevice(device) {
    try {
      device.open();
      const config = device.configDescriptor;
      
      if (config && config.interfaces) {
        for (const iface of config.interfaces) {
          for (const alt of iface) {
            // Printer class is 0x07
            if (alt.bInterfaceClass === 0x07) {
              device.close();
              return true;
            }
          }
        }
      }
      
      device.close();
    } catch (e) {
      // Ignore - device might be in use
    }
    
    return false;
  }

  /**
   * Connect to a specific USB printer
   */
  async connect(vendorId, productId) {
    if (!usb) {
      throw new Error('USB module not available');
    }

    // Convert string IDs to numbers
    const vid = typeof vendorId === 'string' ? parseInt(vendorId, 16) : vendorId;
    const pid = typeof productId === 'string' ? parseInt(productId, 16) : productId;
    
    console.log(`[USBPrinter] Connecting to ${vid.toString(16)}:${pid.toString(16)}...`);
    
    // Disconnect existing connection
    if (this.isConnected) {
      this.disconnect();
    }

    return new Promise((resolve, reject) => {
      try {
        this.device = usb.findByIds(vid, pid);
        
        if (!this.device) {
          reject(new Error(`Impressora USB não encontrada (${vid.toString(16)}:${pid.toString(16)})`));
          return;
        }

        this.device.open();
        console.log('[USBPrinter] Device opened');
        
        // Find the first interface with an OUT endpoint
        const config = this.device.configDescriptor;
        let foundEndpoint = false;
        
        for (let i = 0; i < config.interfaces.length && !foundEndpoint; i++) {
          try {
            this.iface = this.device.interface(i);
            
            // Detach kernel driver if necessary (Linux only)
            if (process.platform !== 'win32' && this.iface.isKernelDriverActive()) {
              this.iface.detachKernelDriver();
            }
            
            this.iface.claim();
            console.log(`[USBPrinter] Interface ${i} claimed`);
            
            // Find the OUT endpoint
            for (const ep of this.iface.endpoints) {
              if (ep.direction === 'out') {
                this.endpoint = ep;
                foundEndpoint = true;
                console.log(`[USBPrinter] OUT endpoint found: 0x${ep.address.toString(16)}`);
                break;
              }
            }
            
            if (!foundEndpoint) {
              this.iface.release();
            }
          } catch (e) {
            console.log(`[USBPrinter] Interface ${i} not available:`, e.message);
          }
        }
        
        if (!this.endpoint) {
          this.device.close();
          reject(new Error('Endpoint de saída não encontrado na impressora'));
          return;
        }
        
        this.lastVendorId = vid;
        this.lastProductId = pid;
        this.isConnected = true;
        this.connectionAttempts = 0;
        
        console.log('[USBPrinter] Connected successfully!');
        resolve(true);
        
      } catch (error) {
        console.log('[USBPrinter] Connection error:', error.message);
        this.cleanup();
        reject(new Error(`Erro ao conectar USB: ${error.message}`));
      }
    });
  }

  /**
   * Reconnect to last known printer
   */
  async reconnect() {
    if (!this.lastVendorId || !this.lastProductId) {
      throw new Error('No previous connection to reconnect');
    }
    
    if (this.connectionAttempts >= this.maxRetries) {
      this.connectionAttempts = 0;
      throw new Error('Max reconnection attempts reached');
    }
    
    this.connectionAttempts++;
    console.log(`[USBPrinter] Reconnection attempt ${this.connectionAttempts}/${this.maxRetries}`);
    
    return this.connect(this.lastVendorId, this.lastProductId);
  }

  /**
   * Disconnect from USB printer
   */
  disconnect() {
    console.log('[USBPrinter] Disconnecting...');
    this.cleanup();
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    if (this.iface) {
      try {
        this.iface.release();
      } catch (e) {}
      this.iface = null;
    }
    
    if (this.device) {
      try {
        this.device.close();
      } catch (e) {}
      this.device = null;
    }
    
    this.endpoint = null;
    this.isConnected = false;
  }

  /**
   * Write data directly to printer (NO SPOOLER!)
   * This is the core function that makes printing FAST
   */
  async write(data) {
    if (!this.endpoint || !this.isConnected) {
      // Try to reconnect
      if (this.lastVendorId && this.lastProductId) {
        await this.reconnect();
      } else {
        throw new Error('Impressora USB não conectada');
      }
    }

    const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data);
    
    return new Promise((resolve, reject) => {
      console.log(`[USBPrinter] Writing ${buffer.length} bytes directly to USB...`);
      
      this.endpoint.transfer(buffer, (error) => {
        if (error) {
          console.log('[USBPrinter] Write error:', error.message);
          
          // Mark as disconnected for retry next time
          this.isConnected = false;
          
          reject(new Error(`Erro ao enviar dados USB: ${error.message}`));
        } else {
          console.log('[USBPrinter] Write successful!');
          resolve(true);
        }
      });
    });
  }

  /**
   * Auto-detect and connect to the first available thermal printer
   */
  async autoConnect() {
    const printers = this.listPrinters();
    
    if (printers.length === 0) {
      throw new Error('Nenhuma impressora USB térmica encontrada');
    }

    // Prefer known vendors
    const knownPrinter = printers.find(p => p.isKnownVendor);
    const printer = knownPrinter || printers[0];
    
    console.log(`[USBPrinter] Auto-connecting to: ${printer.name}`);
    await this.connect(printer.vendorId, printer.productId);
    
    return printer;
  }

  /**
   * Test print - sends a simple test receipt
   */
  async testPrint() {
    const ESC = 0x1B;
    const GS = 0x1D;
    const LF = 0x0A;
    
    const buffers = [];
    
    // Initialize
    buffers.push(Buffer.from([ESC, 0x40]));
    
    // Center align
    buffers.push(Buffer.from([ESC, 0x61, 0x01]));
    
    // Double height
    buffers.push(Buffer.from([GS, 0x21, 0x10]));
    buffers.push(Buffer.from('TESTE USB DIRETO\n'));
    
    // Normal size
    buffers.push(Buffer.from([GS, 0x21, 0x00]));
    buffers.push(Buffer.from('================\n'));
    buffers.push(Buffer.from('Impressao USB OK!\n'));
    buffers.push(Buffer.from('Sem spooler Windows\n'));
    buffers.push(Buffer.from('================\n'));
    
    // Date/time
    const now = new Date();
    buffers.push(Buffer.from(`${now.toLocaleString('pt-BR')}\n`));
    
    // Feed and partial cut
    buffers.push(Buffer.from([LF, LF, LF, LF]));
    buffers.push(Buffer.from([GS, 0x56, 0x01]));
    
    const data = Buffer.concat(buffers);
    
    console.log('[USBPrinter] Sending test print...');
    return this.write(data);
  }
}

module.exports = USBPrinterService;
