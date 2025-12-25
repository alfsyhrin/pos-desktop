// Fetch transaction data by ID from API
async function fetchTransactionById(transactionId) {
  const storeId = localStorage.getItem('store_id');
  const token = localStorage.getItem('token');
  if (!storeId || !token || !transactionId) {
    console.error('Missing storeId, token, or transactionId');
    return null;
  }

  try {
    const res = await fetch(`http://103.126.116.119:8001/api/stores/${storeId}/transactions/${transactionId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      }
    });
    const data = await res.json();
    if (res.ok && data.success) {
      return data.data;
    } else {
      console.error('Failed to fetch transaction:', data.message);
      return null;
    }
  } catch (err) {
    console.error('Error fetching transaction:', err);
    return null;
  }
}

function renderDetailTransaksi() {
  const trx = JSON.parse(localStorage.getItem('last_transaction') || '{}');
  if (!trx || !trx.items) return;

  // Render nomor transaksi, tanggal, metode, dll
  document.querySelector('.jenis-pembayaran-transaksi h4 + p').textContent = trx.idFull || trx.idShort || trx.id || '-';
  document.querySelectorAll('.jenis-pembayaran-transaksi')[1].querySelector('p').textContent =
    trx.createdAt ? new Date(trx.createdAt).toLocaleString('id-ID') : '-';
  document.querySelectorAll('.jenis-pembayaran-transaksi')[2].querySelector('p').textContent = trx.method || 'Tunai';

  // Render item pembelian dengan data asli dari API
  const itemDiv = document.querySelector('.item-pembelian-transaksi');
  itemDiv.innerHTML = `<h4>Item pembelian</h4>`;
  trx.items.forEach(item => {
    const qty = item.qty || item.quantity || 1;
    const price = Number(item.price || 0);
    const lineTotal = Number(item.lineTotal || (price * qty));
    const discount = (price * qty) - lineTotal;

    itemDiv.innerHTML += `
      <p>${item.name || 'Produk'}</p>
      <p>Rp. ${price.toLocaleString('id-ID')} x ${qty}</p>
      <p style="color: var(--paragraph-color); font-size: 14px;">SKU: ${item.sku || '-'}</p>
      ${discount > 0 ? `<p style="color:green;">Diskon: Rp. ${discount.toLocaleString('id-ID')}</p>` : ''}
    `;
  });

  // Render harga transaksi dengan data asli
  const hargaDivs = document.querySelectorAll('.wrap-info-harga');
  const subTotal = Number(trx.total || 0);
  const grandTotal = Number(trx.grand_total || 0);
  const tax = Number(trx.tax || 0);
  const discount = subTotal - grandTotal + tax; // Total diskon sebelum pajak

  if (hargaDivs[0]) hargaDivs[0].querySelector('h4:nth-child(2)').textContent = `Rp. ${subTotal.toLocaleString('id-ID')}`;
  if (hargaDivs[1]) hargaDivs[1].querySelector('h4:nth-child(2)').textContent = `-Rp. ${discount.toLocaleString('id-ID')}`;
  if (hargaDivs[2]) hargaDivs[2].querySelector('h4:nth-child(2)').textContent = `Rp. ${tax.toLocaleString('id-ID')}`;
  if (hargaDivs[3]) hargaDivs[3].querySelector('h4:nth-child(2)').textContent = `Rp. ${grandTotal.toLocaleString('id-ID')}`;

  // Tunai diterima & kembalian dengan data asli
  const tunaiDivs = document.querySelectorAll('.wrap-tunai .wrap-info-harga');
  const received = Number(trx.received || trx.received_amount || 0);
  const change = Number(trx.change || trx.change_amount || 0);

  if (tunaiDivs[0]) tunaiDivs[0].querySelector('h4:nth-child(2)').textContent = `Rp. ${received.toLocaleString('id-ID')}`;
  if (tunaiDivs[1]) tunaiDivs[1].querySelector('h4:nth-child(2)').textContent = `Rp. ${change.toLocaleString('id-ID')}`;
}

// Print receipt functionality
function printReceipt() {
  window.print();
}

// Initialize print button
// function initPrintButton() {
//   const printBtn = document.querySelector('.btn-print-transaksi') || document.querySelector('button[onclick*="print"]');
//   if (printBtn) {
//     printBtn.addEventListener('click', printReceipt);
//   } else {
//     // Add print button if not exists
//     const container = document.querySelector('.container-detail-transaksi') || document.body;
//     const printButton = document.createElement('button');
//     printButton.className = 'btn-print-transaksi';
//     printButton.textContent = 'Print Struk';
//     printButton.style.cssText = 'padding: 10px 20px; background: #10b981; color: white; border: none; border-radius: 5px; cursor: pointer; margin: 20px 0;';
//     printButton.addEventListener('click', printReceipt);
//     container.appendChild(printButton);
//   }
// }

function parseRupiah(str) {
  if (!str) return 0;
  return Number(String(str).replace(/[^\d]/g, "")) || 0;
}

// Bluetooth printer detection and selection
let selectedBluetoothPrinter = null;

async function detectBluetoothPrinters() {
  if (!window.printerAPI || !window.printerAPI.getBluetoothPrinters) {
    console.warn("Bluetooth printer detection not available");
    return [];
  }

  try {
    const result = await window.printerAPI.getBluetoothPrinters();
    if (result.success) {
      // Filter for WOYA or Printer struck printers
      const filteredPrinters = result.printers.filter(printer =>
        printer.name.toLowerCase().includes('woya') ||
        printer.name.toLowerCase().includes('printer struck') ||
        printer.name.toLowerCase().includes('thermal')
      );
      return filteredPrinters;
    } else {
      console.error("Failed to get Bluetooth printers:", result.error);
      return [];
    }
  } catch (e) {
    console.error("Error detecting Bluetooth printers:", e);
    return [];
  }
}

async function selectBluetoothPrinter() {
  const printers = await detectBluetoothPrinters();

  if (printers.length === 0) {
    alert("Tidak ada printer Bluetooth WOYA atau Printer struck yang ditemukan. Pastikan printer Bluetooth aktif dan terpasang.");
    return null;
  }

  if (printers.length === 1) {
    // Auto-select if only one printer found
    selectedBluetoothPrinter = printers[0];
    return printers[0].address;
  }

  // Show modal to select printer
  return new Promise((resolve) => {
    const modal = document.getElementById('modal-bluetooth-selection');
    const printerList = document.getElementById('bluetooth-printer-list');
    const btnSelect = document.getElementById('btn-select-bluetooth');
    const btnCancel = document.getElementById('btn-cancel-bluetooth');

    // Clear previous list
    printerList.innerHTML = '';

    // Add printers to list
    printers.forEach((printer, index) => {
      const item = document.createElement('div');
      item.className = 'printer-item';
      item.innerHTML = `
        <span class="material-symbols-outlined">bluetooth</span>
        <span>${printer.name}</span>
      `;
      item.onclick = () => {
        // Remove selected class from all items
        document.querySelectorAll('.printer-item').forEach(i => i.classList.remove('selected'));
        // Add selected class to clicked item
        item.classList.add('selected');
        selectedBluetoothPrinter = printer;
      };
      if (index === 0) {
        item.classList.add('selected');
        selectedBluetoothPrinter = printer;
      }
      printerList.appendChild(item);
    });

    // Show modal
    modal.classList.add('show');

    // Handle select button
    btnSelect.onclick = () => {
      modal.classList.remove('show');
      resolve(selectedBluetoothPrinter ? selectedBluetoothPrinter.address : null);
    };

    // Handle cancel button
    btnCancel.onclick = () => {
      modal.classList.remove('show');
      resolve(null);
    };
  });
}

async function handlePrint(printType = 'usb', bluetoothAddress = null) {
  console.log("printerAPI in handler:", window.printerAPI); // debug

  if (!window.printerAPI || !window.printerAPI.printReceipt) {
    alert("printerAPI belum tersedia di window");
    return;
  }

  // For Bluetooth printing, select printer first
  if (printType === 'bluetooth' && !bluetoothAddress) {
    bluetoothAddress = await selectBluetoothPrinter();
    if (!bluetoothAddress) {
      return; // User cancelled or no printer selected
    }
  }

  // Get transaction data from localStorage (from API fetch)
  const trx = JSON.parse(localStorage.getItem('last_transaction') || '{}');
  if (!trx || !trx.items) {
    alert("Data transaksi tidak ditemukan!");
    return;
  }

  const store = {
    name: document.getElementById("store-name")?.value || "TOKO SAYA",
    address: document.getElementById("store-address")?.value || "",
    phone: document.getElementById("store-phone")?.value || "",
  };

  const payload = {
    txId: trx.idFull || trx.idShort || trx.id || '',
    txDate: trx.createdAt ? new Date(trx.createdAt).toLocaleString('id-ID') : '',
    method: trx.method || 'Tunai',
    items: trx.items.map(item => ({
      name: item.name || '',
      qty: item.qty || item.quantity || 1,
      price: Number(item.price || 0),
      sku: item.sku || ''
    })),
    subTotal: Number(trx.total || 0),
    discount: Number((trx.total || 0) - (trx.grand_total || 0)),
    tax: Number(trx.tax || 0),
    grandTotal: Number(trx.grand_total || 0),
    cash: Number(trx.received || trx.received_amount || 0),
    change: Number(trx.change || trx.change_amount || 0),
    store,
    printType,
    bluetoothAddress,
  };

  const btnId = printType === 'bluetooth' ? 'btn-print-bluetooth' : 'btn-print-usb';
  const btn = document.getElementById(btnId);
  const oldText = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '<span class="material-symbols-outlined">print</span> Mencetak...';

  try {
    const result = await window.printerAPI.printReceipt(payload);
    console.log("print result:", result);
    if (!result.success) {
      alert("Gagal mencetak: " + (result.error || "Unknown error"));
    } else {
      alert("Struk berhasil dicetak!");
    }
  } catch (e) {
    alert("Error IPC: " + e.message);
    console.error(e);
  } finally {
    btn.disabled = false;
    btn.innerHTML = oldText;
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  // Get transaction ID from localStorage
  const trx = JSON.parse(localStorage.getItem('last_transaction') || '{}');
  const transactionId = trx.idShort || trx.id;

  if (transactionId) {
    // Fetch fresh transaction data from API
    const freshTrx = await fetchTransactionById(transactionId);
    if (freshTrx) {
      // Update localStorage with fresh data
      localStorage.setItem('last_transaction', JSON.stringify(freshTrx));
    }
  }

  renderDetailTransaksi();

  // Initialize print button event listeners
  document.getElementById("btn-print-usb")?.addEventListener("click", () => handlePrint('usb'));
  document.getElementById("btn-print-bluetooth")?.addEventListener("click", () => handlePrint('bluetooth'));
});
