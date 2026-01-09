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

  // Dropdown role logic
  const roleInput = document.getElementById('selected-role');
  const roleLabel = document.getElementById('selected-role-label');
  document.querySelectorAll('.role-option').forEach(btn => {
    btn.addEventListener('click', function() {
      const role = this.getAttribute('data-role');
      if (roleInput) roleInput.value = role;
      if (roleLabel) roleLabel.textContent = role === 'admin' ? 'Admin' : 'Kasir';
      // Tutup dropdown
      const toggle = document.getElementById('dropdown-toggle');
      if (toggle) toggle.checked = false;
    });
  });

  // Set default role jika ingin
  if (roleInput && !roleInput.value) {
    roleInput.value = 'cashier';
    if (roleLabel) roleLabel.textContent = 'Kasir';
  }

  // Helper untuk menampilkan error di bawah field username
  function showUsernameError(msg) {
    let err = document.getElementById('username-error');
    if (!err) {
      err = document.createElement('div');
      err.id = 'username-error';
      err.style.color = 'red';
      err.style.fontSize = '0.9em';
      err.style.marginTop = '2px';
      const parent = usernameInput?.parentNode;
      if (parent) parent.appendChild(err);
    }
    err.textContent = msg;
    if (usernameInput) {
      usernameInput.style.borderColor = 'red';
      usernameInput.focus();
    }
  }
  function clearUsernameError() {
    const err = document.getElementById('username-error');
    if (err) err.remove();
    if (usernameInput) usernameInput.style.borderColor = '';
  }

  if (!simpanBtn) return;

  simpanBtn.addEventListener('click', async () => {
    clearUsernameError();

    const name = nameInput ? nameInput.value.trim() : '';
    const email = emailInput ? emailInput.value.trim() : '';
    const username = usernameInput ? usernameInput.value.trim() : '';
    const password = passwordInput ? passwordInput.value.trim() : '';
    const role = roleInput ? roleInput.value : 'cashier';
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

      if (!res.ok || !data || data.success === false) {
        // Penanganan error username sudah digunakan
        if (data?.message && data.message.includes('Username sudah digunakan')) {
          showUsernameError('Username sudah digunakan, silakan pilih username lain.');
          if (window.showToast) showToast('Username sudah digunakan, silakan pilih username lain.', 'error');
        } else {
          const msg = data?.message || res.status || 'Gagal menyimpan user. Silakan coba lagi.';
          if (window.showToast) showToast(msg, 'error');
          else alert(msg);
        }
        return;
      }

      if (window.showToast) {
        await showToast('Karyawan berhasil ditambah!', 'success');
        window.location.href = 'index.html';
      } else {
        alert('Karyawan berhasil ditambah!');
        window.location.href = 'index.html';
      }
    } catch (err) {
      if (window.showToast) showToast('Terjadi kesalahan jaringan/server.', 'error');
      else alert('Terjadi kesalahan jaringan/server.');
    } finally {
      simpanBtn.disabled = false;
    }
  });
});