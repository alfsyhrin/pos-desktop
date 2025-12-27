// new file: load user, edit (PUT)
// guard supaya file hanya di-init sekali
if (window._editKaryawanInitialized) {
  // silent exit bila sudah di-init
} else {
  window._editKaryawanInitialized = true;

  document.addEventListener('DOMContentLoaded', async () => {
    // Ambil id dari query string
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    if (!id) {
      alert('ID karyawan tidak ditemukan!');
      return;
    }

    // Ambil elemen input
    const nameInput = document.querySelector('input[placeholder="Karyawan 1"]');
    const emailInput = document.querySelector('input[placeholder="contoh@gmail.com"]');
    const usernameInput = document.querySelector('input[placeholder="username"]');
    const passwordInput = document.querySelector('input[placeholder="password"]');
    const confirmPasswordInput = document.querySelector('input[placeholder="konfirmasi password"]');
    const roleInput = document.getElementById('selected-role');
    const roleLabel = document.querySelector('.dropdown-btn');
    const adminBtn = document.querySelector('button[data-category="Admin"]');
    const cashierBtn = document.querySelector('button[data-category="Kasir"]');

    // Fetch data karyawan dari API
    const storeId = localStorage.getItem('store_id');
    const token = localStorage.getItem('token');
    if (!storeId || !token) {
      alert('Store atau token tidak ditemukan!');
      return;
    }

    try {
      const res = await fetch(`http://103.126.116.119:8001/api/stores/${storeId}/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      const user = (data.data || []).find(u => String(u.id) === String(id));
      if (!user) {
        alert('Karyawan tidak ditemukan!');
        return;
      }

      // Isi form dengan data user
      if (nameInput) nameInput.value = user.name || '';
      if (emailInput) emailInput.value = user.email || '';
      if (usernameInput) usernameInput.value = user.username || '';
      if (passwordInput) passwordInput.value = '';
      if (confirmPasswordInput) confirmPasswordInput.value = '';
      if (roleInput) roleInput.value = user.role || '';
      if (roleLabel) roleLabel.childNodes[0].textContent = user.role === 'admin' ? 'Admin' : 'Kasir';

      // Highlight role di dropdown
      if (adminBtn && cashierBtn) {
        if (user.role === 'admin') {
          adminBtn.classList.add('active');
          cashierBtn.classList.remove('active');
        } else {
          cashierBtn.classList.add('active');
          adminBtn.classList.remove('active');
        }
      }

      // Tampilkan tombol aktif/nonaktif sesuai status user
      const nonaktifBtn = document.querySelector('.nonaktifkan-role');
      const aktifkanBtn = document.querySelector('.aktifkan-role');
      if (user.is_active == 1) {
        if (nonaktifBtn) nonaktifBtn.style.display = '';
        if (aktifkanBtn) aktifkanBtn.style.display = 'none';
      } else {
        if (nonaktifBtn) nonaktifBtn.style.display = 'none';
        if (aktifkanBtn) aktifkanBtn.style.display = '';
      }

      // Tombol Nonaktifkan (soft delete)
      if (nonaktifBtn) {
        nonaktifBtn.onclick = async function() {
          if (!confirm('Nonaktifkan karyawan ini?')) return;
          nonaktifBtn.disabled = true;
          nonaktifBtn.textContent = 'Memproses...';
          try {
            const url = `http://103.126.116.119:8001/api/stores/${storeId}/users/${id}`;
            const res = await fetch(url, {
              method: 'PUT',
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ is_active: 0 })
            });
            const data = await res.json();
            if (res.ok && (data.success === true || data.success === undefined)) {
              alert('Karyawan dinonaktifkan');
              window.location.href = '../pages/karyawan.html';
            } else {
              alert('Gagal nonaktifkan: ' + (data.message || JSON.stringify(data)));
            }
          } catch (err) {
            alert('Gagal nonaktifkan: ' + err.message);
          } finally {
            nonaktifBtn.disabled = false;
            nonaktifBtn.textContent = 'Nonaktifkan';
          }
        };
      }

      // Tombol Aktifkan (jika user nonaktif)
      if (aktifkanBtn) {
        aktifkanBtn.onclick = async function() {
          if (!confirm('Aktifkan kembali karyawan ini?')) return;
          aktifkanBtn.disabled = true;
          aktifkanBtn.textContent = 'Memproses...';
          try {
            const url = `http://103.126.116.119:8001/api/stores/${storeId}/users/${id}`;
            const res = await fetch(url, {
              method: 'PUT',
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ is_active: 1 })
            });
            const data = await res.json();
            if (res.ok && (data.success === true || data.success === undefined)) {
              alert('Karyawan diaktifkan kembali');
              window.location.href = '../pages/karyawan.html';
            } else {
              alert('Gagal aktifkan: ' + (data.message || JSON.stringify(data)));
            }
          } catch (err) {
            alert('Gagal aktifkan: ' + err.message);
          } finally {
            aktifkanBtn.disabled = false;
            aktifkanBtn.textContent = 'Aktifkan';
          }
        };
      }

      // Tombol Hapus Permanen (hard delete)
      const hapusBtn = document.querySelector('.hapus-role');
      if (hapusBtn) {
        hapusBtn.onclick = async function() {
          if (!confirm('Hapus permanen karyawan ini? Data tidak bisa dikembalikan!')) return;
          hapusBtn.disabled = true;
          hapusBtn.textContent = 'Menghapus...';
          try {
            const url = `http://103.126.116.119:8001/api/stores/${storeId}/users/${id}`;
            const res = await fetch(url, {
              method: 'DELETE',
              headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (res.ok && (data.success === true || data.success === undefined)) {
              alert('Karyawan berhasil dihapus permanen');
              window.location.href = '../pages/karyawan.html';
            } else {
              alert('Gagal hapus: ' + (data.message || JSON.stringify(data)));
            }
          } catch (err) {
            alert('Gagal hapus: ' + err.message);
          } finally {
            hapusBtn.disabled = false;
            hapusBtn.textContent = 'Hapus Permanen';
          }
        };
      }
    } catch (err) {
      alert('Gagal mengambil data karyawan!');
      console.error(err);
    }

    // Dropdown role logic
    document.querySelectorAll('.dropdown-menu button[data-category]').forEach(btn => {
      btn.addEventListener('click', function() {
        const role = this.getAttribute('data-category').toLowerCase() === 'admin' ? 'admin' : 'cashier';
        if (roleInput) roleInput.value = role;
        if (roleLabel) roleLabel.childNodes[0].textContent = role === 'admin' ? 'Admin' : 'Kasir';
        adminBtn.classList.toggle('active', role === 'admin');
        cashierBtn.classList.toggle('active', role === 'cashier');
        // Tutup dropdown
        const toggle = document.getElementById('dropdown-toggle');
        if (toggle) toggle.checked = false;
      });
    });

    // Simpan perubahan (PUT)
    const simpanBtn = document.querySelector('.simpan-role');
    if (simpanBtn) {
      simpanBtn.onclick = async function() {
        const name = nameInput.value.trim();
        const email = emailInput.value.trim();
        const username = usernameInput.value.trim();
        const password = passwordInput.value.trim();
        const confirmPassword = confirmPasswordInput.value.trim();
        const role = roleInput.value || 'cashier';

        if (!name || !username) {
          alert('Nama dan username wajib diisi!');
          return;
        }
        if (password && password !== confirmPassword) {
          alert('Password dan konfirmasi password tidak sama!');
          return;
        }

        const body = { name, username, role };
        if (email) body.email = email;
        if (password) body.password = password;

        simpanBtn.disabled = true;
        simpanBtn.textContent = 'Menyimpan...';

        try {
          const url = `http://103.126.116.119:8001/api/stores/${storeId}/users/${id}`;
          const res = await fetch(url, {
            method: 'PUT',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
          });
          const data = await res.json();
          if (res.ok && (data.success === true || data.success === undefined)) {
            alert('Data karyawan berhasil diupdate');
            window.location.href = '../pages/karyawan.html';
          } else {
            alert('Gagal update: ' + (data.message || JSON.stringify(data)));
          }
        } catch (err) {
          alert('Gagal update: ' + err.message);
        } finally {
          simpanBtn.disabled = false;
          simpanBtn.textContent = 'Simpan';
        }
      };
    }
  });
}