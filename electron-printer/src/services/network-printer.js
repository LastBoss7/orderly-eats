/**
 * Network Printer Service (TCP/IP Port 9100)
 * 
 * Provides direct TCP/IP connection to network thermal printers
 * Compatible with: Epson TM-T20X, Elgin i9, Tectoy C3, Techa POS80, etc.
 * 
 * Port 9100 is the standard "RAW" printing port for network printers
 * ESC/POS commands are sent directly via TCP socket
 */

const net = require('net');

class NetworkPrinterService {
  constructor() {
    this.connections = new Map(); // IP:Port -> socket
    this.connectionTimeout = 5000; // 5 seconds
    this.writeTimeout = 10000; // 10 seconds
  }

  /**
   * Test if a network printer is reachable
   * @param {string} ip - Printer IP address
   * @param {number} port - Printer port (default: 9100)
   * @returns {Promise<{success: boolean, latency?: number, error?: string}>}
   */
  async testConnection(ip, port = 9100) {
    return new Promise((resolve) => {
      const startTime = Date.now();
      const socket = new net.Socket();
      let resolved = false;

      const cleanup = () => {
        if (!resolved) {
          resolved = true;
          socket.destroy();
        }
      };

      socket.setTimeout(this.connectionTimeout);

      socket.on('connect', () => {
        const latency = Date.now() - startTime;
        cleanup();
        resolve({ success: true, latency, ip, port });
      });

      socket.on('timeout', () => {
        cleanup();
        resolve({ success: false, error: 'Timeout - impressora não respondeu', ip, port });
      });

      socket.on('error', (err) => {
        cleanup();
        resolve({ success: false, error: err.message, ip, port });
      });

      try {
        socket.connect(port, ip);
      } catch (err) {
        cleanup();
        resolve({ success: false, error: err.message, ip, port });
      }
    });
  }

  /**
   * Send data directly to network printer via TCP
   * @param {string} ip - Printer IP address
   * @param {number} port - Printer port (default: 9100)
   * @param {Buffer|string} data - ESC/POS data to send
   * @returns {Promise<{success: boolean, bytesSent?: number, error?: string}>}
   */
  async print(ip, port = 9100, data) {
    return new Promise((resolve) => {
      const socket = new net.Socket();
      let resolved = false;
      let bytesSent = 0;

      const cleanup = () => {
        if (!resolved) {
          resolved = true;
          socket.destroy();
        }
      };

      // Convert string to buffer if needed
      const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data, 'binary');

      socket.setTimeout(this.connectionTimeout);

      socket.on('connect', () => {
        console.log(`[NetworkPrinter] Connected to ${ip}:${port}`);
        
        // Set longer timeout for writing
        socket.setTimeout(this.writeTimeout);

        // Send data
        socket.write(buffer, (err) => {
          if (err) {
            cleanup();
            resolve({ success: false, error: `Erro ao enviar dados: ${err.message}`, ip, port });
            return;
          }

          bytesSent = buffer.length;
          
          // Give printer time to process before closing
          setTimeout(() => {
            socket.end();
          }, 100);
        });
      });

      socket.on('close', () => {
        if (!resolved) {
          resolved = true;
          if (bytesSent > 0) {
            console.log(`[NetworkPrinter] Sent ${bytesSent} bytes to ${ip}:${port}`);
            resolve({ success: true, bytesSent, ip, port });
          } else {
            resolve({ success: false, error: 'Conexão fechada sem enviar dados', ip, port });
          }
        }
      });

      socket.on('timeout', () => {
        cleanup();
        resolve({ success: false, error: 'Timeout - impressora não respondeu', ip, port });
      });

      socket.on('error', (err) => {
        cleanup();
        resolve({ success: false, error: err.message, ip, port });
      });

      try {
        console.log(`[NetworkPrinter] Connecting to ${ip}:${port}...`);
        socket.connect(port, ip);
      } catch (err) {
        cleanup();
        resolve({ success: false, error: err.message, ip, port });
      }
    });
  }

  /**
   * Print text with automatic ESC/POS formatting
   * @param {string} ip - Printer IP address
   * @param {number} port - Printer port (default: 9100)
   * @param {Buffer} escPosData - Pre-built ESC/POS commands buffer
   * @returns {Promise<{success: boolean, bytesSent?: number, error?: string}>}
   */
  async printEscPos(ip, port = 9100, escPosData) {
    return this.print(ip, port, escPosData);
  }

  /**
   * Open cash drawer connected to network printer
   * @param {string} ip - Printer IP address
   * @param {number} port - Printer port (default: 9100)
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async openCashDrawer(ip, port = 9100) {
    // ESC/POS command to open cash drawer (pulse to pin 2)
    const pulseCmd = Buffer.from([0x1B, 0x70, 0x00, 0x19, 0xFA]);
    return this.print(ip, port, pulseCmd);
  }

  /**
   * Scan network for printers on port 9100
   * @param {string} subnet - Subnet to scan (e.g., "192.168.1")
   * @param {number} startIp - Start IP (default: 1)
   * @param {number} endIp - End IP (default: 254)
   * @returns {Promise<Array<{ip: string, port: number, latency: number}>>}
   */
  async scanNetwork(subnet, startIp = 1, endIp = 254) {
    console.log(`[NetworkPrinter] Scanning ${subnet}.${startIp}-${endIp} for printers...`);
    
    const promises = [];
    for (let i = startIp; i <= endIp; i++) {
      const ip = `${subnet}.${i}`;
      promises.push(this.testConnection(ip, 9100));
    }

    const results = await Promise.all(promises);
    const printers = results.filter(r => r.success);
    
    console.log(`[NetworkPrinter] Found ${printers.length} network printer(s)`);
    return printers;
  }

  /**
   * Quick scan for common printer IPs
   * Many printers use common default IPs like 192.168.1.100, 192.168.0.100, etc.
   * @returns {Promise<Array<{ip: string, port: number, latency: number}>>}
   */
  async quickScan() {
    const commonIps = [
      // Common default IPs for thermal printers
      '192.168.1.100',
      '192.168.1.200',
      '192.168.1.250',
      '192.168.0.100',
      '192.168.0.200',
      '192.168.0.250',
      '10.0.0.100',
      '10.0.0.200',
      // DHCP ranges
      '192.168.1.50',
      '192.168.1.51',
      '192.168.1.52',
      '192.168.0.50',
      '192.168.0.51',
      '192.168.0.52',
    ];

    console.log('[NetworkPrinter] Quick scanning common printer IPs...');
    
    const promises = commonIps.map(ip => this.testConnection(ip, 9100));
    const results = await Promise.all(promises);
    
    return results.filter(r => r.success);
  }
}

module.exports = NetworkPrinterService;
