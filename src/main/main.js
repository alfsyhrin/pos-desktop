// main.js
const { app, BrowserWindow, ipcMain } = require("electron");
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
   FUNGSI BANTU: Cetak dengan Windows Printer (Fallback)
================================ */
/* ==============================
   FUNGSI BANTU: Cetak dengan Windows Printer (Fallback) - FORMAT BARU
================================ */
async function printWithWindowsPrinter(payload) {
  console.log("=== MENCETAK DENGAN WINDOWS PRINTER (FORMAT BARU) ===");
  
  const {
    txId,
    txDate,
    method,
    items = [],
    subTotal = 0,
    discount = 0,
    tax = 0,
    taxPercent = 10,
    grandTotal = 0,
    cash = 0,
    change = 0,
    store = {},
    storeData = {},
  } = payload;

  // Format tanggal seperti template
  let formattedDate = "-";
  let formattedTime = "";
  
  if (txDate && txDate !== '-') {
    try {
      const dateObj = new Date(txDate);
      if (!isNaN(dateObj.getTime())) {
        const day = dateObj.getDate().toString().padStart(2, '0');
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
        const month = monthNames[dateObj.getMonth()];
        const year = dateObj.getFullYear();
        
        const hours = dateObj.getHours().toString().padStart(2, '0');
        const minutes = dateObj.getMinutes().toString().padStart(2, '0');
        const seconds = dateObj.getSeconds().toString().padStart(2, '0');
        
        formattedDate = `${day} ${month} ${year}`;
        formattedTime = `${hours}:${minutes}:${seconds}`;
      }
    } catch (e) {
      console.error("Error parsing date:", e);
    }
  }

  // Bangun HTML untuk struk - FORMAT BARU
  let htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        @page { margin: 0; size: 80mm auto; }
        body { 
          font-family: 'Courier New', monospace; 
          font-size: 14px; 
          width: 80mm; 
          margin: 0; 
          padding: 10px;
          line-height: 1.2;
        }
        .store-name { 
          text-align: center; 
          font-weight: bold; 
          font-size: 16px; 
          margin-bottom: 5px;
          text-transform: uppercase;
        }
        .store-info { 
          text-align: center; 
          margin-bottom: 5px;
          font-size: 12px;
        }
        .divider { 
          border-bottom: 1px dashed #000; 
          margin: 8px 0; 
        }
        .receipt-header { 
          text-align: center; 
          font-weight: bold; 
          font-size: 15px;
          margin: 10px 0;
        }
        .transaction-info { 
          font-size: 12px;
          margin: 5px 0;
        }
        .items-header { 
          font-weight: bold; 
          margin: 10px 0 5px 0;
        }
        .item-row { 
          margin: 8px 0;
        }
        .item-name { 
          font-weight: bold;
        }
        .item-details { 
          margin-left: 5px;
        }
        .price-row { 
          display: flex; 
          justify-content: space-between; 
          margin: 3px 0;
        }
        .payment-row { 
          display: flex; 
          justify-content: space-between; 
          margin: 5px 0;
        }
        .footer { 
          text-align: center; 
          margin-top: 15px; 
          font-size: 12px;
        }
      </style>
    </head>
    <body>
  `;

  // Header Toko - FORMAT BARU
  htmlContent += `
    <div class="store-name">${(store?.name || storeData?.name || "TOKO SAYA").toUpperCase()}</div>
  `;
  
  if (store?.address || storeData?.address) {
    htmlContent += `<div class="store-info">${store?.address || storeData?.address}</div>`;
  }
  
  if (store?.phone || storeData?.phone) {
    htmlContent += `<div class="store-info">${store?.phone || storeData?.phone}</div>`;
  }
  
  htmlContent += `<div class="divider"></div>`;

  // Header STRUK PEMBAYARAN - FORMAT BARU
  htmlContent += `<div class="receipt-header">STRUK PEMBAYARAN</div>`;

  // Detail Transaksi - FORMAT BARU
  htmlContent += `
    <div class="transaction-info">
      <div>No : ${txId || "-"}</div>
      <div>Tg1 : ${formattedDate} ${formattedTime}</div>
      <div>Kasir : ${payload.cashier_name || "Admin"}</div>
      <div>Metode : ${method || "cash"}</div>
    </div>
    <div class="divider"></div>
  `;

  // Items - FORMAT BARU
  htmlContent += `<div class="items-header">ITEM PEMBELIAN</div>`;
  
  items.forEach((it) => {
    const originalPrice = it.price || 0;
    const qty = it.qty || 0;
    const discountAmount = it.discount_amount || 0;
    const subtotal = qty * originalPrice;
    
    htmlContent += `
      <div class="item-row">
        <div class="item-name">${it.name || "-"}</div>
    `;
    
    // Format: 1 x Rp 20.000 (Diskon 50%)
    let discountText = "";
    if (discountAmount > 0) {
      const discountPercentage = Math.round((discountAmount / subtotal) * 100);
      discountText = ` (Diskon ${discountPercentage}%)`;
    }
    
    htmlContent += `
        <div class="item-details">${qty} x ${formatRupiah(originalPrice)}${discountText}</div>
        <div class="item-details">${formatRupiah(subtotal - discountAmount)}</div>
      </div>
    `;
  });

  htmlContent += `<div class="divider"></div>`;

  // Subtotal, PPN, TOTAL - FORMAT BARU
  htmlContent += `
    <div class="price-row">
      <span>Subtotal :</span>
      <span>${formatRupiah(subTotal)}</span>
    </div>
    <div class="price-row">
      <span>PPN (${taxPercent}.0%) :</span>
      <span>${formatRupiah(tax)}</span>
    </div>
    <div class="price-row">
      <span>TOTAL :</span>
      <span>${formatRupiah(grandTotal)}</span>
    </div>
  `;

  htmlContent += `<div class="divider"></div>`;

  // Pembayaran - FORMAT BARU
  htmlContent += `
    <div class="payment-row">
      <span>Tunai :</span>
      <span>${formatRupiah(cash)}</span>
    </div>
    <div class="payment-row">
      <span>Kembalian :</span>
      <span>${formatRupiah(change)}</span>
    </div>
  `;

  htmlContent += `<div class="divider"></div>`;

  // Footer - FORMAT BARU
  htmlContent += `
    <div class="footer">
      <div>Terima kasih telah berbelanja</div>
      <div><strong>${(store?.name || storeData?.name || "TOKO SAYA").toUpperCase()}</strong></div>
    </div>
  `;

  htmlContent += `
    </body>
    </html>
  `;

  // Cetak menggunakan electron-pos-printer
  const data = [
    {
      type: 'html',
      value: htmlContent,
      style: 'font-family: "Courier New", monospace;'
    }
  ];

  const options = {
    printerName: payload.printerName || undefined,
    silent: true,
    preview: false,
    copies: 1,
    pageSize: { height: 100000, width: 80000 }, // 80mm width
    margin: '0 0 0 0'
  };

  try {
    await PosPrinter.print(data, options);
    console.log("=== WINDOWS PRINTER SUCCESS (FORMAT BARU) ===");
    return { success: true, message: "Struk berhasil dicetak dengan Windows Printer" };
  } catch (error) {
    console.error("Windows printer error:", error);
    throw error;
  }
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

    // Add Windows printer as fallback option
    devices.push({
      name: "Windows Default Printer",
      address: "WINDOWS_DEFAULT",
      type: "windows",
      status: "available"
    });

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
    const windowsDevices = devices.filter(d => d.type === "windows");
    const bluetoothDevices = testableDevices.concat(
      devices.filter(d => d.type === "bluetooth").slice(5).map(d => ({ ...d, status: "not_available" }))
    );

    return {
      success: true,
      devices: [...usbDevices, ...windowsDevices, ...bluetoothDevices],
      message: usbDevices.length > 0 ?
        "Printer USB terdeteksi. Gunakan mode USB untuk mencetak." :
        "Tidak ada printer USB terdeteksi. Gunakan Windows Printer sebagai fallback."
    };
  } catch (err) {
    console.error("BLUETOOTH DETECTION ERROR:", err);

    // Fallback: return common devices
    const fallbackDevices = [
      { name: "Windows Default Printer", address: "WINDOWS_DEFAULT", type: "windows", status: "available" },
      { name: "WOYA WP58D (USB)", address: "USB_CONNECTED", type: "usb", status: "not_available" },
      { name: "WOYA WP58D", address: "00:15:83:00:00:01", type: "bluetooth", status: "not_available" },
      { name: "WOYA WP58D BT", address: "00:15:83:00:00:02", type: "bluetooth", status: "not_available" },
      { name: "WOYA Thermal Printer", address: "00:15:83:00:00:03", type: "bluetooth", status: "not_available" }
    ];

    return {
      success: false,
      error: err.message,
      devices: fallbackDevices,
      message: "Printer tidak terdeteksi. Gunakan Windows Printer sebagai fallback."
    };
  }
});

/* ==============================
   IPC CETAK STRUK (ESC/POS)
   payload dikirim dari detail-transaksi.js:
   {
     txId, txDate, method,
     items: [{ name, qty, price, sku, discount_amount, discount_type }],
     subTotal, discount, tax, grandTotal,
     cash, change,
     store: { name, address, phone },
     storeData: { receipt_template, ... },
     printType: 'usb' | 'bluetooth' | 'windows',
     bluetoothAddress: 'XX:XX:XX:XX:XX:XX'
   }
================================ */
ipcMain.handle("print-receipt", async (event, payload) => {
  console.log("=== MENERIMA PERINTAH CETAK ===");
  
  try {
    const { printType = 'usb' } = payload;
    
    // Jika printType adalah 'windows', gunakan Windows printer
    if (printType === 'windows') {
      return await printWithWindowsPrinter(payload);
    }
    
    // Jika USB/Bluetooth, coba gunakan ESC/POS
    try {
      return await printWithESCPOS(payload);
    } catch (escposError) {
      console.log("ESC/POS printing failed, trying Windows printer fallback...", escposError.message);
      
      // Fallback ke Windows printer
      try {
        const result = await printWithWindowsPrinter(payload);
        result.fallbackUsed = true;
        result.originalError = escposError.message;
        return result;
      } catch (windowsError) {
        console.error("Both printing methods failed");
        return { 
          success: false, 
          error: `ESC/POS Error: ${escposError.message}, Windows Error: ${windowsError.message}` 
        };
      }
    }
    
  } catch (err) {
    console.error("PRINT ERROR DETAIL:", err);
    return { 
      success: false, 
      error: err.message,
      details: err.stack
    };
  }
});

/* ==============================
   HELPER FORMAT RUPIAH sesuai template (dengan titik, bukan koma)
================================ */
function formatRupiah(num) {
  if (typeof num !== "number") num = Number(num || 0);
  // Format dengan titik sebagai pemisah ribuan (sesuai template)
  return "Rp " + num.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

/* ==============================
   FUNGSI: Cetak dengan ESC/POS (USB/Bluetooth)
================================ */
/* ==============================
   FUNGSI: Cetak dengan ESC/POS (USB/Bluetooth) - FORMAT BARU
================================ */
/* ==============================
   FUNGSI: Cetak dengan ESC/POS (USB/Bluetooth) - SESUAI TEMPLATE
================================ */
async function printWithESCPOS(payload) {
  console.log("=== MENCETAK DENGAN ESC/POS (SESUAI TEMPLATE) ===");
  
  const { printType = 'usb', bluetoothAddress, storeData, store } = payload;

  let device;
  let printer;

  // Pilih adapter berdasarkan tipe printer
  if (printType === 'bluetooth') {
    if (!bluetoothAddress) {
      throw new Error("Bluetooth address is required for Bluetooth printing");
    }
    console.log(`Connecting to Bluetooth printer: ${bluetoothAddress}`);
    device = new Bluetooth(bluetoothAddress);
    await new Promise((resolve, reject) => {
      device.open((err) => (err ? reject(err) : resolve()));
    });
    printer = new Printer(device, { encoding: "CP437" });
  } else {
    console.log("Connecting to USB printer...");
    device = new USB();
    await new Promise((resolve, reject) => {
      device.open((err) => (err ? reject(err) : resolve()));
    });
    printer = new Printer(device, { encoding: "CP437" });
  }

  const {
    txId,
    txDate,
    method,
    items = [],
    subTotal = 0,
    discount = 0,
    tax = 0,
    taxPercent = 10,
    grandTotal = 0,
    cash = 0,
    change = 0,
  } = payload || {};

  // HEADER: Nama Toko - SESUAI TEMPLATE
  printer
    .align("lt")
    .style("b")
    .size(1, 1)
    .text((store?.name || storeData?.name || "TOKO SAYA").toUpperCase())
    .style("normal")
    .size(0, 0);

  // Alamat toko
  if (store?.address || storeData?.address) 
    printer.text(store.address || storeData.address);
  
  // Telepon toko
  if (store?.phone || storeData?.phone) 
    printer.text(`Telp: ${store.phone || storeData.phone}`);

  // Garis pemisah
  printer.text(""); // Baris kosong
  printer.drawLine();

  // STRUK PEMBAYARAN
  printer
    .align("ct")
    .style("b")
    .text("STRUK PEMBAYARAN")
    .style("normal")
    .align("lt");

  // No transaksi - SESUAI TEMPLATE (No : 236)
  printer.text(`No : ${txId || "-"}`);
  
  // Format tanggal dari payload (harus sudah diformat di detail-transaksi.js)
  const dateParts = txDate ? txDate.split(' ') : [];
  let formattedDate = "-";
  if (dateParts.length >= 2) {
    formattedDate = `${dateParts[0]} ${dateParts[1]}`;
  }
  
  printer.text(`Tg1 : ${txDate || "-"}`);
  printer.text(`Kasir : ${payload.cashier_name || "Admin"}`);
  printer.text(`Metode : ${method || "cash"}`);
  
  printer.drawLine();
  printer.text("");

  // ITEM PEMBELIAN
  printer.align("lt").style("b").text("ITEM PEMBELIAN").style("normal");

  // Items dengan format seperti template
  items.forEach((it) => {
    const originalPrice = it.price || 0;
    const qty = it.qty || 0;
    const discountAmount = it.discount_amount || 0;
    const subtotal = qty * originalPrice;
    
    // Nama item
    printer.text(it.name || "-");
    
    // Format: 1 x Rp 20.000 (Diskon 50%)
    let discountText = "";
    if (discountAmount > 0 && subtotal > 0) {
      const discountPercentage = Math.round((discountAmount / subtotal) * 100);
      discountText = ` (Diskon ${discountPercentage}%)`;
    }
    
    printer.text(`${qty} x ${formatRupiah(originalPrice)}${discountText}`);
    
    // Harga setelah diskon
    printer.text(`${formatRupiah(subtotal - discountAmount)}`);
    
    printer.text(""); // Baris kosong antar item
  });

  // Garis pemisah
  printer.drawLine();
  printer.text("");

  // Subtotal - SESUAI TEMPLATE (Subtotal : Rp 10.000)
  printer.text(`Subtotal : ${formatRupiah(subTotal)}`);
  
  // PPN - SESUAI TEMPLATE (PPN (50.0%) : Rp 5.000)
  printer.text(`PPN (${taxPercent}.0%) : ${formatRupiah(tax)}`);
  
  // TOTAL - SESUAI TEMPLATE (TOTAL : Rp 15.000)
  printer.text(`TOTAL : ${formatRupiah(grandTotal)}`);
  
  printer.text(""); // Baris kosong
  printer.drawLine();
  printer.text("");

  // Pembayaran - SESUAI TEMPLATE
  printer.text(`Tunai : ${formatRupiah(cash)}`);
  printer.text(`Kembalian : ${formatRupiah(change)}`);
  
  printer.text(""); // Baris kosong
  printer.drawLine();
  printer.text("");

  // Footer - SESUAI TEMPLATE
  printer.align("ct");
  printer.text("Terima kasih telah berbelanja");
  printer.text((store?.name || storeData?.name || "TOKO SAYA").toUpperCase());

  // Feed dan cut
  printer.feed(4);
  printer.cut();

  await printer.close();
  
  console.log("=== CETAK STRUK BERHASIL (ESC/POS - SESUAI TEMPLATE) ===");
  return { success: true, message: "Struk berhasil dicetak dengan ESC/POS" };
}

/* ==============================
   FUNGSI BANTU: Cetak dengan Windows Printer - SESUAI TEMPLATE
================================ */
async function printWithWindowsPrinter(payload) {
  console.log("=== MENCETAK DENGAN WINDOWS PRINTER (SESUAI TEMPLATE) ===");
  
  const {
    txId,
    txDate,
    method,
    items = [],
    subTotal = 0,
    discount = 0,
    tax = 0,
    taxPercent = 10,
    grandTotal = 0,
    cash = 0,
    change = 0,
    store = {},
    storeData = {},
  } = payload;

  // Bangun HTML untuk struk - SESUAI TEMPLATE
  let htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        @page { margin: 0; size: 80mm auto; }
        body { 
          font-family: 'Courier New', monospace; 
          font-size: 14px; 
          width: 80mm; 
          margin: 0; 
          padding: 10px;
          line-height: 1.2;
        }
        .store-name { 
          text-align: left; 
          font-weight: bold; 
          font-size: 16px; 
          margin-bottom: 5px;
          text-transform: uppercase;
        }
        .store-info { 
          text-align: left; 
          margin-bottom: 3px;
          font-size: 12px;
        }
        .divider { 
          border-bottom: 1px dashed #000; 
          margin: 5px 0; 
        }
        .receipt-header { 
          text-align: center; 
          font-weight: bold; 
          font-size: 15px;
          margin: 5px 0;
        }
        .transaction-info { 
          font-size: 13px;
          margin: 3px 0;
        }
        .items-header { 
          font-weight: bold; 
          margin: 5px 0 3px 0;
          font-size: 14px;
        }
        .item-row { 
          margin: 5px 0;
        }
        .item-name { 
          font-weight: bold;
        }
        .item-details { 
          margin-left: 5px;
        }
        .price-row { 
          margin: 3px 0;
        }
        .payment-row { 
          margin: 3px 0;
        }
        .footer { 
          text-align: center; 
          margin-top: 10px; 
          font-size: 12px;
        }
      </style>
    </head>
    <body>
  `;

  // Header Toko - SESUAI TEMPLATE (kiri, bukan tengah)
  htmlContent += `
    <div class="store-name">${(store?.name || storeData?.name || "TOKO SAYA").toUpperCase()}</div>
  `;
  
  if (store?.address || storeData?.address) {
    htmlContent += `<div class="store-info">${store?.address || storeData?.address}</div>`;
  }
  
  if (store?.phone || storeData?.phone) {
    htmlContent += `<div class="store-info">Telp: ${store?.phone || storeData?.phone}</div>`;
  }
  
  htmlContent += `<div class="divider"></div>`;

  // Header STRUK PEMBAYARAN - SESUAI TEMPLATE
  htmlContent += `<div class="receipt-header">STRUK PEMBAYARAN</div>`;

  // Detail Transaksi - SESUAI TEMPLATE
  // Format tanggal dari payload (harus sudah diformat di detail-transaksi.js)
  const dateParts = txDate ? txDate.split(' ') : [];
  let formattedDate = "-";
  if (dateParts.length >= 2) {
    formattedDate = `${dateParts[0]} ${dateParts[1]}`;
  }
  
  htmlContent += `
    <div class="transaction-info">
      <div>No : ${txId || "-"}</div>
      <div>Tg1 : ${txDate || "-"}</div>
      <div>Kasir : ${payload.cashier_name || "Admin"}</div>
      <div>Metode : ${method || "cash"}</div>
    </div>
    <div class="divider"></div>
  `;

  // Items - SESUAI TEMPLATE
  htmlContent += `<div class="items-header">ITEM PEMBELIAN</div>`;
  
  items.forEach((it) => {
    const originalPrice = it.price || 0;
    const qty = it.qty || 0;
    const discountAmount = it.discount_amount || 0;
    const subtotal = qty * originalPrice;
    
    htmlContent += `
      <div class="item-row">
        <div class="item-name">${it.name || "-"}</div>
    `;
    
    // Format: 1 x Rp 20.000 (Diskon 50%)
    let discountText = "";
    if (discountAmount > 0 && subtotal > 0) {
      const discountPercentage = Math.round((discountAmount / subtotal) * 100);
      discountText = ` (Diskon ${discountPercentage}%)`;
    }
    
    htmlContent += `
        <div class="item-details">${qty} x ${formatRupiah(originalPrice)}${discountText}</div>
        <div class="item-details">${formatRupiah(subtotal - discountAmount)}</div>
      </div>
    `;
  });

  htmlContent += `<div class="divider"></div>`;

  // Subtotal, PPN, TOTAL - SESUAI TEMPLATE
  htmlContent += `
    <div class="price-row">
      <span>Subtotal : ${formatRupiah(subTotal)}</span>
    </div>
    <div class="price-row">
      <span>PPN (${taxPercent}.0%) : ${formatRupiah(tax)}</span>
    </div>
    <div class="price-row">
      <span>TOTAL : ${formatRupiah(grandTotal)}</span>
    </div>
  `;

  htmlContent += `<div class="divider"></div>`;

  // Pembayaran - SESUAI TEMPLATE
  htmlContent += `
    <div class="payment-row">
      <span>Tunai : ${formatRupiah(cash)}</span>
    </div>
    <div class="payment-row">
      <span>Kembalian : ${formatRupiah(change)}</span>
    </div>
  `;

  htmlContent += `<div class="divider"></div>`;

  // Footer - SESUAI TEMPLATE
  htmlContent += `
    <div class="footer">
      <div>Terima kasih telah berbelanja</div>
      <div><strong>${(store?.name || storeData?.name || "TOKO SAYA").toUpperCase()}</strong></div>
    </div>
  `;

  htmlContent += `
    </body>
    </html>
  `;

  // Cetak menggunakan electron-pos-printer
  const data = [
    {
      type: 'html',
      value: htmlContent,
      style: 'font-family: "Courier New", monospace;'
    }
  ];

  const options = {
    printerName: payload.printerName || undefined,
    silent: true,
    preview: false,
    copies: 1,
    pageSize: { height: 100000, width: 80000 }, // 80mm width
    margin: '0 0 0 0'
  };

  try {
    await PosPrinter.print(data, options);
    console.log("=== WINDOWS PRINTER SUCCESS (SESUAI TEMPLATE) ===");
    return { success: true, message: "Struk berhasil dicetak dengan Windows Printer" };
  } catch (error) {
    console.error("Windows printer error:", error);
    throw error;
  }
}

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
================================ */
const fs = require("fs");
const os = require("os");

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
      dpi: 250,
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

// window.addEventListener('online', () => {
//   showToast('Koneksi internet tersedia. Sinkronisasi data...');
//   syncAllData();
// });
// window.addEventListener('offline', () => {
//   showToast('Aplikasi berjalan offline.', 'warning');
// });