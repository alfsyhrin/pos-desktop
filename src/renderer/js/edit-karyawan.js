// new file: load user, edit (PUT)
// guard supaya file hanya di-init sekali
if (window._editKaryawanInitialized) {
  // silent exit bila sudah di-init
} else {
  window._editKaryawanInitialized = true;

  document.addEventListener('DOMContentLoaded', () => {
    // hanya jalankan jika form edit karyawan ada di page
    if (!window.location.pathname.includes('edit-karyawan.html') && !document.querySelector('.simpan-role')) return;
    initEditKaryawan();
  });
}

function q(sel){ return document.querySelector(sel); }

async function fetchJson(url, opts = {}) {
  const token = localStorage.getItem('token');
  const headers = Object.assign({ Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, opts.headers || {});
  const res = await fetch(url, Object.assign({ headers }, opts));
  const text = await res.text().catch(()=>null);
  try { return { ok: res.ok, status: res.status, data: JSON.parse(text) }; } catch(e) { return { ok: res.ok, status: res.status, raw: text }; }
}

async function initEditKaryawan() {
  const params = new URLSearchParams(location.search);
  const id = params.get('id');
  if (!id) return; // silent return (guard handled earlier)

  const nameInput = q('input[placeholder="Karyawan 1"]');
  const emailInput = q('input[placeholder="contoh@gmail.com"]');
  const usernameInput = q('input[placeholder="username"]');
  const passwordInput = q('input[placeholder="password"]');
  const kasirBtn = q('.kasir-tambah-karyawan');
  const adminBtn = q('.admin-tambah-karyawan');
  const generateBtn = q('.generate-password');
  const batalBtn = q('.batal-role');
  const simpanBtn = q('.simpan-role');

  if (!simpanBtn) return;

  const token = localStorage.getItem('token');
  if (!token) return alert('Token tidak ditemukan. Silakan login ulang.');

  // ---- REPLACED: only fetch from store users to avoid /api/users/:id 404 ----
  let user = null;
  try {
    const storeId = localStorage.getItem('store_id');
    if (!storeId) {
      alert('Store belum dipilih. Silakan pilih store terlebih dahulu.');
      return;
    }
    const r2 = await fetchJson(`http://103.126.116.119:5000/api/stores/${storeId}/users`, { method: 'GET' });
    const list = (r2 && r2.data && Array.isArray(r2.data.data ? r2.data.data : r2.data)) ? (r2.data.data || r2.data) : [];
    user = (list || []).find(u => String(u.id) === String(id));
  } catch (e) {
    console.error('Gagal mengambil data user dari store:', e);
  }
  // --------------------------------------------------------------------------

  if (!user) {
    alert('User tidak ditemukan');
    return;
  }

  if (nameInput) nameInput.value = user.name || '';
  if (emailInput) emailInput.value = user.email || '';
  if (usernameInput) usernameInput.value = user.username || '';
  if (passwordInput) passwordInput.value = '';

  if (kasirBtn && adminBtn) {
    kasirBtn.classList.toggle('active', user.role === 'cashier');
    kasirBtn.setAttribute('aria-pressed', user.role === 'cashier');
    kasirBtn.style.pointerEvents = 'auto';
    adminBtn.classList.toggle('active', user.role === 'admin');
    adminBtn.setAttribute('aria-pressed', user.role === 'admin');
    adminBtn.style.pointerEvents = 'auto';
  }

  if (generateBtn) generateBtn.addEventListener('click', () => {
    if (passwordInput) passwordInput.value = Math.random().toString(36).slice(-8);
  });
  if (batalBtn) batalBtn.addEventListener('click', () => window.location.href = '../pages/karyawan.html');

  // bind role buttons safely
  if (kasirBtn && !kasirBtn.dataset.bound) {
    kasirBtn.dataset.bound = '1';
    kasirBtn.addEventListener('click',(e)=>{ e.preventDefault(); kasirBtn.classList.add('active'); adminBtn.classList.remove('active'); kasirBtn.setAttribute('aria-pressed','true'); adminBtn.setAttribute('aria-pressed','false'); });
  }
  if (adminBtn && !adminBtn.dataset.bound) {
    adminBtn.dataset.bound = '1';
    adminBtn.addEventListener('click',(e)=>{ e.preventDefault(); adminBtn.classList.add('active'); kasirBtn.classList.remove('active'); adminBtn.setAttribute('aria-pressed','true'); kasirBtn.setAttribute('aria-pressed','false'); });
  }

  if (simpanBtn && !simpanBtn.dataset.bound) {
    simpanBtn.dataset.bound = '1';
    simpanBtn.addEventListener('click', async () => {
      // prevent double submit
      if (simpanBtn.disabled) return;
      const name = nameInput ? nameInput.value.trim() : '';
      const email = emailInput ? emailInput.value.trim() : '';
      const username = usernameInput ? usernameInput.value.trim() : '';
      const password = passwordInput ? passwordInput.value.trim() : '';
      const role = adminBtn && adminBtn.classList.contains('active') ? 'admin' : 'cashier';

      if (!name || !username) { if (window.showToast) showToast('Nama dan username wajib diisi','warn'); else alert('Nama dan username wajib diisi'); return; }

      const body = { name, username, role };
      if (email) body.email = email;
      if (password) body.password = password;

      simpanBtn.disabled = true;
      const originalText = simpanBtn.textContent;
      simpanBtn.textContent = 'Menyimpan...';

      try {
        const storeId = localStorage.getItem('store_id');
        if (!storeId) {
          if (window.showToast) showToast('Store belum dipilih. Tidak bisa update user.','error'); else alert('Store belum dipilih. Tidak bisa update user.');
          return;
        }
        const url = `http://103.126.116.119:5000/api/stores/${storeId}/users/${id}`;
        const r = await fetchJson(url, {
          method: 'PUT',
          body: JSON.stringify(body)
        });

        if (r.ok && r.data && (r.data.success === true || r.data.success === undefined)) {
          if (window.showToast) {
            await showToast('Data karyawan berhasil diupdate','success');
            window.location.href = 'index.html';
          } else {
            alert('Data karyawan berhasil diupdate');
            window.location.href = 'index.html';
          }
        } else {
          const msg = (r.data && (r.data.message || r.data.error || JSON.stringify(r.data))) || `HTTP ${r.status}`;
          if (window.showToast) showToast('Gagal update: ' + msg, 'error'); else alert('Gagal update: ' + msg);
        }
      } catch (err) {
        console.error(err);
        if (window.showToast) showToast('Gagal update: ' + (err.message || err), 'error'); else alert('Gagal update: ' + (err.message || err));
      } finally {
        simpanBtn.disabled = false;
        simpanBtn.textContent = originalText;
      }
    });
  }
}