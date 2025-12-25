// main.js
const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");

// ==== ESC/POS untuk thermal printer (WOYA WP58D) ====
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
   payload dikirim dari renderer:
   {
     txId, txDate, method,
     items: [{ name, qty, price, sku }],
     subTotal, discount, tax, grandTotal,
     cash, change,
     store: { name, address, phone }
   }
================================ */
ipcMain.handle("print-receipt", async (event, payload) => {
  try {
    // 1. Buka device USB (WOYA WP58D).
    // Jika perlu, bisa isi vendorId/productId: new USB(0xXXXX, 0xYYYY)
    const device = new USB();

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
   APP LIFECYCLE
================================ */
app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
