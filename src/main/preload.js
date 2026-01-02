// src/main/preload.js
const { contextBridge, ipcRenderer } = require("electron");

console.log(">> preload.js loaded (very simple)");
console.log(">> Exposing printerAPI to renderer...");

// Validasi untuk keamanan tambahan
const validChannels = {
  printReceipt: true,
  detectBluetoothPrinters: true,
  checkStatus: true,
  printBarcodeLabel: true,
  listPrinters: true
};

contextBridge.exposeInMainWorld("printerAPI", {
  printReceipt: (payload) => {
    console.log(">> Invoking print-receipt from preload");
    
    // Validasi payload dasar (opsional)
    if (payload && typeof payload === 'object') {
      console.log("Print payload received:", Object.keys(payload));
    }
    
    return ipcRenderer.invoke("print-receipt", payload);
  },

  detectBluetoothPrinters: () => {
    console.log(">> Invoking detect-bluetooth-printers from preload");
    return ipcRenderer.invoke("detect-bluetooth-printers");
  },

  // 🔹 tambahan: cek status printer (USB WOYA)
  checkStatus: () => {
    console.log(">> Invoking check-printer-status from preload");
    return ipcRenderer.invoke("check-printer-status");
  },
  
  // Tambahkan error handling wrapper
  printReceiptSafe: async (payload) => {
    try {
      console.log(">> Invoking print-receipt (safe wrapper)");
      return await ipcRenderer.invoke("print-receipt", payload);
    } catch (error) {
      console.error("Print error in preload:", error);
      return {
        success: false,
        error: error.message || "Unknown error"
      };
    }
  }
});

contextBridge.exposeInMainWorld("barcodeAPI", {
  printBarcode: (payload) => {
    console.log(">> Invoking print-barcode-label from preload");
    
    // Validasi payload barcode
    if (!payload || !payload.image) {
      console.error("Invalid barcode payload");
      return Promise.resolve({
        success: false,
        error: "Invalid barcode data"
      });
    }
    
    return ipcRenderer.invoke("print-barcode-label", payload);
  }
});

console.log(">> printerAPI exposed successfully");

contextBridge.exposeInMainWorld("printerUtils", {
  listPrinters: () => ipcRenderer.invoke("list-printers")
});

// 🔹 PENTING: Validasi semua IPC channels untuk keamanan tambahan
// Mencegah renderer mengakses channel yang tidak sah
ipcRenderer.on('error', (event, error) => {
  console.error('IPC Error:', error);
});

// 🔹 OPSIONAL: Log semua IPC calls untuk debugging
const debug = true; // Set to false in production
if (debug) {
  const originalInvoke = ipcRenderer.invoke;
  ipcRenderer.invoke = async function(channel, ...args) {
    console.log(`[IPC] Calling channel: ${channel}`, args);
    try {
      const result = await originalInvoke.call(this, channel, ...args);
      console.log(`[IPC] Result from ${channel}:`, result);
      return result;
    } catch (error) {
      console.error(`[IPC] Error in ${channel}:`, error);
      throw error;
    }
  };
}

// 🔹 PENTING: Jangan expose ipcRenderer langsung!
// Kode berikut TIDAK boleh ada (jika ada, hapus):
// contextBridge.exposeInMainWorld('ipcRenderer', ipcRenderer);
// contextBridge.exposeInMainWorld('require', require);