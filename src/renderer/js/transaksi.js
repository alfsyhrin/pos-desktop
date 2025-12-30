// Fetch transactions from API
async function fetchTransactions({ search = '', page = 1, limit = 20 } = {}) {
  const storeId = localStorage.getItem('store_id');
  const token = localStorage.getItem('token');
  if (!storeId || !token) return [];

  // Build query string
  const params = [];
  if (search) params.push(`search=${encodeURIComponent(search)}`);
  params.push(`page=${page}`);
  params.push(`limit=${limit}`);
  const query = params.length ? `?${params.join('&')}` : '';

  try {
    const url = `http://103.126.116.119:8001/api/stores/${storeId}/transactions${query}`;
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      }
    });
    const data = await res.json();
    if (res.ok && data.success) {
      return data.data.items || [];
    } else {
      return [];
    }
  } catch (err) {
    return [];
  }
}

// Render transactions to the page
function renderTransactions(transactions) {
  const wrapper = document.querySelector('.card-transaksi-wrapper');
  if (!wrapper) return;

  wrapper.innerHTML = '';

  if (transactions.length === 0) {
    const card = document.createElement('div');
    card.className = 'card-transaksi';
    card.innerHTML = `
      <span class="material-symbols-outlined transaksi">receipt_long</span>
      <div class="info-transaksi">
        <div class="no-harga-wrapper">
          <p class="no-transaksi">Belum ada transaksi</p>
          <p class="harga-transaksi-utama">-</p>
        </div>
        <p class="tanggal-transaksi">-</p>
        <div class="jenis-totalitem-wrapper">
          <p class="jenis-transaksi"><span class="material-symbols-outlined">local_atm</span>-</p>
          <p class="total-item-transaksi">-</p>
        </div>
      </div>
      <div class="button-hapus-transaksi">
        <button class="btn-hapus-transaksi" data-permissions="owner, admin" style="visibility: hidden;"><span class="material-symbols-outlined">delete</span></button>
      </div>
    `;
    wrapper.appendChild(card);
    return;
  }

  transactions.forEach(trx => {
    const card = document.createElement('div');
    card.className = 'card-transaksi';
    card.onclick = () => viewTransactionDetail(trx.transaction_id);

    const createdAt = trx.createdAt ? new Date(trx.createdAt).toLocaleString('id-ID') : '-';
    const total = Number(trx.total || 0);
    const method = trx.method || 'Tunai';
    const itemCount = trx.items ? trx.items.length : 0;
    const idShort = trx.idShort || trx.idFull || trx.transaction_id || '-';

    card.innerHTML = `
      <span class="material-symbols-outlined transaksi">receipt_long</span>
      <div class="info-transaksi">
        <div class="no-harga-wrapper">
          <p class="no-transaksi">#${idShort}</p>
          <p class="harga-transaksi-utama">Rp ${total.toLocaleString('id-ID')}</p>
        </div>
        <p class="tanggal-transaksi">${createdAt}</p>
        <div class="jenis-totalitem-wrapper">
          <p class="jenis-transaksi"><span class="material-symbols-outlined">local_atm</span>${method}</p>
          <p class="total-item-transaksi">${itemCount} item</p>
        </div>
      </div>
      <div class="button-hapus-transaksi">
        <button class="btn-hapus-transaksi" onclick="event.stopPropagation(); deleteTransaction('${trx.transaction_id}')">
          <span class="material-symbols-outlined">delete</span>
        </button>
      </div>
    `;

    wrapper.appendChild(card);
  });
}

// View transaction detail
function viewTransactionDetail(transactionId) {
  localStorage.setItem('selected_transaction_id', transactionId);
  window.location.href = 'detail-transaksi.html';
}

// Delete transaction
async function deleteTransaction(transactionId) {
  if (!transactionId) {
    alert('ID transaksi tidak valid!');
    return;
  }
  if (!confirm('Apakah Anda yakin ingin menghapus transaksi ini?')) return;

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
      loadTransactions(transaksiFilters);
    } else {
      alert('Gagal menghapus transaksi: ' + (data.message || 'Unknown error'));
    }
  } catch (err) {
    console.error('Error deleting transaction:', err);
    alert('Error menghapus transaksi');
  }
}

// Load and display transactions
async function loadTransactions(filters) {
  const transactions = await fetchTransactions(filters);
  renderTransactions(transactions);
}

// Event listener untuk search
document.addEventListener('DOMContentLoaded', () => {
  loadTransactions(transaksiFilters);

  const searchInput = document.getElementById('search-transaksi');
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      transaksiFilters.search = searchInput.value;
      transaksiFilters.page = 1;
      loadTransactions(transaksiFilters);
    });
  }
});

const transaksiFilters = {
  search: '',
  page: 1,
  limit: 20
};
