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

    // Simpan store_id jika ada di response
    if (res.user && res.user.store_id) {
      localStorage.setItem('store_id', res.user.store_id);
    } else if (res.user && res.user.owner_id) {
      // Jika user adalah owner, ambil store_id dari API profil atau store utama
      // (tambahkan logic sesuai kebutuhan jika multi-store)
      // localStorage.setItem('store_id', ...);
    }

    // Setelah login sukses dan token sudah disimpan
    const profile = await window.apiRequest('/auth/profile');
    if (profile.user && profile.user.store_id) {
      localStorage.setItem('store_id', profile.user.store_id);
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
