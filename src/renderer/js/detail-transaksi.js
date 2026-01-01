function formatRupiah(num) {
  return "Rp. " + Number(num || 0).toLocaleString('id-ID');
}

function renderDetailTransaksi() {
  const trx = JSON.parse(localStorage.getItem('last_transaction') || '{}');
  if (!trx || !trx.items) return;

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
  let totalDiskonItem = 0; // ganti nama agar tidak bentrok
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
// detail-transaksi.js
document.getElementById('btn-selesai' && 'btn-back-kasir').onclick = function() {
  localStorage.removeItem('pos_cart');
  localStorage.removeItem('pending_transaction');
  localStorage.setItem('current_page', 'kasir');
  window.location.href = 'index.html';
};