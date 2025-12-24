document.addEventListener('DOMContentLoaded', () => {
  const nameInput = document.querySelector('input[placeholder="Karyawan 1"]');
  const emailInput = document.querySelector('input[placeholder="contoh@gmail.com"]');
  const usernameInput = document.querySelector('input[placeholder="username"]');
  const passwordInput = document.querySelector('input[placeholder="password"]');
  const kasirBtn = document.querySelector('.kasir-tambah-karyawan');
  const adminBtn = document.querySelector('.admin-tambah-karyawan');
  const generateBtn = document.querySelector('.generate-password');
  const batalBtn = document.querySelector('.batal-role');
  const simpanBtn = document.querySelector('.simpan-role');

  function $(el) { return document.querySelector(el); }
  function setRoleButtons(role) {
    if (kasirBtn) {
      kasirBtn.classList.toggle('active', role === 'cashier');
      kasirBtn.setAttribute('aria-pressed', role === 'cashier');
      kasirBtn.style.pointerEvents = 'auto';
    }
    if (adminBtn) {
      adminBtn.classList.toggle('active', role === 'admin');
      adminBtn.setAttribute('aria-pressed', role === 'admin');
      adminBtn.style.pointerEvents = 'auto';
    }
  }

  // defaults
  setRoleButtons('cashier');

  // ensure clickable and bind stable handlers
  if (kasirBtn && !kasirBtn.dataset.bound) {
    kasirBtn.dataset.bound = '1';
    kasirBtn.addEventListener('click', (e)=>{ e.preventDefault(); setRoleButtons('cashier'); });
  }
  if (adminBtn && !adminBtn.dataset.bound) {
    adminBtn.dataset.bound = '1';
    adminBtn.addEventListener('click', (e)=>{ e.preventDefault(); setRoleButtons('admin'); });
  }

  if (generateBtn) generateBtn.addEventListener('click', () => {
    if (passwordInput) passwordInput.value = Math.random().toString(36).slice(-8);
  });
  if (batalBtn) batalBtn.addEventListener('click', () => {
    window.location.href = 'index.html';
  });

  if (!simpanBtn) return;

  simpanBtn.addEventListener('click', async () => {
    const name = nameInput ? nameInput.value.trim() : '';
    const email = emailInput ? emailInput.value.trim() : '';
    const username = usernameInput ? usernameInput.value.trim() : '';
    const password = passwordInput ? passwordInput.value.trim() : '';
    const role = adminBtn && adminBtn.classList.contains('active') ? 'admin' : 'cashier';
    const storeId = localStorage.getItem('store_id');
    const token = localStorage.getItem('token');

    if (!name || !username || !password) {
      if (window.showToast) { showToast('Lengkapi semua field!', 'warn'); } else alert('Lengkapi semua field!');
      return;
    }

    const body = { name, username, password, role };
    if (email) body.email = email;

    const url = storeId
      ? `http://103.126.116.119:8001/api/stores/${storeId}/users`
      : `http://103.126.116.119:8001/api/stores/users`;

    try {
      simpanBtn.disabled = true;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body)
      });
      const data = await res.json().catch(()=>null);
      if (res.ok && data && data.success) {
        if (window.showToast) {
          await showToast('Karyawan berhasil ditambah!', 'success');
          window.location.href = 'index.html';
        } else {
          alert('Karyawan berhasil ditambah!');
          window.location.href = 'index.html';
        }
      } else {
        const msg = data?.message || res.status;
        if (window.showToast) showToast('Gagal tambah karyawan: ' + msg, 'error');
        else alert('Gagal tambah karyawan: ' + msg);
      }
    } catch (err) {
      console.error(err);
      if (window.showToast) showToast('Gagal tambah karyawan: ' + (err.message || err), 'error');
      else alert('Gagal tambah karyawan: ' + (err.message || err));
    } finally {
      simpanBtn.disabled = false;
    }
  });
});