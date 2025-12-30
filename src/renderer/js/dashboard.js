document.addEventListener('DOMContentLoaded', async () => {
  const token = localStorage.getItem('token');
  if (!token) {
    window.location.href = 'login.html';
    return;
  }

  // --- Render nama toko/bisnis di header dashboard ---
  try {
    const role = (localStorage.getItem('role') || '').toLowerCase();
    const storeId = localStorage.getItem('store_id');
    const headerEl = document.getElementById('headerStoreName');
    if (headerEl) {
      if (role === 'owner') {
        // Owner: tampilkan nama bisnis dari profile
        const profile = await window.apiRequest('/auth/profile');
        const user = profile.user || {};
        headerEl.textContent = user.business_name || 'APLIKASI PIPOS';
      } else if ((role === 'admin' || role === 'cashier') && storeId) {
        // Admin/kasir: tampilkan nama toko dari endpoint store
        const store = await window.fetchStoreForUser();
        headerEl.textContent = (store && store.name) ? store.name : 'APLIKASI PIPOS';
      } else {
        headerEl.textContent = 'APLIKASI PIPOS';
      }
    }
  } catch (err) {
    const headerEl = document.getElementById('headerStoreName');
    if (headerEl) headerEl.textContent = 'APLIKASI PIPOS';
  }

  // --- Render data subscription ---
  try {
    const subRes = await window.apiRequest('/subscription');
    const sub = subRes.data || {};
    const plan = sub.plan || '-';
    const endDate = sub.end_date || null;
    const status = sub.status || '-';

    const formattedEndDate = endDate ? formatTanggal(endDate) : '-';
    const remainingDays = endDate ? hitungSisaHari(endDate) : '-';

    const planEl = document.querySelector('.info-langganan-subjudul');
    const endEl = document.querySelectorAll('.info-langganan-subjudul')[1];
    const sisaEl = document.querySelector('.info-langganan-subjudul-hijau');
    const statusEl = document.querySelector('.status-langganan p');

    if (planEl) planEl.textContent = plan;
    if (endEl) endEl.textContent = formattedEndDate;
    if (sisaEl) sisaEl.textContent = remainingDays;
    if (statusEl) statusEl.textContent = status === 'active' ? 'Aktif' : 'Tidak Aktif';
  } catch (err) {
    const planEl = document.querySelector('.info-langganan-subjudul');
    if (planEl) planEl.textContent = 'Gagal memuat data';
  }

  renderDashboardStats();
});

// --- Fungsi render statistik dashboard ---
async function renderDashboardStats() {
  let storeId = localStorage.getItem('store_id');
  if (!storeId) {
    // Jika owner, minta pilih toko dulu
    if (typeof window.apiRequest === 'function') {
      try {
        const profile = await window.apiRequest('/auth/profile');
        if (profile.user && profile.user.role === 'owner') {
          if (window.fetchStoresForOwner && window.showStoreSelector) {
            const stores = await window.fetchStoresForOwner();
            window.showStoreSelector(stores);
          }
        }
      } catch (err) {}
    }
    return;
  }

  const totalProdukEl = document.getElementById('total-produk');
  const stokMenipisEl = document.getElementById('stok-menipis');
  const kategoriCountEl = document.getElementById('total-kategori');

  try {
    const res = await window.apiRequest(`/stores/${storeId}/products/stats`);
    const stats = res?.data || {};

    if (totalProdukEl) totalProdukEl.textContent = stats.total_products ?? '-';
    if (stokMenipisEl) stokMenipisEl.textContent = stats.stock_status?.low_stock ?? '-';

    if (kategoriCountEl) {
      if (typeof stats.total_categories !== 'undefined') {
        kategoriCountEl.textContent = stats.total_categories;
      } else if (Array.isArray(stats.recent_products)) {
        const categories = new Set(stats.recent_products.map(p => p.category).filter(Boolean));
        kategoriCountEl.textContent = categories.size || '-';
      } else {
        kategoriCountEl.textContent = '-';
      }
    }
  } catch (err) {
    if (totalProdukEl) totalProdukEl.textContent = '!';
    if (stokMenipisEl) stokMenipisEl.textContent = '!';
    if (kategoriCountEl) kategoriCountEl.textContent = '!';
  }
}

// --- Helper ---
function formatTanggal(tgl) {
  if (!tgl) return '-';
  const bulan = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  const d = new Date(tgl);
  return `${d.getDate()} ${bulan[d.getMonth()]} ${d.getFullYear()}`;
}

function hitungSisaHari(tgl) {
  if (!tgl) return '-';
  const now = new Date();
  const end = new Date(tgl);
  const diff = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
  return diff > 0 ? `${diff} Hari Lagi` : 'Expired';
}

// --- Modal pilih toko untuk owner ---
window.fetchStoresForOwner = async function() {
  try {
    const res = await window.apiRequest('/stores');
    if (Array.isArray(res)) return res;
    if (Array.isArray(res.data)) return res.data;
    if (res?.data?.stores && Array.isArray(res.data.stores)) return res.data.stores;
    if (res?.stores && Array.isArray(res.stores)) return res.stores;
    if (res?.data?.items && Array.isArray(res.data.items)) return res.data.items;
    return [];
  } catch (err) {
    return [];
  }
};

window.showStoreSelector = function(stores) {
  const modal = document.getElementById('store-selector-modal');
  const list = document.getElementById('store-list');
  if (!modal || !list) return;
  list.innerHTML = '';
  if (stores.length === 0) {
    list.innerHTML = '<p style="color:var(--foreground-color)">Tidak ada toko. Tekan Refresh.</p>';
  } else {
    stores.forEach(s => {
      const el = document.createElement('div');
      el.style.padding = '8px';
      el.style.marginBottom = '6px';
      el.style.background = 'var(--card-color)';
      el.style.borderRadius = '6px';
      el.style.cursor = 'pointer';
      el.style.color = 'var(--foreground-color)';
      el.textContent = `${s.name || s.storeName || s.title || 'Toko'}${s.id ? ' — ID: ' + s.id : ''}`;
      el.dataset.storeId = s.id;
      el.addEventListener('click', () => {
        localStorage.setItem('store_id', String(s.id));
        modal.style.display = 'none';
        window.location.reload();
      });
      list.appendChild(el);
    });
  }
  modal.style.display = 'flex';
  document.getElementById('store-refresh').onclick = async () => {
    const newStores = await window.fetchStoresForOwner();
    window.showStoreSelector(newStores);
  };
  document.getElementById('store-cancel').onclick = () => {
    modal.style.display = 'none';
  };
};