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

// Print receipt functionality
function printReceipt() {
  window.print();
}

// Initialize print button
function initPrintButton() {
  const printBtn = document.querySelector('.btn-print-transaksi') || document.querySelector('button[onclick*="print"]');
  if (printBtn) {
    printBtn.addEventListener('click', printReceipt);
  } else {
    // Add print button if not exists
    const container = document.querySelector('.container-detail-transaksi') || document.body;
    const printButton = document.createElement('button');
    printButton.className = 'btn-print-transaksi';
    printButton.textContent = 'Print Struk';
    printButton.style.cssText = 'padding: 10px 20px; background: #10b981; color: white; border: none; border-radius: 5px; cursor: pointer; margin: 20px 0;';
    printButton.addEventListener('click', printReceipt);
    container.appendChild(printButton);
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
  initPrintButton();
});
