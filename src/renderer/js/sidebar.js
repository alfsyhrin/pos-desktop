document.addEventListener('DOMContentLoaded', async () => {
  const token = localStorage.getItem('token');
  if (!token) {
    window.location.href = 'login.html'; // Redirect ke login jika token tidak ada
    return;
  }

  try {
    // Ambil profil user untuk mendapatkan owner_id
    const profile = await window.apiRequest('/auth/profile');
    const ownerId = profile.user.owner_id;

    if (!ownerId) {
      console.error('Owner ID tidak ditemukan dalam profil user.');
      return;
    }

    // Ambil data owner berdasarkan owner_id
    const ownerRes = await window.apiRequest(`/owners/${ownerId}`);
    const ownerData = ownerRes.data;

    const usernameEl = document.querySelector('.username');
    const emailEl = document.querySelector('.email');

    if (usernameEl) usernameEl.textContent = ownerData.business_name || '-';
    if (emailEl) emailEl.textContent = ownerData.email || '-';
  } catch (err) {
    console.error('Gagal memuat data owner:', err);
  }

    // Tambahkan event listener untuk tombol logout
  const logoutBtn = document.querySelector('.sidebar-item.logout');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
      e.preventDefault(); // Mencegah reload halaman
      if (window.logout) window.logout();
    });
  }
});