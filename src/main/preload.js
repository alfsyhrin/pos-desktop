const { contextBridge, ipcRenderer } = require("electron");

console.log("✅ PRELOAD AKTIF");

contextBridge.exposeInMainWorld("printer", {
  printReceipt: () => ipcRenderer.invoke("print-receipt")
});
