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
      const r = await fetch('http://103.126.116.119:8001/api/stores', { headers: { Authorization: `Bearer ${token}` }});
      const d = await r.json();
      return d.data?.stores || d.data.data || [];
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
      const url = `http://103.126.116.119:8001/api/stores/${storeId}/products${query ? `?q=${encodeURIComponent(query)}` : ''}`;
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
async function renderProdukKasir(q = '', category = '') {
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

  // Tambahkan parameter category jika ada
  let products = [];
  if (category) {
    await cariProdukKasir(q, category);
    // Jangan populate ulang kategori di sini, karena sudah di cariProdukKasir
    return;
  } else {
    products = await fetchProdukKasir(q);
  }

  produkList.innerHTML = '';
  if (!products || products.length === 0) {
    produkList.innerHTML = '<p>Tidak ada produk.</p>';
    return;
  }

  products.forEach(p => {
    // Ambil info diskon
    let promoLabel = '';
    if (p.promoType === 'percentage' && p.promoPercent > 0) {
      promoLabel = `<span class="badge-diskon diskon-persentase">${p.promoPercent}% OFF</span>`;
    } else if (p.promoType === 'buyxgety' && p.buyQty && p.freeQty) {
      promoLabel = `<span class="badge-diskon diskon-bxgy">Beli ${p.buyQty} Gratis ${p.freeQty}</span>`;
    } else if (p.promoType === 'amount' && p.promoAmount > 0) {
      promoLabel = `<span class="badge-diskon diskon-nominal">Potongan Rp ${Number(p.promoAmount).toLocaleString('id-ID')}</span>`;
    }

    // ✅ Tambah label bundle, cek semua kemungkinan field
    const isBundle = (p.promoType === 'bundle' || p.jenis_diskon === 'bundle');
    const bundleQty = p.bundleQty || p.diskon_bundle_min_qty || p.bundle_min_qty || 0;
    const bundleTotalPrice = p.bundleTotalPrice || p.diskon_bundle_value || p.bundle_total_price || 0;
    if (isBundle && bundleQty && bundleTotalPrice) {
      promoLabel += `<span class="badge-diskon diskon-bundle" title="Beli ${bundleQty} hanya Rp${Number(bundleTotalPrice).toLocaleString('id-ID')}">Promo Bundle: Beli ${bundleQty} hanya Rp${Number(bundleTotalPrice).toLocaleString('id-ID')}</span>`;
    }

    // Ambil gambar produk seperti di produk.js
    const imageUrlRaw = p.image_url || p.imageUrl || '';
    const imageUrl = imageUrlRaw
      ? (imageUrlRaw.startsWith('http') ? imageUrlRaw : `${window.BASE_URL.replace('/api','')}/${imageUrlRaw.replace(/^\/+/,'')}`)
      : '';
    // Fallback ke ikon jika gagal
    const imgTag = imageUrl
      ? `<img src="${imageUrl}" alt="Gambar Produk" class="gambar-produk-kasir"
          style="width:100%;height:150px;object-fit:cover;border-radius:8px;background:var(--foreground-color);"
          onerror="this.outerHTML='<span class=&quot;material-symbols-outlined card-icon&quot; style=&quot;font-size:30px;color:#b91c1c;background:#e4363638;&quot;>shopping_bag</span>';">`
      : `<span class="material-symbols-outlined card-icon" style="font-size:70px;color:#b91c1c;background:#e4363638;width:100%;height:150px;border-radius:8px;display:flex;justify-content:center;align-items:center;">shopping_bag</span>`;

    const card = document.createElement('div');
    card.className = 'card-produk-kasir';
    card.innerHTML = `
      ${imgTag}
      <div class="judul-stok-produk">
        <div class="overflow-judul-produk" data-sku="${p.sku}" data-stock="${p.stock}">
          <h3>${escapeHtml(p.name)}</h3>
        </div>
        <p>${p.stock}</p>
      </div>
      <h3>Rp ${Number(p.sellPrice ?? p.price ?? 0).toLocaleString('id-ID')}</h3>
      ${promoLabel ? `<div class="keterangan-diskon">${promoLabel}</div>` : ''}
      <p>Kategori: ${p.category ?? '-'}</p>
      <button class="btn-add-cart"
        data-id="${p.id ?? p.product_id ?? ''}"
        data-name="${escapeHtml(p.name)}"
        data-price="${Number(p.sellPrice ?? p.price ?? 0)}"
        data-sku="${p.sku ?? ''}"
        data-stock="${p.stock ?? p.stok ?? 0}"
        data-discount-type="${p.promoType || p.jenis_diskon || ''}"
        data-discount-value="${p.promoPercent || p.promoAmount || 0}"
        data-buy-qty="${p.buyQty || p.buy_qty || 0}"
        data-free-qty="${p.freeQty || p.free_qty || 0}"
        data-bundle-qty="${bundleQty}"
        data-bundle-value="${bundleTotalPrice}">
        Tambah Ke Keranjang
      </button>
    `;
    produkList.appendChild(card);
  });

  // PENTING: panggil ulang agar tombol kategori aktif
  populateCategoryDropdownKasir();
  inisialisasiKategoriKasir();
}

// ===== Simple escape helper =====
function escapeHtml(str = '') {
  return String(str).replace(/[&<>"'`=\/]/g, s => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;','/':'&#x2F;','`':'&#x60;','=':'&#x3D;'
  })[s]);
}

// ===== Barcode Scan Handler: Add to Cart Otomatis =====
window.onBarcodeScannedKasir = async function (barcode) {
  console.log('[Kasir] Barcode scanned:', barcode);
  try {
    const storeId = localStorage.getItem('store_id');
    const token = localStorage.getItem('token');
    if (!storeId) return showToastKasir('Pilih toko terlebih dahulu!', 'error');

    const url = `http://103.126.116.119:8001/api/stores/${storeId}/products/barcode/${encodeURIComponent(barcode)}`;
    const res = await fetch(url, { headers: { Authorization: 'Bearer ' + token } });
    const json = await res.json();

    const p = json?.data;
    const id = p?.id ?? p?.product_id ?? p?.productId ?? null;
    if (!p || !id) {
      showProductNotFoundModalKasir(barcode);
      return;
    }

    if (typeof addToCartFrontend === 'function') {
      addToCartFrontend({
        id: Number(id),
        name: p.name ?? p.title ?? '',
        price: Number(p.sellPrice ?? p.price ?? p.unit_price ?? 0),
        sku: p.sku ?? '',
        stock: Number(p.stock ?? p.quantity ?? 0),
        discount_type: p.jenis_diskon ?? p.discount_type ?? null,  // ✅ snake_case
        discount_value: Number(p.nilai_diskon ?? p.discount_value ?? 0),  // ✅ snake_case
        buy_qty: Number(p.buy_qty ?? 0),
        free_qty: Number(p.free_qty ?? 0),
        diskon_bundle_min_qty: Number(p.diskon_bundle_min_qty ?? p.bundle_min_qty ?? 0),  // ✅ BENAR
        diskon_bundle_value: Number(p.diskon_bundle_value ?? p.bundle_total_price ?? 0)   // ✅ BENAR
      });
      showToastKasir('Produk berhasil ditambahkan ke keranjang!', 'success');
    } else {
      showToastKasir('Produk ditemukan, tapi gagal menambah ke keranjang!', 'error');
    }
  } catch (err) {
    showToastKasir('Gagal mencari produk: ' + (err.message || err), 'error');
  }
};

// PERBAIKI: initializeAddToCartButtons - saat user klik tombol di card
function initializeAddToCartButtons() {
  document.addEventListener('click', function(e) {
    if (e.target.classList.contains('btn-add-cart')) {
      const button = e.target;
      
      const productData = {
        id: button.dataset.id,
        name: button.dataset.name,
        price: Number(button.dataset.price || 0),
        sku: button.dataset.sku,
        stock: Number(button.dataset.stock || 0),
        discount_type: button.dataset.discountType || null,
        discount_value: Number(button.dataset.discountValue || 0),
        buy_qty: Number(button.dataset.buyQty || 0),
        free_qty: Number(button.dataset.freeQty || 0),
        diskon_bundle_min_qty: Number(button.dataset.bundleQty || 0),      // ✅ PERBAIKI
        diskon_bundle_value: Number(button.dataset.bundleValue || 0)        // ✅ PERBAIKI
      };

      if (!productData.id || !productData.name) {
        console.error('Data produk tidak lengkap:', productData);
        showToastKasir('Data produk tidak lengkap', 'error');
        return;
      }

      if (typeof addToCartFrontend === 'function') {
        addToCartFrontend(productData);
        
        const originalText = button.textContent;
        const originalBgColor = button.style.backgroundColor;
        button.textContent = '✓ Ditambahkan';
        button.style.backgroundColor = '#10b981';
        button.style.color = '#ffffff';
        
        setTimeout(() => {
          button.textContent = originalText;
          button.style.backgroundColor = originalBgColor;
          button.style.color = '';
        }, 1000);
      } else {
        console.error('Fungsi addToCartFrontend tidak ditemukan');
        showToastKasir('Sistem keranjang belum siap. Silakan refresh halaman.', 'error');
      }
    }
  });
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
function applyBuyXGetYQuantity(item) {
  if (item.discount_type !== 'buyxgety') {
    item.buy_quantity = item.quantity;
    item.bonus_quantity = 0;
    return item;
  }

  const buyQty = Number(item.buy_qty || 0);
  const freeQty = Number(item.free_qty || 0);
  const buyCount = Number(item.quantity || 0);

  if (buyQty <= 0 || freeQty <= 0) {
    item.buy_quantity = buyCount;
    item.bonus_quantity = 0;
    return item;
  }

  const setCount = Math.floor(buyCount / buyQty);
  const bonus = setCount * freeQty;

  item.buy_quantity = buyCount;       // dibayar
  item.bonus_quantity = bonus;        // gratis
  item.quantity = buyCount + bonus;   // 🔥 keluar stok

  return item;
}


// ===== Proses Pembayaran =====
// Hapus/replace definisi fungsi duplikat/keliru dan gunakan mapping body yang sesuai backend

// Proses Pembayaran (simpan cart lokal dan redirect ke proses-pembayaran.html)
async function completeTransaction() {
  const storeId = getStoreId();
  const token = getToken();
  const userId = getUserId() || localStorage.getItem('user_id') || 1;
  const cart = (typeof window.getKasirCart === 'function') ? window.getKasirCart() : JSON.parse(localStorage.getItem('pos_cart') || '[]');
  if (!storeId || !token || !cart.length) {
    alert('Data tidak lengkap atau keranjang kosong!');
    return;
  }

  // Validasi stock sebelum transaksi
  for (const item of cart) {
    try {
      let productRes;
      if (typeof window.apiRequest === 'function') {
        productRes = await window.apiRequest(`/stores/${storeId}/products/${item.id}`);
      } else {
        const url = `http://103.126.116.119:8001/api/stores/${storeId}/products/${item.id}`;
        const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` }});
        productRes = await r.json();
      }
      const product = productRes?.data || productRes;
      const availableStock = Number(product?.stock ?? product?.stok ?? 0);
      if (item.quantity > availableStock) {
        alert(`Stok tidak cukup untuk produk "${item.name}". Tersedia: ${availableStock}, diminta: ${item.quantity}`);
        return;
      }
    } catch (err) {
      console.error('Error checking stock for product', item.id, err);
      alert(`Gagal memeriksa stok untuk produk "${item.name}". Silakan coba lagi.`);
      return;
    }
  }

  // Hitung total_cost dari cart
const total_cost = cart.reduce((sum, item) => {
  let harga = Number(item.price || 0);

  if (item.discount_type === 'percentage' && item.discount_value) {
    harga = Math.round(harga * (1 - item.discount_value / 100));
  } else if (
    (item.discount_type === 'amount' || item.discount_type === 'nominal') &&
    item.discount_value
  ) {
    harga = Math.max(0, harga - Number(item.discount_value || 0));
  }

  const qtyBayar = Number(item.buy_quantity || item.quantity || 0);
  return sum + harga * qtyBayar;
}, 0);


  // Simpan data cart ke localStorage untuk proses-pembayaran.html
  const cartData = {
    storeId,
    userId,
    cart,
    total_cost
  };
  localStorage.setItem('pending_transaction', JSON.stringify(cartData));

  // Redirect ke proses-pembayaran.html tanpa transaction_id
  window.location.href = `../pages/proses-pembayaran.html`;

  // Jangan clear cart di sini, biarkan sampai transaksi berhasil
}

// Pencarian produk di kasir
async function cariProdukKasir(q, category = '') {
  const produkList = document.getElementById('produk-list-kasir');
  if (!produkList) return;
  produkList.innerHTML = '<p>Mencari produk...</p>';

  const storeId = getStoreId();
  if (!storeId) { produkList.innerHTML = '<p>Pilih toko terlebih dahulu.</p>'; return; }

  try {
    let url = `/stores/${storeId}/products/search?`;
    const params = [];
    if (q) params.push(`query=${encodeURIComponent(q)}`);
    if (category) params.push(`category=${encodeURIComponent(category)}`);
    url += params.join('&');
    if (typeof window.apiRequest === 'function') {
      const res = await window.apiRequest(url);
      const products = extractProductsFromResponse(res);
      
      produkList.innerHTML = '';
      if (!products || products.length === 0) { produkList.innerHTML = '<p>Tidak ada produk ditemukan.</p>'; return; }
products.forEach(product => {
  // Ambil info diskon
  let promoLabel = '';
  if (product.promoType === 'percentage' && product.promoPercent > 0) {
    promoLabel = `<span class="badge-diskon diskon-persentase">${product.promoPercent}% OFF</span>`;
  } else if (product.promoType === 'buyxgety' && product.buyQty && product.freeQty) {
    promoLabel = `<span class="badge-diskon diskon-bxgy">Beli ${product.buyQty} Gratis ${product.freeQty}</span>`;
  } else if (product.promoType === 'amount' && product.promoAmount > 0) {
    promoLabel = `<span class="badge-diskon diskon-nominal">Potongan Rp ${Number(product.promoAmount).toLocaleString('id-ID')}</span>`;
  }

  // ✅ Tambah label bundle, cek semua kemungkinan field
  const isBundle = (product.promoType === 'bundle' || product.jenis_diskon === 'bundle');
  const bundleQty = product.bundleQty || product.diskon_bundle_min_qty || product.bundle_min_qty || 0;
  const bundleTotalPrice = product.bundleTotalPrice || product.diskon_bundle_value || product.bundle_total_price || 0;
  if (isBundle && bundleQty && bundleTotalPrice) {
    promoLabel += `<span class="badge-diskon diskon-bundle" title="Beli ${bundleQty} hanya Rp${Number(bundleTotalPrice).toLocaleString('id-ID')}">Beli ${bundleQty} hanya Rp${Number(bundleTotalPrice).toLocaleString('id-ID')}</span>`;
  }

  // Ambil gambar produk dari database (image_url atau imageUrl)
  const imageUrlRaw = product.image_url || product.imageUrl || '';
  const imageUrl = imageUrlRaw
    ? (imageUrlRaw.startsWith('http') ? imageUrlRaw : `${window.BASE_URL.replace('/api','')}/${imageUrlRaw.replace(/^\/+/,'')}`)
    : '';
  // Fallback ke ikon jika gagal
  const imgTag = imageUrl
    ? `<img src="${imageUrl}" alt="Gambar Produk" class="gambar-produk-kasir"
        style="width:100%;height:150px;object-fit:cover;border-radius:8px;background:var(--foreground-color);"
        onerror="this.outerHTML='<span class=&quot;material-symbols-outlined card-icon&quot; style=&quot;font-size:30px;color:#b91c1c;background:#e4363638;&quot;>shopping_bag</span>';">`
    : `<span class="material-symbols-outlined card-icon" style="font-size:70px;color:#b91c1c;background:#e4363638;width:100%;height:150px;border-radius:8px;display:flex;justify-content:center;align-items:center;">shopping_bag</span>`;

  const card = document.createElement('div');
  card.className = 'card-produk-kasir';
  card.innerHTML = `
    ${imgTag}
    <div class="judul-stok-produk">
      <div class="overflow-judul-produk" data-sku="${product.sku}" data-stock="${product.stock}">
        <h3>${product.name}</h3>
      </div>
      <p>${product.stock}</p>
    </div>
    <h3>Rp ${Number(product.sellPrice || product.price).toLocaleString('id-ID')}</h3>
    ${promoLabel ? `<div class="keterangan-diskon">${promoLabel}</div>` : ''}
    <p>SKU: ${product.sku}</p>
    <p>Kategori: ${product.category || '-'}</p>
    <button class="btn-add-cart"
      data-id="${product.id ?? product.product_id ?? ''}"
      data-name="${product.name}"
      data-price="${Number(product.sellPrice || product.price)}"
      data-sku="${product.sku}"
      data-stock="${product.stock}"
      data-discount-type="${product.promoType || product.jenis_diskon || ''}"
      data-discount-value="${product.promoPercent || product.promoAmount || 0}"
      data-buy-qty="${product.buyQty || product.buy_qty || 0}"
      data-free-qty="${product.freeQty || product.free_qty || 0}"
      data-bundle-qty="${bundleQty}"
      data-bundle-value="${bundleTotalPrice}">
      Tambah Ke Keranjang
    </button>
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

// Kategori tetap untuk kasir
const KATEGORI_LIST_KASIR = [
  "Kesehatan & Kecantikan",
  "Rumah Tangga & Gaya Hidup",
  "Fashion & Aksesoris",
  "Elektronik",
  "Bayi & Anak",
  "Makanan & Minuman"
];

let selectedCategoryKasir = '';

function populateCategoryDropdownKasir(categories = []) {
  const menu = document.getElementById('dropdown-menu-kasir');
  if (!menu) return;
  menu.innerHTML = '';

  // Tombol Semua Kategori
  const btnAll = document.createElement('button');
  btnAll.type = 'button';
  btnAll.dataset.category = '';
  btnAll.textContent = 'Semua Kategori';
  menu.appendChild(btnAll);

  // Tombol kategori tetap
  KATEGORI_LIST_KASIR.forEach(cat => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.dataset.category = cat;
    btn.textContent = cat;
    menu.appendChild(btn);
  });
}

function inisialisasiKategoriKasir() {
  const categoryButtons = document.querySelectorAll('#dropdown-menu-kasir button[data-category]');
  if (categoryButtons) {
    categoryButtons.forEach(btn => {
      btn.removeEventListener('click', btn._kasirClick); // Hapus event lama jika ada
      btn._kasirClick = function () {
        selectedCategoryKasir = btn.dataset.category || '';
        // tutup dropdown (jika menggunakan checkbox toggle)
        const toggle = document.getElementById('dropdown-toggle-kasir');
        if (toggle) toggle.checked = false;
        // jika ada text di search, jalankan cari dengan category, else render ulang products dengan category filter
        const q = (document.getElementById('search-produk-kasir') || {}).value || '';
        cariProdukKasir(q.trim(), selectedCategoryKasir);
      };
      btn.addEventListener('click', btn._kasirClick);
    });
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

// ===== FUNGSI BARU: Inisialisasi Event Listener untuk Tombol Tambah Ke Keranjang =====
function initializeAddToCartButtons() {
  // Event delegation untuk tombol "Tambah Ke Keranjang"
  document.addEventListener('click', function(e) {
    if (e.target.classList.contains('btn-add-cart')) {
      const button = e.target;
      
      // Ambil data dari atribut data-*
      const productData = {
        id: button.dataset.id,
        name: button.dataset.name,
        price: Number(button.dataset.price || 0),
        sku: button.dataset.sku,
        stock: Number(button.dataset.stock || 0),
        discount_type: button.dataset.discountType || null,
        discount_value: Number(button.dataset.discountValue || 0),
        buy_qty: Number(button.dataset.buyQty || 0),
        free_qty: Number(button.dataset.freeQty || 0),
        diskon_bundle_min_qty: Number(button.dataset.bundleQty || 0),      // ✅ PERBAIKI
        diskon_bundle_value: Number(button.dataset.bundleValue || 0)        // ✅ PERBAIKI
      };

      // Validasi data produk
      if (!productData.id || !productData.name) {
        console.error('Data produk tidak lengkap:', productData);
        showToastKasir('Data produk tidak lengkap', 'error');
        return;
      }

      // Panggil fungsi addToCartFrontend (pastikan sudah didefinisikan)
      if (typeof addToCartFrontend === 'function') {
        addToCartFrontend(productData);
        
        // Tampilkan feedback visual
        const originalText = button.textContent;
        const originalBgColor = button.style.backgroundColor;
        button.textContent = '✓ Ditambahkan';
        button.style.backgroundColor = '#10b981';
        button.style.color = '#ffffff';
        
        setTimeout(() => {
          button.textContent = originalText;
          button.style.backgroundColor = originalBgColor;
          button.style.color = '';
        }, 1000);
      } else {
        console.error('Fungsi addToCartFrontend tidak ditemukan');
        showToastKasir('Sistem keranjang belum siap. Silakan refresh halaman.', 'error');
      }
    }
  });
}

// ===== Inisialisasi halaman kasir =====
let _kasirInitialized = false;

async function initKasirPage() {
  if (_kasirInitialized) return;
  const produkList = document.getElementById('produk-list-kasir');
  if (!produkList) return; // page not injected yet
  _kasirInitialized = true;

  console.log('[kasir] initKasirPage start');
  
  // Inisialisasi tombol tambah ke keranjang
  initializeAddToCartButtons();
  
  await renderProdukKasir();
  populateCategoryDropdownKasir();
  inisialisasiKategoriKasir();
  inisialisasiPencarianKasir();
  
  // renderCart dari wrapper frontend
  try { 
    if (typeof updateKeranjangView === 'function') {
      updateKeranjangView();
    }
  } catch(e) { 
    console.error('[kasir] renderCart error', e); 
  }

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

// Handler barcode khusus kasir (panggil ini/definisikan ini di file ini)
window.onBarcodeScannedKasir = async function (barcode) {
  console.log('[Kasir] Barcode scanned:', barcode);
  try {
    const storeId = localStorage.getItem('store_id');
    const token = localStorage.getItem('token');
    if (!storeId) return showToastKasir('Pilih toko terlebih dahulu!', 'error');

    // Fetch produk by barcode
    const url = `http://103.126.116.119:8001/api/stores/${storeId}/products/barcode/${encodeURIComponent(barcode)}`;
    console.log('[Kasir] Fetching:', url);
    const res = await fetch(url, { headers: { Authorization: 'Bearer ' + token } });
    const json = await res.json();
    console.log('[Kasir] Fetch result:', json);

    // Pastikan produk ditemukan dan ID valid
    const p = json?.data;
    const id = p?.id ?? p?.product_id ?? p?.productId ?? null;
    if (!p || !id) {
      showProductNotFoundModalKasir(barcode);
      return;
    }

    // Panggil addToCartFrontend dengan data produk hasil fetch
    if (typeof addToCartFrontend === 'function') {
      addToCartFrontend({
        id: Number(id),
        name: p.name ?? p.title ?? '',
        price: Number(p.sellPrice ?? p.price ?? p.unit_price ?? 0),
        sku: p.sku ?? '',
        stock: Number(p.stock ?? p.quantity ?? 0),
        discount_type: p.discount_type ?? p.jenis_diskon ?? null,
        discount_value: Number(p.discount_value ?? p.nilai_diskon ?? 0),
        buy_qty: Number(p.buyQty ?? 0),
        free_qty: Number(p.freeQty ?? 0),
        bundle_qty: Number(p.bundle_min_qty ?? p.diskon_bundle_min_qty ?? 0),
        bundle_value: Number(p.bundle_total_price ?? p.diskon_bundle_value ?? 0)
      });
      showToastKasir('Produk berhasil ditambahkan ke keranjang!', 'success');
    } else {
      showToastKasir('Produk ditemukan, tapi gagal menambah ke keranjang!', 'error');
    }
  } catch (err) {
    showToastKasir('Gagal mencari produk: ' + (err.message || err), 'error');
  }
};

// Daftarkan handler barcode kasir ke dispatcher barcode.js
if (typeof window.registerBarcodeHandler === 'function') {
  window.registerBarcodeHandler(window.onBarcodeScannedKasir);
}

// Pastikan juga handler global diarahkan ke kasir saat halaman kasir aktif
window.onBarcodeScanned = window.onBarcodeScannedKasir;

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
}, 500);

document.addEventListener('DOMContentLoaded', () => {
  window.updateHeaderStoreName(); // TAMBAH BARIS INI
});

async function scanAndAddToCart(barcode) {
  const storeId = localStorage.getItem('store_id');
  const token = localStorage.getItem('token');
  if (!storeId) {
    showToastKasir('Pilih toko terlebih dahulu!', 'error');
    return;
  }
  try {
    // Fetch produk by barcode
    const url = `http://103.126.116.119:8001/api/stores/${storeId}/products/barcode/${encodeURIComponent(barcode)}`;
    const res = await fetch(url, { headers: { Authorization: 'Bearer ' + token } });
    const json = await r.json();
    const p = json?.data;
    const id = p?.id ?? p?.product_id ?? p?.productId ?? null;
    if (!p || !id) {
      showProductNotFoundModalKasir(barcode);
      return;
    }
    // Tambahkan produk ke keranjang
    if (typeof addToCartFrontend === 'function') {
      addToCartFrontend({
        id: Number(id),
        name: p.name ?? p.title ?? '',
        price: Number(p.sellPrice ?? p.price ?? p.unit_price ?? 0),
        sku: p.sku ?? '',
        stock: Number(p.stock ?? p.quantity ?? 0),
        discount_type: p.discount_type ?? p.jenis_diskon ?? null,
        discount_value: Number(p.discount_value ?? p.nilai_diskon ?? 0),
        buy_qty: Number(p.buyQty ?? 0),
        free_qty: Number(p.freeQty ?? 0),
        bundle_qty: Number(p.bundle_min_qty ?? p.diskon_bundle_min_qty ?? 0),
        bundle_value: Number(p.bundle_total_price ?? p.diskon_bundle_value ?? 0)
      });
      showToastKasir('Produk berhasil ditambahkan ke keranjang!', 'success');
    }
  } catch (err) {
    showToastKasir('Gagal mencari produk: ' + (err.message || err), 'error');
  }
}

// Handler utama: hanya di kasir, override global handler
window.handleScannedBarcode = function(barcode) {
  if (typeof scanAndAddToCart === 'function') {
    scanAndAddToCart(barcode);
  } else if (typeof window.onBarcodeScannedKasir === 'function') {
    window.onBarcodeScannedKasir(barcode);
  }
};

// ===== Perbaikan: Pastikan ada fallback untuk fungsi addToCartFrontend jika belum didefinisikan =====
if (typeof addToCartFrontend === 'undefined') {
  // Fallback sederhana jika produk-ke-keranjang.js belum dimuat
  window.addToCartFrontend = function(productData) {
    console.log('Fallback addToCartFrontend dipanggil:', productData);
    
    // Ambil cart dari localStorage
    let cart = JSON.parse(localStorage.getItem('pos_cart') || '[]');
    
    // Cari produk yang sudah ada di cart
    const existingIndex = cart.findIndex(item => String(item.id) === String(productData.id));
    
    if (existingIndex !== -1) {
      // Produk sudah ada, tambah quantity
      const item = cart[existingIndex];
      if (item.discount_type !== 'buyxgety') {
        item.quantity = (item.quantity || 0) + 1;
      }
      item.buy_quantity = (item.buy_quantity || 0) + 1;
    } else {
      // Produk baru, tambahkan ke cart
      const newItem = {
        id: Number(productData.id),
        name: productData.name,
        price: productData.price,
        sku: productData.sku,
        stock: productData.stock,
        buy_quantity: 1,
        bonus_quantity: 0,
        quantity: productData.discount_type === 'buyxgety' ? 1 : 1,
        discount_type: productData.discount_type || null,
        discount_value: productData.discount_value || 0,
        buy_qty: productData.buy_qty || 0,
        free_qty: productData.free_qty || 0,
        bundle_qty: productData.bundle_qty || 0,
        bundle_value: productData.bundle_value || 0
      };
      cart.push(newItem);
    }
    
    // Simpan ke localStorage
    localStorage.setItem('pos_cart', JSON.stringify(cart));
    
    // Update tampilan keranjang jika fungsi tersedia
    if (typeof updateKeranjangView === 'function') {
      updateKeranjangView();
    }
    
    // Tampilkan notifikasi
    showToastKasir('Produk berhasil ditambahkan ke keranjang!', 'success');
  };
}