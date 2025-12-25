// src/main/preload.js
const { contextBridge, ipcRenderer } = require("electron");

console.log(">> preload.js loaded (very simple)");
console.log(">> Exposing printerAPI to renderer...");

contextBridge.exposeInMainWorld("printerAPI", {
  printReceipt: (payload) => {
    console.log(">> Invoking print-receipt from preload");
    return ipcRenderer.invoke("print-receipt", payload);
  },
});

console.log(">> printerAPI exposed successfully");
