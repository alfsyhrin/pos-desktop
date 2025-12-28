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
  let totalDiskon = 0;
  trx.items.forEach(item => {
    let qtyTotal = item.qty || item.quantity || 1; // total keluar (dibayar+bonus)
    let harga = Number(item.price || 0);

    // Untuk buyxgety, pisahkan qty dibayar dan bonus
    let qtyDibayar = qtyTotal;
    let bonusQty = 0;
    if (item.discount_type === 'buyxgety' && item.buy_qty && item.free_qty) {
      // qtyTotal = total keluar, hitung qty dibayar dan bonus
      const buy_qty = Number(item.buy_qty);
      const free_qty = Number(item.free_qty);
      // Rumus: bonusQty = Math.floor(qtyTotal / (buy_qty + free_qty)) * free_qty
      const promoUnit = buy_qty + free_qty;
      const promoTimes = Math.floor(qtyTotal / promoUnit);
      bonusQty = promoTimes * free_qty;
      qtyDibayar = qtyTotal - bonusQty;
    }

    // Diskon per item
    let diskonItem = bonusQty * harga;

    itemDiv.innerHTML += `
      <p>${item.name || '-'}</p>
      <p>${formatRupiah(harga)} x ${qtyDibayar}</p>
      <p class="sku">SKU: ${item.sku || '-'}</p>
      ${bonusQty > 0 ? `<p style="color:#10b981;">Bonus : ${bonusQty}</p>` : ''}
      ${diskonItem > 0 ? `<p style="color:green;">Diskon: ${formatRupiah(diskonItem)}</p>` : ''}
    `;
  });

  // Harga transaksi
  const hargaDivs = document.querySelectorAll('.wrap-info-harga');
  // Sub Total
  if (hargaDivs[0]) hargaDivs[0].querySelector('h4:nth-child(2)').textContent = formatRupiah(trx.total);

  // Total Diskon (dari hasil penjumlahan diskon semua item)
  if (hargaDivs[1]) hargaDivs[1].querySelector('h4:nth-child(2)').textContent = formatRupiah(totalDiskon);

  // Pajak & label persen
  let taxPercent = 10.0;
  if (trx.tax_percentage) {
    taxPercent = Number(trx.tax_percentage);
  } else if (trx.tax && trx.grand_total && trx.total) {
    // Estimasi dari data jika tax_percentage tidak ada
    let netSubtotal = (trx.total || 0) - totalDiskon;
    taxPercent = netSubtotal ? Math.round((trx.tax / netSubtotal) * 1000) / 10 : 10.0;
  }
  // Update label pajak
  if (hargaDivs[2]) {
    hargaDivs[2].querySelector('h4.label').textContent = `PPN (${taxPercent.toFixed(1)}%)`;
    hargaDivs[2].querySelector('h4:nth-child(2)').textContent = formatRupiah(trx.tax);
  }

  // Grand Total
  if (hargaDivs[3]) hargaDivs[3].querySelector('h4:nth-child(2)').textContent = formatRupiah(trx.grand_total);

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
document.getElementById('btn-selesai').onclick = function() {
  localStorage.removeItem('pos_cart');
  localStorage.removeItem('pending_transaction');
  localStorage.setItem('current_page', 'kasir');
  window.location.href = 'index.html';
};