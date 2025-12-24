document.addEventListener('DOMContentLoaded', async () => {
  const token = localStorage.getItem('token');
  if (!token) {
    window.location.href = 'login.html';
    return;
  }

  try {
    const profile = await window.apiRequest('/auth/profile');
    const user = profile.user || {};

    // Simpan ke localStorage
    if (user.role) localStorage.setItem('role', String(user.role));
    if (user.id) localStorage.setItem('user_id', String(user.id));
    if (user.owner_id) localStorage.setItem('owner_id', String(user.owner_id));
    if (user.store_id) localStorage.setItem('store_id', String(user.store_id));

    // Render info sidebar sesuai role
    const usernameEl = document.querySelector('.username');
    const emailEl = document.querySelector('.email');
    if (user.role === 'owner') {
      if (usernameEl) usernameEl.textContent = user.business_name || '-';
      if (emailEl) emailEl.textContent = user.email || '-';
    } else if (user.role === 'admin' || user.role === 'cashier') {
      if (usernameEl) usernameEl.textContent = user.store_name || '-';
      if (emailEl) emailEl.textContent = user.username || '-';
    }
  } catch (err) {
    console.error('Gagal memuat profil sidebar:', err);
  }

  // logout binding (tidak berubah)
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

// role-based sidebar visibility (tidak berubah)
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