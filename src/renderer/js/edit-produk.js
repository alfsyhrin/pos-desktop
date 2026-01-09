// Helper fungsi format rupiah (copy dari edit-produk.html)
function formatRupiahInput(val) {
  const num = String(val).replace(/\D/g, '');
  if (!num) return '';
  return num.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function parseRupiahInput(val) {
  return Number(String(val).replace(/\./g, '').replace(/[^0-9]/g, '')) || 0;
}

window.initEditProdukPage = async function() {
  console.log('📝 [initEditProdukPage] START');
  
  // ⭐ PERBAIKI: CEK APAKAH INI HALAMAN EDIT-PRODUK
  // Jika element form tidak ada, berarti bukan halaman edit -> SKIP
  const form = document.getElementById('form-edit-produk');
  if (!form) {
    console.log('ℹ️ [initEditProdukPage] Tidak di halaman edit-produk, skip init');
    return;
  }
  
  // Tunggu DOM siap
  if (document.readyState === 'loading') {
    await new Promise(resolve => document.addEventListener('DOMContentLoaded', resolve));
  }
  
  // ⭐ TAMBAH: TUNGGU EKSTRA UNTUK MEMASTIKAN ELEMENT SIAP
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Ambil productId dari berbagai sumber
  const params = window.__editProdukParams || {};
  let productId = params.id;
  
  if (!productId) {
    productId = sessionStorage.getItem('edit_product_id');
  }
  
  if (!productId) {
    const urlParams = new URLSearchParams(window.location.search || window.location.hash.split('?')[1]);
    productId = urlParams.get('id');
  }
  
  const storeId = localStorage.getItem('store_id');
  
  console.log(`📝 [initEditProdukPage] productId: ${productId}, storeId: ${storeId}`);
  
  if (!productId || !storeId) {
    console.error('❌ Missing productId or storeId');
    if (window.showToast) {
      window.showToast('ID produk atau toko tidak ditemukan', 'error');
    } else {
      alert('ID produk atau toko tidak ditemukan');
    }
    setTimeout(() => {
      window.location.href = 'index.html#produk';
    }, 1000);
    return;
  }

  // Helper untuk tampilkan / sembunyikan input promo di edit page
  window.handlePromoChangeEdit = function() {
    const type = document.getElementById('promo-type')?.value || '';
    const percentWrapper = document.getElementById('promo-percent-wrapper');
    const amountWrapper = document.getElementById('promo-amount-wrapper');
    const buyxgetyWrapper = document.getElementById('buyxgety-wrapper');
    const bundleWrapper = document.getElementById('bundle-wrapper');
    
    if (percentWrapper) percentWrapper.style.display = (type === 'percentage') ? 'block' : 'none';
    if (amountWrapper) amountWrapper.style.display = (type === 'amount') ? 'block' : 'none';
    if (buyxgetyWrapper) buyxgetyWrapper.style.display = (type === 'buyxgety') ? 'block' : 'none';
    if (bundleWrapper) bundleWrapper.style.display = (type === 'bundle') ? 'block' : 'none';
  };

  // Fetch detail produk
  try {
    console.log(`📡 Fetching /stores/${storeId}/products/${productId}`);
    const res = await window.apiRequest(`/stores/${storeId}/products/${productId}`);
    
    console.log('📦 Response:', res);
    
    // Handle berbagai format response
    let produk = res;
    if (res?.data && typeof res.data === 'object' && !Array.isArray(res.data)) {
      produk = res.data;
    }

    console.log('✅ Produk data:', produk);

    if (!produk || !produk.id) {
      throw new Error('Data produk tidak valid');
    }

    // ⭐ PERBAIKI: Query element dengan optional chaining
    // TIDAK perlu cek lagi, karena sudah cek form ada di awal
    const productIdEl = document.getElementById('product-id');
    const namaProdukEl = document.getElementById('nama-produk');
    const skuEl = document.getElementById('sku');
    const barcodeEl = document.getElementById('barcode');
    const hargaModalEl = document.getElementById('harga-modal');
    const hargaJualEl = document.getElementById('harga-jual');
    const stokEl = document.getElementById('stok');
    const isActiveEl = document.getElementById('is-active');
    const promoTypeEl = document.getElementById('promo-type');

    // Set nilai dengan aman (gunakan optional chaining)
    if (productIdEl) productIdEl.value = produk.id || '';
    if (namaProdukEl) namaProdukEl.value = produk.name || '';
    if (skuEl) skuEl.value = produk.sku || '';
    if (barcodeEl) barcodeEl.value = produk.barcode || '';
    
    const costPrice = Number(produk.cost_price || produk.cost || 0);
    const sellPrice = Number(produk.price || 0);
    
    if (hargaModalEl) hargaModalEl.value = formatRupiahInput(costPrice);
    if (hargaJualEl) hargaJualEl.value = formatRupiahInput(sellPrice);
    if (stokEl) stokEl.value = produk.stock || 0;
    if (isActiveEl) isActiveEl.value = String(produk.is_active !== false);

    // --- POPULATE PROMO/DISKON FIELDS ---
    const jenis = produk.jenis_diskon || '';
    const nilai = produk.nilai_diskon ?? 0;
    const buyQty = produk.buy_qty ?? 0;
    const freeQty = produk.free_qty ?? 0;
    const bundleMin = produk.diskon_bundle_min_qty ?? 0;
    const bundleVal = produk.diskon_bundle_value ?? 0;

    if (promoTypeEl && jenis) promoTypeEl.value = jenis;
    
    const promoPercentEl = document.getElementById('promo-percent');
    const promoAmountEl = document.getElementById('promo-amount');
    const buyQtyEl = document.getElementById('buy-qty');
    const freeQtyEl = document.getElementById('free-qty');
    const bundleQtyEl = document.getElementById('bundle-qty');
    const bundlePriceEl = document.getElementById('bundle-total-price');

    if (jenis === 'percentage' && promoPercentEl) promoPercentEl.value = nilai;
    if (jenis === 'amount' && promoAmountEl) promoAmountEl.value = nilai;
    if (jenis === 'buyxgety' && buyQtyEl && freeQtyEl) {
      buyQtyEl.value = buyQty;
      freeQtyEl.value = freeQty;
    }
    if (jenis === 'bundle' && bundleQtyEl && bundlePriceEl) {
      bundleQtyEl.value = bundleMin;
      bundlePriceEl.value = bundleVal;
    }
    
    handlePromoChangeEdit();

    console.log('✅ Form populated successfully');
  } catch (err) {
    console.error('❌ [initEditProdukPage] Error:', err);
    if (window.showToast) {
      window.showToast('Gagal mengambil data produk: ' + err.message, 'error');
    } else {
      alert('Gagal mengambil data produk: ' + err.message); 
    }
    setTimeout(() => {
      window.location.href = 'index.html#produk';
    }, 1500);
    return;
  }

  // Handle submit update
  // Form sudah diperiksa di awal, jadi pasti ada
  form.onsubmit = null;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const storeId = localStorage.getItem('store_id');
    const productId = document.getElementById('product-id')?.value;
    
    if (!storeId || !productId) {
      if (window.showToast) {
        window.showToast('Store ID atau Product ID hilang', 'error');
      } else {
        alert('Store ID atau Product ID hilang');
      }
      return;
    }

    const promoType = document.getElementById('promo-type')?.value || "";

    let jenis_diskon = null;
    let nilai_diskon = null;
    let diskon_bundle_min_qty = null;
    let diskon_bundle_value = null;
    let buy_qty = null;
    let free_qty = null;

    if (promoType === "percentage") {
      jenis_diskon = "percentage";
      nilai_diskon = Number(document.getElementById('promo-percent')?.value || 0);
    } else if (promoType === "amount") {
      jenis_diskon = "amount";
      nilai_diskon = Number(document.getElementById('promo-amount')?.value || 0);
    } else if (promoType === "buyxgety") {
      jenis_diskon = "buyxgety";
      buy_qty = Number(document.getElementById('buy-qty')?.value || 0);
      free_qty = Number(document.getElementById('free-qty')?.value || 0);
    } else if (promoType === "bundle") {
      jenis_diskon = "bundle";
      diskon_bundle_min_qty = Number(document.getElementById('bundle-qty')?.value || 0);
      diskon_bundle_value = Number(document.getElementById('bundle-total-price')?.value || 0);
    }

    const hargaModalValue = parseRupiahInput(document.getElementById('harga-modal')?.value || '0');
    const hargaJualValue = parseRupiahInput(document.getElementById('harga-jual')?.value || '0');

    const body = {
      name: document.getElementById('nama-produk')?.value || '',
      sku: document.getElementById('sku')?.value || '',
      cost_price: hargaModalValue,
      price: hargaJualValue,
      stock: Number(document.getElementById('stok')?.value || 0),
      is_active: document.getElementById('is-active')?.value === 'true'
    };

    if (jenis_diskon) {
      body.jenis_diskon = jenis_diskon;
      body.nilai_diskon = nilai_diskon;
    }
    if (diskon_bundle_min_qty) body.diskon_bundle_min_qty = diskon_bundle_min_qty;
    if (diskon_bundle_value) body.diskon_bundle_value = diskon_bundle_value;
    if (buy_qty) body.buy_qty = buy_qty;
    if (free_qty) body.free_qty = free_qty;

    try {
      await window.apiRequest(`/stores/${storeId}/products/${productId}`, {
        method: 'PUT',
        body
      });

      const fileInput = document.getElementById('product-image');
      if (fileInput?.files?.length > 0) {
        await uploadGambarProdukEdit(storeId, productId, fileInput.files[0]);
      }

      if (window.showToast) {
        window.showToast('Produk berhasil diupdate!', 'success');
      } else {
        alert('Produk berhasil diupdate!');
      }
      
      setTimeout(() => {
        window.location.href = 'index.html#produk';
      }, 800);
    } catch (err) {
      console.error('❌ Update error:', err);
      if (window.showToast) {
        window.showToast('Gagal update produk: ' + err.message, 'error');
      } else {
        alert('Gagal update produk: ' + err.message);
      }
    }
  });
};

// ⭐ PERBAIKI: Hanya panggil jika benar-benar di halaman edit
// Panggil saat DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    // Cek apakah form ada
    if (document.getElementById('form-edit-produk')) {
      window.initEditProdukPage();
    }
  });
} else {
  // DOM sudah ready
  if (document.getElementById('form-edit-produk')) {
    window.initEditProdukPage();
  }
}

async function uploadGambarProdukEdit(storeId, productId, file) {
  if (!file) return;
  const formData = new FormData();
  formData.append('product_id', productId);
  formData.append('image', file);

  try {
    const token = localStorage.getItem('token');
    const res = await fetch(`${window.BASE_URL || ''}/stores/${storeId}/upload-image`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`
      },
      body: formData
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Gagal upload gambar produk');
    return data;
  } catch (err) {
    console.error('❌ Upload gambar error:', err);
    throw err;
  }
}