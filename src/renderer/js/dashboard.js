document.addEventListener('DOMContentLoaded', async () => {
  const token = localStorage.getItem('token');
  if (!token) {
    window.location.href = 'login.html'; // Redirect ke login jika token tidak ada
    return;
  }

  try {
    // Ambil data subscription dari API
    const subRes = await window.apiRequest('/subscription');
    const sub = subRes.data || {};
    const plan = sub.plan || '-';
    const endDate = sub.end_date || null;
    const status = sub.status || '-';

    // Format tanggal dan hitung sisa waktu
    const formattedEndDate = endDate ? formatTanggal(endDate) : '-';
    const remainingDays = endDate ? hitungSisaHari(endDate) : '-';

    // Update elemen HTML
    const planEl = document.querySelector('.info-langganan-subjudul');
    const endEl = document.querySelectorAll('.info-langganan-subjudul')[1];
    const sisaEl = document.querySelector('.info-langganan-subjudul-hijau');
    const statusEl = document.querySelector('.status-langganan p');

    if (planEl) planEl.textContent = plan;
    if (endEl) endEl.textContent = formattedEndDate;
    if (sisaEl) sisaEl.textContent = remainingDays;
    if (statusEl) statusEl.textContent = status === 'active' ? 'Aktif' : 'Tidak Aktif';
  } catch (err) {
    console.error('Gagal mengambil data subscription:', err);
    const planEl = document.querySelector('.info-langganan-subjudul');
    if (planEl) planEl.textContent = 'Gagal memuat data';
  }

  // Tambahan: render nama bisnis/toko di header dashboard
  try {
    const profile = await window.apiRequest('/auth/profile');
    const user = profile.user || {};
    const headerEl = document.getElementById('headerStoreName');
    if (headerEl) {
      if (user.role === 'owner') {
        headerEl.textContent = user.business_name || 'APLIKASI PIPOS';
      } else if (user.role === 'admin' || user.role === 'cashier') {
        headerEl.textContent = user.store_name || 'APLIKASI PIPOS';
      } else {
        headerEl.textContent = 'APLIKASI PIPOS';
      }
    }
  } catch (err) {
    // fallback, biarkan default
  }
});

// Helper untuk format tanggal (YYYY-MM-DD ke 25 Desember 2025)
function formatTanggal(tgl) {
  if (!tgl) return '-';
  const bulan = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  const d = new Date(tgl);
  return `${d.getDate()} ${bulan[d.getMonth()]} ${d.getFullYear()}`;
}

// Helper untuk hitung sisa hari
function hitungSisaHari(tgl) {
  if (!tgl) return '-';
  const now = new Date();
  const end = new Date(tgl);
  const diff = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
  return diff > 0 ? `${diff} Hari Lagi` : 'Expired';
}