// async function login() {
//   const email = document.getElementById('email').value;
//   const password = document.getElementById('password').value;

//   if (!email || !password) {
//     if (window.showToast) showToast('Email dan password wajib diisi', 'warn');
//     else alert('Email dan password wajib diisi');
//     return;
//   }

//   try {
//     const res = await window.apiRequest('/auth/login', {
//       method: 'POST',
//       body: JSON.stringify({ identifier: email, password }),
//     });
//     localStorage.setItem('token', res.token);

//     const profile = await window.apiRequest('/auth/profile');

//     if (profile.user) {
//       localStorage.setItem('role', (profile.user.role || '').toString());
//       localStorage.setItem('user_id', String(profile.user.id || profile.user.user_id || ''));
//       const ownerId = profile.user.owner_id || profile.user.id || null;
//       if (ownerId) localStorage.setItem('owner_id', String(ownerId));
//       if (profile.user.store_id) localStorage.setItem('store_id', String(profile.user.store_id));
//     }

//     if (window.showToast) showToast('Login berhasil', 'success');
//     window.location.href = 'index.html';
//   } catch (err) {
//     if (window.showToast) showToast('Login gagal: ' + err.message, 'error');
//     else alert('Login gagal: ' + err.message);
//   }
// }

window.showToast = function (message, type = 'info', duration = 3000) {
  const container = document.getElementById('toast-container');
  if (!container) {
    console.error('toast-container tidak ditemukan');
    return;
  }

  const toast = document.createElement('div');
  toast.className = 'toast';

  if (type === 'success') toast.classList.add('toast-success');
  else if (type === 'error') toast.classList.add('toast-error');
  else if (type === 'warn') toast.classList.add('toast-warn');

  toast.textContent = message;

  container.appendChild(toast);

  // Hapus elemen setelah durasi
  setTimeout(() => {
    toast.remove();
  }, duration);
};


async function login() {
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const email = emailInput?.value || '';
  const password = passwordInput?.value || '';

  const loginButton = document.getElementById('btn-login');

  // helper menampilkan pesan tanpa alert
  const showError = (msg) => {
    if (window.showToast) {
      showToast(msg, 'error');
    } else {
      // fallback: tulis ke console atau tampilkan di div#error-message
      console.error('LOGIN ERROR:', msg);
      const el = document.getElementById('login-error');
      if (el) {
        el.textContent = msg;
        el.style.display = 'block';
      }
    }
  };

  // Validasi kosong
  if (!email || !password) {
    if (window.showToast) {
      showToast('Email dan password wajib diisi', 'warn');
    } else {
      const el = document.getElementById('login-error');
      if (el) {
        el.textContent = 'Email dan password wajib diisi';
        el.style.display = 'block';
      }
      console.warn('Email dan password wajib diisi');
    }
    return;
  }

  // disable sementara untuk cegah double klik
  if (loginButton) loginButton.disabled = true;
  if (emailInput) emailInput.disabled = true;
  if (passwordInput) passwordInput.disabled = true;

  try {
    const res = await window.apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier: email, password }),
    });

    localStorage.setItem('token', res.token);

    const profile = await window.apiRequest('/auth/profile');

    if (profile.user) {
      localStorage.setItem('role', (profile.user.role || '').toString());
      localStorage.setItem(
        'user_id',
        String(profile.user.id || profile.user.user_id || '')
      );
      const ownerId = profile.user.owner_id || profile.user.id || null;
      if (ownerId) localStorage.setItem('owner_id', String(ownerId));
      if (profile.user.store_id) {
        localStorage.setItem('store_id', String(profile.user.store_id));
      }
    }

    if (window.showToast) showToast('Login berhasil', 'success');
    window.location.href = 'index.html';
  } catch (err) {
    console.error('Login gagal (catch):', err);

    // pesan dari error sudah jelas: "Username/email atau password salah"
    const msg = err?.message || 'Username/email atau password salah';
    showError(msg);
  } finally {
    // WAJIB: aktifkan lagi input supaya bisa isi ulang
    if (loginButton) loginButton.disabled = false;
    if (emailInput) emailInput.disabled = false;
    if (passwordInput) passwordInput.disabled = false;
  }
}




async function logout() {
  try {
    await window.apiRequest('/auth/logout', { method: 'POST' });
  } catch (err) {}
  localStorage.clear();
  sessionStorage && sessionStorage.clear && sessionStorage.clear();

  // Navigasi ke login.html (di direktori yang sama dengan index.html)
  window.location.href = '../pages/login.html';
}

window.logout = logout;

window.login = login;
