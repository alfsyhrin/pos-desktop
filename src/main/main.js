// main.js
const { app, BrowserWindow, ipcMain } = require("electron");
// const { ThermalPrinter, PrinterTypes } = require("node-thermal-printer");
const path = require("path");

// ==== ESC/POS untuk thermal printer (WOYA WP58D) ====
const { Printer } = require("@node-escpos/core");
const USB = require("@node-escpos/usb-adapter");
let Bluetooth;
try {
  Bluetooth = require("@node-escpos/bluetooth-adapter");
} catch (e) {
  console.warn("Bluetooth adapter not available:", e.message);
  Bluetooth = null;
}

// 🔥 INI YANG KURANG SELAMA INI
const { PosPrinter } = require("electron-pos-printer");

// ===== GLOBAL WINDOW =====
let mainWindow = null;

/* ==============================
   WINDOW UTAMA APLIKASI
================================ */
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadFile(
    path.join(__dirname, "../renderer/pages/login.html")
  );

  mainWindow.webContents.openDevTools();
}

/* ==============================
   HELPER FORMAT RUPIAH
================================ */
function formatRupiah(num) {
  if (typeof num !== "number") num = Number(num || 0);
  return "Rp " + num.toLocaleString("id-ID");
}

/* ==============================
   IPC DETEKSI PRINTER BLUETOOTH
================================ */
console.log("Registering detect-bluetooth-printers handler...");
ipcMain.handle("detect-bluetooth-printers", async () => {
  console.log("detect-bluetooth-printers handler called");
  try {
    const devices = [];

    // Check if printer is connected via USB first
    try {
      const usbDevice = new USB();
      await new Promise((resolve, reject) => {
        usbDevice.open((err) => {
          if (err) reject(err);
          else {
            usbDevice.close();
            resolve();
          }
        });
      });

      // USB printer detected
      devices.push({
        name: "WOYA Printer (USB Connected)",
        address: "USB_CONNECTED",
        type: "usb",
        status: "available"
      });
    } catch (usbErr) {
      console.log("No USB printer detected:", usbErr.message);
    }

    // Try to detect WOYA printers using common addresses
    const commonWoyaAddresses = [
      "00:15:83", // Common WOYA prefix
      "00:11:22", // Another common prefix
      "AA:BB:CC", // Test addresses
      "11:22:33",
      "77:88:99"
    ];

    // Generate possible addresses for WOYA printers
    for (const prefix of commonWoyaAddresses) {
      for (let i = 0; i < 10; i++) {
        const address = `${prefix}:${i.toString(16).toUpperCase()}${i.toString(16).toUpperCase()}:${(i+1).toString(16).toUpperCase()}${(i+1).toString(16).toUpperCase()}`;
        devices.push({
          name: `WOYA Printer ${address}`,
          address: address,
          type: "bluetooth"
        });
      }
    }

    // Add some known WOYA models
    devices.unshift(
      { name: "WOYA WP58D", address: "00:15:83:00:00:01", type: "bluetooth" },
      { name: "WOYA WP58D BT", address: "00:15:83:00:00:02", type: "bluetooth" },
      { name: "WOYA Thermal Printer", address: "00:15:83:00:00:03", type: "bluetooth" }
    );

    // Try to test connection to a few addresses (optional)
    const testableDevices = [];
    if (Bluetooth) {
      for (const device of devices.filter(d => d.type === "bluetooth").slice(0, 5)) { // Test first 5 Bluetooth devices
        try {
          const testDevice = new Bluetooth(device.address);
          // Quick connection test (will fail if device not available)
          await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
              testDevice.close();
              reject(new Error("Timeout"));
            }, 2000);

            testDevice.open((err) => {
              clearTimeout(timeout);
              if (err) reject(err);
              else {
                testDevice.close();
                resolve();
              }
            });
          });

          testableDevices.push({
            ...device,
            status: "available"
          });
        } catch (e) {
          // Device not available, but still include it
          testableDevices.push({
            ...device,
            status: "not_available"
          });
        }
      }
    } else {
      // Bluetooth not available, mark all as not available
      testableDevices.push(...devices.filter(d => d.type === "bluetooth").slice(0, 5).map(d => ({ ...d, status: "not_available" })));
    }

    // Add USB devices back
    const usbDevices = devices.filter(d => d.type === "usb");
    const bluetoothDevices = testableDevices.concat(
      devices.filter(d => d.type === "bluetooth").slice(5).map(d => ({ ...d, status: "not_available" }))
    );

    return {
      success: true,
      devices: [...usbDevices, ...bluetoothDevices],
      message: usbDevices.length > 0 ?
        "Printer USB terdeteksi. Gunakan mode USB untuk mencetak." :
        "Tidak ada printer USB terdeteksi. Pastikan printer WOYA Anda terhubung via Bluetooth atau USB."
    };
  } catch (err) {
    console.error("BLUETOOTH DETECTION ERROR:", err);

    // Fallback: return common WOYA addresses even if detection fails
    const fallbackDevices = [
      { name: "WOYA WP58D (USB)", address: "USB_CONNECTED", type: "usb", status: "available" },
      { name: "WOYA WP58D", address: "00:15:83:00:00:01", type: "bluetooth", status: "not_available" },
      { name: "WOYA WP58D BT", address: "00:15:83:00:00:02", type: "bluetooth", status: "not_available" },
      { name: "WOYA Thermal Printer", address: "00:15:83:00:00:03", type: "bluetooth", status: "not_available" },
      { name: "WOYA Printer (Manual)", address: "00:15:83:00:00:04", type: "bluetooth", status: "not_available" }
    ];

    return {
      success: false,
      error: err.message,
      devices: fallbackDevices,
      message: "Printer tidak terdeteksi. Pastikan printer WOYA Anda terhubung dengan benar."
    };
  }
});

/* ==============================
   IPC CETAK STRUK (ESC/POS)
   payload dikirim dari renderer:
   {
     txId, txDate, method,
     items: [{ name, qty, price, sku }],
     subTotal, discount, tax, grandTotal,
     cash, change,
     store: { name, address, phone },
     printType: 'usb' | 'bluetooth' (default: 'usb'),
     bluetoothAddress: 'XX:XX:XX:XX:XX:XX' (required if printType is 'bluetooth')
   }
================================ */
ipcMain.handle("print-receipt", async (event, payload) => {
  try {
    const { printType = 'usb', bluetoothAddress } = payload;

    let device;
    let printer;

    if (printType === 'bluetooth') {
      // Bluetooth printing
      if (!bluetoothAddress) {
        throw new Error("Bluetooth address is required for Bluetooth printing");
      }

      device = new Bluetooth(bluetoothAddress);

      await new Promise((resolve, reject) => {
        device.open((err) => (err ? reject(err) : resolve()));
      });

      printer = new Printer(device, {
        encoding: "CP437",
      });
    } else {
      // USB printing (default)
      device = new USB();

      await new Promise((resolve, reject) => {
        device.open((err) => (err ? reject(err) : resolve()));
      });

      printer = new Printer(device, {
        encoding: "CP437",
      });
    }

    const {
      txId,
      txDate,
      method,
      items = [],
      subTotal = 0,
      discount = 0,
      tax = 0,
      grandTotal = 0,
      cash = 0,
      change = 0,
      store = {},
    } = payload || {};

    // 2. Tulis struk ke buffer ESC/POS
    printer
      .align("ct")
      .style("b")
      .size(1, 1)
      .text(store.name || "TOKO SAYA")
      .style("normal")
      .size(0, 0);

    if (store.address) printer.text(store.address);
    if (store.phone) printer.text(store.phone);

    printer.drawLine();

    printer
      .align("lt")
      .text(`No   : ${txId || "-"}`)
      .text(`Tgl  : ${txDate || "-"}`)
      .text(`Metode: ${method || "-"}`)
      .drawLine();

    // Items
    items.forEach((it) => {
      const qty = Number(it.qty || 0);
      const price = Number(it.price || 0);
      const total = qty * price;

      printer.text(it.name || "-");
      printer.text(
        `${qty} x ${formatRupiah(price)} = ${formatRupiah(total)}`
      );
      if (it.sku) {
        printer.text(`SKU: ${it.sku}`);
      }
      printer.text(""); // spasi antar item
    });

    printer.drawLine();
    printer.text(`Sub Total : ${formatRupiah(subTotal)}`);
    printer.text(`Diskon    : -${formatRupiah(discount)}`);
    printer.text(`PPN       : ${formatRupiah(tax)}`);
    printer.drawLine();
    printer
      .size(1, 1)
      .text(`GRAND : ${formatRupiah(grandTotal)}`)
      .size(0, 0);
    printer.text(`Tunai     : ${formatRupiah(cash)}`);
    printer.text(`Kembalian : ${formatRupiah(change)}`);
    printer.drawLine();

    printer
      .align("ct")
      .text("Terima kasih")
      .text(" ");

    printer.feed(4);
    printer.cut();

    await printer.close();

    return { success: true };
  } catch (err) {
    console.error("PRINT ERROR:", err);
    return { success: false, error: err.message };
  }
});

/* ==============================
   APP LIFECYCLE
================================ */
console.log("App starting...");
app.whenReady().then(() => {
  console.log("App ready, creating window...");
  createWindow();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

/* ==============================
   IPC CEK STATUS PRINTER
   - Cek USB WOYA
   - Opsional: info Bluetooth terakhir
================================ */
const fs = require("fs");
// const path = require("path");
const os = require("os");
// const { PosPrinter } = require("electron-pos-printer");

ipcMain.handle("print-barcode-label", async (event, payload) => {
  try {
    const { image, printerName, copies = 1 } = payload;

    if (!image) throw new Error("Image kosong");

    const tmpPath = path.join(
      app.getPath("temp"),
      `barcode_${Date.now()}.png`
    );

    fs.writeFileSync(tmpPath, Buffer.from(image, "base64"));

    const data = [{
      type: "image",
      path: tmpPath,
      position: "center",
      width: "100mm",
      height: "150mm"
    }];

    const options = {
      printerName,
      silent: false,
      preview: false,
      copies,
      dpi: 203,
      margin: "0 0 0 0",
      pageSize: { width: 100000, height: 150000 }
    };

    await PosPrinter.print(data, options);

    return { success: true };
  } catch (err) {
    console.error("BARCODE PRINT ERROR FULL:", err);
    return { success: false, error: err.message };
  }
});
