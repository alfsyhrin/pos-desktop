function formatRupiah(num) {
  return "Rp " + Number(num || 0).toLocaleString('id-ID');
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

  let totalDiskonItem = 0;
  (trx.items || []).forEach(item => {
    const harga = Number(item.price || 0);
    const qty = Number(item.quantity || item.qty || 0);
    const subtotal = harga * qty;
    const discount = Number(item.discount_amount || item._discountAmount || 0);
    totalDiskonItem += discount;

    wrapText(item.name || '-').forEach(l => receipt += l + '\n');

    const left = `${qty}x ${formatRupiah(harga)}`;
    const right = formatRupiah(subtotal);
    const spaces = Math.max(1, W - left.length - right.length);
    receipt += left + ' '.repeat(spaces) + right + '\n';

    if (item.sku) receipt += `SKU: ${item.sku}\n`;
    if (discount > 0) receipt += `  Diskon: -${formatRupiah(discount)}\n`;

    receipt += '\n';
  });

  receipt += lineEq;

  // Totals (use calculated fields if present)
  const subtotal = Number(trx._grossSubtotal || trx.total || 0);
  const totalDiskon = Number(trx._discountTotal || trx.discount_total || totalDiskonItem);
  const tax = Number(trx._tax || trx.tax || 0);
  const taxPercent = Number(trx.tax_percentage || (subtotal ? (tax / subtotal * 100) : 10));
  const grandTotal = Number(trx._grandTotal || trx.grand_total || (subtotal - totalDiskon + tax));

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
    <div style="background:#fff;color:#000;padding:20px;border-radius:8px;margin:20px 0;font-family:'Courier New',monospace;white-space:pre-wrap;word-break:break-all;font-size:12px;line-height:1.4;">
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

    // Nomor transaksi
    document.querySelectorAll('.jenis-pembayaran-transaksi')[0].querySelector('p').textContent =
      trx.idFull || trx.idShort || trx.id || '-';

    // Tanggal & waktu
    document.querySelectorAll('.jenis-pembayaran-transaksi')[1].querySelector('p').textContent =
      trx.createdAt ? formatDateToTZ(trx.createdAt) : '-';

    // Metode pembayaran
    document.querySelectorAll('.jenis-pembayaran-transaksi')[2].querySelector('p').textContent =
      trx.method || trx.payment_method || '-';

    // Item pembelian & HITUNG ULANG dari scratch
    const itemDiv = document.querySelector('.item-pembelian-transaksi');
    itemDiv.innerHTML = `<h4>Item pembelian</h4>`;
    
    let grossSubtotal = 0;
    let discountTotal = 0;

    (trx.items || []).forEach(item => {
      const harga = Number(item.price || 0);
      const qty = Number(item.quantity || item.qty || 0);
      
      // SUBTOTAL HANYA harga x qty
      grossSubtotal += harga * qty;

      let discountAmount = Number(item.discount_amount || item._discountAmount || 0);

      // === DISKON BUNDLE ===
      if (item.discount_type === 'bundle' && item.diskon_bundle_min_qty && item.diskon_bundle_value) {
        const minQty = Number(item.diskon_bundle_min_qty);
        const bundlePrice = Number(item.diskon_bundle_value);
        const bundleCount = Math.floor(qty / minQty);
        const sisa = qty % minQty;
        const totalBundle = bundleCount * bundlePrice + sisa * harga;
        const normalTotal = qty * harga;
        discountAmount = normalTotal - totalBundle;

        itemDiv.innerHTML += `
          <p>${item.name || '-'}</p>
          <p>${formatRupiah(harga)} x ${qty}</p>
          <p class="sku">SKU: ${item.sku || '-'}</p>
          <p style="color:#10b981;">Bundle: ${minQty} = ${formatRupiah(bundlePrice)}</p>
          <p style="color:green;">Diskon: ${formatRupiah(discountAmount)}</p>
        `;
        discountTotal += discountAmount;
        return;
      }

      // === BUY X GET Y ===
      let qtyDibayar = qty;
      let bonusQty = 0;
      if (item.discount_type === 'buyxgety' && item.buy_qty && item.free_qty) {
        const x = Number(item.buy_qty);
        const y = Number(item.free_qty);
        const groupQty = x + y;
        const paidQty = Math.floor(qty / groupQty) * x + (qty % groupQty);
        bonusQty = qty - paidQty;
        qtyDibayar = paidQty;
      }

      // === DISKON PERSENTASE/NOMINAL ===
      if (item.discount_type === 'percentage' && item.discount_value > 0) {
        discountAmount = harga * qty * (item.discount_value / 100);
      } else if (item.discount_type === 'nominal' && item.discount_value > 0) {
        discountAmount = Math.min(item.discount_value, harga * qty);
      }
      discountTotal += discountAmount;

      let diskonText = '';
      if (discountAmount > 0) {
        diskonText = `<p style="color:green;">Diskon: ${formatRupiah(discountAmount)}</p>`;
      }

      itemDiv.innerHTML += `
        <p>${item.name || '-'}</p>
        <p>${formatRupiah(harga)} x ${qtyDibayar}</p>
        <p class="sku">SKU: ${item.sku || '-'}</p>
        ${bonusQty > 0 ? `<p style="color:#10b981;">Bonus: ${bonusQty}</p>` : ''}
        ${diskonText}
      `;
    });

    // Diskon transaksi level
    if (trx.jenis_diskon && trx.nilai_diskon > 0) {
      if (trx.jenis_diskon === 'percentage') {
        discountTotal += grossSubtotal * (trx.nilai_diskon / 100);
      } else if (trx.jenis_diskon === 'nominal') {
        discountTotal += Number(trx.nilai_diskon);
      }
    }

    // PPN dari (subtotal - diskon)
    const taxPercentage = Number(trx.tax_percentage || 10);
    const dasarPajak = grossSubtotal - discountTotal;
    const tax = dasarPajak * (taxPercentage / 100);
    const grandTotal = dasarPajak + tax;

    // RENDER KE UI
    const hargaDivs = document.querySelectorAll('.wrap-info-harga');
    
    if (hargaDivs[0]) hargaDivs[0].querySelector('h4:nth-child(2)').textContent = formatRupiah(grossSubtotal);
    if (hargaDivs[1]) hargaDivs[1].querySelector('h4:nth-child(2)').textContent = formatRupiah(discountTotal);
    if (hargaDivs[2]) {
      hargaDivs[2].querySelector('h4.label').textContent = `PPN (${taxPercentage.toFixed(1)}%)`;
      hargaDivs[2].querySelector('h4:nth-child(2)').textContent = formatRupiah(tax);
    }
    if (hargaDivs[3]) hargaDivs[3].querySelector('h4:nth-child(2)').textContent = formatRupiah(grandTotal);

    // Tunai diterima & kembalian
    const tunaiDivs = document.querySelectorAll('.wrap-tunai .wrap-info-harga');
    const received = Number(trx.received || trx.received_amount || 0);
    const change = Math.max(0, received - grandTotal);

    if (tunaiDivs[0]) tunaiDivs[0].querySelector('h4:nth-child(2)').textContent = formatRupiah(received);
    if (tunaiDivs[1]) tunaiDivs[1].querySelector('h4:nth-child(2)').textContent = formatRupiah(change);

    // Simpan ulang hasil hitung yang benar
    trx._grossSubtotal = grossSubtotal;
    trx._discountTotal = discountTotal;
    trx._tax = tax;
    trx._grandTotal = grandTotal;
    trx.tax_percentage = taxPercentage;
    localStorage.setItem('last_transaction', JSON.stringify(trx));

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

  // Nomor transaksi
  document.querySelectorAll('.jenis-pembayaran-transaksi')[0].querySelector('p').textContent =
    trx.idFull || trx.idShort || trx.id || '-';

  // Tanggal & waktu
  document.querySelectorAll('.jenis-pembayaran-transaksi')[1].querySelector('p').textContent =
    trx.createdAt ? formatDateToTZ(trx.createdAt) : '-';

  // Metode pembayaran
  document.querySelectorAll('.jenis-pembayaran-transaksi')[2].querySelector('p').textContent =
    trx.method || trx.payment_method || '-';

  // Item pembelian & hitung ulang dari scratch
  const itemDiv = document.querySelector('.item-pembelian-transaksi');
  itemDiv.innerHTML = `<h4>Item pembelian</h4>`;
  
  let grossSubtotal = 0;
  let discountTotal = 0;

  (trx.items || []).forEach(item => {
    const harga = Number(item.price || 0);
    const qty = Number(item.quantity || item.qty || 0);
    
    // SUBTOTAL HANYA harga x qty
    grossSubtotal += harga * qty;

    let discountAmount = Number(item.discount_amount || 0);

    // === DISKON BUNDLE ===
    if (item.discount_type === 'bundle' && item.diskon_bundle_min_qty && item.diskon_bundle_value) {
      const minQty = Number(item.diskon_bundle_min_qty);
      const bundlePrice = Number(item.diskon_bundle_value);
      const bundleCount = Math.floor(qty / minQty);
      const sisa = qty % minQty;
      const totalBundle = bundleCount * bundlePrice + sisa * harga;
      const normalTotal = qty * harga;
      discountAmount = normalTotal - totalBundle;

      itemDiv.innerHTML += `
        <p>${item.name || '-'}</p>
        <p>${formatRupiah(harga)} x ${qty}</p>
        <p class="sku">SKU: ${item.sku || '-'}</p>
        <p style="color:#10b981;">Bundle: ${minQty} = ${formatRupiah(bundlePrice)}</p>
        <p style="color:green;">Diskon: ${formatRupiah(discountAmount)}</p>
      `;
      discountTotal += discountAmount;
      return;
    }

    // === BUY X GET Y ===
    let qtyDibayar = qty;
    let bonusQty = 0;
    if (item.discount_type === 'buyxgety' && item.buy_qty && item.free_qty) {
      const x = Number(item.buy_qty);
      const y = Number(item.free_qty);
      const groupQty = x + y;
      const paidQty = Math.floor(qty / groupQty) * x + (qty % groupQty);
      bonusQty = qty - paidQty;
      qtyDibayar = paidQty;
    }

    // === DISKON PERSENTASE/NOMINAL ===
    if (item.discount_type === 'percentage' && item.discount_value > 0) {
      discountAmount = harga * qty * (item.discount_value / 100);
    } else if (item.discount_type === 'nominal' && item.discount_value > 0) {
      discountAmount = Math.min(item.discount_value, harga * qty);
    }
    discountTotal += discountAmount;

    let diskonText = '';
    if (discountAmount > 0) {
      diskonText = `<p style="color:green;">Diskon: ${formatRupiah(discountAmount)}</p>`;
    }

    itemDiv.innerHTML += `
      <p>${item.name || '-'}</p>
      <p>${formatRupiah(harga)} x ${qtyDibayar}</p>
      <p class="sku">SKU: ${item.sku || '-'}</p>
      ${bonusQty > 0 ? `<p style="color:#10b981;">Bonus: ${bonusQty}</p>` : ''}
      ${diskonText}
    `;
  });

  // Diskon transaksi level
  if (trx.jenis_diskon && trx.nilai_diskon > 0) {
    if (trx.jenis_diskon === 'percentage') {
      discountTotal += grossSubtotal * (trx.nilai_diskon / 100);
    } else if (trx.jenis_diskon === 'nominal') {
      discountTotal += Number(trx.nilai_diskon);
    }
  }

  // PPN dari (subtotal - diskon)
  const dasarPajak = grossSubtotal - discountTotal;
  const tax = dasarPajak * (taxPercentage / 100);
  const grandTotal = dasarPajak + tax;

  // RENDER KE UI
  const hargaDivs = document.querySelectorAll('.wrap-info-harga');
  
  if (hargaDivs[0]) hargaDivs[0].querySelector('h4:nth-child(2)').textContent = formatRupiah(grossSubtotal);
  if (hargaDivs[1]) hargaDivs[1].querySelector('h4:nth-child(2)').textContent = formatRupiah(discountTotal);
  if (hargaDivs[2]) {
    hargaDivs[2].querySelector('h4.label').textContent = `PPN (${taxPercentage.toFixed(1)}%)`;
    hargaDivs[2].querySelector('h4:nth-child(2)').textContent = formatRupiah(tax);
  }
  if (hargaDivs[3]) hargaDivs[3].querySelector('h4:nth-child(2)').textContent = formatRupiah(grandTotal);

  // Tunai diterima & kembalian
  const tunaiDivs = document.querySelectorAll('.wrap-tunai .wrap-info-harga');
  const received = Number(trx.received_amount || trx.received || 0);
  const change = Math.max(0, received - grandTotal);

  if (tunaiDivs[0]) tunaiDivs[0].querySelector('h4:nth-child(2)').textContent = formatRupiah(received);
  if (tunaiDivs[1]) tunaiDivs[1].querySelector('h4:nth-child(2)').textContent = formatRupiah(change);

  // Simpan untuk print
  const trxToSave = {
    ...trx,
    _grossSubtotal: grossSubtotal,
    _discountTotal: discountTotal,
    _tax: tax,
    _grandTotal: grandTotal,
    tax_percentage: taxPercentage
  };
  localStorage.setItem('last_transaction', JSON.stringify(trxToSave));

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

    // fallback store data
    let storeData = await fetchStoreData().catch(() => null);
    if (!storeData) {
      try { storeData = JSON.parse(localStorage.getItem('store_data') || localStorage.getItem('store') || '{}'); } catch (e) { storeData = {}; }
    }

    // normalize/calculations
    const items = (trx.items || []).map(it => {
      const price = Number(it.price || it.lineTotal || 0);
      const qty = Number(it.quantity || it.qty || it.qty || 0) || 0;
      const discount_amount = Number(it.discount_amount || it._discountAmount || 0);
      return {
        name: it.name || '-',
        sku: it.sku || '',
        qty,
        price,
        discount_amount,
        lineTotal: Number(it.lineTotal || price * qty || 0)
      };
    });

    const subTotal = Number(trx._grossSubtotal ?? trx.subtotal ?? trx.total ?? items.reduce((s,i) => s + (i.price * i.qty), 0) );
    const discount = Number(trx._discountTotal ?? trx.discount_total ?? items.reduce((s,i) => s + (i.discount_amount || 0), 0));
    const tax = Number(trx._tax ?? trx.tax ?? 0);
    const taxPercent = Number(trx.tax_percentage ?? storeData?.tax_percentage ?? 10);
    const grandTotal = Number(trx._grandTotal ?? trx.grand_total ?? (subTotal - discount + tax));
    const cash = Number(trx.received ?? trx.received_amount ?? 0);
    const change = Number(trx.change ?? trx.change_amount ?? Math.max(0, cash - grandTotal));

    // Ensure trx has normalized fields (persist for future)
    trx._grossSubtotal = subTotal;
    trx._discountTotal = discount;
    trx._tax = tax;
    trx._grandTotal = grandTotal;
    trx.received = cash;
    trx.change = change;
    localStorage.setItem('last_transaction', JSON.stringify(trx));

    // Generate receiptText (preview exact)
    const receiptText = generateReceiptTemplate(storeData || {}, trx);

    // Build payload with BOTH receiptText and structured fields
    const payload = {
      receiptText,
      printType,
      bluetoothAddress,
      printerName: undefined,

      // Structured fallback data (main.js uses these if needed)
      txId: trx.idFull || trx.idShort || trx.transaction_id || trx.id || '-',
      txDate: trx.createdAt ? formatDateToTZ(trx.createdAt) : (trx.created_at ? formatDateToTZ(trx.created_at) : formatDateToTZ(new Date())),
      method: trx.method || trx.payment_method || 'cash',
      items,
      subTotal,
      discount,
      tax,
      taxPercent,
      grandTotal,
      cash,
      change,
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