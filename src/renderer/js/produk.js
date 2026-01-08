function extractProductsFromResponse(res) {
  console.log('🔍 [DEBUG] Response API raw:', res); // DEBUG LINE
  
  if (!res) {
    console.warn('❌ Response kosong');
    return [];
  }
  
  // Periksa jika ada data yang memiliki property 'items'
  if (res.data && res.data.items) {
    console.log(`✅ [DEBUG] Format: {data: {items: [...]}, items: ${res.data.items.length}}`);
    return res.data.items;
  }

  // Cek jika ada 'items' langsung di tingkat atas objek response
  if (Array.isArray(res.items)) {
    console.log(`✅ [DEBUG] Format: {items: [...]}, items: ${res.items.length}`);
    return res.items;
  }

  // Cek jika format lain di dalam response.data.products (misalnya, produk dikemas dalam 'products')
  if (res.data && res.data.products && Array.isArray(res.data.products)) {
    console.log(`✅ [DEBUG] Format: {data: {products: [...]}, items: ${res.data.products.length}}`);
    return res.data.products;
  }

  // Cek jika ada pagination atau informasi lebih lanjut (misalnya 'page', 'totalPages', 'totalItems')
  if (res.data && res.data.pagination) {
    console.log('🔍 [DEBUG] Pagination ditemukan:', res.data.pagination);
    // Jika pagination, pastikan semua halaman produk diambil
    const allItems = [];
    let currentPage = 1;
    const totalPages = res.data.pagination.totalPages || 1;  // Pastikan default ke 1

    // Ambil semua halaman
    while (currentPage <= totalPages) {
      const pageProducts = fetchProductsByPage(currentPage); // Ganti dengan fungsi yang sesuai untuk ambil halaman
      allItems.push(...pageProducts);
      currentPage++;
    }

    console.log(`✅ [DEBUG] Total produk yang diekstrak: ${allItems.length}`);
    return allItems;
  }
  
  // Format response yang tidak dikenali
  console.warn('❌ Format response tidak dikenali:', res);
  return [];
}

// Fungsi untuk fetch produk dari halaman tertentu jika ada pagination
async function fetchProductsByPage(page) {
  const storeId = localStorage.getItem('store_id');
  const res = await window.apiRequest(`/stores/${storeId}/products?page=${page}`);
  return extractProductsFromResponse(res);
}


// ===== store selector (owner) =====
// async function fetchStoresForOwner() {
//   try {
//     const res = await window.apiRequest('/stores'); // ambil semua toko untuk owner
//     // debug singkat (hapus/komentari bila sudah ok)
//     console.log('fetchStoresForOwner response:', res);

//     // berbagai kemungkinan shape response:
//     // 1) res = [ ... ]
//     // 2) res = { data: [ ... ] }
//     // 3) res = { data: { stores: [ ... ] } }
//     // 4) res = { stores: [ ... ] }
//     // 5) res = { data: { items: [ ... ] } }
//     let stores = [];

//     if (Array.isArray(res)) {
//       stores = res;
//     } else if (Array.isArray(res.data)) {
//       stores = res.data;
//     } else if (res?.data?.stores && Array.isArray(res.data.stores)) {
//       stores = res.data.stores;
//     } else if (res?.stores && Array.isArray(res.stores)) {
//       stores = res.stores;
//     } else if (res?.data?.items && Array.isArray(res.data.items)) {
//       stores = res.data.items;
//     } else {
//       // fallback: sometimes API nests under data -> data
//       const maybe = res?.data?.data;
//       if (Array.isArray(maybe)) stores = maybe;
//     }

//     return stores;
//   } catch (err) {
//     console.error('Gagal mengambil list toko:', err);
//     return [];
//   }
// }

// Fungsi reusable untuk render list produk
// Fungsi reusable untuk render list produk
async function renderProdukList(products, listProdukEl, storeId) {
  if (!listProdukEl || !products) {
    console.error('❌ Parameter tidak valid untuk renderProdukList');
    return;
  }
  
  console.log(`🎨 [renderProdukList] Mulai render ${products.length} produk...`);
  
  // DEBUG: Tampilkan semua produk
  console.log('📋 Daftar produk yang akan dirender:');
  products.forEach((p, i) => {
    console.log(`  ${i+1}. ID: ${p.id}, Nama: "${p.name}", Stok: ${p.stock}`);
  });
  
  // Kosongkan container dulu
  listProdukEl.innerHTML = '';
  
  if (products.length === 0) {
    console.log('ℹ️ Tidak ada produk untuk dirender');
    listProdukEl.innerHTML = '<p>Tidak ada produk.</p>';
    return;
  }
  
  // 1. Update statistik
  await updateProdukStats(products, storeId);
  
  // 2. Populate kategori dropdown
  const kategoriSet = new Set(products.map(p => p.category).filter(Boolean));
  console.log(`📊 Kategori ditemukan: ${Array.from(kategoriSet).join(', ')}`);
  populateCategoryDropdown(Array.from(kategoriSet));
  
  // 3. BUILD HTML SEKALIGUS - PERBAIKI INI!
  let allCardsHTML = '';
  let renderedCount = 0;
  
  products.forEach((product, index) => {
    // HANYA debug beberapa produk pertama
    if (index < 5) {
      console.log(`  📝 Produk ${index + 1}: "${product.name}" (ID: ${product.id}, Stok: ${product.stock})`);
    }
    
    const imageUrlRaw = product.image_url || product.imageUrl || '';
    const imageUrl = imageUrlRaw
      ? (imageUrlRaw.startsWith('http') ? imageUrlRaw : `${window.BASE_URL.replace('/api','')}/${imageUrlRaw.replace(/^\/+/,'')}`)
      : '';
    
    const imgTag = imageUrl
      ? `<img src="${imageUrl}" alt="Gambar Produk" class="card-img" style="width:48px;height:48px;object-fit:cover;border-radius:8px;background:var(--foreground-color);"
          onerror="this.outerHTML='<span class=&quot;material-symbols-outlined card-icon&quot; style=&quot;font-size:30px;color:#b91c1c;background:#e4363638;&quot;>shopping_bag</span>';">`
      : `<span class="material-symbols-outlined card-icon" style="font-size:30px;color:#b91c1c;background:#e4363638;">shopping_bag</span>`;
    
    // Escape quotes dalam string untuk menghindari XSS dan syntax error
    const productName = (product.name || '').replace(/'/g, "\\'").replace(/"/g, '&quot;');
    const productBarcode = (product.barcode || '').replace(/'/g, "\\'").replace(/"/g, '&quot;');
    
    allCardsHTML += `
      <div class="card-produk" data-product-id="${product.id}">
        ${imgTag}
        <div class="info-produk">
          <div class="nama-produk-stok-wrapper">
            <h4>${productName}</h4>
            <h4>Stok: ${product.stock || 0}</h4>
          </div>
          <div class="kode-harga-button-wrapper">
            <div class="kode-harga-wrapper">
              <p class="kode-produk">SKU: ${product.sku || '-'}</p>
              <p class="harga-produk">Rp ${Number(product.sellPrice || product.price || 0).toLocaleString('id-ID')}</p>
            </div>
            <div class="button-produk-wrapper">
              <button class="barcode-produk" title="Preview Barcode" onclick="previewBarcodeProduk('${productBarcode}', '${productName}')">
                <span class="material-symbols-outlined">qr_code</span>
              </button>
              <button class="edit-produk" data-permissions="owner,admin" onclick="loadPage('editProduk', {id: ${product.id}})">
                <span class="material-symbols-outlined">edit</span>
              </button>
              <button class="hapus-produk" data-permissions="owner,admin" onclick="hapusProduk(${product.id})">
                <span class="material-symbols-outlined">delete</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
    
    renderedCount++;
  });
  
  console.log(`✅ [renderProdukList] Selesai membangun HTML untuk ${renderedCount} produk`);
  
  // 4. SET HTML SEKALIGUS (INI PENTING!)
  console.log(`🔄 [renderProdukList] Mengatur innerHTML (panjang: ${allCardsHTML.length} karakter)`);
  listProdukEl.innerHTML = allCardsHTML;
  
  // 5. Verifikasi DOM setelah render
  setTimeout(() => {
    const cardsInDOM = document.querySelectorAll('.card-produk');
    console.log(`🔍 [renderProdukList] Jumlah .card-produk di DOM: ${cardsInDOM.length}`);
    
    if (cardsInDOM.length !== products.length) {
      console.error(`❌ [renderProdukList] DISCREPANCY: ${cardsInDOM.length} di DOM vs ${products.length} di data!`);
    }
  }, 100);
  
  // 6. Simpan ke window.__lastProducts untuk export
  window.__lastProducts = products;
  
  console.log(`🎉 [renderProdukList] Selesai render ${products.length} produk`);
}

// Fungsi untuk cek apakah ada CSS yang membatasi tampilan
function checkCSSOverflow() {
  const listProdukEl = document.querySelector('.list-produk');
  if (!listProdukEl) return;
  
  console.log('🎨 [CSS Check] Memeriksa CSS untuk .list-produk:');
  
  // Check computed styles
  const styles = window.getComputedStyle(listProdukEl);
  const importantProps = [
    'maxHeight', 'height', 'overflowY', 'overflow',
    'display', 'flexDirection', 'flexWrap'
  ];
  
  importantProps.forEach(prop => {
    const value = styles[prop] || styles.getPropertyValue(prop);
    console.log(`  ${prop}: ${value}`);
  });
  
  // Check parent container
  const parent = listProdukEl.parentElement;
  if (parent) {
    console.log('🎨 [CSS Check] Parent element:', parent.className || parent.tagName);
    const parentStyles = window.getComputedStyle(parent);
    console.log(`  Parent maxHeight: ${parentStyles.maxHeight}`);
    console.log(`  Parent height: ${parentStyles.height}`);
    console.log(`  Parent overflow: ${parentStyles.overflow}`);
  }
  
  // Check if there's a height/max-height limitation
  const maxHeight = styles.maxHeight || styles.height;
  if (maxHeight && maxHeight !== 'none' && maxHeight !== 'auto') {
    console.warn(`⚠️ [CSS Check] MUNGKIN MASALAH: .list-produk memiliki ${maxHeight}`);
  }
  
  if (styles.overflowY === 'auto' || styles.overflowY === 'scroll') {
    console.log('ℹ️ [CSS Check] .list-produk memiliki overflow-y: auto/scroll');
  }
}

// Fungsi untuk update statistik
async function updateProdukStats(products, storeId) {
  const totalProdukEl = document.querySelector('.card-detail-produk .detail-produk-info h5 + p');
  const kategoriSet = new Set(products.map(p => p.category).filter(Boolean));
  
  if (totalProdukEl) totalProdukEl.textContent = products.length;
  
  const kategoriCountEl = Array.from(document.querySelectorAll('.card-detail-produk .detail-produk-info h5'))
    .find(el => el.textContent.trim().toLowerCase() === 'kategori')?.nextElementSibling;
  if (kategoriCountEl) kategoriCountEl.textContent = kategoriSet.size;

  // Ambil stok menipis via API terpisah
  try {
    const stokRes = await window.apiRequest(`/stores/${storeId}/products/low-stock?threshold=10`);
    const stokCount = stokRes?.data?.count ?? 0;
    const stokEl = Array.from(document.querySelectorAll('.card-detail-produk .detail-produk-info h5'))
      .find(el => el.textContent.trim().toLowerCase() === 'stok menipis')?.nextElementSibling;
    if (stokEl) stokEl.textContent = stokCount;
  } catch (err) {
    const stokEl = Array.from(document.querySelectorAll('.card-detail-produk .detail-produk-info h5'))
      .find(el => el.textContent.trim().toLowerCase() === 'stok menipis')?.nextElementSibling;
    if (stokEl) stokEl.textContent = '!';
  }
}

function showStoreSelector(stores) {
  const modal = document.getElementById('store-selector-modal');
  const list = document.getElementById('store-list');
  if (!modal || !list) return;
  list.innerHTML = '';
  if (stores.length === 0) {
    list.innerHTML = '<p style="color:var(--foreground-color)">Tidak ada toko. Tekan Refresh.</p>';
  } else {
    stores.forEach(s => {
      const el = document.createElement('div');
      el.style.padding = '8px';
      el.style.marginBottom = '6px';
      el.style.background = 'var(--background-color)';
      el.style.borderRadius = '6px';
      el.style.cursor = 'pointer';
      el.style.color = 'var(--foreground-color)';
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


// UBAH: Ganti semua DOMContentLoaded pertama dengan function
async function initProduk() {
  console.log('🚀 ========== initProduk() DIPANGGIL ==========');
  
  const listProdukEl = document.querySelector('.list-produk');
  if (!listProdukEl) {
    console.error('❌ Element .list-produk tidak ditemukan');
    return;
  }
  
  console.log('📍 [initProduk] listProdukEl ditemukan:', listProdukEl);

  const token = localStorage.getItem('token');
  if (!token) {
    window.location.href = 'login.html';
    return;
  }

  window.updateHeaderStoreName();
  
  const role = (localStorage.getItem('role') || '').toLowerCase();
  const storeId = localStorage.getItem('store_id');
  
  console.log(`👤 [initProduk] Role: ${role}, Store ID: ${storeId}`);

  if (!storeId) {
    if (role === 'owner') {
      console.log('🏪 [initProduk] Owner tanpa store, tampilkan selector');
      const stores = await window.fetchStoresForOwner();
      showStoreSelector(stores);
      return;
    } else if (role === 'admin' || role === 'cashier') {
      listProdukEl.innerHTML = '<p style="color:red;">Akun Anda belum terhubung ke toko. Hubungi owner/admin.</p>';
      return;
    }
  }

  try {
    console.log(`📡 [initProduk] Fetching produk untuk store ${storeId}...`);
    const res = await window.apiRequest(`/stores/${storeId}/products`);
    
    console.log('📦 [initProduk] Response dari API:', res);
    
    const products = extractProductsFromResponse(res);
    
    console.log(`📊 [initProduk] Total produk diekstrak: ${products.length}`);
    
    if (products.length !== 23) {
      console.warn(`⚠️ [initProduk] PERINGATAN: Seharusnya 23 produk, tetapi diekstrak ${products.length}`);
    }
    
    // Cek CSS sebelum render
    checkCSSOverflow();
    
    // Render produk menggunakan fungsi yang sama dengan renderProdukPage
    await renderProdukList(products, listProdukEl, storeId);
    
    // Cek lagi setelah render
    setTimeout(checkCSSOverflow, 200);
    
    inisialisasiPencarianProduk();
    setupScanButtonsProduk();

  } catch (err) {
    console.error('❌ [initProduk] Gagal memuat daftar produk:', err);
    listProdukEl.innerHTML = '<p style="color:red;">Gagal memuat produk.</p>';
  }
  
  console.log('✅ ========== initProduk() SELESAI ==========');
}

// Call saat DOMContentLoaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initProduk);
} else {
  initProduk();
}

// Export untuk router
window.initProduk = initProduk;

window.tambahProduk = async function tambahProduk() {
  const storeId = localStorage.getItem('store_id');
  if (!storeId) { alert('Store ID tidak ditemukan. Silakan login ulang.'); return; }

  // Ambil semua field dari form
  const namaProduk = (document.getElementById('nama-produk').value || '').trim();
  const barcode = (document.getElementById('product-barcode').value || '').trim();
  const hargaModal = parseRupiahInput(document.getElementById('harga-modal').value);
  const hargaJual = parseRupiahInput(document.getElementById('harga-jual').value);
  const sku = (document.getElementById('sku').value || '').trim();
  const stok = Number(document.getElementById('stok').value || 0);
  const kategori = document.getElementById('kategori').value;
  if (!kategori) {
    if (window.showToast) showToast('Kategori wajib dipilih!', 'warn');
    else alert('Kategori wajib dipilih!');
    return;
  }
  const deskripsi = (document.getElementById('deskripsi').value || '').trim();
  const promoType = document.getElementById('promo-type').value || "";

  // Promo/diskon mapping
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

  // Ambil file gambar
  const imageInput = document.getElementById('product-image');
  const fileToUpload = imageInput && imageInput.files ? imageInput.files[0] : null;

  // Siapkan form-data
  const formData = new FormData();
  formData.append('name', namaProduk);
  formData.append('sku', sku);
  formData.append('barcode', barcode);
  formData.append('price', hargaJual);
  formData.append('cost_price', hargaModal);
  formData.append('stock', stok);
  formData.append('category', kategori);
  formData.append('description', deskripsi);
  if (fileToUpload) formData.append('image', fileToUpload);

  // Promo/diskon
  if (jenis_diskon) formData.append('jenis_diskon', jenis_diskon);
  if (nilai_diskon !== null) formData.append('nilai_diskon', nilai_diskon);
  if (diskon_bundle_min_qty !== null) formData.append('diskon_bundle_min_qty', diskon_bundle_min_qty);
  if (diskon_bundle_value !== null) formData.append('diskon_bundle_value', diskon_bundle_value);
  if (buy_qty !== null) formData.append('buy_qty', buy_qty);
  if (free_qty !== null) formData.append('free_qty', free_qty);

  try {
    const token = localStorage.getItem('token');
    const res = await fetch(`${BASE_URL}/stores/${storeId}/products`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`
        // Jangan set Content-Type, biarkan browser yang atur boundary
      },
      body: formData
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Gagal menambahkan produk');

    if (window.showToast) showToast('Produk berhasil ditambahkan!', 'success');
    else alert('Produk berhasil ditambahkan!');
    window.location.href = 'index.html#produk';
  } catch (err) {
    console.error('Gagal menambahkan produk:', err);
    const serverMsg = err.response?.message || err.message || JSON.stringify(err.response) || 'Terjadi kesalahan server';
    if (window.showToast) showToast(`Gagal menambahkan produk: ${serverMsg}`, 'error');
    else alert(`Gagal menambahkan produk: ${serverMsg}`);
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

window.previewBarcodeProduk = function(barcode, name = "") {
  if (!barcode) {
    alert("Barcode produk tidak tersedia!");
    return;
  }

  // Payload sama seperti di barcode.js
  const payload = {
    value: barcode,
    copies: 8,
    type: "CODE128",
    name: name
  };

  localStorage.setItem("barcode-preview-data", JSON.stringify(payload));

  window.open(
    "../pages/preview-barcode.html",
    "_blank",
    "width=420,height=650"
  );
};
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

async function uploadGambarProduk(storeId, file) {
  if (!file) return null;
  const formData = new FormData();
  formData.append('image', file);

  try {
    const token = localStorage.getItem('token');
    const res = await fetch(`${BASE_URL}/stores/${storeId}/upload-image`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`
        // Jangan set Content-Type, biarkan browser yang atur boundary
      },
      body: formData
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Gagal upload gambar produk');
    return data.image_url || null;
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
// Flag untuk mencegah multiple rendering
let isRenderingProdukPage = false;

window.renderProdukPage = async function renderProdukPage() {
  // Prevent multiple simultaneous rendering
  if (isRenderingProdukPage) {
    console.log('⚠️ renderProdukPage sedang berjalan, skip...');
    return;
  }
  
  isRenderingProdukPage = true;
  console.log('🔄 renderProdukPage() dipanggil');
  
  try {
    const listProdukEl = document.querySelector('.list-produk');
    if (!listProdukEl) {
      console.error('❌ Element .list-produk tidak ditemukan');
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      window.location.href = 'login.html';
      return;
    }

    const role = (localStorage.getItem('role') || '').toLowerCase();
    const storeId = localStorage.getItem('store_id');

    if (!storeId) {
      if (role === 'owner') {
        const stores = await window.fetchStoresForOwner();
        showStoreSelector(stores);
        return;
      } else if (role === 'admin' || role === 'cashier') {
        listProdukEl.innerHTML = '<p style="color:red;">Akun Anda belum terhubung ke toko. Hubungi owner/admin.</p>';
        return;
      }
    }

    console.log(`📡 [renderProdukPage] Fetching produk untuk store ${storeId}...`);
    const res = await window.apiRequest(`/stores/${storeId}/products`);
    const products = extractProductsFromResponse(res);
    
    console.log(`📊 [renderProdukPage] Total produk: ${products.length}`);
    
    // Gunakan fungsi reusable
    await renderProdukList(products, listProdukEl, storeId);
    
    inisialisasiPencarianProduk();
    
  } catch (err) {
    console.error('❌ Error dalam renderProdukPage:', err);
    const listProdukEl = document.querySelector('.list-produk');
    if (listProdukEl) {
      listProdukEl.innerHTML = '<p style="color:red;">Gagal memuat produk.</p>';
    }
  } finally {
    isRenderingProdukPage = false;
    console.log('✅ renderProdukPage selesai');
  }
  
  // Setelah render produk dan inisialisasi pencarian
  // Tambahkan event listener tombol export setiap render
  const btnExport = document.getElementById('btnExportStokOpname');
  if (btnExport) {
    btnExport.onclick = function() {
      if (!window.__lastProducts || window.__lastProducts.length === 0) {
        alert('Produk belum dimuat');
        return;
      }
      exportStokOpnameExcel(window.__lastProducts);
    };
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
    const queryParam = q ? `query=${encodeURIComponent(q)}` : '';
    const categoryParam = category ? `category=${encodeURIComponent(category)}` : '';
    const params = [queryParam, categoryParam].filter(Boolean).join('&');
    const url = `/stores/${storeId}/products/search${params ? '?' + params : ''}`;
    
    console.log(`🔍 Searching: ${url}`);
    
    const res = await window.apiRequest(url);
    const products = extractProductsFromResponse(res);
    
    console.log(`🔍 Hasil pencarian: ${products.length} produk`);
    
    // Gunakan fungsi reusable
    await renderProdukList(products, listProdukEl, storeId);
    
  } catch (err) {
    console.error('❌ Cari produk error:', err);
    const listProdukEl = document.querySelector('.list-produk');
    if (listProdukEl) {
      listProdukEl.innerHTML = '<p style="color:red;">Gagal mencari produk.</p>';
    }
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
        cariProduk(q.trim(), selectedCategory); // Selalu panggil cariProduk dengan q dan kategori
      });
      btn.dataset.bound = '1';
    });
  }
}
const KATEGORI_LIST = [
  "Kesehatan & Kecantikan",
  "Rumah Tangga & Gaya Hidup",
  "Fashion & Aksesoris",
  "Elektronik",
  "Bayi & Anak",
  "Makanan & Minuman"
];

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

  // Tombol kategori tetap
  KATEGORI_LIST.forEach(cat => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.dataset.category = cat;
    btn.textContent = cat;
    menu.appendChild(btn);
  });
}

// --- Integrasi scan barcode dari barcode.js ---
// Aktifkan scan barcode wired saat tombol WP2DW ditekan
document.addEventListener('DOMContentLoaded', () => {
  const btnWoya = document.getElementById('btn-wp2dw');
  if (btnWoya) {
    btnWoya.addEventListener('click', () => {
      const scannerInput = document.getElementById('scanner-input');
      if (scannerInput) {
        scannerInput.focus();
        if (window.showToast) showToast('Mode scan barcode aktif. Silakan scan barcode produk.', 'info');
      }
    });
  }

  // Aktifkan scan kamera saat tombol Scan Kamera ditekan
  const btnCamera = document.getElementById('btn-scan-camera');
  if (btnCamera) {
    btnCamera.addEventListener('click', () => {
      if (window.toggleCamera) window.toggleCamera();
    });
  }

  const btnCloseCamera = document.getElementById('btn-close-camera');
  if (btnCloseCamera) {
    btnCloseCamera.addEventListener('click', () => {
      if (window.stopCamera) window.stopCamera();
    });
  }
});

function setupScanButtonsProduk() {
  const btnWoya = document.getElementById('btn-wp2dw');
  if (btnWoya && !btnWoya.dataset.bound) {
    btnWoya.addEventListener('click', () => {
      const scannerInput = document.getElementById('scanner-input');
      if (scannerInput) {
        scannerInput.focus();
        if (window.showToast) showToast('Mode scan barcode aktif. Silakan scan barcode produk.', 'info');
      }
    });
    btnWoya.dataset.bound = "1";
  }

  const btnCamera = document.getElementById('btn-scan-camera');
  if (btnCamera && !btnCamera.dataset.bound) {
    btnCamera.addEventListener('click', () => {
      if (window.toggleCamera) window.toggleCamera();
    });
    btnCamera.dataset.bound = "1";
  }
}

// Panggil setupScanButtonsProduk setiap kali halaman produk di-render
document.addEventListener('DOMContentLoaded', setupScanButtonsProduk);
// Jika pakai SPA/router, panggil juga di renderProdukPage
if (window.renderProdukPage) {
  const oldRenderProdukPage = window.renderProdukPage;
  window.renderProdukPage = async function() {
    await oldRenderProdukPage.apply(this, arguments);
    setupScanButtonsProduk();
  };
}

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
          window.location.href = `index.html#tambah-produk?barcode=${encodeURIComponent(barcode)}`;
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
<button class="barcode-produk" title="Preview Barcode"
  onclick="previewBarcodeProduk('${product.barcode}','${product.name}')">
  <span class="material-symbols-outlined">qr_code</span>
</button>
              <button class="edit-produk" data-permissions="owner, admin" onclick="loadPage && loadPage('editProduk', {id: ${p.id}})"><span class="material-symbols-outlined">edit</span></button>
              <button class="hapus-produk" data-permissions="owner, admin" onclick="hapusProduk(${p.id})"><span class="material-symbols-outlined">delete</span></button>
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

document.addEventListener('DOMContentLoaded', function() {
  // Deteksi jika sedang di halaman tambah produk (SPA atau multi-page)
  const isTambahProdukPage =
    window.location.hash.includes('tambah-produk') ||
    window.location.pathname.endsWith('tambah-produk.html');

  if (!isTambahProdukPage) return;

  // Ambil barcode dari query string (hash atau search)
  let barcodeParam = '';
  if (window.location.hash && window.location.hash.includes('barcode=')) {
    const hashParams = new URLSearchParams(window.location.hash.split('?')[1]);
    barcodeParam = hashParams.get('barcode') || '';
  } else {
    const urlParams = new URLSearchParams(window.location.search);
    barcodeParam = urlParams.get('barcode') || '';
  }

  if (barcodeParam) {
    // Isi ke input barcode utama (pastikan id input sesuai)
    const barcodeValueInput = document.getElementById('barcode-value');
    const productBarcodeInput = document.getElementById('product-barcode');
    if (barcodeValueInput) barcodeValueInput.value = barcodeParam;
    if (productBarcodeInput) productBarcodeInput.value = barcodeParam;

    // Jika ada fungsi generate preview barcode, panggil
    if (typeof generateBarcodeFromValue === 'function') {
      generateBarcodeFromValue(barcodeParam);
    } else if (typeof generateBarcode === 'function') {
      generateBarcode();
    }

    // Tampilkan toast jika ada
    if (window.showToast) showToast('Barcode dari scan: ' + barcodeParam, 'info');
  }
});

const role = (localStorage.getItem('role') || '').toLowerCase();
if (role === 'cashier') {
  document.querySelectorAll('.edit-produk, .hapus-produk, .tambah-produk').forEach(btn => {
    btn.style.display = 'none';
  });
}

// Untuk owner: ambil semua toko
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

// Untuk admin/kasir: ambil hanya toko sendiri
window.fetchStoreForUser = async function() {
  const storeId = localStorage.getItem('store_id');
  if (!storeId) return null;
  try {
    const res = await window.apiRequest(`/stores/${storeId}`);
    // Pastikan hasilnya konsisten array (agar bisa dipakai di showStoreSelector jika perlu)
    if (res?.data) return [res.data];
    return [];
  } catch (err) {
    return [];
  }
};

document.addEventListener('DOMContentLoaded', function() {
  console.log('📄 DOM Content Loaded - produk.js');
  // Hanya panggil initProduk() yang sudah ada
});

window.previewBarcodeProduk = function(barcode, name) {
  if (!barcode) {
    alert('Barcode produk tidak tersedia!');
    return;
  }
  // Simpan data ke localStorage (seperti preview-barcode.html)
  localStorage.setItem("barcode-preview-data", JSON.stringify({
    value: barcode,
    copies: 8,
    type: "CODE128",
    name: name || ""
  }));
  window.open(
    "../pages/preview-barcode.html",
    "_blank",
    "width=420,height=650"
  );
};

document.addEventListener('DOMContentLoaded', function() {
  const role = (localStorage.getItem('role') || '').toLowerCase();
  if (role === 'cashier') {
    const btn = document.querySelector('.tambah-produk-btn');
    if (btn) btn.style.display = 'none';
  }
});

function exportStokOpnameExcel(products) {
  if (!Array.isArray(products) || products.length === 0) {
    alert('Data produk kosong');
    return;
  }

  // Siapkan data
  const rows = products.map((p, index) => ({
    'ID Produk': p.id,
    'Nama Produk': p.name,
    'SKU': p.sku,
    'Barcode': p.barcode,
    'Kategori': p.category,
    'Harga Modal': p.costPrice ?? p.cost_price ?? 0,
    'Harga Jual': p.sellPrice ?? p.price ?? 0,
    'Stok Sistem': p.stock ?? 0,
    'Stok Fisik': '', // diisi manual
    'Selisih': '',    // =I2-H2
    'Nilai Selisih': '', // =J2*F2
    'Status': (p.isActive ?? p.is_active) ? 'Aktif' : 'Nonaktif',
    'Promo': p.promoType ?? p.jenis_diskon ?? '-',
    'Updated At': p.updatedAt ? new Date(p.updatedAt).toLocaleString('id-ID') : ''
  }));

  // Buat worksheet
  const worksheet = XLSX.utils.json_to_sheet(rows);

  // Format kolom harga modal & harga jual ke format rupiah
  for (let i = 2; i <= products.length + 1; i++) {
    worksheet[`F${i}`].t = 'n';
    worksheet[`F${i}`].z = '"Rp "#,##0';
    worksheet[`G${i}`].t = 'n';
    worksheet[`G${i}`].z = '"Rp "#,##0';
  }

  // Tambahkan border dan warna header
  const headerCols = [
    'A1','B1','C1','D1','E1','F1','G1','H1','I1','J1','K1','L1','M1','N1'
  ];
  headerCols.forEach(cell => {
    if (worksheet[cell]) {
      worksheet[cell].s = {
        fill: { fgColor: { rgb: "FFD700" } }, // warna kuning
        font: { bold: true },
        border: {
          top: { style: "thin", color: { rgb: "000000" } },
          bottom: { style: "thin", color: { rgb: "000000" } },
          left: { style: "thin", color: { rgb: "000000" } },
          right: { style: "thin", color: { rgb: "000000" } }
        }
      };
    }
  });

  // Tambahkan border ke semua cell data
  for (let r = 2; r <= products.length + 1; r++) {
    for (let c = 0; c < headerCols.length; c++) {
      const col = String.fromCharCode(65 + c); // A, B, C, ...
      const cell = `${col}${r}`;
      if (worksheet[cell]) {
        worksheet[cell].s = {
          border: {
            top: { style: "thin", color: { rgb: "000000" } },
            bottom: { style: "thin", color: { rgb: "000000" } },
            left: { style: "thin", color: { rgb: "000000" } },
            right: { style: "thin", color: { rgb: "000000" } }
          }
        };
      }
    }
  }

  // Buat workbook dan export
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Stok Opname');
  XLSX.writeFile(
    workbook,
    `stok-opname-${new Date().toISOString().slice(0, 10)}.xlsx`
  );
}

// Pastikan window.__lastProducts selalu update setiap render produk
function updateLastProducts(products) {
  window.__lastProducts = Array.isArray(products) ? products : [];
}

// Patch renderProdukPage agar selalu update window.__lastProducts
// const _oldRenderProdukPage = window.renderProdukPage;
// window.renderProdukPage = async function() {
//   await _oldRenderProdukPage.apply(this, arguments);
//   // Ambil data produk dari DOM (atau fetch ulang jika perlu)
//   const storeId = localStorage.getItem('store_id');
//   if (!storeId) return;
//   try {
//     const res = await window.apiRequest(`/stores/${storeId}/products`);
//     const products = extractProductsFromResponse(res);
//     updateLastProducts(products);
//   } catch (e) {
//     updateLastProducts([]);
//   }
// };

// Event listener tombol export
document.addEventListener('DOMContentLoaded', function() {
  const btnExport = document.getElementById('btnExportStokOpname');
  if (btnExport) {
    btnExport.onclick = function() {
      if (!window.__lastProducts || window.__lastProducts.length === 0) {
        alert('Produk belum dimuat');
        return;
      }
      exportStokOpnameExcel(window.__lastProducts);
    };
  }
});

// Kode untuk debugging real-time
// document.addEventListener('DOMContentLoaded', function() {
//   console.log('📄 DOM Content Loaded - produk.js v2 (Debug Mode)');
  
//   // Tambahkan tombol debug manual
//   setTimeout(() => {
//     const debugBtn = document.createElement('button');
//     debugBtn.textContent = '🔍 Debug Produk';
//     debugBtn.style.position = 'fixed';
//     debugBtn.style.bottom = '10px';
//     debugBtn.style.right = '10px';
//     debugBtn.style.zIndex = '9999';
//     debugBtn.style.padding = '8px 12px';
//     debugBtn.style.background = '#007bff';
//     debugBtn.style.color = 'white';
//     debugBtn.style.border = 'none';
//     debugBtn.style.borderRadius = '4px';
//     debugBtn.style.cursor = 'pointer';
    
//     debugBtn.onclick = function() {
//       console.log('=== MANUAL DEBUG ===');
//       const cards = document.querySelectorAll('.card-produk');
//       console.log(`Jumlah kartu produk di DOM: ${cards.length}`);
      
//       cards.forEach((card, i) => {
//         const name = card.querySelector('h4')?.textContent || 'No name';
//         console.log(`${i+1}. ${name}`);
//       });
      
//       checkCSSOverflow();
//     };
    
//     document.body.appendChild(debugBtn);
//   }, 2000);
// });

// Format angka ke format rupiah (tanpa Rp)
function formatRupiahInput(val) {
  const num = String(val).replace(/\D/g, '');
  if (!num) return '';
  return num.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

// Ambil nilai numerik dari input rupiah
function parseRupiahInput(val) {
  return Number(String(val).replace(/\./g, '').replace(/[^0-9]/g, '')) || 0;
}

// Inisialisasi input agar auto-format rupiah
function initRupiahInput(input) {
  if (!input) return;
  input.type = "text";
  input.inputMode = "numeric";
  input.addEventListener('input', function () {
    let val = this.value.replace(/\D/g, '');
    this.value = formatRupiahInput(val);
  });
  input.addEventListener('blur', function () {
    let val = this.value.replace(/\D/g, '');
    this.value = formatRupiahInput(val);
  });
  input.addEventListener('focus', function () {
    let val = this.value.replace(/\D/g, '');
    this.value = val;
  });
}