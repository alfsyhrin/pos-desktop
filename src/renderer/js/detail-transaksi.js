function formatRupiah(num) {
  return "Rp " + Number(num || 0).toLocaleString('id-ID');
}

// Fungsi perhitungan yang sama dengan proses-pembayaran.js
function calculateBuyXGetY(buyCount, buyQty, freeQty) {
  if (!buyQty || !freeQty || buyCount < buyQty) return 0;
  return Math.floor(buyCount / buyQty) * freeQty;
}

// Fungsi untuk menghitung semua nilai transaksi (sama seperti di proses-pembayaran.js)
function calculateTransactionValues(items, taxPercentage = 10) {
  let grossSubtotal = 0;
  let discountTotal = 0;

  items.forEach(item => {
    const harga = Number(item.price || 0);
    const qty = Number(item.quantity || item.qty || 0);

    let buyQty = qty;
    let bonusQty = 0;
    let discountAmount = 0;

    // === BUY X GET Y ===
    if (
      item.discount_type === 'buyxgety' &&
      Number(item.buy_qty) > 0 &&
      Number(item.free_qty) > 0
    ) {
      const group = item.buy_qty + item.free_qty;
      const promoCount = Math.floor(qty / group);
      bonusQty = promoCount * item.free_qty;
      buyQty = qty - bonusQty;
      discountAmount = bonusQty * harga;
    }
    // === DISKON PERSENTASE ===
    else if (item.discount_type === 'percentage') {
      discountAmount = harga * qty * (item.discount_value / 100);
    }
    // === DISKON NOMINAL ===
    else if (item.discount_type === 'nominal') {
      discountAmount = Math.min(harga * qty, item.discount_value);
    }

    const grossItem = harga * qty;
    grossSubtotal += grossItem;
    discountTotal += discountAmount;

    // Simpan nilai perhitungan di item
    item._buyQty = buyQty;
    item._bonusQty = bonusQty;
    item._discountAmount = discountAmount;
    item._grossItem = grossItem;
  });

  const netSubtotal = grossSubtotal - discountTotal;
  const tax = netSubtotal * (taxPercentage / 100);
  const grandTotal = netSubtotal + tax;

  return {
    grossSubtotal,
    discountTotal,
    netSubtotal,
    tax,
    grandTotal,
    taxPercentage
  };
}

// TAMBAH: Fetch store data dari database
async function fetchStoreData() {
  const storeId = localStorage.getItem('store_id');
  const token = localStorage.getItem('token');
  
  if (!storeId || !token) return null;
  
  try {
    const res = await fetch(`http://103.126.116.119:8001/api/stores/${storeId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    return data?.success ? data.data : null;
  } catch (err) {
    console.error('Gagal fetch store data:', err);
    return null;
  }
}

// TAMBAH: Generate template struk ESC/POS
function generateReceiptTemplate(storeData, trx) {
  const W = 32; // paper width in characters for 48mm/57.5mm printer
  const lineEq = '='.repeat(W) + '\n';
  const lineDash = '─'.repeat(W) + '\n';

  function centerText(text) {
    const t = String(text || '');
    if (t.length >= W) return t;
    const pad = Math.floor((W - t.length) / 2);
    return ' '.repeat(pad) + t;
  }

  function wrapText(text) {
    const words = String(text || '').split(/\s+/);
    const lines = [];
    let cur = '';
    for (const w of words) {
      if ((cur + ' ' + w).trim().length <= W) cur = (cur + ' ' + w).trim();
      else { if (cur) lines.push(cur); cur = w; }
    }
    if (cur) lines.push(cur);
    return lines;
  }

  function lineKV(label, value) {
    const v = String(formatRupiah(value));
    const pad = Math.max(1, W - label.length - v.length);
    return label + ' '.repeat(pad) + v + '\n';
  }

  let receipt = '';

  // Header
  receipt += lineEq;
  receipt += centerText((storeData?.name || 'TOKO SAYA').toUpperCase()) + '\n';
  if (storeData?.address) wrapText(storeData.address).forEach(l => receipt += l + '\n');
  if (storeData?.phone) receipt += 'Telp: ' + storeData.phone + '\n';
  receipt += lineEq + '\n';

  // Trans info
  receipt += `No. Trans : ${trx.idFull || trx.id || '-'}\n`;
  receipt += `Tgl/Jam  : ${trx.createdAt ? formatDateToTZ(trx.createdAt) : '-'}\n`;
  receipt += `Metode   : ${trx.method || trx.payment_method || 'Tunai'}\n`;
  receipt += lineEq + '\n';

  // Items
  receipt += 'DAFTAR BARANG:\n';
  receipt += lineDash;

  // Gunakan nilai yang sudah dihitung
  const items = trx.items || [];
  items.forEach(item => {
    const harga = Number(item.price || 0);
    const qty = Number(item.quantity || item.qty || 0);
    const buyQty = item._buyQty || qty; // Jumlah yang dibayar
    const bonusQty = item._bonusQty || 0; // Jumlah bonus
    const discountAmount = item._discountAmount || 0;

    // Nama produk
    wrapText(item.name || '-').forEach(l => receipt += l + '\n');
    
    // Tampilkan quantity dengan detail buyXgetY
    if (bonusQty > 0) {
      const totalKeluar = qty; // Total yang keluar dari gudang
      receipt += `${totalKeluar}x ${formatRupiah(harga)}\n`;
      receipt += `  (Bayar: ${buyQty}, Bonus: ${bonusQty})\n`;
    } else {
      receipt += `${buyQty}x ${formatRupiah(harga)}\n`;
    }

    if (item.sku) receipt += `SKU: ${item.sku}\n`;
    if (discountAmount > 0) {
      receipt += `  Diskon: -${formatRupiah(discountAmount)}\n`;
    }

    receipt += '\n';
  });

  receipt += lineEq;

  // Totals - gunakan nilai yang sudah dihitung
  const subtotal = Number(trx._grossSubtotal || 0);
  const totalDiskon = Number(trx._discountTotal || 0);
  const tax = Number(trx._tax || 0);
  const taxPercent = Number(trx.tax_percentage || 10);
  const grandTotal = Number(trx._grandTotal || 0);

  receipt += lineKV('Sub Total      :', subtotal);
  // show negative sign for discount
  const diskonDisplay = totalDiskon > 0 ? -Math.abs(totalDiskon) : 0;
  receipt += lineKV('Total Diskon   :', diskonDisplay);
  const taxLabel = `PPN (${taxPercent.toFixed(1)}%) :`;
  {
    const v = formatRupiah(tax);
    const pad = Math.max(1, W - taxLabel.length - v.length);
    receipt += taxLabel + ' '.repeat(pad) + v + '\n';
  }
  receipt += lineDash;
  receipt += lineKV('GRAND TOTAL    :', grandTotal);
  receipt += lineEq + '\n';

  // Payment
  receipt += lineKV('Tunai Diterima :', Number(trx.received || trx.received_amount || 0));
  receipt += lineKV('Kembalian      :', Number(trx.change || trx.change_amount || 0));
  receipt += '\n';

  // Footer
  const footer = storeData?.receipt_template || 'Terima Kasih\nSelamat Datang Kembali';
  wrapText(footer).forEach(l => receipt += centerText(l) + '\n');
  receipt += lineEq;

  return receipt;
}

// TAMBAH: Render preview struk di halaman
async function renderReceiptPreview() {
  const storeData = await fetchStoreData();
  const trx = JSON.parse(localStorage.getItem('last_transaction') || '{}');
  
  if (!storeData || !trx) return;
  
  const receiptText = generateReceiptTemplate(storeData, trx);
  const previewContainer = document.getElementById('receipt-preview') || createPreviewContainer();
  
  previewContainer.innerHTML = `
    <div style="display:flex;justify-content:center;align-items:center;background:#fff;color:#000;padding:20px;border-radius:8px;margin:20px 0;font-family:'Courier New',monospace;white-space:pre-wrap;word-break:break-all;font-size:12px;line-height:1.4;">
      ${receiptText.replace(/</g, '&lt;').replace(/>/g, '&gt;')}
    </div>
  `;
}

function createPreviewContainer() {
  const container = document.createElement('div');
  container.id = 'receipt-preview';
  container.style.cssText = 'margin-top:20px;padding:20px;background:#f5f5f5;border-radius:8px;';
  
  const heading = document.createElement('h3');
  heading.textContent = 'Preview Struk';
  heading.style.cssText = 'margin-bottom:10px;';
  
  container.appendChild(heading);
  document.querySelector('.main-container').appendChild(container);
  
  return container;
}

// TAMBAH: Fetch single transaction by ID
async function fetchTransactionById(transactionId) {
  const storeId = localStorage.getItem('store_id');
  const token = localStorage.getItem('token');
  
  if (!storeId || !token || !transactionId) return null;
  
  try {
    const res = await fetch(`http://103.126.116.119:8001/api/stores/${storeId}/transactions/${transactionId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    return data?.success ? data.data : null;
  } catch (err) {
    console.error('Gagal fetch transaction detail:', err);
    return null;
  }
}

async function renderDetailTransaksi() {
  // --- JALUR DARI PROSES PEMBAYARAN ---
  const lastTrxStr = localStorage.getItem('last_transaction');
  if (lastTrxStr) {
    const trx = JSON.parse(lastTrxStr);

    // Jika sudah ada nilai perhitungan, gunakan langsung
    // Jika belum, hitung ulang
    if (!trx._grossSubtotal && trx.items) {
      const taxPercentage = trx.tax_percentage || 10;
      const calculated = calculateTransactionValues(trx.items, taxPercentage);
      
      // Update trx dengan nilai perhitungan
      Object.assign(trx, calculated);
      
      // Simpan kembali ke localStorage
      localStorage.setItem('last_transaction', JSON.stringify(trx));
    }

    // Nomor transaksi
    document.querySelectorAll('.jenis-pembayaran-transaksi')[0].querySelector('p').textContent =
      trx.idFull || trx.idShort || trx.id || '-';

    // Tanggal & waktu
    document.querySelectorAll('.jenis-pembayaran-transaksi')[1].querySelector('p').textContent =
      trx.createdAt ? formatDateToTZ(trx.createdAt) : '-';

    // Metode pembayaran
    document.querySelectorAll('.jenis-pembayaran-transaksi')[2].querySelector('p').textContent =
      trx.method || trx.payment_method || '-';

    // Item pembelian
    const itemDiv = document.querySelector('.item-pembelian-transaksi');
    itemDiv.innerHTML = `<h4>Item pembelian</h4>`;
    
    (trx.items || []).forEach(item => {
      const harga = Number(item.price || 0);
      const qty = Number(item.quantity || item.qty || 0);
      const buyQty = item._buyQty || qty;
      const bonusQty = item._bonusQty || 0;
      const discountAmount = item._discountAmount || 0;

      let itemHTML = `
        <div style="margin-bottom: 15px; padding-bottom: 10px; border-bottom: 1px solid #eee;">
          <p style="font-weight: bold; margin-bottom: 5px;">${item.name || '-'}</p>
      `;

      if (bonusQty > 0) {
        itemHTML += `
          <p style="color: #666; margin-bottom: 3px;">
            ${formatRupiah(harga)} x ${buyQty} (Bayar)
          </p>
          <p style="color: #10b981; margin-bottom: 3px;">
            Bonus: ${bonusQty} item
          </p>
          <p style="font-size: 12px; color: #888;">
            Total keluar: ${qty} item
          </p>
        `;
      } else {
        itemHTML += `
          <p style="color: #666; margin-bottom: 3px;">
            ${formatRupiah(harga)} x ${qty}
          </p>
        `;
      }

      if (item.sku) {
        itemHTML += `<p class="sku" style="font-size: 12px; color: #888;">SKU: ${item.sku || '-'}</p>`;
      }

      if (discountAmount > 0) {
        let discountType = '';
        if (item.discount_type === 'percentage') {
          discountType = `${item.discount_value}%`;
        } else if (item.discount_type === 'nominal') {
          discountType = formatRupiah(item.discount_value);
        } else if (item.discount_type === 'buyxgety') {
          discountType = `Buy ${item.buy_qty} Get ${item.free_qty}`;
        }
        
        itemHTML += `
          <p style="color: #f59e42; font-size: 13px; margin-top: 5px;">
            Diskon: ${discountType} (${formatRupiah(discountAmount)})
          </p>
        `;
      }

      itemHTML += `</div>`;
      itemDiv.innerHTML += itemHTML;
    });

    // Harga transaksi - gunakan nilai yang sudah dihitung
    const hargaDivs = document.querySelectorAll('.wrap-info-harga');

    const subtotal = Number(trx._grossSubtotal || 0);
    const totalDiskon = Number(trx._discountTotal || 0);
    const tax = Number(trx._tax || 0);
    const taxPercent = Number(trx.tax_percentage || 10);
    const grandTotal = Number(trx._grandTotal || 0);

    if (hargaDivs[0]) hargaDivs[0].querySelector('h4:nth-child(2)').textContent = formatRupiah(subtotal);
    if (hargaDivs[1]) hargaDivs[1].querySelector('h4:nth-child(2)').textContent = formatRupiah(totalDiskon);
    if (hargaDivs[2]) {
      hargaDivs[2].querySelector('h4.label').textContent = `PPN (${taxPercent.toFixed(1)}%)`;
      hargaDivs[2].querySelector('h4:nth-child(2)').textContent = formatRupiah(tax);
    }
    if (hargaDivs[3]) hargaDivs[3].querySelector('h4:nth-child(2)').textContent = formatRupiah(grandTotal);

    // Tunai diterima & kembalian
    const tunaiDivs = document.querySelectorAll('.wrap-tunai .wrap-info-harga');
    if (tunaiDivs[0]) tunaiDivs[0].querySelector('h4:nth-child(2)').textContent = formatRupiah(trx.received || trx.received_amount);
    if (tunaiDivs[1]) tunaiDivs[1].querySelector('h4:nth-child(2)').textContent = formatRupiah(trx.change || trx.change_amount);

    // Render preview struk
    setTimeout(() => renderReceiptPreview(), 500);

    return; // STOP di sini, tidak fetch dari API
  }

  // --- JALUR DARI RIWAYAT TRANSAKSI ---
  const selectedTxId = localStorage.getItem('selected_transaction_id');
  if (!selectedTxId) {
    console.error('Transaction ID tidak ditemukan di localStorage');
    return;
  }

  // Fetch transaksi dan data toko secara paralel
  const [trx, storeData] = await Promise.all([
    fetchTransactionById(selectedTxId),
    fetchStoreData()
  ]);

  if (!trx || !trx.items) {
    console.error('Transaction data tidak ditemukan');
    return;
  }

  // Gunakan tax_percentage dari response API, fallback ke store
  const taxPercentage = Number(trx.tax_percentage || storeData?.tax_percentage || 10);

  // Hitung ulang menggunakan fungsi yang sama dengan proses-pembayaran.js
  const calculated = calculateTransactionValues(trx.items, taxPercentage);

  // Nominal bayar dan kembalian dari response API
  const received = Number(trx.received_amount || trx.received || 0);
  const change = Math.max(0, received - calculated.grandTotal);

  // Simpan ke localStorage untuk konsistensi print struk
  const trxToSave = {
    ...trx,
    ...calculated,
    received,
    change
  };
  localStorage.setItem('last_transaction', JSON.stringify(trxToSave));

  // --- Render ke UI ---
  document.querySelectorAll('.jenis-pembayaran-transaksi')[0].querySelector('p').textContent =
    trx.idFull || trx.idShort || trx.id || '-';

  document.querySelectorAll('.jenis-pembayaran-transaksi')[1].querySelector('p').textContent =
    trx.createdAt ? formatDateToTZ(trx.createdAt) : '-';

  document.querySelectorAll('.jenis-pembayaran-transaksi')[2].querySelector('p').textContent =
    trx.method || trx.payment_method || '-';

  // Item pembelian
  const itemDiv = document.querySelector('.item-pembelian-transaksi');
  itemDiv.innerHTML = `<h4>Item pembelian</h4>`;
  
  trxToSave.items.forEach(item => {
    const harga = Number(item.price || 0);
    const qty = Number(item.quantity || item.qty || 0);
    const buyQty = item._buyQty || qty;
    const bonusQty = item._bonusQty || 0;
    const discountAmount = item._discountAmount || 0;

    let itemHTML = `
      <div style="margin-bottom: 15px; padding-bottom: 10px; border-bottom: 1px solid #eee;">
        <p style="font-weight: bold; margin-bottom: 5px;">${item.name || '-'}</p>
    `;

    if (bonusQty > 0) {
      itemHTML += `
        <p style="color: #666; margin-bottom: 3px;">
          ${formatRupiah(harga)} x ${buyQty} (Bayar)
        </p>
        <p style="color: #10b981; margin-bottom: 3px;">
          Bonus: ${bonusQty} item
        </p>
        <p style="font-size: 12px; color: #888;">
          Total keluar: ${qty} item
        </p>
      `;
    } else {
      itemHTML += `
        <p style="color: #666; margin-bottom: 3px;">
          ${formatRupiah(harga)} x ${qty}
        </p>
      `;
    }

    if (item.sku) {
      itemHTML += `<p class="sku" style="font-size: 12px; color: #888;">SKU: ${item.sku || '-'}</p>`;
    }

    if (discountAmount > 0) {
      let discountType = '';
      if (item.discount_type === 'percentage') {
        discountType = `${item.discount_value}%`;
      } else if (item.discount_type === 'nominal') {
        discountType = formatRupiah(item.discount_value);
      } else if (item.discount_type === 'buyxgety') {
        discountType = `Buy ${item.buy_qty} Get ${item.free_qty}`;
      }
      
      itemHTML += `
        <p style="color: #f59e42; font-size: 13px; margin-top: 5px;">
          Diskon: ${discountType} (${formatRupiah(discountAmount)})
        </p>
      `;
    }

    itemHTML += `</div>`;
    itemDiv.innerHTML += itemHTML;
  });

  // Harga transaksi
  const hargaDivs = document.querySelectorAll('.wrap-info-harga');
  if (hargaDivs[0]) hargaDivs[0].querySelector('h4:nth-child(2)').textContent = formatRupiah(calculated.grossSubtotal);
  if (hargaDivs[1]) hargaDivs[1].querySelector('h4:nth-child(2)').textContent = formatRupiah(calculated.discountTotal);
  if (hargaDivs[2]) {
    hargaDivs[2].querySelector('h4.label').textContent = `PPN (${calculated.taxPercentage.toFixed(1)}%)`;
    hargaDivs[2].querySelector('h4:nth-child(2)').textContent = formatRupiah(calculated.tax);
  }
  if (hargaDivs[3]) hargaDivs[3].querySelector('h4:nth-child(2)').textContent = formatRupiah(calculated.grandTotal);

  // Tunai diterima & kembalian
  const tunaiDivs = document.querySelectorAll('.wrap-tunai .wrap-info-harga');
  if (tunaiDivs[0]) tunaiDivs[0].querySelector('h4:nth-child(2)').textContent = formatRupiah(received);
  if (tunaiDivs[1]) tunaiDivs[1].querySelector('h4:nth-child(2)').textContent = formatRupiah(change);

  // Render preview struk
  setTimeout(() => renderReceiptPreview(), 500);
}

// helper: format date string to specific timezone (default WIT)
function formatDateToTZ(dateInput, timeZone = localStorage.getItem('preferred_timezone') || 'Asia/Jayapura') {
  try {
    const d = dateInput ? new Date(dateInput) : new Date();
    return new Intl.DateTimeFormat('id-ID', {
      timeZone,
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(d);
  } catch (e) {
    // fallback to local string
    return dateInput ? new Date(dateInput).toLocaleString('id-ID') : new Date().toLocaleString('id-ID');
  }
}

async function deleteTransactionAndGoToKasir() {
  const trx = JSON.parse(localStorage.getItem('last_transaction') || '{}');
  const storeId = trx.store_id || trx.storeId || localStorage.getItem('store_id');
  const token = localStorage.getItem('token');
  if (!trx.id && !trx.idFull && !trx.idShort) {
    alert('ID transaksi tidak ditemukan!');
    return;
  }
  if (!storeId || !token) {
    alert('Store ID atau token tidak ditemukan!');
    return;
  }
  const trxId = trx.id || trx.idFull || trx.idShort;
  if (!confirm('Yakin ingin menghapus transaksi ini?')) return;

  try {
    const res = await fetch(`http://103.126.116.119:8001/api/stores/${storeId}/transactions/${trxId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    if (res.ok && (data.success || data.message?.toLowerCase().includes('berhasil'))) {
      // Hapus keranjang
      localStorage.removeItem('pos_cart');
      localStorage.removeItem('pending_transaction');
      localStorage.removeItem('last_transaction');
      // Redirect ke kasir
      localStorage.setItem('current_page', 'kasir');
      window.location.href = 'index.html';
    } else {
      alert(data.message || 'Gagal menghapus transaksi!');
    }
  } catch (err) {
    alert('Gagal menghapus transaksi: ' + (err.message || err));
  }
}

document.addEventListener('DOMContentLoaded', renderDetailTransaksi);
document.getElementById('btn-delete').addEventListener('click', deleteTransactionAndGoToKasir);
document.getElementById('btn-selesai').onclick = function() {
  localStorage.removeItem('pos_cart');
  localStorage.removeItem('pending_transaction');
  localStorage.removeItem('last_transaction');
  localStorage.setItem('current_page', 'kasir');
  window.location.href = 'index.html';
};

document.getElementById('btn-back-kasir').addEventListener('click', function (e) {
  e.preventDefault();

  // Hapus data transaksi sementara agar tidak bentrok jika kembali ke kasir
  localStorage.removeItem('last_transaction');
  localStorage.removeItem('pending_transaction');
  localStorage.setItem('current_page', 'kasir');
  window.location.href = 'index.html';
});

// Tambahkan fungsi global yang dipanggil dari detail-transaksi.html
async function sendPrintRequest(printType = 'usb', bluetoothAddress = null) {
  try {
    const raw = localStorage.getItem('last_transaction') || '{}';
    const trx = JSON.parse(raw || '{}');

    if (!trx || Object.keys(trx).length === 0) {
      console.warn('sendPrintRequest: no last_transaction found — aborting silently');
      return;
    }

    // Pastikan perhitungan sudah ada
    if (!trx._grossSubtotal && trx.items) {
      const taxPercentage = trx.tax_percentage || 10;
      const calculated = calculateTransactionValues(trx.items, taxPercentage);
      Object.assign(trx, calculated);
      localStorage.setItem('last_transaction', JSON.stringify(trx));
    }

    // fallback store data
    let storeData = await fetchStoreData().catch(() => null);
    if (!storeData) {
      try { storeData = JSON.parse(localStorage.getItem('store_data') || localStorage.getItem('store') || '{}'); } catch (e) { storeData = {}; }
    }

    // Build payload dengan BOTH receiptText dan structured fields
    const receiptText = generateReceiptTemplate(storeData || {}, trx);

    const payload = {
      receiptText,
      printType,
      bluetoothAddress,
      printerName: undefined,

      // Structured fallback data
      txId: trx.idFull || trx.idShort || trx.transaction_id || trx.id || '-',
      txDate: trx.createdAt ? formatDateToTZ(trx.createdAt) : (trx.created_at ? formatDateToTZ(trx.created_at) : formatDateToTZ(new Date())),
      method: trx.method || trx.payment_method || 'cash',
      items: trx.items || [],
      subTotal: trx._grossSubtotal || 0,
      discount: trx._discountTotal || 0,
      tax: trx._tax || 0,
      taxPercent: trx.tax_percentage || 10,
      grandTotal: trx._grandTotal || 0,
      cash: trx.received || trx.received_amount || 0,
      change: trx.change || trx.change_amount || 0,
      cashier_name: trx.cashier_name || trx.created_by || 'Admin',
      store: {
        name: storeData?.name || localStorage.getItem('store_name') || 'CV BETARAK INDONESIA 1',
        address: storeData?.address || localStorage.getItem('store_address') || '',
        phone: storeData?.phone || localStorage.getItem('store_phone') || ''
      },
      storeData
    };

    console.log('sendPrintRequest: payload prepared', {
      txId: payload.txId,
      itemsCount: payload.items.length,
      subTotal: payload.subTotal,
      discount: payload.discount,
      tax: payload.tax,
      grandTotal: payload.grandTotal
    });

    // Use preload API
    if (window.printerAPI && typeof window.printerAPI.printReceipt === 'function') {
      const res = await window.printerAPI.printReceipt(payload);
      console.log('print result', res);
    } else if (window.electron?.ipcRenderer?.invoke) {
      const res = await window.electron.ipcRenderer.invoke('print-receipt', payload);
      console.log('print result (ipcRenderer)', res);
    } else {
      console.warn('No print bridge available (printerAPI/ipcRenderer)');
    }
  } catch (err) {
    console.error('sendPrintRequest error:', err);
  }
}