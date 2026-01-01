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
  let receipt = '';
  
  // Header: Nama Toko
  receipt += `${'='.repeat(42)}\n`;
  receipt += `${(storeData?.name || 'TOKO SAYA').toUpperCase().padStart(21 + (storeData?.name || 'TOKO SAYA').length / 2)}\n`;
  
  // Informasi toko
  if (storeData?.address) {
    const addr = storeData.address;
    receipt += `${addr.substring(0, 42)}\n`;
  }
  if (storeData?.phone) {
    receipt += `Telp: ${storeData.phone}\n`;
  }
  receipt += `${'='.repeat(42)}\n\n`;
  
  // Nomor & Tanggal Transaksi
  receipt += `No. Trans : ${trx.idFull || trx.id || '-'}\n`;
  receipt += `Tgl/Jam  : ${trx.createdAt ? new Date(trx.createdAt).toLocaleString('id-ID') : '-'}\n`;
  receipt += `Metode   : ${trx.method || trx.payment_method || 'Tunai'}\n`;
  receipt += `${'='.repeat(42)}\n\n`;
  
  // Items dengan format: Nama Qty x Harga = Total
  receipt += `DAFTAR BARANG:\n`;
  receipt += `${'─'.repeat(42)}\n`;
  
  let totalDiskonItem = 0;
  (trx.items || []).forEach(item => {
    const harga = Number(item.price || 0);
    const qty = Number(item.quantity || item.qty || 0);
    const subtotal = harga * qty;
    const discount = Number(item.discount_amount || item._discountAmount || 0);
    totalDiskonItem += discount;
    
    // Nama item
    receipt += `${(item.name || '-').substring(0, 42)}\n`;
    
    // Qty, harga, subtotal
    const qtyPart = `${qty}x`;
    const hargaPart = formatRupiah(harga);
    const totalPart = formatRupiah(subtotal);
    receipt += `${qtyPart.padEnd(8)} ${hargaPart.padEnd(15)} ${totalPart}\n`;
    
    // SKU
    if (item.sku) {
      receipt += `SKU: ${item.sku}\n`;
    }
    
    // Diskon item jika ada
    if (discount > 0) {
      receipt += `  Diskon: -${formatRupiah(discount)}\n`;
    }
    
    receipt += `\n`;
  });
  
  receipt += `${'='.repeat(42)}\n`;
  
  // Totals
  const subtotal = Number(trx._grossSubtotal || trx.total || 0);
  const totalDiskon = Number(trx._discountTotal || trx.discount_total || totalDiskonItem);
  const tax = Number(trx._tax || trx.tax || 0);
  const taxPercent = Number(trx.tax_percentage || (subtotal ? (tax / subtotal * 100) : 10));
  const grandTotal = Number(trx._grandTotal || trx.grand_total || (subtotal - totalDiskon + tax));
  
  receipt += `Sub Total      : ${formatRupiah(subtotal).padStart(25)}\n`;
  receipt += `Total Diskon   : -${formatRupiah(totalDiskon).padStart(24)}\n`;
  receipt += `PPN (${taxPercent.toFixed(1)}%)       : ${formatRupiah(tax).padStart(25)}\n`;
  receipt += `${'─'.repeat(42)}\n`;
  receipt += `GRAND TOTAL    : ${formatRupiah(grandTotal).padStart(25)}\n`;
  receipt += `${'='.repeat(42)}\n\n`;
  
  // Pembayaran
  receipt += `Tunai Diterima : ${formatRupiah(trx.received || trx.received_amount || 0).padStart(25)}\n`;
  receipt += `Kembalian      : ${formatRupiah(trx.change || trx.change_amount || 0).padStart(25)}\n\n`;
  
  // Footer: Receipt Template dari database
  if (storeData?.receipt_template) {
    receipt += `${'='.repeat(42)}\n`;
    receipt += `${storeData.receipt_template}\n`;
    receipt += `${'='.repeat(42)}\n`;
  } else {
    receipt += `Terima Kasih\n`;
    receipt += `Selamat Datang Kembali\n`;
  }
  
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

function renderDetailTransaksi() {
  const selectedTxId = localStorage.getItem('selected_transaction_id');
  
  if (!selectedTxId) {
    console.error('Transaction ID tidak ditemukan di localStorage');
    return;
  }

  // Fetch transaction dari API by ID
  fetchTransactionById(selectedTxId).then(trx => {
    if (!trx || !trx.items) {
      console.error('Transaction data tidak ditemukan');
      return;
    }

    // Simpan ke localStorage untuk digunakan di print
    localStorage.setItem('last_transaction', JSON.stringify(trx));

    // Nomor transaksi
    document.querySelectorAll('.jenis-pembayaran-transaksi')[0].querySelector('p').textContent =
      trx.idFull || trx.idShort || trx.id || '-';

    // Tanggal & waktu
    document.querySelectorAll('.jenis-pembayaran-transaksi')[1].querySelector('p').textContent =
      trx.createdAt ? new Date(trx.createdAt).toLocaleString('id-ID') : '-';

    // Metode pembayaran
    document.querySelectorAll('.jenis-pembayaran-transaksi')[2].querySelector('p').textContent =
      trx.method || trx.payment_method || '-';

    // Item pembelian & hitung total diskon
    const itemDiv = document.querySelector('.item-pembelian-transaksi');
    itemDiv.innerHTML = `<h4>Item pembelian</h4>`;
    let totalDiskonItem = 0;
    trx.items.forEach(item => {
      const harga = Number(item.price || 0);
      const qty = Number(item.quantity || item.qty || 0);
      let discountAmount = Number(item.discount_amount || item._discountAmount || 0);
      totalDiskonItem += discountAmount;

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

    // Harga transaksi
    const hargaDivs = document.querySelectorAll('.wrap-info-harga');

    const subtotal = Number(trx._grossSubtotal || trx.total || 0);
    const totalDiskon = Number(trx._discountTotal || trx.discount_total || totalDiskonItem);
    const tax = Number(trx._tax || trx.tax || 0);
    const taxPercent = Number(trx.tax_percentage || (subtotal ? (tax / subtotal * 100) : 10));
    const grandTotal = Number(trx._grandTotal || trx.grand_total || (subtotal - totalDiskon + tax));

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
  });
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
document.getElementById('btn-selesai' && 'btn-back-kasir').onclick = function() {
  localStorage.removeItem('pos_cart');
  localStorage.removeItem('pending_transaction');
  localStorage.setItem('current_page', 'kasir');
  window.location.href = 'index.html';
};