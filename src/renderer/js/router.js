// ==============================
// SIMPLE SPA ROUTER FOR ELECTRON
// ==============================

const routes = {
  dashboard: '../pages/dashboard.html',
  kasir: '../pages/kasir.html',
  produk: '../pages/produk.html',
  transaksi: '../pages/transaksi.html',
  karyawan: '../pages/karyawan.html',
  laporan: '../pages/laporan.html',
  pengaturan: '../pages/pengaturan.html',
  login: '../pages/login.html'
};

const content = document.getElementById('app-content');
const sidebarItems = document.querySelectorAll('.sidebar-item');

/**
 * Load halaman ke dalam content
 */
function loadPage(page) {
  const path = routes[page];

  if (!path) {
    content.innerHTML = `<h2>404 - Halaman tidak ditemukan</h2>`;
    return;
  }

  fetch(path)
    .then(res => {
      if (!res.ok) throw new Error('Gagal memuat halaman');
      return res.text();
    })
    .then(html => {
      content.innerHTML = html;
      setActiveMenu(page);
      saveLastPage(page);
    })
    .catch(err => {
      content.innerHTML = `<h2>Error loading page</h2>`;
      console.error(err);
    });
}

/**
 * Set sidebar aktif
 */
function setActiveMenu(page) {
  sidebarItems.forEach(item => {
    item.classList.toggle(
      'active',
      item.dataset.page === page
    );
  });
}

/**
 * Simpan halaman terakhir
 */
function saveLastPage(page) {
  localStorage.setItem('activePage', page);
}

/**
 * Ambil halaman terakhir
 */
function getLastPage() {
  return localStorage.getItem('activePage') || 'dashboard';
}

/**
 * Event klik sidebar
 */
sidebarItems.forEach(item => {
  item.addEventListener('click', e => {
    e.preventDefault();

    const page = item.dataset.page;

    // khusus logout
    if (page === 'login') {
      localStorage.clear();
      loadPage('login');
      return;
    }

    loadPage(page);
  });
});

// ==============================
// INIT APP
// ==============================
document.addEventListener('DOMContentLoaded', () => {
  const lastPage = getLastPage();
  loadPage(lastPage);
});
