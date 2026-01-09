// src/main/preload.js
const { contextBridge, ipcRenderer } = require("electron");

console.log(">> preload.js loaded (very simple)");
console.log(">> Exposing printerAPI to renderer...");

// Validasi untuk keamanan tambahan - DIPERLUAS
const validChannels = {
  'print-receipt': true,
  'detect-bluetooth-printers': true,
  'check-printer-status': true,
  'print-barcode-label': true,
  'list-printers': true,
  'open-cash-drawer': true,        // 🆕 Channel untuk cash drawer
  'test-cash-drawer': true          // 🆕 Channel untuk test drawer
};

// 🔹 Helper function untuk validasi channel
function isValidChannel(channel) {
  if (!validChannels[channel]) {
    console.error(`❌ Invalid IPC channel: ${channel}`);
    return false;
  }
  return true;
}

// 🔹 Wrapper function untuk invoke dengan validasi
async function safeInvoke(channel, payload = null) {
  if (!isValidChannel(channel)) {
    return {
      success: false,
      error: `Invalid channel: ${channel}`
    };
  }
  
  try {
    console.log(`>> Invoking ${channel} from preload`);
    const result = await ipcRenderer.invoke(channel, payload);
    return result;
  } catch (error) {
    console.error(`Error in ${channel}:`, error);
    return {
      success: false,
      error: error.message || "Unknown error",
      stack: error.stack
    };
  }
}

// ===== PRINTER API =====
contextBridge.exposeInMainWorld("printerAPI", {
  /**
   * Cetak struk transaksi
   * @param {Object} payload - Data struk (txId, items, totals, dll)
   * @param {boolean} payload.openDrawer - Buka cash drawer otomatis (default: false)
   * @returns {Promise<Object>} Result { success, message, error }
   */
  printReceipt: (payload) => {
    // Validasi payload dasar
    if (!payload || typeof payload !== 'object') {
      console.error("Invalid print payload");
      return Promise.resolve({
        success: false,
        error: "Invalid payload data"
      });
    }
    
    console.log("Print payload received:", Object.keys(payload));
    return safeInvoke("print-receipt", payload);
  },

  /**
   * Wrapper aman untuk printReceipt (backward compatibility)
   */
  printReceiptSafe: async (payload) => {
    return await safeInvoke("print-receipt", payload);
  },

  /**
   * Deteksi printer Bluetooth/USB yang tersedia
   * @returns {Promise<Object>} { success, devices[], message }
   */
  detectBluetoothPrinters: () => {
    return safeInvoke("detect-bluetooth-printers");
  },

  /**
   * Cek status printer USB WOYA
   * @returns {Promise<Object>} Status printer
   */
  checkStatus: () => {
    return safeInvoke("check-printer-status");
  }
});

// ===== 🆕 CASH DRAWER API =====
contextBridge.exposeInMainWorld("drawerAPI", {
  /**
   * Buka cash drawer secara manual
   * @param {Object} options - Konfigurasi drawer
   * @param {string} options.printType - 'usb' atau 'bluetooth'
   * @param {string} options.bluetoothAddress - Alamat BT (jika bluetooth)
   * @param {number} options.pin - Pin drawer: 0 (pin 2) atau 1 (pin 5)
   * @param {number} options.onTime - Durasi pulse on (ms, default: 120)
   * @param {number} options.offTime - Durasi pulse off (ms, default: 240)
   * @returns {Promise<Object>} { success, message, pin, error }
   */
  open: (options = {}) => {
    console.log(">> Opening cash drawer with options:", options);
    
    // Validasi options
    const validOptions = {
      printType: options.printType || 'usb',
      bluetoothAddress: options.bluetoothAddress || null,
      pin: typeof options.pin === 'number' ? options.pin : 0,
      onTime: typeof options.onTime === 'number' ? options.onTime : 120,
      offTime: typeof options.offTime === 'number' ? options.offTime : 240
    };
    
    // Validasi printType
    if (!['usb', 'bluetooth'].includes(validOptions.printType)) {
      console.error("Invalid printType:", validOptions.printType);
      return Promise.resolve({
        success: false,
        error: "printType harus 'usb' atau 'bluetooth'"
      });
    }
    
    // Validasi bluetooth address jika bluetooth
    if (validOptions.printType === 'bluetooth' && !validOptions.bluetoothAddress) {
      return Promise.resolve({
        success: false,
        error: "Alamat Bluetooth diperlukan untuk printType 'bluetooth'"
      });
    }
    
    // Validasi pin (0 atau 1)
    if (![0, 1].includes(validOptions.pin)) {
      console.warn("Invalid pin value, using default (0)");
      validOptions.pin = 0;
    }
    
    // Validasi timing (1-255 ms)
    if (validOptions.onTime < 1 || validOptions.onTime > 255) {
      console.warn("Invalid onTime, using default (120)");
      validOptions.onTime = 120;
    }
    if (validOptions.offTime < 1 || validOptions.offTime > 255) {
      console.warn("Invalid offTime, using default (240)");
      validOptions.offTime = 240;
    }
    
    return safeInvoke("open-cash-drawer", validOptions);
  },

  /**
   * Test cash drawer dengan berbagai konfigurasi
   * @param {Object} options - Konfigurasi dasar (printType, bluetoothAddress)
   * @returns {Promise<Object>} { success, results[] }
   */
  test: (options = {}) => {
    console.log(">> Testing cash drawer with options:", options);
    
    const validOptions = {
      printType: options.printType || 'usb',
      bluetoothAddress: options.bluetoothAddress || null
    };
    
    return safeInvoke("test-cash-drawer", validOptions);
  },

  /**
   * Wrapper singkat untuk buka drawer dengan konfigurasi default
   * @param {string} printType - 'usb' atau 'bluetooth'
   * @param {string} bluetoothAddress - Alamat BT (opsional)
   * @returns {Promise<Object>}
   */
  openDefault: (printType = 'usb', bluetoothAddress = null) => {
    return safeInvoke("open-cash-drawer", {
      printType,
      bluetoothAddress,
      pin: 0,
      onTime: 120,
      offTime: 240
    });
  }
});

// ===== BARCODE API =====
contextBridge.exposeInMainWorld("barcodeAPI", {
  /**
   * Cetak label barcode
   * @param {Object} payload - Data barcode
   * @param {string} payload.image - Base64 encoded image
   * @param {string} payload.printerName - Nama printer
   * @param {number} payload.copies - Jumlah copy (default: 1)
   * @returns {Promise<Object>}
   */
  printBarcode: (payload) => {
    console.log(">> Invoking print-barcode-label from preload");
    
    // Validasi payload barcode
    if (!payload || typeof payload !== 'object') {
      console.error("Invalid barcode payload: not an object");
      return Promise.resolve({
        success: false,
        error: "Invalid barcode data: payload must be an object"
      });
    }
    
    if (!payload.image) {
      console.error("Invalid barcode payload: missing image");
      return Promise.resolve({
        success: false,
        error: "Invalid barcode data: image is required"
      });
    }
    
    // Validasi image format (base64)
    if (typeof payload.image !== 'string') {
      console.error("Invalid barcode payload: image is not a string");
      return Promise.resolve({
        success: false,
        error: "Invalid barcode data: image must be base64 string"
      });
    }
    
    return safeInvoke("print-barcode-label", payload);
  },

  /**
   * Cetak label barcode dengan validasi ketat
   */
  printBarcodeSafe: async (payload) => {
    try {
      // Validasi tambahan
      if (!payload?.image) {
        throw new Error("Image data is required");
      }
      
      if (!payload?.printerName) {
        console.warn("Printer name not specified, using default");
      }
      
      return await safeInvoke("print-barcode-label", payload);
    } catch (error) {
      console.error("Barcode print error:", error);
      return {
        success: false,
        error: error.message
      };
    }
  }
});

// ===== PRINTER UTILS =====
contextBridge.exposeInMainWorld("printerUtils", {
  /**
   * List semua printer yang tersedia di sistem
   * @returns {Promise<Array>} Array printer objects
   */
  listPrinters: () => {
    return safeInvoke("list-printers");
  }
});

console.log(">> printerAPI exposed successfully");
console.log(">> drawerAPI exposed successfully"); // 🆕
console.log(">> barcodeAPI exposed successfully");

// 🔹 PENTING: Error handler untuk IPC
ipcRenderer.on('error', (event, error) => {
  console.error('❌ IPC Error:', error);
});

// 🔹 OPSIONAL: Log semua IPC calls untuk debugging
const DEBUG_MODE = process.env.NODE_ENV !== 'production'; // 🔥 Gunakan env variable

if (DEBUG_MODE) {
  console.log("🐛 Debug mode enabled");
  
  const originalInvoke = ipcRenderer.invoke;
  ipcRenderer.invoke = async function(channel, ...args) {
    console.log(`[IPC] 📤 Calling channel: ${channel}`, args);
    const startTime = Date.now();
    
    try {
      const result = await originalInvoke.call(this, channel, ...args);
      const duration = Date.now() - startTime;
      console.log(`[IPC] 📥 Result from ${channel} (${duration}ms):`, result);
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`[IPC] ❌ Error in ${channel} (${duration}ms):`, error);
      throw error;
    }
  };
}

// 🔹 KEAMANAN: Validasi bahwa tidak ada exposure berbahaya
// Pastikan kode berikut TIDAK ADA (jika ada, hapus segera):
// ❌ contextBridge.exposeInMainWorld('ipcRenderer', ipcRenderer);
// ❌ contextBridge.exposeInMainWorld('require', require);
// ❌ contextBridge.exposeInMainWorld('electron', electron);
// ❌ contextBridge.exposeInMainWorld('process', process);

// 🔹 OPSIONAL: Expose versi untuk debugging
contextBridge.exposeInMainWorld("appInfo", {
  version: "1.0.0", // Sesuaikan dengan package.json
  platform: process.platform,
  arch: process.arch,
  debug: DEBUG_MODE
});

console.log(">> preload.js initialization complete ✅");
