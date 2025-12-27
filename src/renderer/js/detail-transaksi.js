function renderDetailTransaksi() {
  const trx = JSON.parse(localStorage.getItem('last_transaction') || '{}');
  if (!trx || !trx.items) return;

  // Tampilkan total, diskon, grand_total dari trx (response backend)
  document.getElementById('total').textContent = `Rp ${Number(trx.total || 0).toLocaleString('id-ID')}`;
  document.getElementById('grand_total').textContent = `Rp ${Number(trx.grand_total || trx.total || 0).toLocaleString('id-ID')}`;

  // Render nomor transaksi, tanggal, metode, dll
  document.querySelector('.jenis-pembayaran-transaksi h4 + p').textContent = trx.idFull || trx.idShort || '-';
  document.querySelectorAll('.jenis-pembayaran-transaksi')[1].querySelector('p').textContent =
    trx.createdAt ? new Date(trx.createdAt).toLocaleString('id-ID') : '-';
  document.querySelectorAll('.jenis-pembayaran-transaksi')[2].querySelector('p').textContent = trx.method || '-';

  // Render item pembelian
  const itemDiv = document.querySelector('.item-pembelian-transaksi');
  itemDiv.innerHTML = `<h4>Item pembelian</h4>`;
  trx.items.forEach(item => {
    itemDiv.innerHTML += `
      <p>${item.name}</p>
      <p>Rp. ${Number(item.price).toLocaleString('id-ID')} x ${item.qty}</p>
      <p style="color: var(--paragraph-color); font-size: 14px;">SKU: ${item.sku}</p>
      ${item.lineTotal && item.lineTotal < item.price * item.qty ? `<p style="color:green;">Diskon: Rp. ${(item.price * item.qty - item.lineTotal).toLocaleString('id-ID')}</p>` : ''}
    `;
  });

  // Render harga transaksi
  const hargaDivs = document.querySelectorAll('.wrap-info-harga');
  if (hargaDivs[0]) hargaDivs[0].querySelector('h4:nth-child(2)').textContent = `Rp. ${Number(trx.total).toLocaleString('id-ID')}`;
  if (hargaDivs[1]) hargaDivs[1].querySelector('h4:nth-child(2)').textContent = `-Rp. ${Number(trx.total - trx.grand_total).toLocaleString('id-ID')}`;
  if (hargaDivs[2]) hargaDivs[2].querySelector('h4:nth-child(2)').textContent = `Rp. ${Number(trx.tax).toLocaleString('id-ID')}`;
  if (hargaDivs[3]) hargaDivs[3].querySelector('h4:nth-child(2)').textContent = `Rp. ${Number(trx.grand_total).toLocaleString('id-ID')}`;

  // Tunai diterima & kembalian
  const tunaiDivs = document.querySelectorAll('.wrap-tunai .wrap-info-harga');
  if (tunaiDivs[0]) tunaiDivs[0].querySelector('h4:nth-child(2)').textContent = `Rp. ${Number(trx.received).toLocaleString('id-ID')}`;
  if (tunaiDivs[1]) tunaiDivs[1].querySelector('h4:nth-child(2)').textContent = `Rp. ${Number(trx.change).toLocaleString('id-ID')}`;
}

document.addEventListener('DOMContentLoaded', renderDetailTransaksi);