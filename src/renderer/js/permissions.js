/**
 * Simple permission helpers and auto-hide for elements.
 * Usage:
 *  - add data-permissions="owner,admin" on elements that only should show for those roles
 *  - call window.ensureOwnerHasStore() on app init to require store selection for owners
 */
(function () {
  function getRole() {
    return (localStorage.getItem('role') || '').toLowerCase();
  }
  function getStoreId() {
    return localStorage.getItem('store_id') || null;
  }

  function applyElementPermissions() {
    const role = getRole();
    document.querySelectorAll('[data-permissions]').forEach(el => {
      const allowed = (el.dataset.permissions || '').split(',').map(s=>s.trim().toLowerCase()).filter(Boolean);
      if (allowed.length && !allowed.includes(role)) el.style.display = 'none';
    });
  }

  // Hide sidebar items by data-page mapping
  function applySidebarPermissions() {
    const role = getRole();
    // Cashier bisa akses: dashboard, kasir, produk, transaksi, pengaturan
    const allowedForCashier = ['dashboard','kasir','produk','transaksi','pengaturan'];
    // Owner bisa akses: dashboard, produk, transaksi, karyawan, laporan, pengaturan, aktivitas (TIDAK KASIR)
    const allowedForOwner = ['dashboard','produk','transaksi','karyawan','laporan','pengaturan','aktivitas'];
    
    document.querySelectorAll('.sidebar-item[data-page]').forEach(a => {
      const page = (a.dataset.page || '').toLowerCase();
      
      if (role === 'cashier') {
        // Cashier hanya bisa akses yang ada di allowedForCashier
        if (!allowedForCashier.includes(page)) {
          a.style.display = 'none';
        } else {
          a.style.display = '';
        }
      } else if (role === 'owner') {
        // Owner hanya bisa akses yang ada di allowedForOwner
        if (!allowedForOwner.includes(page)) {
          a.style.display = 'none';
        } else {
          a.style.display = '';
        }
      } else {
        // Admin bisa akses semua
        a.style.display = '';
      }
    });
  }

  // If owner and no store selected, force selection prompt
  async function ensureOwnerHasStore() {
    const role = getRole();
    if (role !== 'owner') return;
    if (getStoreId()) return;
    // try to get stores from backend
    try {
      let stores = [];
      if (window.apiRequest && typeof window.apiRequest === 'function') {
        const r = await window.apiRequest('/stores');
        if (r && Array.isArray(r.data)) stores = r.data;
      }
      // if stores available, prompt selection
      if (stores.length) {
        const names = stores.map(s=>`${s.id}: ${s.name}`).join('\n');
        const pick = prompt('Anda owner. Pilih store id:\n' + names + '\nMasukkan ID store:');
        if (pick) localStorage.setItem('store_id', String(pick));
      } else {
        const pick = prompt('Anda owner tapi belum memilih store. Masukkan store_id secara manual (atau buat toko dulu):');
        if (pick) localStorage.setItem('store_id', String(pick));
      }
    } catch (e) {
      const pick = prompt('Anda owner tapi belum memilih store. Masukkan store_id secara manual (atau buat toko dulu):');
      if (pick) localStorage.setItem('store_id', String(pick));
    }
  }

  // Expose helpers globally
  window.permission = {
    getRole,
    getStoreId,
    applyElementPermissions,
    applySidebarPermissions,
    ensureOwnerHasStore,
    isOwner: () => getRole() === 'owner',
    isAdmin: () => getRole() === 'admin',
    isCashier: () => getRole() === 'cashier'
  };

  document.addEventListener('DOMContentLoaded', () => {
    applyElementPermissions();
    applySidebarPermissions();
    // Hanya owner yang perlu pilih store
    if (window.permission.isOwner()) {
      setTimeout(() => { window.permission.ensureOwnerHasStore(); }, 100);
    }
  });
})();