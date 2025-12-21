// helper: ekstrak array produk dari berbagai bentuk response API
function extractProductsFromResponse(res) {
  if (!res) return [];
  if (Array.isArray(res)) return res;
  if (Array.isArray(res.data)) return res.data;
  if (res.data && Array.isArray(res.data.items)) return res.data.items;
  if (res.data && Array.isArray(res.data.products)) return res.data.products;
  return [];
}

// ===== store selector (owner) =====
async function fetchStoresForOwner() {
  try {
    const res = await window.apiRequest('/stores'); // ambil semua toko untuk owner
    // debug singkat (hapus/komentari bila sudah ok)
    console.log('fetchStoresForOwner response:', res);

    // berbagai kemungkinan shape response:
    // 1) res = [ ... ]
    // 2) res = { data: [ ... ] }
    // 3) res = { data: { stores: [ ... ] } }
    // 4) res = { stores: [ ... ] }
    // 5) res = { data: { items: [ ... ] } }
    let stores = [];

    if (Array.isArray(res)) {
      stores = res;
    } else if (Array.isArray(res.data)) {
      stores = res.data;
    } else if (res?.data?.stores && Array.isArray(res.data.stores)) {
      stores = res.data.stores;
    } else if (res?.stores && Array.isArray(res.stores)) {
      stores = res.stores;
    } else if (res?.data?.items && Array.isArray(res.data.items)) {
      stores = res.data.items;
    } else {
      // fallback: sometimes API nests under data -> data
      const maybe = res?.data?.data;
      if (Array.isArray(maybe)) stores = maybe;
    }

    return stores;
  } catch (err) {
    console.error('Gagal mengambil list toko:', err);
    return [];
  }
}

function showStoreSelector(stores) {
  const modal = document.getElementById('store-selector-modal');
  const list = document.getElementById('store-list');
  if (!modal || !list) return;
  list.innerHTML = '';
  if (stores.length === 0) {
    list.innerHTML = '<p style="color:#fff">Tidak ada toko. Tekan Refresh.</p>';
  } else {
    stores.forEach(s => {
      const el = document.createElement('div');
      el.style.padding = '8px';
      el.style.marginBottom = '6px';
      el.style.background = '#2a1f1f';
      el.style.borderRadius = '6px';
      el.style.cursor = 'pointer';
      el.style.color = '#fff';
      el.textContent = `${s.name || s.storeName || s.title || 'Toko'}${s.id ? ' — ID: ' + s.id : ''}`;
      el.dataset.storeId = s.id;
      el.addEventListener('click', () => {
        localStorage.setItem('store_id', String(s.id));
        modal.style.display = 'none';
        if (window.renderProdukPage) window.renderProdukPage();
      });
      list.appendChild(el);
    });
  }
  modal.style.display = 'flex';
  document.getElementById('store-refresh').onclick = async () => {
    const newStores = await fetchStoresForOwner();
    showStoreSelector(newStores);
  };
  document.getElementById('store-cancel').onclick = () => {
    modal.style.display = 'none';
  };
}

// ===== category + search integration =====
// global selected category
let selectedCategory = '';


document.addEventListener('DOMContentLoaded', async () => {
  // Hanya jalankan kode list produk jika ada elemen .list-produk
  const listProdukEl = document.querySelector('.list-produk');
  if (!listProdukEl) return;

  // Cek token dulu; jangan gunakan storeId sebelum dideklarasi
  const token = localStorage.getItem('token');
  if (!token) {
    window.location.href = 'login.html';
    return;
  }

  // ambil storeId setelah cek token
  const storeId = localStorage.getItem('store_id');
  if (!storeId) {
    const stores = await fetchStoresForOwner();
    showStoreSelector(stores);
    return; // tunggu pilihan store
  }

  try {
    // Ambil daftar produk dari API
    const res = await window.apiRequest(`/stores/${storeId}/products`);
    console.log('API Response:', res);

    // Perbaikan parsing response
    const products = extractProductsFromResponse(res);
    listProdukEl.innerHTML = '';

    if (products.length === 0) {
      listProdukEl.innerHTML = '<p>Tidak ada produk.</p>';
      return;
    }

    products.forEach(product => {
      const productCard = `
        <div class="card-produk">
          <span class="material-symbols-outlined card-icon">shopping_bag</span>
          <div class="info-produk">
            <div class="nama-produk-stok-wrapper">
              <h4>${product.name}</h4>
              <h4>Stok: ${product.stock}</h4>
            </div>
            <div class="kode-harga-button-wrapper">
              <div class="kode-harga-wrapper">
                <p class="kode-produk">SKU: ${product.sku}</p>
                <p class="harga-produk">Rp ${Number(product.sellPrice || product.price).toLocaleString('id-ID')}</p>
              </div>
              <div class="button-produk-wrapper">
                <button class="edit-produk" onclick="loadPage('editProduk', {id: ${product.id}})"><span class="material-symbols-outlined">edit</span></button>
                <button class="hapus-produk" onclick="hapusProduk(${product.id})"><span class="material-symbols-outlined">delete</span></button>
              </div>
            </div>
          </div>
        </div>
      `;
      listProdukEl.innerHTML += productCard;
    });

    // Panggil inisialisasi pencarian di sini
    inisialisasiPencarianProduk();

  } catch (err) {
    console.error('Gagal memuat daftar produk:', err);
    if (listProdukEl) listProdukEl.innerHTML = '<p style="color:red;">Gagal memuat produk.</p>';
  }
});

window.tambahProduk = async function tambahProduk() {
  const storeId = localStorage.getItem('store_id');
  if (!storeId) { alert('Store ID tidak ditemukan. Silakan login ulang.'); return; }

  const namaProduk = (document.getElementById('nama-produk').value || '').trim();
  const barcode = (document.getElementById('product-barcode').value || '').trim();
  const hargaModal = Number(document.getElementById('harga-modal').value || 0);
  const hargaJual = Number(document.getElementById('harga-jual').value || 0);
  const sku = (document.getElementById('sku').value || '').trim();
  const stok = Number(document.getElementById('stok').value || 0);
  const kategori = document.getElementById('kategori').value;
  if (!kategori) { alert('Kategori wajib dipilih!'); return; }
  const deskripsi = (document.getElementById('deskripsi').value || '').trim();
  const imageUrl = (document.getElementById('image-url').value || '').trim();
  const promoType = document.getElementById('promo-type').value || "";

  // Mapping promo sesuai backend
  let jenis_diskon = null;
  let nilai_diskon = null;
  let diskon_bundle_min_qty = null;
  let diskon_bundle_value = null;
  let buy_qty = null;
  let free_qty = null;

  if (promoType === "percentage") {
    jenis_diskon = "percentage";
    nilai_diskon = Number(document.getElementById('promo-percent').value || 0);
  } else if (promoType === "amount") {
    jenis_diskon = "amount";
    nilai_diskon = Number(document.getElementById('promo-amount').value || 0);
  } else if (promoType === "buyxgety") {
    jenis_diskon = "buyxgety";
    buy_qty = Number(document.getElementById('buy-qty').value || 0);
    free_qty = Number(document.getElementById('free-qty').value || 0);
  } else if (promoType === "bundle") {
    jenis_diskon = "bundle";
    diskon_bundle_min_qty = Number(document.getElementById('bundle-qty').value || 0);
    diskon_bundle_value = Number(document.getElementById('bundle-total-price').value || 0);
  }

  const produkBaru = {
    name: namaProduk,
    sku: sku,
    barcode: barcode,
    price: hargaJual,
    cost_price: hargaModal,
    stock: stok,
    category: kategori,
    description: deskripsi,
    image_url: imageUrl,
    jenis_diskon,
    nilai_diskon,
    diskon_bundle_min_qty,
    diskon_bundle_value,
    buy_qty,
    free_qty
  };

  // Hapus field null
  Object.keys(produkBaru).forEach(key => {
    if (produkBaru[key] === null) delete produkBaru[key];
  });

  console.log('Payload:', produkBaru);

  try {
    const res = await window.apiRequest(`/stores/${storeId}/products`, {
      method: 'POST',
      body: produkBaru,
    });

    const productId = res?.data?.id || res?.id;
    if (productId) await uploadGambarProduk(productId);

    alert('Produk berhasil ditambahkan!');
    window.location.href = 'index.html#produk';
  } catch (err) {
    console.error('Gagal menambahkan produk:', err);
    const serverMsg = err.response?.message || err.message || JSON.stringify(err.response) || 'Terjadi kesalahan server';
    alert(`Gagal menambahkan produk: ${serverMsg}`);
  }
};

// async function editProduk(productId) {
//   const storeId = localStorage.getItem('store_id');
//   if (!storeId) {
//     alert('Silakan pilih toko terlebih dahulu!');
//     return;
//   }

//   // Ambil data produk lama (opsional, bisa fetch detail produk jika mau)
//   // Prompt input baru
//   const namaProduk = prompt('Nama produk baru:');
//   const sku = prompt('SKU baru:');
//   const hargaJual = prompt('Harga jual baru:');
//   const stok = prompt('Stok baru:');
//   const imageUrl = prompt('URL gambar baru:');
//   const isActive = confirm('Produk aktif? (OK=Ya, Cancel=Tidak)');
//   const jenisDiskon = prompt('Jenis diskon (nominal/percentage):');
//   const nilaiDiskon = prompt('Nilai diskon:');
//   const diskonBundleMinQty = prompt('Min qty bundle:');
//   const diskonBundleValue = prompt('Nilai diskon bundle:');

//   const body = {
//     name: namaProduk,
//     sku: sku,
//     price: Number(hargaJual),
//     stock: Number(stok),
//     image_url: imageUrl,
//     is_active: isActive,
//     jenis_diskon: jenisDiskon,
//     nilai_diskon: Number(nilaiDiskon),
//     diskon_bundle_min_qty: Number(diskonBundleMinQty),
//     diskon_bundle_value: Number(diskonBundleValue)
//   };

//   try {
//     await window.apiRequest(`/stores/${storeId}/products/${productId}`, {
//       method: 'PUT',
//       body
//     });
//     alert('Produk berhasil diupdate!');
//     window.renderProdukPage();
//   } catch (err) {
//     console.error('Gagal update produk:', err);
//     alert('Gagal update produk!');
//   }
// }

async function hapusProduk(productId) {
  const storeId = localStorage.getItem('store_id');
  if (!storeId) {
    alert('Silakan pilih toko terlebih dahulu!');
    return;
  }
  const konfirmasi = confirm('Yakin ingin menghapus produk ini?');
  if (!konfirmasi) return;

  try {
    await window.apiRequest(`/stores/${storeId}/products/${productId}`, {
      method: 'DELETE'
    });
    alert('Produk berhasil dihapus!');
    window.renderProdukPage();
  } catch (err) {
    console.error('Gagal hapus produk:', err);
    alert('Gagal hapus produk!');
  }
}

// function generateBarcode() {
//   const barcodeValue = document.getElementById('barcode-value').value;
//   if (!barcodeValue) {
//     alert('Masukkan nilai barcode terlebih dahulu!');
//     return;
//   }

//   // Simpan barcode ke input produk
//   document.getElementById('product-barcode').value = barcodeValue;

//   // Generate barcode preview
//   JsBarcode('#barcode-preview', barcodeValue, {
//     format: 'CODE128',
//     displayValue: true,
//     fontSize: 20,
//   });
// }

// ...existing code...

async function uploadGambarProduk(productId, file) {
  // jika file tidak diberikan, ambil dari input page saat ini
  let fileToUpload = file;
  if (!fileToUpload) {
    const imageInput = document.getElementById('product-image');
    fileToUpload = imageInput && imageInput.files ? imageInput.files[0] : null;
  }

  if (!fileToUpload) return; // tidak ada file, tidak perlu upload

  const formData = new FormData();
  formData.append('image', fileToUpload);
  formData.append('product_id', productId);

  try {
    const token = localStorage.getItem('token');
    const res = await fetch(`${BASE_URL}/products/upload-image`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`
        // Jangan set Content-Type, biarkan browser atur boundary
      },
      body: formData
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Gagal upload gambar produk');
    return data;
  } catch (err) {
    console.error('Gagal upload gambar produk:', err);
    throw err;
  }
}

// expose ke global agar bisa dipanggil dari edit-produk.js
window.uploadGambarProduk = uploadGambarProduk;

// ...existing code...
// Pastikan semua tombol edit menggunakan loadPage('editProduk', {id: ...})
// Ganti sisa editProduk(...) references jika ada

function handleDiskonChange() {
  const jenisDiskon = document.getElementById('jenis-diskon').value;

  // Sembunyikan semua input diskon
  document.getElementById('diskon-persentase-wrapper').style.display = 'none';
  document.getElementById('buyxgety-wrapper').style.display = 'none';
  document.getElementById('bundle-wrapper').style.display = 'none';

  // Tampilkan input sesuai jenis diskon
  if (jenisDiskon === 'percentage') {
    document.getElementById('diskon-persentase-wrapper').style.display = 'block';
  } else if (jenisDiskon === 'buyxgety') {
    document.getElementById('buyxgety-wrapper').style.display = 'block';
  } else if (jenisDiskon === 'bundle') {
    document.getElementById('bundle-wrapper').style.display = 'block';
  }
}

// produk.js
// ...existing code...
window.renderProdukPage = async function renderProdukPage() {
  const listProdukEl = document.querySelector('.list-produk');
  if (!listProdukEl) return;

  // cek token dulu
  const token = localStorage.getItem('token');
  if (!token) {
    window.location.href = 'login.html';
    return;
  }

  // ambil storeId; jika belum ada (owner), tampilkan selector toko dan TIDAK redirect
  const storeId = localStorage.getItem('store_id');
  if (!storeId) {
    const stores = await fetchStoresForOwner();
    showStoreSelector(stores);
    return; // tunggu pilihan store
  }

  // sudah ada token & storeId -> lanjut ambil produk
  try {
    const res = await window.apiRequest(`/stores/${storeId}/products`);
    const products = extractProductsFromResponse(res);
    listProdukEl.innerHTML = '';

    // update statistik dasar (total & kategori) berdasarkan products
    const totalProdukEl = document.querySelector('.card-detail-produk .detail-produk-info h5 + p');
    const kategoriSet = new Set(products.map(p => p.category).filter(Boolean));
    if (totalProdukEl) totalProdukEl.textContent = products.length;
    const kategoriCountEl = Array.from(document.querySelectorAll('.card-detail-produk .detail-produk-info h5'))
      .find(el => el.textContent.trim().toLowerCase() === 'kategori')?.nextElementSibling;
    if (kategoriCountEl) kategoriCountEl.textContent = kategoriSet.size;

    // ambil stok menipis via API terpisah
    try {
      const stokRes = await window.apiRequest(`/stores/${storeId}/products/low-stock?threshold=10`);
      const stokCount = stokRes?.data?.count ?? 0;
      const stokEl = Array.from(document.querySelectorAll('.card-detail-produk .detail-produk-info h5'))
        .find(el => el.textContent.trim().toLowerCase() === 'stok menipis')?.nextElementSibling;
      if (stokEl) stokEl.textContent = stokCount;
    } catch (err) {
      // keep silent, tampilkan ! jika gagal
      const stokEl = Array.from(document.querySelectorAll('.card-detail-produk .detail-produk-info h5'))
        .find(el => el.textContent.trim().toLowerCase() === 'stok menipis')?.nextElementSibling;
      if (stokEl) stokEl.textContent = '!';
    }

    // populate kategori dropdown
    populateCategoryDropdown(Array.from(kategoriSet));

    if (!products || products.length === 0) {
      listProdukEl.innerHTML = '<p>Tidak ada produk.</p>';
      return;
    }

    products.forEach(product => {
      const productCard = `
        <div class="card-produk">
          <span class="material-symbols-outlined card-icon">shopping_bag</span>
          <div class="info-produk">
            <div class="nama-produk-stok-wrapper">
              <h4>${product.name}</h4>
              <h4>Stok: ${product.stock}</h4>
            </div>
            <div class="kode-harga-button-wrapper">
              <div class="kode-harga-wrapper">
                <p class="kode-produk">SKU: ${product.sku}</p>
                <p class="harga-produk">Rp ${Number(product.sellPrice || product.price).toLocaleString('id-ID')}</p>
              </div>
              <div class="button-produk-wrapper">
                <button class="edit-produk" onclick="loadPage('editProduk', {id: ${product.id}})"><span class="material-symbols-outlined">edit</span></button>
                <button class="hapus-produk" onclick="hapusProduk(${product.id})"><span class="material-symbols-outlined">delete</span></button>
              </div>
            </div>
          </div>
        </div>
      `;
      listProdukEl.innerHTML += productCard;
    });

    inisialisasiPencarianProduk();
  } catch (err) {
    console.error('Gagal memuat daftar produk:', err);
    listProdukEl.innerHTML = '<p style="color:red;">Gagal memuat produk.</p>';
  }
};
// ...existing code...

async function renderProdukStats() {
  const storeId = localStorage.getItem('store_id');
  if (!storeId) return;

  // Ambil elemen info
  const totalProdukEl = document.querySelectorAll('.card-detail-produk .detail-produk-info h5 + p')[0];
  const stokMenipisEl = document.querySelectorAll('.card-detail-produk .detail-produk-info h5 + p')[1];
  const kategoriCountEl = document.querySelectorAll('.card-detail-produk .detail-produk-info h5 + p')[2];

  try {
    const res = await window.apiRequest(`/stores/${storeId}/products/stats`);
    const stats = res?.data || {};

    if (totalProdukEl) totalProdukEl.textContent = stats.total ?? '-';
    if (stokMenipisEl) stokMenipisEl.textContent = stats.low_stock ?? '-';
    if (kategoriCountEl) kategoriCountEl.textContent = stats.categories ?? '-';
  } catch (err) {
    if (totalProdukEl) totalProdukEl.textContent = '!';
    if (stokMenipisEl) stokMenipisEl.textContent = '!';
    if (kategoriCountEl) kategoriCountEl.textContent = '!';
  }
}

// juga perbaiki bagian cariProduk rendering (ganti editProduk -> loadPage)
async function cariProduk(q, category = '') {
  const listProdukEl = document.querySelector('.list-produk');
  const storeId = localStorage.getItem('store_id');
  if (!listProdukEl || !storeId) return;

  listProdukEl.innerHTML = '<p>Mencari produk...</p>';
  try {
    const categoryQuery = category ? `&category=${encodeURIComponent(category)}` : '';
    const res = await window.apiRequest(`/stores/${storeId}/products/search?query=${encodeURIComponent(q)}${categoryQuery}`);
    const products = extractProductsFromResponse(res);
    listProdukEl.innerHTML = '';

    if (products.length === 0) {
      listProdukEl.innerHTML = '<p>Tidak ada produk ditemukan.</p>';
      return;
    }

    products.forEach(product => {
      const productCard = `
        <div class="card-produk">
          <span class="material-symbols-outlined card-icon">shopping_bag</span>
          <div class="info-produk">
            <div class="nama-produk-stok-wrapper">
              <h4>${product.name}</h4>
              <h4>Stok: ${product.stock}</h4>
            </div>
            <div class="kode-harga-button-wrapper">
              <div class="kode-harga-wrapper">
                <p class="kode-produk">SKU: ${product.sku}</p>
                <p class="harga-produk">Rp ${Number(product.sellPrice || product.price).toLocaleString('id-ID')}</p>
              </div>
              <div class="button-produk-wrapper">
                <button class="edit-produk" onclick="loadPage('editProduk', {id: ${product.id}})"><span class="material-symbols-outlined">edit</span></button>
                <button class="hapus-produk" onclick="hapusProduk(${product.id})"><span class="material-symbols-outlined">delete</span></button>
              </div>
            </div>
          </div>
        </div>
      `;
      listProdukEl.innerHTML += productCard;
    });
  } catch (err) {
    listProdukEl.innerHTML = '<p style="color:red;">Gagal mencari produk.</p>';
    console.error('Cari produk error:', err);
  }
}

function inisialisasiPencarianProduk() {
  const searchInput = document.querySelector('.bar-pencarian-produk input[type="text"]');
  if (searchInput && !searchInput.dataset.listener) {
    let searchTimeout = null;
    searchInput.addEventListener('input', function () {
      const q = this.value.trim();
      clearTimeout(searchTimeout);
      if (q.length === 0) {
        // jika kosong, render ulang semua produk (untuk store terpilih)
        if (window.renderProdukPage) window.renderProdukPage();
        return;
      }
      searchTimeout = setTimeout(() => {
        cariProduk(q, selectedCategory);
      }, 400);
    });
    searchInput.dataset.listener = "true";
  }

  // category buttons
  const categoryButtons = document.querySelectorAll('.dropdown-menu button[data-category]');
  if (categoryButtons) {
    categoryButtons.forEach(btn => {
      if (btn.dataset.bound) return;
      btn.addEventListener('click', () => {
        selectedCategory = btn.dataset.category || '';
        // tutup dropdown (jika menggunakan checkbox toggle)
        const toggle = document.getElementById('dropdown-toggle');
        if (toggle) toggle.checked = false;
        // jika ada text di search, jalankan cari dengan category, else render ulang products dengan category filter
        const q = (document.querySelector('.bar-pencarian-produk input[type="text"]') || {}).value || '';
        if (q.trim().length > 0) {
          cariProduk(q.trim(), selectedCategory);
        } else {
          // ambil ulang daftar produk utama lalu filter client-side berdasarkan category
          if (window.renderProdukPage) window.renderProdukPage();
        }
      });
      btn.dataset.bound = '1';
    });
  }
}

function populateCategoryDropdown(categories = []) {
  const menu = document.querySelector('.dropdown-menu');
  if (!menu) return;
  menu.innerHTML = '';

  // Tombol Semua Kategori
  const btnAll = document.createElement('button');
  btnAll.type = 'button';
  btnAll.dataset.category = '';
  btnAll.textContent = 'Semua Kategori';
  menu.appendChild(btnAll);

  // Tombol kategori unik (urutkan agar konsisten)
  Array.from(new Set(categories)).sort().forEach(cat => {
    if (!cat) return;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.dataset.category = cat;
    btn.textContent = cat;
    menu.appendChild(btn);
  });
}

// ...existing code...

// global handler dipanggil dari barcode.js saat scan sukses
window.onBarcodeScanned = async function(barcode) {
  const listProdukEl = document.querySelector('.list-produk');
  const storeId = localStorage.getItem('store_id');
  if (!storeId) {
    // owner belum pilih toko -> show selector
    const stores = await fetchStoresForOwner();
    showStoreSelector(stores);
    return;
  }
  if (!listProdukEl) return;

  // cepat tampil loading
  listProdukEl.innerHTML = '<p>Mencari produk berdasarkan barcode...</p>';
  try {
    const res = await window.apiRequest(`/stores/${storeId}/products/barcode/${encodeURIComponent(barcode)}`);
    // backend kemungkinan mengemas data di res.data atau res.data.data
    const product = res?.data || res;
    // jika backend mengembalikan success:false -> treat as not found
    if (!product || (product.success === false && !product.data)) {
      // produk tidak ditemukan -> tanya pengguna
      const tambah = confirm('Produk belum terdaftar. Tambah produk baru dengan barcode ini?');
      if (tambah) {
        // buka halaman tambah-produk dengan barcode terisi
        if (window.loadPage) {
          // jika SPA router tersedia
          window.loadPage('tambahProduk', { barcode });
        } else {
          // fallback: buka halaman langsung dengan query param
          window.location.href = `../pages/tambah-produk.html?barcode=${encodeURIComponent(barcode)}`;
        }
      } else {
        // batalkan: render pesan kosong atau restore produk list
        listProdukEl.innerHTML = '<p>Tidak ada produk ditemukan.</p>';
      }
      return;
    }

    // jika product object penuh berada di product.data
    const p = product?.data || product;
    // render single product card (mirip card rendering)
    listProdukEl.innerHTML = `
      <div class="card-produk">
        <span class="material-symbols-outlined card-icon">shopping_bag</span>
        <div class="info-produk">
          <div class="nama-produk-stok-wrapper">
            <h4>${p.name || p.nama || '-'}</h4>
            <h4>Stok: ${p.stock ?? p.stok ?? 0}</h4>
          </div>
          <div class="kode-harga-button-wrapper">
            <div class="kode-harga-wrapper">
              <p class="kode-produk">SKU: ${p.sku || p.SKU || ''}</p>
              <p class="harga-produk">Rp ${Number(p.sellPrice || p.price || p.hargaJual || 0).toLocaleString('id-ID')}</p>
            </div>
            <div class="button-produk-wrapper">
              <button class="edit-produk" onclick="loadPage && loadPage('editProduk', {id: ${p.id}})"><span class="material-symbols-outlined">edit</span></button>
              <button class="hapus-produk" onclick="hapusProduk(${p.id})"><span class="material-symbols-outlined">delete</span></button>
            </div>
          </div>
        </div>
      </div>
    `;
  } catch (err) {
    console.error('Error mencari produk by barcode:', err);
    listProdukEl.innerHTML = '<p style="color:red;">Gagal mencari produk.</p>';
  }
};

// ...existing code...