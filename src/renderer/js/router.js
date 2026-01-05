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
  aktivitas: '../pages/log-aktivitas.html',
  login: '../pages/login.html',
  editProduk: '../pages/edit-produk.html'
};

const content = document.getElementById('app-content');
const sidebarItems = document.querySelectorAll('.sidebar-item');

/**
 * Load halaman ke dalam content
 */
function loadPage(page, params = {}) {
  const token = localStorage.getItem('token');
  if (!token && page !== 'login') {
    window.location.href = 'login.html';
    return;
  }

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

      // TAMBAH INI - panggil init function sesuai halaman
      if (page === 'dashboard' && window.initDashboard) {
        setTimeout(() => window.initDashboard(), 100);
      } else if (page === 'transaksi' && window.initTransaksi) {
        setTimeout(() => window.initTransaksi(), 100);
      } else if (page === 'pengaturan' && window.initPengaturan) {
        setTimeout(() => window.initPengaturan(), 100);
      } else if (page === 'produk' && window.initProduk) {
        setTimeout(() => window.renderProdukPage(), 100);
      } else if (page === 'editProduk' && params?.id) {
        sessionStorage.setItem('edit_product_id', params.id);
        setTimeout(() => window.initEditProdukPage?.(), 200);
      } else if (page === 'aktivitas' && window.renderActivityLogs) {
        setTimeout(() => window.renderActivityLogs(1), 100);
      } else if (page === 'laporan' && window.initLaporanPage) {
        setTimeout(() => window.initLaporanPage(), 100);
      }

      // Update header
      setTimeout(() => {
        window.updateHeaderStoreName();
      }, 200);
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

/**
 * Setup mutation observer untuk update header saat content berubah
 */
function setupMutationObserver() {
  const content = document.getElementById('app-content');
  
  const observer = new MutationObserver(() => {
    console.log('🔄 Content berubah, update header...');
    window.updateHeaderStoreName();
  });

  observer.observe(content, {
    childList: true,
    subtree: true
  });

  console.log('✅ Mutation observer aktif');
}

// ==============================
// INIT APP
// ==============================
document.addEventListener('DOMContentLoaded', () => {
  setupMutationObserver();
  const lastPage = getLastPage();
  loadPage(lastPage);
});

window.addEventListener('hashchange', () => {
  const page = location.hash.replace('#', '') || 'dashboard';
  loadPage(page);
});

window.loadPage = loadPage;
