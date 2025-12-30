// ...new file...
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

  // Hide sidebar items by data-page mapping (fallback if sidebar script not handling role)
  function applySidebarPermissions() {
    const role = getRole();
    const allowedForCashier = ['dashboard','kasir','produk','transaksi']; // cashier limited
    document.querySelectorAll('.sidebar-item[data-page]').forEach(a => {
      const page = (a.dataset.page || '').toLowerCase();
      if (role === 'cashier') {
        if (!allowedForCashier.includes(page)) a.style.display = 'none';
      } else {
        a.style.display = ''; // owner/admin show default
      }
    });
  }

  // If owner and no store selected, force selection prompt (simple); replace with modal/store page if exists
  async function ensureOwnerHasStore() {
    const role = getRole();
    if (role !== 'owner') return;
    if (getStoreId()) return;
    // try to get stores from backend (if api helper available)
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