const usb = require('usb');

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
};

class USBPrinterService {
  constructor() {
    this.device = null;
    this.endpoint = null;
    this.isConnected = false;
  }

  /**
   * List all available USB printers
   */
  listPrinters() {
    const devices = usb.getDeviceList();
    const printers = [];

    for (const device of devices) {
      const descriptor = device.deviceDescriptor;
      const vendorId = descriptor.idVendor;
      
      // Check if it's a known printer vendor or has printer interface
      if (KNOWN_PRINTER_VENDORS[vendorId] || this.isPrinterDevice(device)) {
        try {
          device.open();
          
          const manufacturer = device.getStringDescriptor(descriptor.iManufacturer) || 'Unknown';
          const product = device.getStringDescriptor(descriptor.iProduct) || 'USB Printer';
          
          device.close();
          
          printers.push({
            vendorId: vendorId.toString(16).padStart(4, '0'),
            productId: descriptor.idProduct.toString(16).padStart(4, '0'),
            manufacturer: KNOWN_PRINTER_VENDORS[vendorId] || manufacturer,
            product,
            name: `${KNOWN_PRINTER_VENDORS[vendorId] || manufacturer} - ${product}`,
            path: `USB:${vendorId.toString(16)}:${descriptor.idProduct.toString(16)}`,
          });
        } catch (e) {
          // Device might be in use or inaccessible
          printers.push({
            vendorId: vendorId.toString(16).padStart(4, '0'),
            productId: descriptor.idProduct.toString(16).padStart(4, '0'),
            manufacturer: KNOWN_PRINTER_VENDORS[vendorId] || 'Unknown',
            product: 'USB Device',
            name: `${KNOWN_PRINTER_VENDORS[vendorId] || 'Unknown'} USB Printer`,
            path: `USB:${vendorId.toString(16)}:${descriptor.idProduct.toString(16)}`,
          });
        }
      }
    }

    return printers;
  }

  /**
   * Check if device is likely a printer by checking interfaces
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
      // Ignore errors
    }
    
    return false;
  }

  /**
   * Connect to a specific USB printer
   */
  connect(vendorId, productId) {
    return new Promise((resolve, reject) => {
      try {
        const vid = typeof vendorId === 'string' ? parseInt(vendorId, 16) : vendorId;
        const pid = typeof productId === 'string' ? parseInt(productId, 16) : productId;
        
        this.device = usb.findByIds(vid, pid);
        
        if (!this.device) {
          reject(new Error('Impressora USB não encontrada'));
          return;
        }

        this.device.open();
        
        // Find the printer interface
        const iface = this.device.interface(0);
        
        // Detach kernel driver if necessary (Linux)
        if (iface.isKernelDriverActive()) {
          iface.detachKernelDriver();
        }
        
        iface.claim();
        
        // Find the OUT endpoint
        for (const endpoint of iface.endpoints) {
          if (endpoint.direction === 'out') {
            this.endpoint = endpoint;
            break;
          }
        }
        
        if (!this.endpoint) {
          reject(new Error('Endpoint de saída não encontrado'));
          return;
        }
        
        this.isConnected = true;
        resolve(true);
      } catch (error) {
        reject(new Error(`Erro ao conectar: ${error.message}`));
      }
    });
  }

  /**
   * Disconnect from USB printer
   */
  disconnect() {
    if (this.device) {
      try {
        this.device.close();
      } catch (e) {
        // Ignore
      }
      this.device = null;
      this.endpoint = null;
      this.isConnected = false;
    }
  }

  /**
   * Write data to printer
   */
  write(data) {
    return new Promise((resolve, reject) => {
      if (!this.endpoint || !this.isConnected) {
        reject(new Error('Impressora não conectada'));
        return;
      }

      const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data);
      
      this.endpoint.transfer(buffer, (error) => {
        if (error) {
          reject(new Error(`Erro ao enviar dados: ${error.message}`));
        } else {
          resolve(true);
        }
      });
    });
  }

  /**
   * Auto-detect and connect to the first available printer
   */
  async autoConnect() {
    const printers = this.listPrinters();
    
    if (printers.length === 0) {
      throw new Error('Nenhuma impressora USB encontrada');
    }

    const printer = printers[0];
    await this.connect(printer.vendorId, printer.productId);
    
    return printer;
  }
}

module.exports = USBPrinterService;
