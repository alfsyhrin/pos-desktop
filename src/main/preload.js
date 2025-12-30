// src/main/preload.js
const { contextBridge, ipcRenderer } = require("electron");

console.log(">> preload.js loaded (very simple)");
console.log(">> Exposing printerAPI to renderer...");

contextBridge.exposeInMainWorld("printerAPI", {
  printReceipt: (payload) => {
    console.log(">> Invoking print-receipt from preload");
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
  }
});

contextBridge.exposeInMainWorld("barcodeAPI", {
  printBarcode: (payload) => {
    return ipcRenderer.invoke("print-barcode-label", payload);
  }
});

console.log(">> printerAPI exposed successfully");

contextBridge.exposeInMainWorld("printerUtils", {
  listPrinters: () => ipcRenderer.invoke("list-printers")
});
