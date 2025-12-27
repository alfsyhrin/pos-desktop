document.addEventListener('DOMContentLoaded', loadStoreInfo);

async function loadStoreInfo() {
  const storeId = localStorage.getItem('store_id');
  const token = localStorage.getItem('token');
  if (!storeId || !token) {
    if (window.showToast) showToast('Store atau token tidak ditemukan', 'error');
    return;
  }
  try {
    const res = await fetch(`http://103.126.116.119:8001/api/stores/${storeId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    if (data.success && data.data) {
      renderStoreInfo(data.data);
      // Simpan nama toko ke localStorage untuk header/struk
      localStorage.setItem('store_name', data.data.name || '');
      localStorage.setItem('store_address', data.data.address || '');
      localStorage.setItem('store_phone', data.data.phone || '');
    } else {
      if (window.showToast) showToast('Gagal mengambil info toko', 'error');
    }
  } catch (e) {
    if (window.showToast) showToast('Gagal mengambil info toko: ' + e.message, 'error');
  }
}

function renderStoreInfo(store) {
  document.querySelectorAll('.detail-toko-judul').forEach((el, i) => {
    const next = el.nextElementSibling;
    if (!next) return;
    switch (el.textContent.trim().toLowerCase()) {
      case 'id':
        next.textContent = store.id || '-';
        break;
      case 'owner id':
        next.textContent = store.owner_id || '-';
        break;
      case 'nama':
        next.textContent = store.name || '-';
        break;
      case 'alamat':
        next.textContent = store.address || '-';
        break;
      case 'telepon':
        next.textContent = store.phone || '-';
        break;
      case 'receipt template':
        next.textContent = store.receipt_template || '-';
        break;
      case 'created at':
        next.textContent = store.created_at || '-';
        break;
      case 'updated at':
        next.textContent = store.updated_at || '-';
        break;
    }
  });
}