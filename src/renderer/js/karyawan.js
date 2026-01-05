// new file: fetch & render list, delete user
(function(){
  function tryInit() {
    const container = document.querySelector('.container-card-karyawan');
    if (container) initKaryawanPage();
    setupSearchHandler(); // attach search when page present
  }

  // try immediately (page may be static)
  tryInit();

  // observe app content for injected page (router)
  const appRoot = document.getElementById('app-content') || document.body;
  const mo = new MutationObserver((mutations) => {
    for (const m of mutations) {
      if (m.addedNodes && m.addedNodes.length) {
        if (document.querySelector('.container-card-karyawan')) {
          initKaryawanPage();
          setupSearchHandler();
          mo.disconnect();
          break;
        }
      }
    }
  });
  mo.observe(appRoot, { childList: true, subtree: true });

  // also re-run when custom event 'page:change' emitted by router (if router supports)
  window.addEventListener('page:change', () => { tryInit(); });
})();

async function apiGet(path, opts = {}) {
  if (window.apiRequest) {
    return window.apiRequest(path, opts);
  }
  const token = localStorage.getItem('token');
  const res = await fetch(`http://103.126.116.119:8001/api${path}`, {
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    ...opts
  });
  return res.ok ? res.json() : Promise.reject(await res.json().catch(()=>res.status));
}

async function fetchStoreUsers(storeId, q = '', opts = {}) {
  const qStr = q ? `?search=${encodeURIComponent(q)}` : '';
  return await apiGet(`/stores/${storeId}/users${qStr}`, opts);
}

async function initKaryawanPage(search = '') {
  const container = document.querySelector('.container-card-karyawan');
  if (!container) return;
  container.innerHTML = '<p>Memula...</p>';
  const role = (localStorage.getItem('role') || '').toLowerCase();

  try {
    if (role === 'cashier') {
      container.innerHTML = '<p>Akses ditolak. Halaman ini hanya untuk admin/owner.</p>';
      return;
    }

    if (role === 'admin') {
      const storeId = localStorage.getItem('store_id');
      if (!storeId) return container.innerHTML = '<p>Store tidak ditemukan untuk admin.</p>';
      const res = await fetchStoreUsers(storeId, search);
      if (!res || !res.success) return container.innerHTML = `<p>Gagal memuat: ${res?.message || 'unknown'}</p>`;
      renderList(container, res.data || []);
      window.updateHeaderStoreName();
      return;
    }

    if (role === 'owner') {
      let storeId = localStorage.getItem('store_id');
      
      // TAMBAH: Jika belum ada store_id, ambil dari fetchStoresForOwner
      if (!storeId) {
        const stores = await window.fetchStoresForOwner();
        if (stores && stores.length > 0) {
          storeId = await showStoreSelectionModal(stores);
        } else {
          container.innerHTML = `
            <p style="color: #ff6b6b; padding: 20px; text-align: center;">
              ⚠️ Anda belum memilih toko. Silakan pilih toko di halaman <strong>Produk</strong> terlebih dahulu.
            </p>
          `;
          return;
        }
      }

      if (!storeId) {
        container.innerHTML = '<p>Pemilihan toko dibatalkan.</p>';
        return;
      }

      const res = await fetchStoreUsers(storeId, search);
      if (!res || !res.success) return container.innerHTML = `<p>Gagal memuat: ${res?.message || 'unknown'}</p>`;
      renderList(container, res.data || []);
      window.updateHeaderStoreName();
      return;
    }

    container.innerHTML = '<p>Role tidak dikenali.</p>';
  } catch (err) {
    console.error(err);
    container.innerHTML = `<p>Error: ${err?.message || err}</p>`;
  }
}

function renderList(container, users) {
  const list = Array.isArray(users) ? users : (users.data || users || []);
  if (!list || !list.length) {
    container.innerHTML = '<p>Hasil tidak ditemukan.</p>';
    // Tetap update jumlah ke 0
    updateUserCounts(0, 0, 0);
    return;
  }
  container.innerHTML = '';

  // Hitung jumlah user, admin, kasir
  let total = list.length;
  let admin = 0;
  let cashier = 0;
  list.forEach(u => {
    if (u.role === 'admin') admin++;
    if (u.role === 'cashier') cashier++;
  });

  // Update ke elemen HTML
  updateUserCounts(total, admin, cashier);

  list.forEach(u => {
    const card = document.createElement('div');
    card.className = 'card-karyawan';
    card.dataset.id = u.id;
    card.innerHTML = `
      <div class="icon-karyawan ${u.role==='admin'?'icon-hijau':'icon-oranye'}"><span class="material-symbols-outlined">person</span></div>
      <div class="info-card-karyawan">
        <h3>${escapeHtml(u.name||u.username)}</h3>
        <p class="id-karyawan">ID: ${u.id}</p>
        <div class="role-nomor-karyawan">
          <p class="role-user ${u.role==='cashier'?'role-oranye':'role-hijau'}">${u.role}</p>
          <p class="nomor-user">${u.phone||''}</p>
        </div>
      </div>
      <div class="button-card-karyawan">
        <div class="status-karyawan ${u.is_active == 1 ? 'status-aktif' : 'status-nonaktif'}">
          ${u.is_active == 1 ? 'Aktif' : 'Nonaktif'}
        </div>
        <a data-permissions="owner, admin" href="../pages/edit-karyawan.html?id=${u.id}" class="edit-karyawan"><span class="material-symbols-outlined">edit</span></a>
        <button class="hapus-karyawan"><span class="material-symbols-outlined">delete</span></button>
      </div>
    `;
    container.appendChild(card);
    const btn = card.querySelector('.hapus-karyawan');
    if (btn) btn.addEventListener('click', () => confirmDelete(u.id, card));
  });
}

// Tambahkan fungsi ini di bawah renderList
function updateUserCounts(total, admin, cashier) {
  // Urutan: Semua User, Admin, Kasir
  const countEls = document.querySelectorAll('.data-karyawan .karyawan-detail');
  if (countEls[0]) countEls[0].textContent = total;
  if (countEls[1]) countEls[1].textContent = admin;
  if (countEls[2]) countEls[2].textContent = cashier;
}

function escapeHtml(s) { return String(s||'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

async function confirmDelete(id, cardEl) {
  if (!confirm('Hapus karyawan ini?')) return;
  try {
    const storeId = localStorage.getItem('store_id');
    if (!storeId) {
      if (window.showToast) showToast('Store belum dipilih. Tidak bisa menghapus user.', 'error');
      else alert('Store belum dipilih. Tidak bisa menghapus user.');
      return;
    }
    const token = localStorage.getItem('token');
    const url = `http://103.126.116.119:8001/api/stores/${storeId}/users/${id}`;
    const res = await fetch(url, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json().catch(()=>null);
    if (res.ok && data && data.success) {
      cardEl.remove();
      if (window.showToast) showToast('Karyawan berhasil dihapus.', 'success');
      else alert('Karyawan berhasil dihapus.');
    } else {
      const msg = data?.message || res.status;
      if (window.showToast) showToast('Gagal hapus: ' + msg, 'error');
      else alert('Gagal hapus: ' + msg);
    }
  } catch (err) {
    console.error(err);
    if (window.showToast) showToast('Gagal hapus: ' + (err.message || err), 'error');
    else alert('Gagal hapus: ' + (err.message || err));
  }
}

function showStoreSelectionModal(stores = []) {
  return new Promise(resolve => {
    const modal = document.createElement('div');
    modal.className = 'store-select-modal';
    modal.style = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;z-index:9999;';
    const box = document.createElement('div');
    box.style = '  background: var(--card-color);padding: 20px;border-radius: 8px;width: 420px;max-height: 70vh; overflow: auto;border: 1px solid var(--border-color);';
    box.innerHTML = `<h3 style="margin-top: 0; 
  color: var(--foreground-color);margin-bottom: 10px;">Pilih toko</h3><div class="list-stores" style="margin-top:10px;background-color:var(--card-color);"></div><div style="text-align:right;margin-top:12px;"><button class="cancel-store" style="padding:8px 12px;
  border-radius: 5px;
  background-color: var(--primary-color);
  border: none;
  color: var(--foreground-color);
  font-weight: var(--weight-bold);
  width: 80px;
  cursor: pointer;">Batal</button></div>`;
    modal.appendChild(box);
    document.body.appendChild(modal);
    const listEl = box.querySelector('.list-stores');
    stores.forEach(s => {
      const btn = document.createElement('button');
      btn.textContent = `${s.id} — ${s.name || s.branch || s.store_name || '-'}`;
      btn.style = 'font-size:16px;border:none;cursor:pointer;background-color:var(--card-color);color:var(--foreground-color);font-weight:var(--weight-bold);display:block;margin:6px 0;padding:8px;border-radius:6px;width:100%;text-align:left;';
      btn.addEventListener('click', () => {
        localStorage.setItem('store_id', String(s.id));
        document.body.removeChild(modal);
        resolve(s.id);
      });
      listEl.appendChild(btn);
    });
    box.querySelector('.cancel-store').addEventListener('click', () => {
      document.body.removeChild(modal);
      resolve(null);
    });
  });
}

// add search handler with debounce and live API call
let _karyawanSearchTimer = null;
function setupSearchHandler() {
  const input = document.querySelector('.bar-pencarian-karyawan input');
  if (!input) return;
  if (input.dataset._searchBound) return;
  input.dataset._searchBound = '1';

  input.addEventListener('input', (e) => {
    const q = (e.target.value || '').trim();
    if (_karyawanSearchTimer) clearTimeout(_karyawanSearchTimer);
    _karyawanSearchTimer = setTimeout(() => {
      // call initKaryawanPage with search term
      initKaryawanPage(q);
    }, 350);
  });

  // optional: submit on Enter immediately
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      if (_karyawanSearchTimer) clearTimeout(_karyawanSearchTimer);
      initKaryawanPage((e.target.value || '').trim());
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  window.updateHeaderStoreName(); // TAMBAH BARIS INI
});