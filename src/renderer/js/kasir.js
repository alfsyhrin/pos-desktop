// Helper: ekstrak array produk dari berbagai bentuk response API
function extractProductsFromResponse(res) {
  if (!res) return [];
  if (Array.isArray(res)) return res;
  if (Array.isArray(res.data)) return res.data;
  if (Array.isArray(res.data?.items)) return res.data.items;
  if (Array.isArray(res.data?.products)) return res.data.products;
  return [];
}

// Helper
function getStoreId() { return localStorage.getItem('store_id'); }
function getToken() { return localStorage.getItem('token'); }
function getUserId() { return localStorage.getItem('user_id'); }

// ===== Store Selector (Owner) =====
async function fetchStoresForOwner() {
  try {
    if (typeof window.apiRequest === 'function') {
      const res = await window.apiRequest('/stores');
      // normalize similar to produk.js
      if (Array.isArray(res)) return res;
      if (Array.isArray(res.data)) return res.data;
      if (res?.data?.stores && Array.isArray(res.data.stores)) return res.data.stores;
      if (res?.stores && Array.isArray(res.stores)) return res.stores;
      if (res?.data?.items && Array.isArray(res.data.items)) return res.data.items;
      const maybe = res?.data?.data;
      if (Array.isArray(maybe)) return maybe;
      return [];
    } else {
      // fallback
      const token = getToken();
      if (!token) return [];
      const r = await fetch('http://103.126.116.119:5000/api/stores', { headers: { Authorization: `Bearer ${token}` }});
      const d = await r.json();
      return d.data?.stores || d.data || [];
    }
  } catch (err) {
    console.error('fetchStoresForOwner error', err);
    return [];
  }
}
function showStoreSelectorKasir(stores) {
  let modal = document.getElementById('store-selector-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'store-selector-modal';
    modal.style = 'display:flex;position:fixed;inset:0;background:rgba(0,0,0,0.6);align-items:center;justify-content:center;z-index:9999;';
    modal.innerHTML = `
      <div style="background:#1f1414;padding:20px;border-radius:8px;width:420px;max-height:70vh;overflow:auto;">
        <h3 style="margin-top:0;color:#fff;">Pilih Toko</h3>
        <div id="store-list"></div>
        <div style="margin-top:12px;display:flex;gap:8px;justify-content:flex-end;">
          <button id="store-refresh" style="padding:8px 12px;">Refresh</button>
          <button id="store-cancel" style="padding:8px 12px;">Batal</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  }
  const list = modal.querySelector('#store-list');
  list.innerHTML = '';
  if (stores.length === 0) {
    list.innerHTML = '<p style="color:#fff">Tidak ada toko. Tekan Refresh.</p>';
  } else {
    stores.forEach(s => {
      const el = document.createElement('div');
      el.style = 'padding:8px;margin-bottom:6px;background:#2a1f1f;border-radius:6px;cursor:pointer;color:#fff;';
      el.textContent = `${s.name || s.storeName || s.title || 'Toko'}${s.id ? ' — ID: ' + s.id : ''}`;
      el.dataset.storeId = s.id;
      el.onclick = () => {
        localStorage.setItem('store_id', String(s.id));
        modal.style.display = 'none';
        renderProdukKasir();
        renderCart();
      };
      list.appendChild(el);
    });
  }
  modal.style.display = 'flex';
  modal.querySelector('#store-refresh').onclick = async () => {
    const newStores = await fetchStoresForOwner();
    showStoreSelectorKasir(newStores);
  };
  modal.querySelector('#store-cancel').onclick = () => {
    modal.style.display = 'none';
  };
}

// ===== Ambil produk dari API (pakai window.apiRequest + ekstraktor) =====
async function fetchProdukKasir(query = '') {
  const storeId = getStoreId();
  if (!storeId) return [];
  try {
    const endpoint = `/stores/${storeId}/products` + (query ? `?q=${encodeURIComponent(query)}` : '');
    if (typeof window.apiRequest === 'function') {
      const res = await window.apiRequest(endpoint);
      return extractProductsFromResponse(res);
    } else {
      // fallback direct fetch
      const token = getToken();
      const url = `http://103.126.116.119:5000/api/stores/${storeId}/products${query ? `?q=${encodeURIComponent(query)}` : ''}`;
      const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` }});
      const d = await r.json();
      return extractProductsFromResponse(d);
    }
  } catch (err) {
    console.error('fetchProdukKasir error', err);
    return [];
  }
}

// ===== Render produk di halaman kasir (tetap menggunakan extractProductsFromResponse) =====
async function renderProdukKasir(q = '') {
  const produkList = document.getElementById('produk-list-kasir');
  if (!produkList) return;
  produkList.innerHTML = '<p class="loading">Memuat produk...</p>';

  const storeId = getStoreId();
  if (!storeId) {
    const stores = await fetchStoresForOwner();
    if (stores && stores.length) {
      showStoreSelectorKasir(stores);
      produkList.innerHTML = '<p>Pilih toko terlebih dahulu.</p>';
      return;
    }
    produkList.innerHTML = '<p>Tidak ada toko terpilih.</p>';
    return;
  }

  const products = await fetchProdukKasir(q);
  produkList.innerHTML = '';
  if (!products || products.length === 0) {
    produkList.innerHTML = '<p>Tidak ada produk.</p>';
    return;
  }

  products.forEach(p => {
    const price = Number(p.sellPrice ?? p.price ?? 0);
    const stock = p.stock ?? p.stok ?? 0;
    const name = p.name ?? p.nama ?? '-';
    const sku = p.sku ?? '';
    const id = p.id ?? p.product_id ?? '';

    // Ambil diskon dari produk (support percentage, amount, buyxgety, bundle)
    const discountType = p.discount_type || p.jenis_diskon || '';
    const discountValue = p.discount_value || p.nilai_diskon || 0;
    const buyQty = p.buy_qty || 0;
    const freeQty = p.free_qty || 0;
    const bundleQty = p.diskon_bundle_min_qty || p.bundle_min_qty || 0;
    const bundleValue = p.diskon_bundle_value || p.bundle_total_price || 0;

    const card = document.createElement('div');
    card.className = 'card-produk-kasir';
    card.innerHTML = `
      <div class="judul-stok-produk">
        <div class="overflow-judul-produk" data-sku="${sku}" data-stock="${stock}">
          <h3>${escapeHtml(name)}</h3>
        </div>
        <p>${stock}</p>
      </div>
      <h3>Rp ${price.toLocaleString('id-ID')}</h3>
      <p>SKU: ${sku}</p>
      <p>Kategori: ${p.category ?? '-'}</p>
      <button class="btn-add-cart"
        data-id="${id}"
        data-name="${escapeHtml(name)}"
        data-price="${price}"
        data-sku="${sku}"
        data-stock="${stock}"
        data-discount-type="${discountType}"
        data-discount-value="${discountValue}"
        data-buy-qty="${buyQty}"
        data-free-qty="${freeQty}"
        data-bundle-qty="${bundleQty}"
        data-bundle-value="${bundleValue}">
        Tambah Ke Keranjang
      </button>
    `;
    produkList.appendChild(card);
  });
}

// ===== Simple escape helper =====
function escapeHtml(str = '') {
  return String(str).replace(/[&<>"'`=\/]/g, s => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;','/':'&#x2F;','`':'&#x60;','=':'&#x3D;'
  })[s]);
}

// ===== Keranjang =====
// Hapus semua implementasi fetchCart, addToCartAPI, _localCart, getProductIdBySKU dan renderCart yang memanggil API.
// Ganti dengan wrapper yang menggunakan cart frontend (produk-ke-keranjang.js)

function renderCart(items = null) {
  // jika ada fungsi updateKeranjangView di produk-ke-keranjang.js, panggil untuk render
  try {
    if (typeof window.updateKeranjangView === 'function') {
      window.updateKeranjangView();
    } else if (typeof updateKeranjangView === 'function') {
      updateKeranjangView();
    }
  } catch (e) { /* ignore */ }

  // kembalikan array cart jika tersedia
  if (typeof window.getKasirCart === 'function') {
    return window.getKasirCart();
  }
  return items || [];
}

// Hapus listener addToCartAPI duplikat — produk-ke-keranjang.js sudah menangani tombol .btn-add-cart
// Jika ada listener lama yang memanggil addToCartAPI / getProductIdBySKU, hapus atau komentar.

// ===== Proses Pembayaran =====
// Hapus/replace definisi fungsi duplikat/keliru dan gunakan mapping body yang sesuai backend

// Proses Pembayaran (ambil cart dari frontend)
async function completeTransaction() {
  const storeId = getStoreId();
  const token = getToken();
  const userId = getUserId() || localStorage.getItem('user_id') || 1;
  const cart = (typeof window.getKasirCart === 'function') ? window.getKasirCart() : [];
  if (!storeId || !token || !cart.length) {
    alert('Data tidak lengkap atau keranjang kosong!');
    return;
  }

  const total_cost = cart.reduce((sum, item) => {
    // gunakan harga setelah diskon preview (frontend) untuk total_cost
    let harga = Number(item.price || 0);
    if (item.discount_type && item.discount_value) {
      if (item.discount_type === 'percentage') harga = Math.round(harga * (1 - item.discount_value / 100));
      else if (item.discount_type === 'amount' || item.discount_type === 'nominal') harga = Math.max(0, harga - Number(item.discount_value || 0));
    }
    return sum + harga * Number(item.quantity || 0);
  }, 0);

  const items = cart.map(item => ({
    product_id: item.id,
    quantity: item.quantity,
    price: item.price,
    discount_type: item.discount_type || null,
    discount_value: item.discount_value || 0,
    notes: item.notes || ""
  }));

  const body = {
    user_id: Number(userId),
    total_cost,
    payment_type: "tunai",
    payment_method: "cash",
    received_amount: total_cost,
    change_amount: 0,
    items
  };

  // debug: log payload (hapus di production)
  console.info('[kasir] transaksi payload', body);

  try {
    const res = await fetch(`http://103.126.116.119:5000/api/stores/${storeId}/transactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body)
    });

    // baca response text dulu (jika bukan JSON akan tetap terbaca)
    const text = await res.text();
    let data = null;
    try { data = JSON.parse(text); } catch(e) { data = { raw: text }; }

    console.info('[kasir] transaksi response', res.status, data);
    if (res.ok && data && data.success) {
      alert('Transaksi berhasil!');
      if (typeof window.getKasirCart === 'function') window.getKasirCart().length = 0;
      if (typeof window.updateKeranjangView === 'function') window.updateKeranjangView();
      else if (typeof updateKeranjangView === 'function') updateKeranjangView();
    } else {
      alert('Gagal transaksi: ' + (data?.message || res.status || JSON.stringify(data)));
    }
  } catch (err) {
    console.error('[kasir] transaksi fetch error', err);
    alert('Gagal transaksi: ' + (err.message || err));
  }
}

// Pencarian produk di kasir
async function cariProdukKasir(q) {
  const produkList = document.getElementById('produk-list-kasir');
  if (!produkList) return;
  produkList.innerHTML = '<p>Mencari produk...</p>';

  const storeId = getStoreId();
  if (!storeId) { produkList.innerHTML = '<p>Pilih toko terlebih dahulu.</p>'; return; }

  try {
    if (typeof window.apiRequest === 'function') {
      const res = await window.apiRequest(`/stores/${storeId}/products/search?query=${encodeURIComponent(q)}`);
      const products = extractProductsFromResponse(res);
      produkList.innerHTML = '';
      if (!products || products.length === 0) { produkList.innerHTML = '<p>Tidak ada produk ditemukan.</p>'; return; }
      products.forEach(product => {
        const card = document.createElement('div');
        card.className = 'card-produk-kasir';
        card.innerHTML = `
          <div class="judul-stok-produk">
            <div class="overflow-judul-produk" data-sku="${product.sku}" data-stock="${product.stock}">
              <h3>${product.name}</h3>
            </div>
            <p>${product.stock}</p>
          </div>
          <h3>Rp ${Number(product.sellPrice || product.price).toLocaleString('id-ID')}</h3>
          <p>SKU: ${product.sku}</p>
          <p>Kategori: ${product.category || '-'}</p>
          <button class="btn-add-cart"
            data-name="${product.name}"
            data-price="${product.sellPrice || product.price}"
            data-sku="${product.sku}"
            data-stock="${product.stock}">Tambah Ke Keranjang</button>
        `;
        produkList.appendChild(card);
      });
    } else {
      // fallback to renderProdukKasir with q
      await renderProdukKasir(q);
    }
  } catch (err) {
    produkList.innerHTML = '<p style="color:red;">Gagal mencari produk.</p>';
    console.error('Cari produk kasir error:', err);
  }
}

// Inisialisasi event pencarian
function inisialisasiPencarianKasir() {
  const searchInput = document.getElementById('search-produk-kasir');
  if (searchInput && !searchInput.dataset.listener) {
    let searchTimeout = null;
    searchInput.addEventListener('input', function () {
      const q = this.value.trim();
      clearTimeout(searchTimeout);
      if (q.length === 0) {
        renderProdukKasir();
        return;
      }
      searchTimeout = setTimeout(() => {
        cariProdukKasir(q);
      }, 400);
    });
    searchInput.dataset.listener = "true";
  }
}

// Replace previous DOMContentLoaded init with robust init that runs when kasir page is injected
let _kasirInitialized = false;

async function initKasirPage() {
  if (_kasirInitialized) return;
  const produkList = document.getElementById('produk-list-kasir');
  if (!produkList) return; // page not injected yet
  _kasirInitialized = true;

  console.log('[kasir] initKasirPage start');
  await renderProdukKasir();
  inisialisasiPencarianKasir();
  // renderCart dari wrapper frontend
  try { renderCart(); } catch(e) { console.error('[kasir] renderCart error', e); }

  // attach bayar button
  const bayarBtn = document.getElementById('btn-proses-bayar') || document.querySelector('.button-pembayaran a');
  if (bayarBtn) {
    bayarBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      await completeTransaction();
    });
  }
  console.log('[kasir] initKasirPage done');
}

// Try init immediately (in case kasir page already present)
initKasirPage().catch(e => console.error('[kasir] init immediate error', e));

// Observe app content for SPA injection and init when kasir page is added
const appContent = document.getElementById('app-content') || document.body;
const observer = new MutationObserver((mutations) => {
  for (const m of mutations) {
    if (m.addedNodes && m.addedNodes.length) {
      if (document.getElementById('produk-list-kasir')) {
        initKasirPage().catch(e => console.error('[kasir] init observer error', e));
        break;
      }
    }
  }
});
observer.observe(appContent, { childList: true, subtree: true });

// Fallback polling for 1st few seconds if MutationObserver misses
let _pollCount = 0;
const _pollInterval = setInterval(() => {
  if (_kasirInitialized) { clearInterval(_pollInterval); return; }
  _pollCount++;
  initKasirPage().catch(()=>{});
  if (_pollCount > 20) clearInterval(_pollInterval); // stop after ~10s
}, 500);