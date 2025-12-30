/**
 * ======================================================
 * PENGATURAN TOKO
 * Aman untuk multi-page (Electron / Web)
 * ======================================================
 */

document.addEventListener('DOMContentLoaded', () => {
  // Load data toko (aman dipanggil di halaman lain)
  loadStoreInfo();

  // Inisialisasi modal edit (hanya aktif di halaman pengaturan)
  setupEditTokoModal();
});

/* ======================================================
 * LOAD & RENDER INFO TOKO
 * ====================================================== */
async function loadStoreInfo() {
  const storeId = localStorage.getItem('store_id');
  const token = localStorage.getItem('token');

  if (!storeId || !token) return;

  try {
    const res = await fetch(`http://103.126.116.119:8001/api/stores/${storeId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const data = await res.json();
    if (!data?.success || !data?.data) return;

    renderStoreInfo(data.data);

    // Simpan ke localStorage (dipakai header / struk)
    localStorage.setItem('store_name', data.data.name || '');
    localStorage.setItem('store_address', data.data.address || '');
    localStorage.setItem('store_phone', data.data.phone || '');

    // Update header jika ada
    const headerEl = document.getElementById('headerStoreName');
    if (headerEl) headerEl.textContent = data.data.name || '';

  } catch (err) {
    console.error('Gagal load store info:', err);
  }
}

function renderStoreInfo(store) {
  document.querySelectorAll('.detail-toko-judul').forEach(el => {
    const valueEl = el.nextElementSibling;
    if (!valueEl) return;

    switch (el.textContent.trim().toLowerCase()) {
      case 'id': valueEl.textContent = store.id ?? '-'; break;
      case 'owner id': valueEl.textContent = store.owner_id ?? '-'; break;
      case 'nama': valueEl.textContent = store.name ?? '-'; break;
      case 'alamat': valueEl.textContent = store.address ?? '-'; break;
      case 'telepon': valueEl.textContent = store.phone ?? '-'; break;
      case 'receipt template': valueEl.textContent = store.receipt_template ?? '-'; break;
      case 'created at': valueEl.textContent = store.created_at ?? '-'; break;
      case 'updated at': valueEl.textContent = store.updated_at ?? '-'; break;
    }
  });
}

/* ======================================================
 * MODAL EDIT TOKO
 * ====================================================== */
function setupEditTokoModal() {
  const editBtn = document.querySelector('.edit-toko');
  const modal = document.getElementById('modalEditToko');

  // ⛔ Guard clause → bukan halaman pengaturan
  if (!editBtn || !modal) return;

  const modalCard = modal.querySelector('.modal-card');
  const cancelBtn = modal.querySelector('.modal-cancel');
  const saveBtn = modal.querySelector('.modal-save');

  // Pastikan modal tertutup saat awal
  closeModalEditToko();

  /* === OPEN MODAL === */
  editBtn.addEventListener('click', e => {
    e.preventDefault();

    const namaEl = document.getElementById('namaToko');
    const alamatEl = document.getElementById('alamatToko');
    const teleponEl = document.getElementById('teleponToko');

    const inputNama = document.getElementById('editNama');
    const inputAlamat = document.getElementById('editAlamat');
    const inputTelepon = document.getElementById('editTelepon');

    if (inputNama) inputNama.value = namaEl?.textContent || '';
    if (inputAlamat) inputAlamat.value = alamatEl?.textContent || '';
    if (inputTelepon) inputTelepon.value = teleponEl?.textContent || '';

    modal.classList.add('active');
    modal.style.display = 'flex';

    inputNama?.focus();
  });

  /* === CLOSE MODAL === */
  cancelBtn?.addEventListener('click', e => {
    e.preventDefault();
    closeModalEditToko();
  });

  modal.addEventListener('click', e => {
    if (!modalCard.contains(e.target)) {
      closeModalEditToko();
    }
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && modal.classList.contains('active')) {
      closeModalEditToko();
    }
  });

  /* === SAVE === */
  saveBtn?.addEventListener('click', async e => {
    e.preventDefault();
    await updateStoreInfo();
  });
}

function closeModalEditToko() {
  const modal = document.getElementById('modalEditToko');
  if (!modal) return;

  modal.classList.remove('active');
  modal.style.display = 'none';
}

/* ======================================================
 * UPDATE STORE INFO
 * ====================================================== */
async function updateStoreInfo() {
  const storeId = localStorage.getItem('store_id');
  const token = localStorage.getItem('token');
  if (!storeId || !token) return;

  const name = document.getElementById('editNama')?.value.trim() || '';
  const address = document.getElementById('editAlamat')?.value.trim() || '';
  const phone = document.getElementById('editTelepon')?.value.trim() || '';

  try {
    const res = await fetch(`http://103.126.116.119:8001/api/stores/${storeId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ name, address, phone })
    });

    const data = await res.json();

    if (data?.success) {
      window.showToast?.('Informasi toko berhasil diupdate', 'success');
      closeModalEditToko();
      await loadStoreInfo();
    } else {
      window.showToast?.('Gagal update toko', 'error');
    }
  } catch (err) {
    console.error('Update store error:', err);
    window.showToast?.('Gagal update toko', 'error');
  }
}
