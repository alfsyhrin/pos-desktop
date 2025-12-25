const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  printReceipt: (payload) => ipcRenderer.invoke("print-receipt", payload),
  printBarcode: (payload) => ipcRenderer.invoke("print-barcode", payload),
  checkPrinterStatus: () => ipcRenderer.invoke("check-printer-status"),
});
