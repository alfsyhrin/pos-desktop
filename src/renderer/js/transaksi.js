// Fetch transactions from API
async function fetchTransactions() {
  console.log('fetchTransactions called');
  const storeId = localStorage.getItem('store_id');
  const token = localStorage.getItem('token');
  console.log('storeId:', storeId, 'token:', token ? 'present' : 'missing');

  if (!storeId || !token) {
    console.error('Missing storeId or token');
    return [];
  }

  try {
    const url = `http://103.126.116.119:8001/api/stores/${storeId}/transactions`;
    console.log('Fetching from URL:', url);
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      }
    });
    console.log('Response status:', res.status);
    const data = await res.json();
    console.log('Response data:', data);
    if (res.ok && data.success) {
      return data.data || [];
    } else {
      console.error('Failed to fetch transactions:', data.message);
      return [];
    }
  } catch (err) {
    console.error('Error fetching transactions:', err);
    return [];
  }
}

// Render transactions to the page
function renderTransactions(transactions) {
  const wrapper = document.querySelector('.card-transaksi-wrapper');
  if (!wrapper) return;

  // Clear existing cards
  wrapper.innerHTML = '';

  // If no transactions, show empty state
  if (transactions.length === 0) {
    const card = document.createElement('div');
    card.className = 'card-transaksi';
    card.innerHTML = `
      <span class="material-symbols-outlined transaksi">receipt_long</span>
      <div class="info-transaksi">
        <div class="no-harga-wrapper">
          <p class="no-transaksi">Belum ada transaksi</p>
          <p class="harga-transaksi">-</p>
        </div>
        <p class="tanggal-transaksi">-</p>
        <div class="jenis-totalitem-wrapper">
          <p class="jenis-transaksi"><span class="material-symbols-outlined">local_atm</span>-</p>
          <p class="total-item-transaksi">-</p>
        </div>
      </div>
      <div class="button-hapus-transaksi">
        <button class="btn-hapus-transaksi" style="visibility: hidden;"><span class="material-symbols-outlined">delete</span></button>
      </div>
    `;
    wrapper.appendChild(card);
    return;
  }

  // Show latest transaction in the original card design
  const latestTrx = transactions[0]; // Show the most recent transaction
  const card = document.createElement('div');
  card.className = 'card-transaksi';
  card.onclick = () => viewTransactionDetail(latestTrx.id);

  const createdAt = latestTrx.createdAt ? new Date(latestTrx.createdAt).toLocaleString('id-ID') : '-';
  const total = Number(latestTrx.total || 0);
  const method = latestTrx.method || 'Tunai';
  const itemCount = latestTrx.items ? latestTrx.items.length : 0;
  const idShort = latestTrx.idShort || latestTrx.idFull || latestTrx.id || '-';

  card.innerHTML = `
    <span class="material-symbols-outlined transaksi">receipt_long</span>
    <div class="info-transaksi">
      <div class="no-harga-wrapper">
        <p class="no-transaksi">#${idShort}</p>
        <p class="harga-transaksi">Rp ${total.toLocaleString('id-ID')}</p>
      </div>
      <p class="tanggal-transaksi">${createdAt}</p>
      <div class="jenis-totalitem-wrapper">
        <p class="jenis-transaksi"><span class="material-symbols-outlined">local_atm</span>${method}</p>
        <p class="total-item-transaksi">${itemCount} item</p>
      </div>
    </div>
    <div class="button-hapus-transaksi">
      <button class="btn-hapus-transaksi" onclick="event.stopPropagation(); deleteTransaction(${latestTrx.id})">
        <span class="material-symbols-outlined">delete</span>
      </button>
    </div>
  `;

  wrapper.appendChild(card);
}

// View transaction detail
function viewTransactionDetail(transactionId) {
  // Store transaction ID and navigate to detail page
  localStorage.setItem('selected_transaction_id', transactionId);
  window.location.href = 'detail-transaksi.html';
}

// Delete transaction
async function deleteTransaction(transactionId) {
  if (!confirm('Apakah Anda yakin ingin menghapus transaksi ini?')) {
    return;
  }

  const storeId = localStorage.getItem('store_id');
  const token = localStorage.getItem('token');
  if (!storeId || !token) {
    alert('Authentication error');
    return;
  }

  try {
    const res = await fetch(`http://103.126.116.119:8001/api/stores/${storeId}/transactions/${transactionId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      }
    });
    const data = await res.json();
    if (res.ok && data.success) {
      alert('Transaksi berhasil dihapus');
      loadTransactions(); // Reload the list
    } else {
      alert('Gagal menghapus transaksi: ' + (data.message || 'Unknown error'));
    }
  } catch (err) {
    console.error('Error deleting transaction:', err);
    alert('Error menghapus transaksi');
  }
}

// Load and display transactions
async function loadTransactions() {
  console.log('loadTransactions called');
  const transactions = await fetchTransactions();
  console.log('Transactions fetched:', transactions.length);
  renderTransactions(transactions);
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
  console.log('Transaksi page loaded, initializing...');
  loadTransactions();
});
