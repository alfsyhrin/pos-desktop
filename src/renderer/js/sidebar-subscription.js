// sidebar-subscription.js
// Tampilkan plan langganan di sidebar (index.html)

async function renderSidebarSubscription() {
  // Pastikan window.apiRequest sudah siap
  function waitForApi(timeout = 3000) {
    return new Promise(resolve => {
      const start = Date.now();
      (function check() {
        if (typeof window.apiRequest === 'function') return resolve(true);
        if (Date.now() - start > timeout) return resolve(false);
        setTimeout(check, 50);
      })();
    });
  }

  const ok = await waitForApi();
  if (!ok) return;

  const statusEl = document.querySelector('.status-langganan');
  if (!statusEl) return;

  try {
    const subRes = await window.apiRequest('/subscription');
    const sub = subRes.data || {};
    const plan = sub.plan || '-';
    statusEl.textContent = `${plan.charAt(0).toUpperCase() + plan.slice(1)}`;
    statusEl.style.color = '#333'; // warna default, bisa diganti sesuai kebutuhan
  } catch (err) {
    statusEl.textContent = 'Paket: Gagal memuat';
    statusEl.style.color = '#ff4136';
  }
}

// Jalankan saat DOM siap
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', renderSidebarSubscription);
} else {
  renderSidebarSubscription();
}
