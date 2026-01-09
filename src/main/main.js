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

//   if (!app.isPackaged) { // hanya di dev
//   mainWindow.webContents.openDevTools();
// }

}

/* ==============================
   HELPER FORMAT RUPIAH
================================ */
function formatRupiah(num) {
  if (typeof num !== "number") num = Number(num || 0);
  return "Rp " + num.toLocaleString("id-ID");
}

/* ==============================
   🆕 FUNGSI: BUKA CASH DRAWER
   Mengirim perintah ESC/POS untuk membuka laci uang
================================ */
async function openCashDrawer(options = {}) {
  console.log("=== MEMBUKA CASH DRAWER ===");
  
  const { 
    printType = 'usb',
    bluetoothAddress,
    pin = 0, // pin 0 untuk drawer connector 1 (default), pin 1 untuk connector 2
    onTime = 120, // durasi pulse on (default 120ms)
    offTime = 240 // durasi pulse off (default 240ms)
  } = options;

  let device;
  let printer;

  try {
    // Pilih adapter (USB atau Bluetooth)
    if (printType === 'bluetooth') {
      if (!Bluetooth) {
        throw new Error("Bluetooth adapter tidak tersedia");
      }
      if (!bluetoothAddress) {
        throw new Error("Alamat Bluetooth diperlukan");
      }
      console.log(`Koneksi ke Bluetooth printer: ${bluetoothAddress}`);
      device = new Bluetooth(bluetoothAddress);
      await new Promise((resolve, reject) => {
        device.open((err) => (err ? reject(err) : resolve()));
      });
    } else {
      console.log("Koneksi ke USB printer...");
      device = new USB();
      await new Promise((resolve, reject) => {
        device.open((err) => (err ? reject(err) : resolve()));
      });
    }

    printer = new Printer(device, { encoding: "CP437" });

    // ===== KIRIM PERINTAH BUKA CASH DRAWER =====
    // ESC p m t1 t2 - Standard ESC/POS command
    // 0x1B 0x70 [pin] [onTime] [offTime]
    const ESC = 0x1B;
    const p = 0x70;
    
    // Pastikan nilai dalam range yang valid
    const pinValue = pin === 1 ? 0x01 : 0x00; // 0x00 untuk pin 2, 0x01 untuk pin 5
    const onTimeValue = Math.min(Math.max(onTime, 0), 255);
    const offTimeValue = Math.min(Math.max(offTime, 0), 255);
    
    // Kirim perintah ke printer
    const command = Buffer.from([ESC, p, pinValue, onTimeValue, offTimeValue]);
    
    await new Promise((resolve, reject) => {
      device.write(command, (err) => {
        if (err) {
          reject(new Error(`Gagal mengirim perintah: ${err.message}`));
        } else {
          resolve();
        }
      });
    });

    console.log(`Cash drawer berhasil dibuka (Pin: ${pin === 1 ? '5' : '2'})`);
    
    // Tutup koneksi
    await printer.close();
    
    return { 
      success: true, 
      message: 'Cash drawer berhasil dibuka',
      pin: pin === 1 ? 5 : 2
    };
    
  } catch (err) {
    console.error('ERROR BUKA CASH DRAWER:', err);
    
    // Coba tutup printer jika masih terbuka
    try {
      if (printer) await printer.close();
    } catch (closeErr) {
      console.error('Error saat menutup printer:', closeErr);
    }
    
    return { 
      success: false, 
      error: err.message,
      details: 'Pastikan cash drawer terhubung ke printer thermal melalui port RJ11/DK'
    };
  }
}

/* ==============================
   🆕 IPC HANDLER: BUKA CASH DRAWER
   Dipanggil dari renderer process
================================ */
ipcMain.handle("open-cash-drawer", async (event, options = {}) => {
  console.log("=== MENERIMA PERINTAH BUKA CASH DRAWER ===");
  console.log("Options:", options);
  
  try {
    const result = await openCashDrawer(options);
    return result;
  } catch (err) {
    console.error("CASH DRAWER ERROR:", err);
    return { 
      success: false, 
      error: err.message,
      stack: err.stack
    };
  }
});

/* ==============================
   🆕 FUNGSI: TEST CASH DRAWER
   Untuk testing apakah cash drawer berfungsi
================================ */
ipcMain.handle("test-cash-drawer", async (event, options = {}) => {
  console.log("=== TEST CASH DRAWER ===");
  
  try {
    // Test dengan berbagai kombinasi pin dan timing
    const tests = [
      { pin: 0, onTime: 120, offTime: 240, name: "Pin 2 (Standard)" },
      { pin: 1, onTime: 120, offTime: 240, name: "Pin 5 (Alternative)" },
      { pin: 0, onTime: 50, offTime: 200, name: "Pin 2 (Fast)" }
    ];
    
    const results = [];
    
    for (const test of tests) {
      console.log(`Testing: ${test.name}`);
      const result = await openCashDrawer({
        ...options,
        ...test
      });
      
      results.push({
        ...test,
        success: result.success,
        message: result.message || result.error
      });
      
      // Tunggu sebentar antara test
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    return {
      success: true,
      results: results
    };
    
  } catch (err) {
    console.error("TEST CASH DRAWER ERROR:", err);
    return {
      success: false,
      error: err.message
    };
  }
});

/* ==============================
   FUNGSI BANTU: Cetak dengan Windows Printer (Fallback)
================================ */
async function printWithWindowsPrinter(payload) {
  console.log("=== MENCETAK DENGAN WINDOWS PRINTER (FORMAT TEMPLATE) ===");
  
  const {
    txId = '-',
    txDate = '-',
    method = 'cash',
    items = [],
    subTotal = 0,
    discount = 0,
    tax = 0,
    taxPercent = 10,
    grandTotal = 0,
    cash = 0,
    change = 0,
    store = {},
    cashier_name = 'Admin',
    openDrawer = false // 🆕 Parameter untuk buka drawer otomatis
  } = payload;

  // Build struk text - SESUAI TEMPLATE THERMAL PRINTER
  let receiptText = '';
  
  // Header - Garis atas
  receiptText += '='.repeat(17) + '\n';
  
  // Nama toko
  const storeName = (store?.name || 'CV BETARAK INDONESIA 1').toUpperCase();
  receiptText += storeName + '\n';
  
  // Alamat toko (potong maksimal 42 karakter per baris)
  if (store?.address) {
    let addr = store.address;
    if (addr.length > 42) {
      receiptText += addr.substring(0, 42) + '\n';
    } else {
      receiptText += addr + '\n';
    }
  }
  
  // Telepon toko
  if (store?.phone) {
    receiptText += 'Telp: ' + store.phone + '\n';
  }
  
  // Garis pemisah
  receiptText += '='.repeat(17) + '\n';
  
  // Nomor transaksi, tanggal, metode
  receiptText += 'No. Trans : ' + txId + '\n';
  receiptText += 'Tgl/Jam   : ' + txDate + '\n';
  receiptText += 'Metode    : ' + method + '\n';
  
  // Garis pemisah
  receiptText += '='.repeat(17) + '\n';
  
  // Header DAFTAR BARANG
  receiptText += 'DAFTAR BARANG:\n';
  receiptText += '-'.repeat(17) + '\n';
  
  // Items
  items.forEach(it => {
    const itemName = (it.name || '-').substring(0, 42);
    const itemQty = it.qty || 1;
    const itemPrice = it.price || 0;
    const itemDiscount = it.discount_amount || 0;
    const itemSubtotal = itemQty * itemPrice;
    
    // Nama item
    receiptText += itemName + '\n';
    
    // Qty x Harga = Total (format: 1x     Rp 10.000      Rp 10.000)
    const qtyStr = itemQty + 'x';
    const priceStr = formatRupiah(itemPrice);
    const subtotalStr = formatRupiah(itemSubtotal);
    
    // Format: Qty x Harga = Subtotal
    receiptText += qtyStr.padEnd(6) + priceStr.padStart(15) + subtotalStr.padStart(20) + '\n';
    
    // SKU
    if (it.sku) {
      receiptText += 'SKU: ' + it.sku + '\n';
    }
    
    // Diskon
    if (itemDiscount > 0) {
      receiptText += '  Diskon: -' + formatRupiah(itemDiscount) + '\n';
    }
  });
  
  // Garis pemisah
  receiptText += '='.repeat(17) + '\n';
  
  // Totals
  receiptText += 'Sub Total      : ' + formatRupiah(subTotal).padStart(20) + '\n';
  receiptText += 'Total Diskon   : ' + (discount > 0 ? '-' + formatRupiah(discount) : '-').padStart(20) + '\n';
  receiptText += 'PPN (' + taxPercent.toFixed(1) + '%)  : ' + formatRupiah(tax).padStart(20) + '\n';
  receiptText += '\n';
  receiptText += 'GRAND TOTAL    : ' + formatRupiah(grandTotal).padStart(20) + '\n';
  
  // Garis pemisah
  receiptText += '='.repeat(17) + '\n';
  
  // Pembayaran
  receiptText += 'Tunai Diterima : ' + formatRupiah(cash).padStart(20) + '\n';
  receiptText += 'Kembalian      : ' + formatRupiah(change).padStart(20) + '\n';
  
  // Garis pemisah & footer
  receiptText += '='.repeat(17) + '\n';
  receiptText += 'Terima Kasih telah berbelanja di\n';
  receiptText += storeName + ' :)\n';
  receiptText += '='.repeat(17) + '\n';

  // HTML untuk Windows printer
  let htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        @page { margin: 0; size: 80mm auto; }
        body { 
          font-family: 'Courier New', monospace; 
          font-size: 13px; 
          width: 80mm; 
          margin: 0; 
          padding: 5mm;
          line-height: 1.3;
        }
        pre { 
          font-family: 'Courier New', monospace; 
          font-size: 13px;
          margin: 0;
          white-space: pre-wrap;
          word-wrap: break-word;
        }
      </style>
    </head>
    <body>
      <pre>${receiptText}</pre>
    </body>
    </html>
  `;

  const data = [
    {
      type: 'html',
      value: htmlContent
    }
  ];

  const options = {
    printerName: payload.printerName || undefined,
    silent: true,
    preview: false,
    copies: 1,
    pageSize: { height: 100000, width: 80000 },
    margin: '0 0 0 0'
  };

  try {
    await PosPrinter.print(data, options);
    console.log("=== WINDOWS PRINTER SUCCESS ===");
    
    // 🆕 Buka cash drawer setelah cetak (jika diminta)
    if (openDrawer && method === 'cash') {
      console.log("Membuka cash drawer setelah cetak...");
      try {
        await openCashDrawer({
          printType: payload.printType || 'usb',
          bluetoothAddress: payload.bluetoothAddress
        });
      } catch (drawerErr) {
        console.warn("Gagal membuka cash drawer:", drawerErr.message);
      }
    }
    
    return { success: true, message: 'Struk berhasil dicetak dengan Windows Printer' };
  } catch (error) {
    console.error('Windows printer error:', error);
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
   HELPER FORMAT RUPIAH sesuai template (dengan titik, bukan koma)
================================ */
function formatRupiah(num) {
  if (typeof num !== "number") num = Number(num || 0);
  // Format dengan titik sebagai pemisah ribuan (sesuai template)
  return "Rp " + num.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

/* ==============================
   FUNGSI: Cetak dengan ESC/POS (USB/Bluetooth) - SESUAI TEMPLATE
================================ */
async function printWithESCPOS(payload) {
  console.log("=== MENCETAK DENGAN ESC/POS (THERMAL PRINTER) ===");
  
  const { 
    printType = 'usb', 
    bluetoothAddress,
    txId = '-',
    txDate = '-',
    method = 'cash',
    items = [],
    subTotal = 0,
    discount = 0,
    tax = 0,
    taxPercent = 10,
    grandTotal = 0,
    cash = 0,
    change = 0,
    store = {},
    openDrawer = false // 🆕 Parameter untuk buka drawer otomatis
  } = payload;

  let device;
  let printer;

  // Pilih adapter
  if (printType === 'bluetooth') {
    if (!bluetoothAddress) {
      throw new Error("Bluetooth address is required");
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

  try {
    // Header - Garis atas
    printer.text('='.repeat(17));
    
    // Nama toko
    const storeName = (store?.name || 'CV BETARAK INDONESIA 1').toUpperCase();
    printer.text(storeName);
    
    // Alamat toko
    if (store?.address) {
      let addr = store.address;
      if (addr.length > 42) {
        printer.text(addr.substring(0, 42));
      } else {
        printer.text(addr);
      }
    }
    
    // Telepon
    if (store?.phone) {
      printer.text('Telp: ' + store.phone);
    }
    
    // Garis pemisah
    printer.text('='.repeat(17));
    
    // Nomor transaksi, tanggal, metode
    printer.text('No. Trans : ' + txId);
    printer.text('Tgl/Jam   : ' + txDate);
    printer.text('Metode    : ' + method);
    
    // Garis pemisah
    printer.text('='.repeat(17));
    
    // Header DAFTAR BARANG
    printer.text('DAFTAR BARANG:');
    printer.text('-'.repeat(17));
    
    // Items
    items.forEach(it => {
      const itemName = (it.name || '-').substring(0, 42);
      const itemQty = it.qty || 1;
      const itemPrice = it.price || 0;
      const itemDiscount = it.discount_amount || 0;
      const itemSubtotal = itemQty * itemPrice;
      
      // Nama item
      printer.text(itemName);
      
      // Qty x Harga = Total
      const qtyStr = itemQty + 'x';
      const priceStr = formatRupiah(itemPrice);
      const subtotalStr = formatRupiah(itemSubtotal);
      
      printer.text(qtyStr.padEnd(6) + priceStr.padStart(15) + subtotalStr.padStart(20));
      
      // SKU
      if (it.sku) {
        printer.text('SKU: ' + it.sku);
      }
      
      // Diskon
      if (itemDiscount > 0) {
        printer.text('  Diskon: -' + formatRupiah(itemDiscount));
      }
    });
    
    // Garis pemisah
    printer.text('='.repeat(17));
    
    // Totals
    printer.text('Sub Total      : ' + formatRupiah(subTotal).padStart(20));
    printer.text('Total Diskon   : ' + (discount > 0 ? '-' + formatRupiah(discount) : '-').padStart(20));
    printer.text('PPN (' + taxPercent.toFixed(1) + '%)  : ' + formatRupiah(tax).padStart(20));
    printer.text('');
    printer.text('GRAND TOTAL    : ' + formatRupiah(grandTotal).padStart(20));
    
    // Garis pemisah
    printer.text('='.repeat(17));
    
    // Pembayaran
    printer.text('Tunai Diterima : ' + formatRupiah(cash).padStart(20));
    printer.text('Kembalian      : ' + formatRupiah(change).padStart(20));
    
    // Garis pemisah & footer
    printer.text('='.repeat(17));
    printer.text('Terima Kasih telah berbelanja di');
    printer.text(storeName + ' :)');
    printer.text('='.repeat(17));
    
    // Feed & cut
    printer.feed(4);
    printer.cut();
    
    // 🆕 Buka cash drawer setelah cetak (jika diminta dan pembayaran cash)
    if (openDrawer && method === 'cash') {
      console.log("Mengirim perintah buka cash drawer...");
      try {
        // Kirim perintah ESC p dengan parameter standar
        const ESC = 0x1B;
        const p = 0x70;
        const pin = 0x00; // Pin 2 (default)
        const onTime = 120; // 120ms
        const offTime = 240; // 240ms
        
        const drawerCommand = Buffer.from([ESC, p, pin, onTime, offTime]);
        await new Promise((resolve, reject) => {
          device.write(drawerCommand, (err) => {
            if (err) reject(err);
            else resolve();
          });
        });
        
        console.log("Cash drawer command sent successfully");
      } catch (drawerErr) {
        console.warn("Gagal membuka cash drawer:", drawerErr.message);
      }
    }
    
    await printer.close();
    
    console.log("=== ESC/POS PRINT SUCCESS ===");
    return { success: true, message: 'Struk berhasil dicetak' };
  } catch (err) {
    console.error('ESC/POS Error:', err);
    await printer.close();
    throw err;
  }
}

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

// NEW helper: print raw receiptText (used for both Windows and ESC/POS)
async function printRawReceipt(receiptText, payload = {}) {
  const { printType = 'usb', bluetoothAddress, printerName, openDrawer = false, method = 'cash' } = payload;

  // WINDOWS: wrap in <pre> and print with electron-pos-printer
  if (printType === 'windows') {
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          @page { margin: 0; size: 80mm auto; }
          body { font-family: 'Courier New', monospace; font-size: 13px; width: 80mm; margin:0; padding:6px; line-height:1.3; }
          pre { font-family: 'Courier New', monospace; font-size:13px; margin:0; white-space:pre-wrap; }
        </style>
      </head>
      <body><pre>${receiptText.replace(/&/g,'&amp;').replace(/</g,'&lt;')}</pre></body>
      </html>
    `;
    const data = [{ type: 'html', value: htmlContent }];
    const options = {
      printerName: printerName || undefined,
      silent: true,
      preview: false,
      copies: 1,
      margin: '0 0 0 0'
    };
    await PosPrinter.print(data, options);
    
    // 🆕 Buka drawer setelah cetak (Windows printer)
    if (openDrawer && method === 'cash') {
      try {
        await openCashDrawer({ printType, bluetoothAddress });
      } catch (drawerErr) {
        console.warn("Gagal membuka cash drawer:", drawerErr.message);
      }
    }
    
    return { success: true, message: 'Printed via Windows printer' };
  }

  // ESC/POS (USB or Bluetooth): send per-line
  let device;
  let printer;
  try {
    if (printType === 'bluetooth') {
      if (!Bluetooth) throw new Error('Bluetooth adapter not available on this build');
      if (!bluetoothAddress) throw new Error('Bluetooth address required');
      device = new Bluetooth(bluetoothAddress);
      await new Promise((res, rej) => device.open(err => (err ? rej(err) : res())));
    } else {
      device = new USB();
      await new Promise((res, rej) => device.open(err => (err ? rej(err) : res())));
    }
    printer = new Printer(device, { encoding: 'CP437' });

    // Print each line exactly as in receiptText
    const lines = receiptText.split(/\r?\n/);
    for (const line of lines) {
      // ensure no control chars; ESC/POS will handle width
      printer.text(line);
    }
    printer.feed(4);
    printer.cut();
    
    // 🆕 Buka drawer setelah cetak (ESC/POS)
    if (openDrawer && method === 'cash') {
      console.log("Mengirim perintah buka cash drawer...");
      try {
        const ESC = 0x1B;
        const p = 0x70;
        const pin = 0x00;
        const onTime = 120;
        const offTime = 240;
        
        const drawerCommand = Buffer.from([ESC, p, pin, onTime, offTime]);
        await new Promise((resolve, reject) => {
          device.write(drawerCommand, (err) => {
            if (err) reject(err);
            else resolve();
          });
        });
      } catch (drawerErr) {
        console.warn("Gagal membuka cash drawer:", drawerErr.message);
      }
    }
    
    await printer.close();
    return { success: true, message: 'Printed via ESC/POS' };
  } catch (err) {
    try { if (printer) await printer.close(); } catch (e) {}
    throw err;
  } finally {
    try { if (device && typeof device.close === 'function') device.close(); } catch (e) {}
  }
}

// MODIFY ipcMain handler to prefer payload.receiptText
ipcMain.handle("print-receipt", async (event, payload) => {
  console.log("=== print-receipt payload received ===");
  try {
    if (payload && payload.receiptText) {
      // print the exact receipt text from renderer (guarantees preview == print)
      return await printRawReceipt(payload.receiptText, payload);
    }

    // fallback: existing logic (keep previous behavior)
    const { printType = 'usb' } = payload;
    if (printType === 'windows') {
      return await printWithWindowsPrinter(payload);
    }
    try {
      return await printWithESCPOS(payload);
    } catch (escposError) {
      try {
        const result = await printWithWindowsPrinter(payload);
        result.fallbackUsed = true;
        result.originalError = escposError.message;
        return result;
      } catch (windowsError) {
        return { success: false, error: `ESC/POS Error: ${escposError.message}, Windows Error: ${windowsError.message}` };
      }
    }
  } catch (err) {
    console.error('PRINT ERROR:', err);
    return { success: false, error: err.message };
  }
});

/* ==============================
   APP LIFECYCLE (WAJIB ADA)
================================ */
app.whenReady().then(() => {
  console.log("Electron app ready");
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
