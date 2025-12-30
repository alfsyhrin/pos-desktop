// new file - set headerStoreName from localStorage or /stores/:id
document.addEventListener('DOMContentLoaded', async () => {
  const el = document.getElementById('headerStoreName');
  if (!el) return;

  // pakai cached store_name dulu
  const cached = localStorage.getItem('store_name');
  if (cached) { el.textContent = cached; return; }

  const storeId = localStorage.getItem('store_id');
  const token = (typeof window.getToken === 'function') ? window.getToken() : localStorage.getItem('token');
  if (!storeId || !token) return;

  try {
    const base = window.BASE_URL || 'http://103.126.116.119:8001/api';
    const res = await fetch(`${base}/stores/${storeId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const json = await res.json();
    if (json?.success && json?.data?.name) {
      el.textContent = json.data.name;
      localStorage.setItem('store_name', json.data.name);
    }
  } catch (err) {
    console.warn('header.js: failed to load store name', err);
  }
});