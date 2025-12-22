document.addEventListener('DOMContentLoaded', async () => {
  const token = localStorage.getItem('token');
  if (!token) {
    window.location.href = 'login.html';
    return;
  }

  try {
    const profile = await window.apiRequest('/auth/profile');
    const user = profile.user || {};
    // ensure localStorage synced
    if (user.role) localStorage.setItem('role', String(user.role));
    if (user.id) localStorage.setItem('user_id', String(user.id));
    if (user.owner_id) localStorage.setItem('owner_id', String(user.owner_id));
    if (user.store_id) localStorage.setItem('store_id', String(user.store_id));
    // render owner info if available
    const ownerId = user.owner_id || user.id;
    if (ownerId) {
      try {
        const ownerRes = await window.apiRequest(`/owners/${ownerId}`);
        const ownerData = ownerRes.data || {};
        const usernameEl = document.querySelector('.username');
        const emailEl = document.querySelector('.email');
        if (usernameEl) usernameEl.textContent = ownerData.business_name || ownerData.name || '-';
        if (emailEl) emailEl.textContent = ownerData.email || '-';
      } catch (e) {
        // ignore owner details error
      }
    }
  } catch (err) {
    console.error('Gagal memuat profil sidebar:', err);
  }

  // logout binding (cari beberapa selector)
  const logoutSelectors = ['.sidebar-item.logout', '#logout-btn', 'a[href="#logout"]'];
  logoutSelectors.forEach(sel => {
    document.querySelectorAll(sel).forEach(el => {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        if (window.logout) window.logout();
        else {
          localStorage.clear();
          window.location.href = 'login.html';
        }
      });
    });
  });
});

// role-based sidebar visibility (kept separate so it runs even if profile fetch fails)
document.addEventListener('DOMContentLoaded', () => {
  const role = (localStorage.getItem('role') || '').toLowerCase();
  const mapping = {
    owner: null,
    admin: null,
    cashier: ['dashboard', 'kasir', 'produk', 'transaksi']
  };
  const allowed = mapping[role];
  document.querySelectorAll('.sidebar-item[data-page]').forEach(a => {
    const page = (a.dataset.page || '').toLowerCase();
    if (Array.isArray(allowed) && !allowed.includes(page)) a.style.display = 'none';
    else a.style.display = '';
  });
  if (window.permission && typeof window.permission.applyElementPermissions === 'function') {
    window.permission.applyElementPermissions();
  }
});