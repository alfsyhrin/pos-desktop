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
});

console.log(">> printerAPI exposed successfully");
