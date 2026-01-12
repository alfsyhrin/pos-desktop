async function initPendingTransaksi() {
  window.updateHeaderStoreName();
  loadTransactions(transaksiFilters);

  const searchInput = document.getElementById('search-transaksi');
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      transaksiFilters.search = searchInput.value;
      transaksiFilters.page = 1;
      loadTransactions(transaksiFilters);
    });
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initTransaksi);
} else {
  initPendingTransaksi();
}

window.initTransaksi = initTransaksi;

const transaksiFilters = {
  search: '',
  page: 1,
  limit: 20
};