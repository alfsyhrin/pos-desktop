// main.js
const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");

// ==== ESC/POS untuk thermal printer (WOYA WP58D & Xprinter XP-D4601B) ====
const { Printer } = require("@node-escpos/core");
const USB = require("@node-escpos/usb-adapter");

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
   IPC CETAK STRUK (ESC/POS)
================================ */
ipcMain.handle("print-receipt", async (event, payload) => {
  try {
    // 1. Buka device USB (WOYA WP58D).
    const device = new USB(); // jika perlu: new USB(0xXXXX, 0xYYYY)

    await new Promise((resolve, reject) => {
      device.open((err) => (err ? reject(err) : resolve()));
    });

    const printer = new Printer(device, {
      encoding: "CP437", // sesuaikan jika butuh charset lain
    });

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
   IPC CETAK BARCODE (XP-D4601B)
   payload dari renderer:
   {
     type: "CODE128" | "EAN13" | "QR",
     value: "1234567890123"
   }
================================ */
ipcMain.handle("print-barcode", async (event, payload) => {
  const { type, value } = payload || {};

  if (!value) {
    return { success: false, error: "Barcode kosong" };
  }

  // Sementara paksa ke CODE128 dulu untuk memastikan keluar.
  const barcodeType = "CODE128";
  const code = value.trim();

  try {
    console.log("=== PRINT BARCODE ===");
    console.log("Type:", type, "-> used:", barcodeType);
    console.log("Value:", code, "length:", code.length);

    const device = new USB(); // sudah WinUSB dari Zadig

    await new Promise((resolve, reject) => {
      device.open((err) => (err ? reject(err) : resolve()));
    });

    const printer = new Printer(device, {
      encoding: "CP437",
    });

    // Tes tulis teks biasa dulu, untuk cek apakah ESC/POS benar-benar keluar
    printer.align("ct");
    printer.text("=== TEST BARCODE ===");
    printer.text(`VALUE: ${code}`);
    printer.newLine();

    // PENTING: gunakan method barcode() yang sesuai dokumentasi @node-escpos/core.[web:43][web:58]
    // Banyak contoh: printer.barcode("12345678", "CODE128");
    printer.barcode(code, barcodeType, {
      width: 3,
      height: 100,
      position: "BELOW", // tampilkan teks di bawah barcode (jika didukung)
    });

    printer.newLine();
    printer.text("=== END ===");
    printer.newLine();
    printer.cut();

    await printer.close();

    console.log("PRINT BARCODE OK");
    return { success: true };
  } catch (err) {
    console.error("PRINT BARCODE ERROR:", err, err?.message, err?.code);
    return { success: false, error: err.message || String(err) };
  }
});


/* ==============================
   CEK STATUS PRINTER
================================ */
ipcMain.handle("check-printer-status", async () => {
  try {
    const device = new USB();

    await new Promise((resolve, reject) => {
      device.open((err) => (err ? reject(err) : resolve()));
    });

    await device.close?.(); // kalau ada method close

    return {
      ok: true,
      status: "connected",
      message: "Printer terdeteksi dan siap digunakan.",
    };
  } catch (err) {
    console.error("CHECK PRINTER ERROR:", err);
    return {
      ok: false,
      status: "disconnected",
      message: err.message || "Printer tidak terdeteksi.",
    };
  }
});

/* ==============================
   APP LIFECYCLE
================================ */
app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
