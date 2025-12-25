// src/main/preload.js
const { contextBridge, ipcRenderer } = require("electron");

console.log(">> preload.js loaded (very simple)");

contextBridge.exposeInMainWorld("printerAPI", {
  printReceipt: (payload) => ipcRenderer.invoke("print-receipt", payload),
});
