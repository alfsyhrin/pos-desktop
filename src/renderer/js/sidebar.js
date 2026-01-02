document.addEventListener('DOMContentLoaded', async () => {
  const usernameEl = document.querySelector('.username');
  const emailEl = document.querySelector('.email');
  const storeNameEl = document.querySelector('.store-name'); // optional
  const logoutEl = document.querySelector('.sidebar-item.logout') || document.querySelector('[data-action="logout"]');

  // helper: wait for window.apiRequest (api.js) to be ready
  async function waitForApi(timeout = 3000) {
    const start = Date.now();
    while (typeof window.apiRequest !== 'function') {
      if (Date.now() - start > timeout) return false;
      await new Promise(r => setTimeout(r, 50));
    }
    return true;
  }

  const ok = await waitForApi();
  if (!ok) {
    console.error('sidebar.js: window.apiRequest not available');
  }

  // fetch profile and populate sidebar
  try {
    const res = await (typeof window.apiRequest === 'function'
      ? window.apiRequest('/auth/profile')
      : fetch('/api/auth/profile').then(r => r.json()));
    const user = (res && (res.user || res.data?.user)) ? (res.user || res.data.user) : (res.user === undefined ? res : res.user);

    if (usernameEl) usernameEl.textContent = (user && user.username) ? user.username : '-';
    if (emailEl) emailEl.textContent = (user && user.email) ? user.email : '-';

    // optionally fetch store name if store-name element exists and user has store_id
    const storeId = user && (user.store_id || localStorage.getItem('store_id'));
    const token = (typeof window.getToken === 'function') ? window.getToken() : localStorage.getItem('token');
    if (storeNameEl && storeId && token) {
      try {
        const storeRes = await fetch(`${(window.BASE_URL || 'http://103.126.116.119:8001/api')}/stores/${storeId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const storeJson = await storeRes.json();
        if (storeJson && storeJson.data && storeJson.data.name) {
          storeNameEl.textContent = storeJson.data.name;
          localStorage.setItem('store_name', storeJson.data.name);
        }
      } catch (err) {
        console.warn('sidebar.js: failed to fetch store name', err);
      }
    }
  } catch (err) {
    console.error('sidebar.js: failed to load profile', err);
    if (usernameEl) usernameEl.textContent = '-';
    if (emailEl) emailEl.textContent = '-';
  }

  // logout handler (robust with fallbacks to avoid 404)
  async function doLogout() {
    try {
      if (typeof window.apiRequest === 'function') {
        await window.apiRequest('/auth/logout', { method: 'POST' });
      } else {
        await fetch('/api/auth/logout', { method: 'POST' }).catch(()=>{});
      }
    } catch (e) {
      console.warn('sidebar.js: logout request failed (continuing)', e);
    }

    // clear local data
    localStorage.clear();
    sessionStorage.clear();

    // Try SPA/router navigation first if available
    if (window.router && typeof window.router.navigate === 'function') {
      try { window.router.navigate('/login'); return; } catch {}
    }
    if (typeof window.navigateTo === 'function') {
      try { window.navigateTo('login'); return; } catch {}
    }

    // Fallbacks for direct redirects (try several likely paths)
    const candidates = [
      'login.html',
      './pages/login.html',
      '../pages/login.html',
      '/login.html',
      '/'
    ];
    for (const p of candidates) {
      try {
        window.location.href = p;
        return;
      } catch (e) { /* ignore and try next */ }
    }

    // final fallback: reload (will likely show login if app clears auth)
    window.location.reload();
  }

  if (logoutEl) {
    logoutEl.addEventListener('click', (ev) => {
      ev.preventDefault();
      doLogout();
    });
  } else {
    console.warn('sidebar.js: logout element not found');
  }

  // Sinkronisasi manual
  const syncEl = document.getElementById('btn-sync');
  if (syncEl && typeof window.syncAllData === 'function') {
    syncEl.addEventListener('click', async (ev) => {
      ev.preventDefault();
      syncEl.classList.add('loading');
      syncEl.innerHTML = '<span class="material-symbols-outlined fill spin">sync</span>Sinkronisasi...';
      try {
        await window.syncAllData();
        alert('Sinkronisasi selesai!');
      } catch (e) {
        alert('Gagal sinkronisasi: ' + (e.message || e));
      }
      syncEl.classList.remove('loading');
      syncEl.innerHTML = '<span class="material-symbols-outlined fill">sync</span>Sinkron';
    });
  }
});