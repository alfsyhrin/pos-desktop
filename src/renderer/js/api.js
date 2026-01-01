const BASE_URL = 'http://103.126.116.119:8001/api';

function getToken() {
  return localStorage.getItem('token');
}

async function apiRequest(path, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  const fetchOpts = {
    ...options,
    headers,
  };

  if (options.body !== undefined && options.body !== null) {
    if (typeof options.body === 'object') {
      fetchOpts.headers['Content-Type'] = fetchOpts.headers['Content-Type'] || 'application/json';
      fetchOpts.body = JSON.stringify(options.body);
    } else {
      fetchOpts.body = options.body;
    }
  }

  const res = await fetch(`${BASE_URL}${path}`, fetchOpts);
  if (res.status === 403) {
    alert('Anda tidak memiliki akses ke fitur ini');
    throw new Error('Forbidden');
  }

  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'API Error');
  return data;
}

window.apiRequest = apiRequest;
window.BASE_URL = BASE_URL;
window.getToken = getToken;

window.fetchStoresForOwner = async function() {
  const role = (localStorage.getItem('role') || '').toLowerCase();
  if (role !== 'owner') return [];
  try {
    const res = await window.apiRequest('/stores');
    if (Array.isArray(res)) return res;
    if (Array.isArray(res.data)) return res.data;
    if (res?.data?.stores && Array.isArray(res.data.stores)) return res.data.stores;
    if (res?.stores && Array.isArray(res.stores)) return res.stores;
    if (res?.data?.items && Array.isArray(res.data.items)) return res.data.items;
    return [];
  } catch (err) {
    return [];
  }
};

window.fetchStoreForUser = async function() {
  const storeId = localStorage.getItem('store_id');
  if (!storeId) return null;
  try {
    const res = await window.apiRequest(`/stores/${storeId}`);
    if (res?.data) return res.data;
    return null;
  } catch (err) {
    return null;
  }
};

/* ======================================================
 * GLOBAL HELPER: UPDATE HEADER STORE NAME
 * ====================================================== */
window.updateHeaderStoreName = function() {
  const headerStoreName = document.getElementById('headerStoreName');
  if (!headerStoreName) return;

  const userRole = localStorage.getItem('role');
  
  if (userRole === 'owner') {
    // Owner: tampilkan nama bisnis
    const businessName = localStorage.getItem('owner_business_name') || 'Bisnis Anda';
    headerStoreName.textContent = businessName;
  } else {
    // Admin & Cashier: tampilkan nama toko
    const storeName = localStorage.getItem('store_name') || 'Toko Anda';
    headerStoreName.textContent = storeName;
  }
};

window.showStoreSelectionModal = function(stores = []) {
  return new Promise(resolve => {
    const modal = document.createElement('div');
    modal.className = 'store-select-modal';
    modal.style = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;z-index:9999;';
    const box = document.createElement('div');
    box.style = 'background:#1b1b1b;padding:20px;border-radius:8px;max-width:600px;width:90%;color:#fff;';
    box.innerHTML = `<h3>Pilih toko</h3><div class="list-stores" style="margin-top:10px;"></div><div style="text-align:right;margin-top:12px;"><button class="cancel-store" style="margin-right:8px;">Batal</button></div>`;
    modal.appendChild(box);
    document.body.appendChild(modal);
    const listEl = box.querySelector('.list-stores');
    stores.forEach(s => {
      const btn = document.createElement('button');
      btn.textContent = `${s.id} — ${s.name || s.branch || s.store_name || '-'}`;
      btn.style = 'display:block;margin:6px 0;padding:8px;border-radius:6px;width:100%;text-align:left;background:#333;color:#fff;border:1px solid #555;cursor:pointer;';
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
};