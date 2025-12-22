async function login() {
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;

  if (!email || !password) {
    alert('Email dan password wajib diisi');
    return;
  }

  try {
    const res = await window.apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier: email, password }),
    });
    localStorage.setItem('token', res.token);

    // Ambil profil lengkap
    const profile = await window.apiRequest('/auth/profile');

    // simpan role dan id yang benar
    if (profile.user) {
      localStorage.setItem('role', (profile.user.role || '').toString());
      localStorage.setItem('user_id', String(profile.user.id || profile.user.user_id || ''));
      // owner_id: jika user adalah owner, owner_id = user.id, jika bukan, ada owner_id
      const ownerId = profile.user.owner_id || profile.user.id || null;
      if (ownerId) localStorage.setItem('owner_id', String(ownerId));
      // store_id jika ada (admin/kasir)
      if (profile.user.store_id) localStorage.setItem('store_id', String(profile.user.store_id));
    }

    window.location.href = 'index.html';
  } catch (err) {
    alert('Login gagal: ' + err.message);
  }
}

async function logout() {
  try {
    await window.apiRequest('/auth/logout', { method: 'POST' });
  } catch (err) {
    // Boleh abaikan error logout (misal token sudah expired)
  }
  // Bersihkan localStorage
  localStorage.removeItem('token');
  localStorage.removeItem('store_id');
  // Redirect ke login
  window.location.href = 'login.html';
}

window.logout = logout;

window.login = login;
