function extractProductsFromResponse(res) {
  console.log('🔍 [DEBUG] Response API raw:', res);
  
  if (!res) {
    console.warn('❌ Response kosong');
    return [];
  }
  
  // Periksa jika ada data yang memiliki property 'items'
  if (res.data && res.data.items && Array.isArray(res.data.items)) {
    console.log(`✅ [DEBUG] Format: {data: {items: [...]}, items: ${res.data.items.length}}`);
    return res.data.items.map(p => {
      // ✅ AUTO-DETECT PROMO TYPE DARI DATA
      let detectedPromoType = p.jenis_diskon || p.promoType || null;
      
      // Jika jenis_diskon null, coba deteksi dari field lain
      if (!detectedPromoType) {
        if (p.bundleQty || p.diskon_bundle_min_qty) {
          detectedPromoType = 'bundle';
          console.log(`🔍 Auto-detect bundle untuk produk ID ${p.id}`);
        } else if (p.buyQty || p.buy_qty) {
          detectedPromoType = 'buyxgety';
          console.log(`🔍 Auto-detect buyxgety untuk produk ID ${p.id}`);
        } else if ((p.promoPercent || 0) > 0) {
          detectedPromoType = 'percentage';
          console.log(`🔍 Auto-detect percentage untuk produk ID ${p.id}`);
        } else if ((p.promoAmount || 0) > 0) {
          detectedPromoType = 'amount';
          console.log(`🔍 Auto-detect amount untuk produk ID ${p.id}`);
        }
      }
      
      return {
        ...p,
        promoType: detectedPromoType,
        bundleQty: p.diskon_bundle_min_qty || p.bundleQty || null,
        bundleTotalPrice: parseFloat(p.diskon_bundle_value || p.bundleTotalPrice || 0),
        costPrice: parseFloat(p.cost_price || p.costPrice || 0),
        sellPrice: parseFloat(p.price || p.sellPrice || 0),
        promoPercent: parseFloat(p.nilai_diskon || p.promoPercent || 0),
        buyQty: p.buy_qty || p.buyQty || null,
        freeQty: p.free_qty || p.freeQty || null
      };
    });
  }

  // Cek jika ada 'items' langsung di tingkat atas objek response
  if (Array.isArray(res.items)) {
    console.log(`✅ [DEBUG] Format: {items: [...]}, items: ${res.items.length}}`);
    return res.items.map(p => {
      let detectedPromoType = p.jenis_diskon || p.promoType || null;
      if (!detectedPromoType) {
        if (p.bundleQty || p.diskon_bundle_min_qty) {
          detectedPromoType = 'bundle';
        } else if (p.buyQty || p.buy_qty) {
          detectedPromoType = 'buyxgety';
        } else if ((p.promoPercent || 0) > 0) {
          detectedPromoType = 'percentage';
        } else if ((p.promoAmount || 0) > 0) {
          detectedPromoType = 'amount';
        }
      }
      return {
        ...p,
        promoType: detectedPromoType,
        bundleQty: p.diskon_bundle_min_qty || p.bundleQty || null,
        bundleTotalPrice: parseFloat(p.diskon_bundle_value || p.bundleTotalPrice || 0),
        costPrice: parseFloat(p.cost_price || p.costPrice || 0),
        sellPrice: parseFloat(p.price || p.sellPrice || 0),
        promoPercent: parseFloat(p.nilai_diskon || p.promoPercent || 0),
        buyQty: p.buy_qty || p.buyQty || null,
        freeQty: p.free_qty || p.freeQty || null
      };
    });
  }

  // Cek jika format lain di dalam response.data.products
  if (res.data && res.data.products && Array.isArray(res.data.products)) {
    console.log(`✅ [DEBUG] Format: {data: {products: [...]}, items: ${res.data.products.length}}`);
    return res.data.products.map(p => {
      let detectedPromoType = p.jenis_diskon || p.promoType || null;
      if (!detectedPromoType) {
        if (p.bundleQty || p.diskon_bundle_min_qty) {
          detectedPromoType = 'bundle';
        } else if (p.buyQty || p.buy_qty) {
          detectedPromoType = 'buyxgety';
        } else if ((p.promoPercent || 0) > 0) {
          detectedPromoType = 'percentage';
        } else if ((p.promoAmount || 0) > 0) {
          detectedPromoType = 'amount';
        }
      }
      return {
        ...p,
        promoType: detectedPromoType,
        bundleQty: p.diskon_bundle_min_qty || p.bundleQty || null,
        bundleTotalPrice: parseFloat(p.diskon_bundle_value || p.bundleTotalPrice || 0),
        costPrice: parseFloat(p.cost_price || p.costPrice || 0),
        sellPrice: parseFloat(p.price || p.sellPrice || 0),
        promoPercent: parseFloat(p.nilai_diskon || p.promoPercent || 0),
        buyQty: p.buy_qty || p.buyQty || null,
        freeQty: p.free_qty || p.freeQty || null
      };
    });
  }

  console.warn('❌ Format response tidak dikenali:', res);
  return [];
}

// Fungsi untuk fetch produk dari halaman tertentu jika ada pagination
async function fetchProductsByPage(page) {
  const storeId = localStorage.getItem('store_id');
  const res = await window.apiRequest(`/stores/${storeId}/products?page=${page}`);
  return extractProductsFromResponse(res);
}

// ===== RENDER PRODUK LIST =====
async function renderProdukList(products, listProdukEl, storeId) {
  if (!listProdukEl || !products) {
    console.error('❌ Parameter tidak valid untuk renderProdukList');
    return;
  }
  
  allProducts = products; // Simpan untuk filter lokal jika diperlukan
  
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
  inisialisasiPencarianProduk(); // Pastikan event listener kategori & reset terpasang
  
  // 3. BUILD HTML SEKALIGUS
  let allCardsHTML = '';
  let renderedCount = 0;
  
  products.forEach((product, index) => {
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

// ===== CSS OVERFLOW CHECK =====
function checkCSSOverflow() {
  const listProdukEl = document.querySelector('.list-produk');
  if (!listProdukEl) return;
  
  console.log('🎨 [CSS Check] Memeriksa CSS untuk .list-produk:');
  
  const styles = window.getComputedStyle(listProdukEl);
  const importantProps = [
    'maxHeight', 'height', 'overflowY', 'overflow',
    'display', 'flexDirection', 'flexWrap'
  ];
  
  importantProps.forEach(prop => {
    const value = styles[prop] || styles.getPropertyValue(prop);
    console.log(`  ${prop}: ${value}`);
  });
  
  const parent = listProdukEl.parentElement;
  if (parent) {
    console.log('🎨 [CSS Check] Parent element:', parent.className || parent.tagName);
    const parentStyles = window.getComputedStyle(parent);
    console.log(`  Parent maxHeight: ${parentStyles.maxHeight}`);
    console.log(`  Parent height: ${parentStyles.height}`);
    console.log(`  Parent overflow: ${parentStyles.overflow}`);
  }
  
  const maxHeight = styles.maxHeight || styles.height;
  if (maxHeight && maxHeight !== 'none' && maxHeight !== 'auto') {
    console.warn(`⚠️ [CSS Check] MUNGKIN MASALAH: .list-produk memiliki ${maxHeight}`);
  }
  
  if (styles.overflowY === 'auto' || styles.overflowY === 'scroll') {
    console.log('ℹ️ [CSS Check] .list-produk memiliki overflow-y: auto/scroll');
  }
}

// ===== UPDATE STATISTIK =====
async function updateProdukStats(products, storeId) {
  const statsContainer = document.querySelector('.card-detail-produk');
  if (!statsContainer) {
    console.warn('⚠️ Stats container tidak ditemukan, skip updateProdukStats');
    return;
  }

  const statsElements = document.querySelectorAll('.card-detail-produk .detail-produk-info');
  if (statsElements.length === 0) {
    console.warn('⚠️ Stats info elements tidak ditemukan');
    return;
  }

  try {
    const totalProdukEl = Array.from(statsElements).flatMap(el => 
      Array.from(el.querySelectorAll('h5')).find(h => 
        h.textContent.toLowerCase().includes('total')
      )
    ).find(Boolean)?.nextElementSibling;
    
    if (totalProdukEl) {
      totalProdukEl.textContent = products.length;
      console.log(`✅ Total Produk updated: ${products.length}`);
    }

    const kategoriSet = new Set(products.map(p => p.category).filter(Boolean));
    const kategoriEl = Array.from(statsElements).flatMap(el => 
      Array.from(el.querySelectorAll('h5')).find(h => 
        h.textContent.toLowerCase().includes('kategori')
      )
    ).find(Boolean)?.nextElementSibling;
    
    if (kategoriEl) {
      kategoriEl.textContent = kategoriSet.size;
      console.log(`✅ Kategori updated: ${kategoriSet.size}`);
    }

    try {
      const stokRes = await window.apiRequest(`/stores/${storeId}/products/low-stock?threshold=10`);
      const stokCount = stokRes?.data?.count ?? stokRes?.count ?? 0;
      
      const stokEl = Array.from(statsElements).flatMap(el => 
        Array.from(el.querySelectorAll('h5')).find(h => 
          h.textContent.toLowerCase().includes('stok menipis')
        )
      ).find(Boolean)?.nextElementSibling;
      
      if (stokEl) {
        stokEl.textContent = stokCount;
        console.log(`✅ Stok Menipis updated: ${stokCount}`);
      }
    } catch (err) {
      console.warn('⚠️ Gagal ambil low-stock:', err);
    }
  } catch (err) {
    console.error('❌ Error dalam updateProdukStats:', err);
  }
}

// ===== STORE SELECTOR =====
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

// ===== KATEGORI & SEARCH =====
let selectedCategory = '';
let allProducts = []; // Untuk filter lokal jika diperlukan

const KATEGORI_LIST = [
  "Kesehatan & Kecantikan",
  "Rumah Tangga & Gaya Hidup",
  "Fashion & Aksesoris",
  "Elektronik",
  "Bayi & Anak",
  "Makanan & Minuman"
];

// Perbaikan: Dropdown kategori dengan tombol reset & highlight kategori terpilih
function populateCategoryDropdown(categories = []) {
  const menu = document.querySelector('.dropdown-menu');
  if (!menu) return;
  menu.innerHTML = '';

  // Tombol Semua Kategori
  const btnAll = document.createElement('button');
  btnAll.type = 'button';
  btnAll.dataset.category = '';
  btnAll.textContent = selectedCategory === '' ? '✓ Semua Kategori' : 'Semua Kategori';
  btnAll.style.fontWeight = selectedCategory === '' ? 'bold' : '';
  menu.appendChild(btnAll);

  // Kategori dari data
  const uniqueCategories = [...new Set([...categories, ...KATEGORI_LIST])].filter(Boolean);
  uniqueCategories.forEach(cat => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.dataset.category = cat;
    btn.textContent = selectedCategory === cat ? `✓ ${cat}` : cat;
    btn.style.fontWeight = selectedCategory === cat ? 'bold' : '';
    menu.appendChild(btn);
  });

  // Tombol Reset Filter
  const btnReset = document.createElement('button');
  btnReset.type = 'button';
  btnReset.id = 'btn-reset-kategori';
  btnReset.textContent = '🔄 Reset Filter';
  btnReset.style.marginTop = '8px';
  menu.appendChild(btnReset);
}

// ===== INIT PRODUK =====
let isRenderingProdukPage = false;

async function initProduk() {
  console.log('🚀 ========== initProduk() DIPANGGIL ==========');
  
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
    const products = extractProductsFromResponse(res);
    
    console.log(`📊 [initProduk] Total produk diekstrak: ${products.length}`);
    
    checkCSSOverflow();
    await renderProdukList(products, listProdukEl, storeId);
    setTimeout(checkCSSOverflow, 200);
    
    inisialisasiPencarianProduk();
    setupScanButtonsProduk();

  } catch (err) {
    console.error('❌ [initProduk] Gagal memuat daftar produk:', err);
    listProdukEl.innerHTML = '<p style="color:red;">Gagal memuat produk.</p>';
  }
  
  console.log('✅ ========== initProduk() SELESAI ==========');
  if (typeof window.applyElementPermissions === 'function') {
  window.applyElementPermissions();
}

    // 🔴 PENTING: Apply custom permission handler
  ensureTambahProdukPermissions();
}

// ===== RENDER PRODUK PAGE =====
window.renderProdukPage = async function renderProdukPage() {
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
    
    await renderProdukList(products, listProdukEl, storeId);
    inisialisasiPencarianProduk();
    setupExportButtons();
    
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
  if (typeof window.applyElementPermissions === 'function') {
  window.applyElementPermissions();
}
    // 🔴 PENTING: Apply custom permission handler
  ensureTambahProdukPermissions();
};

function setupExportButtons() {
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

  const btnExportPDF = document.getElementById('btnExportStokOpnamePDF');
  if (btnExportPDF) {
    btnExportPDF.onclick = function() {
      if (!window.__lastProducts || window.__lastProducts.length === 0) {
        alert('Produk belum dimuat');
        return;
      }
      exportStokOpnamePDF(window.__lastProducts);
    };
  }
}

// ===== TAMBAH PRODUK =====
window.tambahProduk = async function tambahProduk() {
  const storeId = localStorage.getItem('store_id');
  if (!storeId) { 
    alert('Store ID tidak ditemukan. Silakan login ulang.'); 
    return; 
  }

  const namaProduk = (document.getElementById('nama-produk').value || '').trim();
  const barcode = (document.getElementById('product-barcode').value || '').trim();
  const hargaModal = parseRupiahInput(document.getElementById('harga-modal').value);
  const hargaJual = parseRupiahInput(document.getElementById('harga-jual').value);
  const sku = (document.getElementById('sku').value || '').trim();
  const stok = Number(document.getElementById('stok').value || 0);
  const kategori = document.getElementById('kategori').value;
  
  // ===== VALIDASI HARGA =====
  if (!hargaModal || hargaModal <= 0) {
    if (window.showToast) showToast('Harga modal harus diisi dan > 0!', 'warn');
    else alert('Harga modal harus diisi dan > 0!');
    return;
  }

  if (!hargaJual || hargaJual <= 0) {
    if (window.showToast) showToast('Harga jual harus diisi dan > 0!', 'warn');
    else alert('Harga jual harus diisi dan > 0!');
    return;
  }

  if (!kategori) {
    if (window.showToast) showToast('Kategori wajib dipilih!', 'warn');
    else alert('Kategori wajib dipilih!');
    return;
  }
  
  const deskripsi = (document.getElementById('deskripsi').value || '').trim();
  const promoType = document.getElementById('promo-type').value || "";
  
  // ✅ TAMBAH: Ambil file input
  const imageInput = document.getElementById('product-image');
  const fileToUpload = imageInput && imageInput.files ? imageInput.files[0] : null;

  // ===== PARSE PROMO DATA - SESUAI MAPPING BACKEND =====
  console.log(`🎁 Promo Type dipilih: "${promoType}"`);

  let jenis_diskon = null;
  let nilai_diskon = 0;
  let diskon_bundle_min_qty = null;
  let diskon_bundle_value = null;
  let buy_qty = null;
  let free_qty = null;

  if (promoType === "percentage") {
    jenis_diskon = "percentage";
    nilai_diskon = parseFloat(document.getElementById('promo-percent')?.value || 0);
    if (nilai_diskon <= 0) nilai_diskon = null;
    console.log(`✅ Percentage discount: ${nilai_diskon}%`);
  } 
  else if (promoType === "amount") {
    jenis_diskon = "amount";
    nilai_diskon = parseRupiahInput(document.getElementById('promo-amount')?.value || '0');
    if (nilai_diskon <= 0) nilai_diskon = null;
    console.log(`✅ Nominal discount: Rp ${nilai_diskon}`);
  } 
  else if (promoType === "buyxgety") {
    jenis_diskon = "buyxgety";
    buy_qty = parseInt(document.getElementById('buy-qty')?.value || 0, 10);
    free_qty = parseInt(document.getElementById('free-qty')?.value || 0, 10);
    
    if (!buy_qty || buy_qty < 1) {
      if (window.showToast) showToast('Beli Qty harus diisi dan > 0!', 'warn');
      else alert('Beli Qty harus diisi dan > 0!');
      return;
    }
    if (!free_qty || free_qty < 1) {
      if (window.showToast) showToast('Gratis Qty harus diisi dan > 0!', 'warn');
      else alert('Gratis Qty harus diisi dan > 0!');
      return;
    }
    console.log(`✅ Buy X Get Y: Beli ${buy_qty} Gratis ${free_qty}`);
  } 
  else if (promoType === "bundle") {
    jenis_diskon = "bundle";
    diskon_bundle_min_qty = parseInt(document.getElementById('bundle-qty')?.value || 0, 10);
    diskon_bundle_value = parseRupiahInput(document.getElementById('bundle-total-price')?.value || '0');

    if (!diskon_bundle_min_qty || diskon_bundle_min_qty < 1) {
      if (window.showToast) showToast('Bundle Qty wajib diisi dan > 0!', 'warn');
      else alert('Bundle Qty wajib diisi dan > 0!');
      return;
    }
    if (!diskon_bundle_value || diskon_bundle_value < 1) {
      if (window.showToast) showToast('Bundle Total Price wajib diisi dan > 0!', 'warn');
      else alert('Bundle Total Price wajib diisi dan > 0!');
      return;
    }
    console.log(`✅ Bundle: ${diskon_bundle_min_qty} item = Rp ${diskon_bundle_value}`);
  }

  // ===== BUILD REQUEST BODY =====
  const body = {
    name: namaProduk,
    sku: sku,
    barcode: barcode,
    price: hargaJual,              // ✅ Angka
    cost_price: hargaModal,        // ✅ Angka
    stock: stok,
    category: kategori,
    description: deskripsi,
    jenis_diskon: jenis_diskon
  };

  // ✅ HANYA KIRIM DISKON FIELDS JIKA ADA JENIS DISKON
  if (jenis_diskon) {
    if (nilai_diskon > 0) body.nilai_diskon = nilai_diskon;
    if (buy_qty !== null && buy_qty > 0) body.buy_qty = buy_qty;
    if (free_qty !== null && free_qty > 0) body.free_qty = free_qty;
    if (diskon_bundle_min_qty !== null && diskon_bundle_min_qty > 0) body.diskon_bundle_min_qty = diskon_bundle_min_qty;
    if (diskon_bundle_value !== null && diskon_bundle_value > 0) body.diskon_bundle_value = diskon_bundle_value;
  }

  console.log('📤 Request body:', JSON.stringify(body, null, 2));

  try {
    const token = localStorage.getItem('token');
    
    // ✅ Jika ada gambar, kirim FormData
    if (fileToUpload) {
      const formData = new FormData();
      Object.keys(body).forEach(key => {
        formData.append(key, body[key] ?? '');
      });
      formData.append('image', fileToUpload);

      console.log('📸 Dengan gambar, kirim FormData');

      const res = await fetch(`${BASE_URL}/stores/${storeId}/products`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Gagal menambahkan produk');

      console.log('✅ Produk berhasil ditambahkan:', data);
      if (window.showToast) showToast('Produk berhasil ditambahkan!', 'success');
      else alert('Produk berhasil ditambahkan!');
      window.location.href = 'index.html#produk';
    } 
    // ✅ Jika tidak ada gambar, kirim JSON
    else {
      console.log('📄 Tanpa gambar, kirim JSON');

      const res = await fetch(`${BASE_URL}/stores/${storeId}/products`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Gagal menambahkan produk');

      console.log('✅ Produk berhasil ditambahkan:', data);
      if (window.showToast) showToast('Produk berhasil ditambahkan!', 'success');
      else alert('Produk berhasil ditambahkan!');
      window.location.href = 'index.html#produk';
    }
  } catch (err) {
    console.error('❌ Gagal menambahkan produk:', err);
    const serverMsg = err.message || 'Terjadi kesalahan server';
    if (window.showToast) showToast(`Gagal: ${serverMsg}`, 'error');
    else alert(`Gagal: ${serverMsg}`);
  }
};

// ===== HAPUS PRODUK =====
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

// ===== PREVIEW BARCODE =====
window.previewBarcodeProduk = function(barcode, name = "") {
  if (!barcode) {
    alert("Barcode produk tidak tersedia!");
    return;
  }

  const payload = {
    value: barcode,
    copies: 8,
    type: "CODE128",
    name: name
  };

  localStorage.setItem("barcode-preview-data", JSON.stringify(payload));
  window.open("../pages/preview-barcode.html", "_blank", "width=420,height=650");
};

// ===== UPLOAD GAMBAR =====
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

window.uploadGambarProduk = uploadGambarProduk;

// ===== DISKON HANDLER =====
function handleDiskonChange() {
  const jenisDiskon = document.getElementById('jenis-diskon').value;

  document.getElementById('diskon-persentase-wrapper').style.display = 'none';
  document.getElementById('buyxgety-wrapper').style.display = 'none';
  document.getElementById('bundle-wrapper').style.display = 'none';

  if (jenisDiskon === 'percentage') {
    document.getElementById('diskon-persentase-wrapper').style.display = 'block';
  } else if (jenisDiskon === 'buyxgety') {
    document.getElementById('buyxgety-wrapper').style.display = 'block';
  } else if (jenisDiskon === 'bundle') {
    document.getElementById('bundle-wrapper').style.display = 'block';
  }
}

// ===== CARI PRODUK =====
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
    await renderProdukList(products, listProdukEl, storeId);
    
  } catch (err) {
    console.error('❌ Cari produk error:', err);
    const listProdukEl = document.querySelector('.list-produk');
    if (listProdukEl) {
      listProdukEl.innerHTML = '<p style="color:red;">Gagal mencari produk.</p>';
    }
  }
}

// ===== INISIALISASI PENCARIAN =====
function inisialisasiPencarianProduk() {
  const searchInput = document.querySelector('.bar-pencarian-produk input[type="text"]');
  if (searchInput && !searchInput.dataset.listener) {
    let searchTimeout = null;
    searchInput.addEventListener('input', function () {
      const q = this.value.trim();
      clearTimeout(searchTimeout);
      if (q.length === 0 && !selectedCategory) {
        if (window.renderProdukPage) window.renderProdukPage();
        return;
      }
      searchTimeout = setTimeout(() => {
        cariProduk(q, selectedCategory);
      }, 400);
    });
    searchInput.dataset.listener = "true";
  }

  // Perbaikan: Event kategori & reset
  const menu = document.querySelector('.dropdown-menu');
  if (menu) {
    menu.querySelectorAll('button[data-category]').forEach(btn => {
      if (btn.dataset.bound) return;
      btn.addEventListener('click', () => {
        selectedCategory = btn.dataset.category || '';
        const toggle = document.getElementById('dropdown-toggle');
        if (toggle) toggle.checked = false;
        const q = (document.querySelector('.bar-pencarian-produk input[type="text"]') || {}).value || '';
        cariProduk(q.trim(), selectedCategory);
        // Refresh dropdown highlight
        populateCategoryDropdown([...KATEGORI_LIST]);
      });
      btn.dataset.bound = '1';
    });

    // Tombol reset
    const btnReset = menu.querySelector('#btn-reset-kategori');
    if (btnReset && !btnReset.dataset.bound) {
      btnReset.addEventListener('click', () => {
        selectedCategory = '';
        const toggle = document.getElementById('dropdown-toggle');
        if (toggle) toggle.checked = false;
        const searchInput = document.querySelector('.bar-pencarian-produk input[type="text"]');
        if (searchInput) searchInput.value = '';
        if (window.renderProdukPage) window.renderProdukPage();
        populateCategoryDropdown([...KATEGORI_LIST]);
      });
      btnReset.dataset.bound = '1';
    }
  }
}

// ===== BARCODE SCANNING =====
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

window.onBarcodeScanned = async function(barcode) {
  const listProdukEl = document.querySelector('.list-produk');
  const storeId = localStorage.getItem('store_id');
  
  if (!storeId) {
    const stores = await window.fetchStoresForOwner();
    showStoreSelector(stores);
    return;
  }
  if (!listProdukEl) return;

  listProdukEl.innerHTML = '<p>Mencari produk berdasarkan barcode...</p>';
  try {
    const res = await window.apiRequest(`/stores/${storeId}/products/barcode/${encodeURIComponent(barcode)}`);
    const product = res?.data || res;
    
    if (!product || (product.success === false && !product.data)) {
      const tambah = confirm('Produk belum terdaftar. Tambah produk baru dengan barcode ini?');
      if (tambah) {
        if (window.loadPage) {
          window.loadPage('tambahProduk', { barcode });
        } else {
          window.location.href = `index.html#tambah-produk?barcode=${encodeURIComponent(barcode)}`;
        }
      } else {
        listProdukEl.innerHTML = '<p>Tidak ada produk ditemukan.</p>';
      }
      return;
    }

    const p = product?.data || product;
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
              <button class="barcode-produk" title="Preview Barcode" onclick="previewBarcodeProduk('${p.barcode}','${p.name}')">
                <span class="material-symbols-outlined">qr_code</span>
              </button>
              <button class="edit-produk" data-permissions="owner,admin" onclick="loadPage('editProduk', {id: ${p.id}})">
                <span class="material-symbols-outlined">edit</span>
              </button>
              <button class="hapus-produk" data-permissions="owner,admin" onclick="hapusProduk(${p.id})">
                <span class="material-symbols-outlined">delete</span>
              </button>
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

// ===== AUTO-FILL BARCODE DARI QUERY PARAM =====
document.addEventListener('DOMContentLoaded', function() {
  const isTambahProdukPage =
    window.location.hash.includes('tambah-produk') ||
    window.location.pathname.endsWith('tambah-produk.html');

  if (!isTambahProdukPage) return;

  let barcodeParam = '';
  if (window.location.hash && window.location.hash.includes('barcode=')) {
    const hashParams = new URLSearchParams(window.location.hash.split('?')[1]);
    barcodeParam = hashParams.get('barcode') || '';
  } else {
    const urlParams = new URLSearchParams(window.location.search);
    barcodeParam = urlParams.get('barcode') || '';
  }

  if (barcodeParam) {
    const barcodeValueInput = document.getElementById('barcode-value');
    const productBarcodeInput = document.getElementById('product-barcode');
    if (barcodeValueInput) barcodeValueInput.value = barcodeParam;
    if (productBarcodeInput) productBarcodeInput.value = barcodeParam;

    if (typeof generateBarcodeFromValue === 'function') {
      generateBarcodeFromValue(barcodeParam);
    } else if (typeof generateBarcode === 'function') {
      generateBarcode();
    }

    if (window.showToast) showToast('Barcode dari scan: ' + barcodeParam, 'info');
  }
});

// ===== PERMISSIONS HANDLER =====
// const role = (localStorage.getItem('role') || '').toLowerCase();
// if (role === 'cashier') {
//   document.querySelectorAll('.edit-produk, .hapus-produk, .tambah-produk').forEach(btn => {
//     btn.style.display = 'none';
//   });
// }

// ===== FETCH STORES =====
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
    if (res?.data) return [res.data];
    return [];
  } catch (err) {
    return [];
  }
};

// ===== EXPORT FUNCTIONS =====
function exportStokOpnameExcel(products) {
  if (!Array.isArray(products) || products.length === 0) {
    alert('Data produk kosong');
    return;
  }

  const rows = products.map((p, index) => ({
    'ID Produk': p.id,
    'Nama Produk': p.name,
    'SKU': p.sku,
    'Barcode': p.barcode,
    'Kategori': p.category,
    'Harga Modal': p.costPrice ?? p.cost_price ?? 0,
    'Harga Jual': p.sellPrice ?? p.price ?? 0,
    'Stok Sistem': p.stock ?? 0,
    'Stok Fisik': '',
    'Selisih': '',
    'Nilai Selisih': '',
    'Status': (p.isActive ?? p.is_active) ? 'Aktif' : 'Nonaktif',
    'Promo': p.promoType ?? p.jenis_diskon ?? '-',
    'Updated At': p.updatedAt ? new Date(p.updatedAt).toLocaleString('id-ID') : ''
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);

  for (let i = 2; i <= products.length + 1; i++) {
    worksheet[`F${i}`].t = 'n';
    worksheet[`F${i}`].z = '"Rp "#,##0';
    worksheet[`G${i}`].t = 'n';
    worksheet[`G${i}`].z = '"Rp "#,##0';
  }

  const headerCols = ['A1','B1','C1','D1','E1','F1','G1','H1','I1','J1','K1','L1','M1','N1'];
  headerCols.forEach(cell => {
    if (worksheet[cell]) {
      worksheet[cell].s = {
        fill: { fgColor: { rgb: "FFD700" } },
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

  for (let r = 2; r <= products.length + 1; r++) {
    for (let c = 0; c < headerCols.length; c++) {
      const col = String.fromCharCode(65 + c);
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

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Stok Opname');
  XLSX.writeFile(workbook, `stok-opname-${new Date().toISOString().slice(0, 10)}.xlsx`);
}

function exportStokOpnamePDF(products) {
  if (!Array.isArray(products) || products.length === 0) {
    alert('Data produk kosong');
    return;
  }

  let jsPDF = null;
  if (window.jspdf && window.jspdf.jsPDF) {
    jsPDF = window.jspdf.jsPDF;
  } else if (window.jsPDF) {
    jsPDF = window.jsPDF;
  }
  
  if (!jsPDF || !(jsPDF.prototype?.autoTable || jsPDF.API?.autoTable)) {
    alert('jsPDF atau autoTable belum dimuat!');
    return;
  }

  const doc = new jsPDF('l', 'mm', 'a4');
  doc.setFontSize(16);
  doc.text('Daftar Stok Opname Produk', 14, 14);

  const columns = [
    "ID Produk", "Nama Produk", "SKU", "Barcode", "Kategori",
    "Harga Modal", "Harga Jual", "Stok Sistem", "Stok Fisik",
    "Selisih", "Nilai Selisih", "Status", "Promo", "Updated At"
  ];
  
  const rows = products.map(p => [
    p.id,
    p.name,
    p.sku,
    p.barcode,
    p.category,
    "Rp " + (p.costPrice ?? p.cost_price ?? 0).toLocaleString('id-ID'),
    "Rp " + (p.sellPrice ?? p.price ?? 0).toLocaleString('id-ID'),
    p.stock ?? 0,
    "",
    "",
    "",
    (p.isActive ?? p.is_active) ? 'Aktif' : 'Nonaktif',
    p.promoType ?? p.jenis_diskon ?? '-',
    p.updatedAt ? new Date(p.updatedAt).toLocaleString('id-ID') : ''
  ]);

  doc.autoTable({
    head: [columns],
    body: rows,
    startY: 22,
    styles: { fontSize: 9 },
    headStyles: { fillColor: [229, 57, 53] },
    alternateRowStyles: { fillColor: [245, 245, 245] }
  });

  doc.save(`stok-opname-${new Date().toISOString().slice(0, 10)}.pdf`);
}

// ===== INIT PADA DOM READY =====
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 DOMContentLoaded event fired');
    initProduk();
    // Juga pastikan permission check dilakukan setelah semua selesai
    setTimeout(() => {
      console.log('🔐 Checking permissions after DOMContentLoaded...');
      ensureTambahProdukPermissions();
    }, 500);
  });
} else {
  console.log('📄 Document already loaded, calling initProduk immediately');
  initProduk();
  setTimeout(() => {
    console.log('🔐 Checking permissions...');
    ensureTambahProdukPermissions();
  }, 500);
}

// ===== PERMISSIONS HANDLER (DIPERBAIKI) =====
// Pastikan tombol "Tambah Produk" ter-hide untuk cashier
function ensureTambahProdukPermissions() {
  const role = (localStorage.getItem('role') || '').toLowerCase();
  console.log(`🔐 [ensureTambahProdukPermissions] Role: ${role}`);
  
  const tambahBtn = document.querySelector('.tambah-produk-btn');
  if (!tambahBtn) {
    console.warn('⚠️ [ensureTambahProdukPermissions] Tombol .tambah-produk-btn tidak ditemukan');
    return;
  }
  
  // Cek data-permissions
  const permissions = (tambahBtn.dataset.permissions || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
  console.log(`📋 [ensureTambahProdukPermissions] Permissions: ${permissions.join(', ')}`);
  
  // Jika role tidak ada di permissions, sembunyikan
  if (permissions.length > 0 && !permissions.includes(role)) {
    tambahBtn.style.display = 'none';
    console.log(`✅ [ensureTambahProdukPermissions] Tombol .tambah-produk-btn DI-HIDE untuk role: ${role}`);
  } else {
    tambahBtn.style.display = '';
    console.log(`✅ [ensureTambahProdukPermissions] Tombol .tambah-produk-btn DITAMPILKAN untuk role: ${role}`);
  }
  
  // Juga hide edit & delete buttons untuk cashier
  if (role === 'cashier') {
    document.querySelectorAll('.edit-produk, .hapus-produk').forEach(btn => {
      btn.style.display = 'none';
      console.log(`✅ Hide button: ${btn.className}`);
    });
  }
}

// Helper untuk mendapat role (kalau belum ada)
function getRole() {
  return (localStorage.getItem('role') || '').toLowerCase();
}

window.initProduk = initProduk;
window.ensureTambahProdukPermissions = ensureTambahProdukPermissions;
window.getRole = getRole;