// ==========================================
// Receipt Bluetooth Printer - Vanilla JS
// ==========================================

// SPP UUID untuk thermal printer Bluetooth Classic
const SPP_UUID = '00001101-0000-1000-8000-00805f9b34fb';

// State
let bluetoothDevice = null;
let characteristic = null;
let isConnected = false;

// DOM Elements
const statusIndicator = document.getElementById('status-indicator');
const statusText = document.getElementById('status-text');
const printerNameDiv = document.getElementById('printer-name');
const printerNameText = document.getElementById('printer-name-text');
const btnConnect = document.getElementById('btn-connect');
const btnDisconnect = document.getElementById('btn-disconnect');
const btnTestPrint = document.getElementById('btn-test-print');
const btnPrint = document.getElementById('btn-print');
const paperWidthSelect = document.getElementById('paper-width');
const taxPercentageInput = document.getElementById('tax-percentage');
const storeNameInput = document.getElementById('store-name');
const storeAddressInput = document.getElementById('store-address');
const storePhoneInput = document.getElementById('store-phone');
const receiptPreview = document.getElementById('receipt-preview');
const toast = document.getElementById('toast');
const toastMessage = document.getElementById('toast-message');

// Sample Transaction Data
const sampleTransaction = {
  idFull: 'TRX-20241222-001',
  idShort: '001',
  createdAt: new Date(),
  method: 'Tunai',
  total: 150000,
  received: 200000,
  change: 50000,
  items: [
    {
      idShort: 'ITM001',
      productId: 'PROD001',
      name: 'Nasi Goreng Spesial',
      price: 25000,
      qty: 2,
      lineTotal: 50000,
      sku: 'NG001',
      discountAmount: 0
    },
    {
      idShort: 'ITM002',
      productId: 'PROD002',
      name: 'Es Teh Manis',
      price: 8000,
      qty: 3,
      lineTotal: 24000,
      sku: 'ETM001',
      discountAmount: 0
    },
    {
      idShort: 'ITM003',
      productId: 'PROD003',
      name: 'Ayam Bakar Madu',
      price: 45000,
      qty: 1,
      lineTotal: 40000,
      sku: 'ABM001',
      discountAmount: 5000
    },
    {
      idShort: 'ITM004',
      productId: 'PROD004',
      name: 'Jus Alpukat',
      price: 15000,
      qty: 2,
      lineTotal: 30000,
      sku: 'JA001',
      discountAmount: 0
    }
  ]
};

// ==========================================
// Utility Functions
// ==========================================

function showToast(message, type = 'success') {
  toastMessage.textContent = message;
  toast.className = 'toast ' + type;
  toast.classList.add('show');
  
  setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
}

function formatRupiah(value) {
  const raw = Math.abs(value).toString();
  let result = '';
  for (let i = 0; i < raw.length; i++) {
    if ((raw.length - i) % 3 === 0 && i !== 0) {
      result += '.';
    }
    result += raw[i];
  }
  return (value < 0 ? '-' : '') + 'Rp ' + result;
}

function formatDate(date) {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = months[date.getMonth()];
  const yyyy = date.getFullYear();
  const hh = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  const ss = String(date.getSeconds()).padStart(2, '0');
  return `${dd} ${mm} ${yyyy} ${hh}:${min}:${ss}`;
}

function getLineChars(paperWidth) {
  if (paperWidth <= 58) return 32;
  if (paperWidth <= 72) return 42;
  return 48;
}

function leftRight(left, right, lineChars) {
  const space = lineChars - left.length - right.length;
  return left + ' '.repeat(Math.max(space, 1)) + right;
}

function centerText(text, lineChars) {
  const padding = Math.floor((lineChars - text.length) / 2);
  return ' '.repeat(Math.max(padding, 0)) + text;
}

// ==========================================
// UI Update Functions
// ==========================================

function updateUI() {
  if (isConnected) {
    statusIndicator.className = 'status-indicator connected';
    statusText.textContent = 'Terhubung';
    printerNameDiv.style.display = 'block';
    printerNameText.textContent = bluetoothDevice?.name || 'Unknown';
    btnConnect.disabled = true;
    btnDisconnect.disabled = false;
    btnTestPrint.disabled = false;
    btnPrint.disabled = false;
  } else {
    statusIndicator.className = 'status-indicator disconnected';
    statusText.textContent = 'Tidak Terhubung';
    printerNameDiv.style.display = 'none';
    btnConnect.disabled = false;
    btnDisconnect.disabled = true;
    btnTestPrint.disabled = true;
    btnPrint.disabled = true;
  }
}

function updateReceiptPreview() {
  const storeInfo = {
    name: storeNameInput.value || 'TOKO SAYA',
    address: storeAddressInput.value || 'Alamat Toko',
    phone: storePhoneInput.value || '021-12345678'
  };
  
  const paperWidth = parseInt(paperWidthSelect.value);
  const taxPercentage = parseFloat(taxPercentageInput.value) || 10;
  const lineChars = getLineChars(paperWidth);
  const divider = '-'.repeat(lineChars);
  
  const tx = sampleTransaction;
  
  // Calculate totals
  let subtotal = 0;
  let totalDiskon = 0;
  
  tx.items.forEach(item => {
    subtotal += item.lineTotal;
    totalDiskon += item.discountAmount;
  });
  
  const afterDisc = subtotal - totalDiskon;
  const tax = Math.round(afterDisc * taxPercentage / 100);
  const total = afterDisc + tax;
  
  // Build receipt HTML
  let html = '';
  
  // Header
  html += `<div class="center bold large">${storeInfo.name}</div>`;
  html += `<div class="center">${storeInfo.address}</div>`;
  html += `<div class="center">${storeInfo.phone}</div>`;
  html += `<div class="divider"></div>`;
  
  // Transaction Info
  html += `<div class="center bold">STRUK PEMBAYARAN</div>`;
  html += `<div>No     : ${tx.idFull}</div>`;
  html += `<div>Tgl    : ${formatDate(tx.createdAt)}</div>`;
  html += `<div>Kasir  : Admin</div>`;
  html += `<div>Metode : ${tx.method}</div>`;
  html += `<div class="divider"></div>`;
  
  // Items
  html += `<div class="bold">ITEM PEMBELIAN</div>`;
  tx.items.forEach(item => {
    let nama = item.name;
    if (nama.length > lineChars - 8) {
      nama = nama.substring(0, lineChars - 8) + '...';
    }
    html += `<div>${nama}</div>`;
    html += `<div>${leftRight(`${item.qty} x ${formatRupiah(item.price)}`, formatRupiah(item.lineTotal), lineChars)}</div>`;
    if (item.discountAmount > 0) {
      html += `<div>${leftRight('  Diskon', formatRupiah(-item.discountAmount), lineChars)}</div>`;
    }
    html += `<div></div>`;
  });
  
  html += `<div class="divider"></div>`;
  
  // Summary
  html += `<div>${leftRight('Subtotal', formatRupiah(subtotal), lineChars)}</div>`;
  if (totalDiskon > 0) {
    html += `<div>${leftRight('Total Diskon', formatRupiah(-totalDiskon), lineChars)}</div>`;
    html += `<div>${leftRight('Subtotal Diskon', formatRupiah(afterDisc), lineChars)}</div>`;
  }
  html += `<div>${leftRight(`PPN (${taxPercentage.toFixed(1)}%)`, formatRupiah(tax), lineChars)}</div>`;
  html += `<div class="bold large">${leftRight('TOTAL', formatRupiah(total), lineChars)}</div>`;
  html += `<div></div>`;
  html += `<div>${leftRight('Tunai', formatRupiah(tx.received), lineChars)}</div>`;
  html += `<div>${leftRight('Kembalian', formatRupiah(tx.change), lineChars)}</div>`;
  html += `<div class="divider"></div>`;
  
  // Footer
  html += `<div class="center bold large">TERIMA KASIH</div>`;
  html += `<div class="center">Barang yang dibeli tidak dapat dikembalikan</div>`;
  
  receiptPreview.innerHTML = html;
}

// ==========================================
// Bluetooth Functions
// ==========================================

async function connectPrinter() {
  try {
    statusIndicator.className = 'status-indicator connecting';
    statusText.textContent = 'Menghubungkan...';
    
    // Check if Web Bluetooth is supported
    if (!navigator.bluetooth) {
      throw new Error('Web Bluetooth tidak didukung di browser ini. Gunakan Chrome atau Edge.');
    }
    
    // Request device
    bluetoothDevice = await navigator.bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: [SPP_UUID]
    });
    
    if (!bluetoothDevice) {
      throw new Error('Tidak ada perangkat yang dipilih');
    }
    
    // Connect to GATT server
    const server = await bluetoothDevice.gatt.connect();
    
    // Get service
    const service = await server.getPrimaryService(SPP_UUID);
    
    // Get characteristic
    const characteristics = await service.getCharacteristics();
    
    // Find writable characteristic
    characteristic = characteristics.find(c => 
      c.properties.write || c.properties.writeWithoutResponse
    );
    
    if (!characteristic) {
      throw new Error('Tidak dapat menemukan karakteristik yang dapat ditulis');
    }
    
    isConnected = true;
    updateUI();
    showToast('Printer berhasil terhubung!', 'success');
    
    // Listen for disconnection
    bluetoothDevice.addEventListener('gattserverdisconnected', onDisconnected);
    
  } catch (error) {
    console.error('Connection error:', error);
    isConnected = false;
    updateUI();
    showToast('Gagal terhubung: ' + error.message, 'error');
  }
}

function onDisconnected() {
  isConnected = false;
  characteristic = null;
  updateUI();
  showToast('Printer terputus', 'error');
}

async function disconnectPrinter() {
  try {
    if (bluetoothDevice && bluetoothDevice.gatt.connected) {
      bluetoothDevice.gatt.disconnect();
    }
    isConnected = false;
    characteristic = null;
    bluetoothDevice = null;
    updateUI();
    showToast('Printer diputuskan', 'success');
  } catch (error) {
    console.error('Disconnect error:', error);
    showToast('Gagal memutuskan: ' + error.message, 'error');
  }
}

async function writeBytes(bytes) {
  if (!characteristic) {
    throw new Error('Printer tidak terhubung');
  }
  
  const data = new Uint8Array(bytes);
  const chunkSize = 512;
  
  for (let i = 0; i < data.length; i += chunkSize) {
    const chunk = data.slice(i, i + chunkSize);
    if (characteristic.properties.writeWithoutResponse) {
      await characteristic.writeValueWithoutResponse(chunk);
    } else {
      await characteristic.writeValue(chunk);
    }
    // Small delay between chunks
    await new Promise(resolve => setTimeout(resolve, 50));
  }
}

// ==========================================
// ESC/POS Commands
// ==========================================

const ESC = {
  init: () => [0x1B, 0x40],
  alignLeft: () => [0x1B, 0x61, 0x00],
  alignCenter: () => [0x1B, 0x61, 0x01],
  boldOn: () => [0x1B, 0x45, 0x01],
  boldOff: () => [0x1B, 0x45, 0x00],
  sizeNormal: () => [0x1D, 0x21, 0x00],
  sizeLarge: () => [0x1D, 0x21, 0x11],
  doubleHeightOn: () => [0x1B, 0x21, 0x10],
  doubleHeightOff: () => [0x1B, 0x21, 0x00],
  feed: (n) => [0x1B, 0x64, n],
  cut: () => [0x1D, 0x56, 0x01],
  text: (s) => Array.from(new TextEncoder().encode(s + '\n'))
};

function buildReceiptBytes(tx, storeInfo, taxPercentage, paperWidth) {
  const out = [];
  const add = (bytes) => out.push(...bytes);
  
  const lineChars = getLineChars(paperWidth);
  const divider = '-'.repeat(lineChars);
  
  // Calculate totals
  let subtotal = 0;
  let totalDiskon = 0;
  
  tx.items.forEach(item => {
    subtotal += item.lineTotal;
    totalDiskon += item.discountAmount;
  });
  
  const afterDisc = subtotal - totalDiskon;
  const tax = Math.round(afterDisc * taxPercentage / 100);
  const total = afterDisc + tax;
  
  // Build receipt
  add(ESC.init());
  
  // Header
  add(ESC.alignCenter());
  add(ESC.doubleHeightOn());
  add(ESC.boldOn());
  add(ESC.text(storeInfo.name));
  add(ESC.doubleHeightOff());
  add(ESC.boldOff());
  add(ESC.text(storeInfo.address));
  add(ESC.text(storeInfo.phone));
  add(ESC.text(divider));
  
  // Transaction info
  add(ESC.boldOn());
  add(ESC.text('STRUK PEMBAYARAN'));
  add(ESC.boldOff());
  add(ESC.alignLeft());
  add(ESC.text(`No     : ${tx.idFull}`));
  add(ESC.text(`Tgl    : ${formatDate(tx.createdAt)}`));
  add(ESC.text('Kasir  : Admin'));
  add(ESC.text(`Metode : ${tx.method}`));
  add(ESC.text(divider));
  
  // Items
  add(ESC.boldOn());
  add(ESC.text('ITEM PEMBELIAN'));
  add(ESC.boldOff());
  
  tx.items.forEach(item => {
    let nama = item.name;
    if (nama.length > lineChars - 8) {
      nama = nama.substring(0, lineChars - 8) + '...';
    }
    add(ESC.text(nama));
    add(ESC.text(leftRight(`${item.qty} x ${formatRupiah(item.price)}`, formatRupiah(item.lineTotal), lineChars)));
    if (item.discountAmount > 0) {
      add(ESC.text(leftRight('  Diskon', formatRupiah(-item.discountAmount), lineChars)));
    }
    add(ESC.text(''));
  });
  
  add(ESC.text(divider));
  
  // Summary
  add(ESC.text(leftRight('Subtotal', formatRupiah(subtotal), lineChars)));
  if (totalDiskon > 0) {
    add(ESC.text(leftRight('Total Diskon', formatRupiah(-totalDiskon), lineChars)));
    add(ESC.text(leftRight('Subtotal Diskon', formatRupiah(afterDisc), lineChars)));
  }
  add(ESC.text(leftRight(`PPN (${taxPercentage.toFixed(1)}%)`, formatRupiah(tax), lineChars)));
  
  add(ESC.boldOn());
  add(ESC.sizeLarge());
  add(ESC.text(leftRight('TOTAL', formatRupiah(total), lineChars)));
  add(ESC.sizeNormal());
  add(ESC.boldOff());
  
  add(ESC.text(''));
  add(ESC.text(leftRight('Tunai', formatRupiah(tx.received), lineChars)));
  add(ESC.text(leftRight('Kembalian', formatRupiah(tx.change), lineChars)));
  add(ESC.text(divider));
  
  // Footer
  add(ESC.alignCenter());
  add(ESC.boldOn());
  add(ESC.doubleHeightOn());
  add(ESC.text('TERIMA KASIH'));
  add(ESC.doubleHeightOff());
  add(ESC.text('Barang yang dibeli tidak dapat dikembalikan'));
  add(ESC.boldOff());
  
  add(ESC.feed(3));
  add(ESC.cut());
  
  return out;
}

function buildTestPrintBytes(storeInfo, taxPercentage, paperWidth) {
  const out = [];
  const add = (bytes) => out.push(...bytes);
  
  const lineChars = getLineChars(paperWidth);
  const divider = '='.repeat(lineChars);
  
  add(ESC.init());
  add(ESC.alignCenter());
  add(ESC.boldOn());
  add(ESC.sizeLarge());
  add(ESC.text('TEST PRINTER'));
  add(ESC.sizeNormal());
  add(ESC.boldOff());
  add(ESC.text(divider));
  add(ESC.alignLeft());
  add(ESC.text(`Nama Toko : ${storeInfo.name}`));
  add(ESC.text(`Alamat    : ${storeInfo.address}`));
  add(ESC.text(`Telepon   : ${storeInfo.phone}`));
  add(ESC.text(`PPN       : ${taxPercentage.toFixed(1)}%`));
  add(ESC.text(`Kertas    : ${paperWidth}mm`));
  add(ESC.text(`Waktu     : ${formatDate(new Date())}`));
  add(ESC.text(divider));
  add(ESC.alignCenter());
  add(ESC.boldOn());
  add(ESC.doubleHeightOn());
  add(ESC.text('BERHASIL TERHUBUNG'));
  add(ESC.doubleHeightOff());
  add(ESC.text('Printer siap digunakan'));
  add(ESC.boldOff());
  add(ESC.feed(3));
  add(ESC.cut());
  
  return out;
}

// ==========================================
// Print Functions
// ==========================================

async function testPrint() {
  try {
    const storeInfo = {
      name: storeNameInput.value || 'TOKO SAYA',
      address: storeAddressInput.value || 'Alamat Toko',
      phone: storePhoneInput.value || '021-12345678'
    };
    
    const paperWidth = parseInt(paperWidthSelect.value);
    const taxPercentage = parseFloat(taxPercentageInput.value) || 10;
    
    const bytes = buildTestPrintBytes(storeInfo, taxPercentage, paperWidth);
    await writeBytes(bytes);
    
    showToast('Test print berhasil!', 'success');
  } catch (error) {
    console.error('Test print error:', error);
    showToast('Gagal test print: ' + error.message, 'error');
  }
}

async function printReceipt() {
  try {
    const storeInfo = {
      name: storeNameInput.value || 'TOKO SAYA',
      address: storeAddressInput.value || 'Alamat Toko',
      phone: storePhoneInput.value || '021-12345678'
    };
    
    const paperWidth = parseInt(paperWidthSelect.value);
    const taxPercentage = parseFloat(taxPercentageInput.value) || 10;
    
    const bytes = buildReceiptBytes(sampleTransaction, storeInfo, taxPercentage, paperWidth);
    await writeBytes(bytes);
    
    showToast('Struk berhasil dicetak!', 'success');
  } catch (error) {
    console.error('Print error:', error);
    showToast('Gagal mencetak: ' + error.message, 'error');
  }
}

// ==========================================
// Event Listeners
// ==========================================

btnConnect.addEventListener('click', connectPrinter);
btnDisconnect.addEventListener('click', disconnectPrinter);
btnTestPrint.addEventListener('click', testPrint);
btnPrint.addEventListener('click', printReceipt);

// Update preview when settings change
paperWidthSelect.addEventListener('change', updateReceiptPreview);
taxPercentageInput.addEventListener('input', updateReceiptPreview);
storeNameInput.addEventListener('input', updateReceiptPreview);
storeAddressInput.addEventListener('input', updateReceiptPreview);
storePhoneInput.addEventListener('input', updateReceiptPreview);

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  updateUI();
  updateReceiptPreview();
  
  // Check browser support
  if (!navigator.bluetooth) {
    showToast('Web Bluetooth tidak didukung. Gunakan Chrome/Edge.', 'error');
  }
});
