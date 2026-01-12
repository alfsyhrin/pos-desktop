// Helper fungsi format rupiah
function formatRupiahInput(val) {
  // ✅ Parse sebagai float dulu untuk hilangkan trailing zeros
  const numVal = parseFloat(String(val).replace(/\./g, '').replace(/[^0-9.]/g, ''));
  
  if (isNaN(numVal) || numVal === 0) return '';
  
  // Format dengan separator ribuan tanpa desimal
  return Math.round(numVal).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function parseRupiahInput(val) {
  // ✅ Hati-hati dengan string yang sudah terpisah dengan titik
  const numStr = String(val)
    .replace(/\./g, '')      // Hapus separator ribuan
    .replace(/[^0-9]/g, ''); // Hapus karakter non-angka
  
  return parseInt(numStr, 10) || 0;
}

window.initEditProdukPage = async function() {
  console.log('📝 [initEditProdukPage] START');
  
  const form = document.getElementById('form-edit-produk');
  if (!form) {
    console.log('ℹ️ [initEditProdukPage] Tidak di halaman edit-produk, skip init');
    return;
  }
  
  if (document.readyState === 'loading') {
    await new Promise(resolve => document.addEventListener('DOMContentLoaded', resolve));
  }
  
  await new Promise(resolve => setTimeout(resolve, 500));
  
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
    
    console.log(`🎨 [handlePromoChangeEdit] Promo type: ${type}`);
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

    // ===== NORMALIZE FIELD NAMES & HARGA =====
    const normalizedProduk = {
      id: produk.id,
      name: produk.name,
      sku: produk.sku,
      barcode: produk.barcode,
      // ✅ PENTING: Parse harga sebagai angka, hilangkan trailing zeros
      costPrice: parseFloat(produk.cost_price || produk.costPrice || 0),
      sellPrice: parseFloat(produk.price || produk.sellPrice || 0),
      stock: produk.stock,
      isActive: produk.is_active ?? produk.isActive ?? 1,
      
      // Promo/Diskon fields - DETEKSI OTOMATIS JENIS DISKON
      promoType: produk.jenis_diskon || produk.promoType || null,
      promoPercent: parseFloat(produk.nilai_diskon || 0),
      promoAmount: parseFloat(produk.nilai_diskon || 0),
      buyQty: produk.buy_qty || produk.buyQty || null,
      freeQty: produk.free_qty || produk.freeQty || null,
      bundleQty: produk.diskon_bundle_min_qty || produk.bundleQty || null,
      bundleTotalPrice: parseFloat(produk.diskon_bundle_value || produk.bundleTotalPrice || 0)
    };

    // ✅ AUTO-DETECT JENIS DISKON JIKA NULL
    if (!normalizedProduk.promoType) {
      if (normalizedProduk.bundleQty && normalizedProduk.bundleQty > 0) {
        normalizedProduk.promoType = 'bundle';
        console.log('🔍 Auto-detect: Bundle promo detected');
      } else if (normalizedProduk.buyQty && normalizedProduk.freeQty) {
        normalizedProduk.promoType = 'buyxgety';
        console.log('🔍 Auto-detect: BuyXGetY promo detected');
      } else if (normalizedProduk.promoPercent && normalizedProduk.promoPercent > 0) {
        normalizedProduk.promoType = 'percentage';
        console.log('🔍 Auto-detect: Percentage promo detected');
      } else if (normalizedProduk.promoAmount && normalizedProduk.promoAmount > 0) {
        normalizedProduk.promoType = 'amount';
        console.log('🔍 Auto-detect: Amount promo detected');
      }
    }

    console.log('🔄 Normalized produk:', normalizedProduk);

    // Query element dengan optional chaining
    const productIdEl = document.getElementById('product-id');
    const namaProdukEl = document.getElementById('nama-produk');
    const skuEl = document.getElementById('sku');
    const barcodeEl = document.getElementById('barcode');
    const hargaModalEl = document.getElementById('harga-modal');
    const hargaJualEl = document.getElementById('harga-jual');
    const stokEl = document.getElementById('stok');
    const isActiveEl = document.getElementById('is-active');
    const promoTypeEl = document.getElementById('promo-type');

    // Set nilai dengan aman
    if (productIdEl) productIdEl.value = normalizedProduk.id || '';
    if (namaProdukEl) namaProdukEl.value = normalizedProduk.name || '';
    if (skuEl) skuEl.value = normalizedProduk.sku || '';
    if (barcodeEl) barcodeEl.value = normalizedProduk.barcode || '';
    
    if (hargaModalEl) hargaModalEl.value = formatRupiahInput(normalizedProduk.costPrice);
    if (hargaJualEl) hargaJualEl.value = formatRupiahInput(normalizedProduk.sellPrice);
    if (stokEl) stokEl.value = normalizedProduk.stock || 0;
    if (isActiveEl) isActiveEl.value = String(normalizedProduk.isActive !== 0);

    // --- POPULATE PROMO/DISKON FIELDS ---
    const promoType = normalizedProduk.promoType || '';

    console.log(`💾 Setting promo type: "${promoType}"`);

    if (promoTypeEl) {
      promoTypeEl.value = promoType;
      console.log(`✅ Promo Type dropdown set to: ${promoType}`);
    }
    
    const promoPercentEl = document.getElementById('promo-percent');
    const promoAmountEl = document.getElementById('promo-amount');
    const buyQtyEl = document.getElementById('buy-qty');
    const freeQtyEl = document.getElementById('free-qty');
    const bundleQtyEl = document.getElementById('bundle-qty');
    const bundlePriceEl = document.getElementById('bundle-total-price');

    // ===== CRITICAL: Populate berdasarkan promoType & data yang tersedia =====
    if (promoType === 'percentage' && promoPercentEl) {
      promoPercentEl.value = normalizedProduk.promoPercent || 0;
      console.log(`✅ Promo Percent set to: ${normalizedProduk.promoPercent}`);
    } 
    else if (promoType === 'amount' && promoAmountEl) {
      promoAmountEl.value = normalizedProduk.promoAmount || 0;
      console.log(`✅ Promo Amount set to: ${normalizedProduk.promoAmount}`);
    } 
    else if (promoType === 'buyxgety') {
      if (buyQtyEl) {
        buyQtyEl.value = normalizedProduk.buyQty || 0;
        console.log(`✅ Buy Qty set to: ${normalizedProduk.buyQty}`);
      }
      if (freeQtyEl) {
        freeQtyEl.value = normalizedProduk.freeQty || 0;
        console.log(`✅ Free Qty set to: ${normalizedProduk.freeQty}`);
      }
    } 
    else if (promoType === 'bundle') {
      if (bundleQtyEl) {
        bundleQtyEl.value = normalizedProduk.bundleQty || 0;
        console.log(`✅ Bundle Qty set to: ${normalizedProduk.bundleQty}`);
      }
      if (bundlePriceEl) {
        // ✅ Format harga bundle dengan Rupiah
        bundlePriceEl.value = formatRupiahInput(normalizedProduk.bundleTotalPrice);
        console.log(`✅ Bundle Total Price set to: ${normalizedProduk.bundleTotalPrice}`);
      }
    }
    // Handle bundle tanpa promoType (bundleQty & bundleTotalPrice ada tapi promoType=null)
    else if (!promoType && normalizedProduk.bundleQty && normalizedProduk.bundleTotalPrice) {
      console.log(`⚠️ Detected bundle data tanpa promoType, auto-set ke bundle`);
      if (promoTypeEl) {
        promoTypeEl.value = 'bundle';
      }
      if (bundleQtyEl) {
        bundleQtyEl.value = normalizedProduk.bundleQty;
        console.log(`✅ Auto-set Bundle Qty: ${normalizedProduk.bundleQty}`);
      }
      if (bundlePriceEl) {
        // ✅ Format harga bundle dengan Rupiah
        bundlePriceEl.value = formatRupiahInput(normalizedProduk.bundleTotalPrice);
        console.log(`✅ Auto-set Bundle Total Price: ${normalizedProduk.bundleTotalPrice}`);
      }
    }
    
    // Trigger promo change handler untuk show/hide field yang sesuai
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
  form.onsubmit = null;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const storeId = localStorage.getItem('store_id');
    const productId = document.getElementById('product-id')?.value;

    if (!storeId || !productId) {
      window.showToast?.('Store ID atau Product ID hilang', 'error');
      return;
    }

    const hargaModalValue = parseRupiahInput(document.getElementById('harga-modal')?.value || '0');
    const hargaJualValue = parseRupiahInput(document.getElementById('harga-jual')?.value || '0');
    const barcode = (document.getElementById('barcode')?.value || '').trim();

    const promoType = document.getElementById('promo-type')?.value || "";

    // Diskon fields
    let jenis_diskon = null;
    let nilai_diskon = null;
    let diskon_bundle_min_qty = null;
    let diskon_bundle_value = null;
    let buy_qty = null;
    let free_qty = null;

    if (promoType === "percentage") {
      jenis_diskon = "percentage";
      nilai_diskon = parseFloat(document.getElementById('promo-percent')?.value || 0) || null;
    } else if (promoType === "amount") {
      jenis_diskon = "amount";
      nilai_diskon = parseRupiahInput(document.getElementById('promo-amount')?.value || '0') || null;
    } else if (promoType === "buyxgety") {
      jenis_diskon = "buyxgety";
      buy_qty = parseInt(document.getElementById('buy-qty')?.value || 0, 10) || null;
      free_qty = parseInt(document.getElementById('free-qty')?.value || 0, 10) || null;
    } else if (promoType === "bundle") {
      jenis_diskon = "bundle";
      diskon_bundle_min_qty = parseInt(document.getElementById('bundle-qty')?.value || 0, 10) || null;
      diskon_bundle_value = parseRupiahInput(document.getElementById('bundle-total-price')?.value || '0') || null;
      // Validasi wajib
      if (!diskon_bundle_min_qty || !diskon_bundle_value) {
        window.showToast?.('Bundle Qty dan Bundle Price wajib diisi dan > 0!', 'warn');
        return;
      }
    }

    // Build body
    const body = {
      name: document.getElementById('nama-produk')?.value || '',
      sku: document.getElementById('sku')?.value || '',
      barcode: barcode,
      cost_price: hargaModalValue,
      price: hargaJualValue,
      stock: parseInt(document.getElementById('stok')?.value || 0, 10),
      is_active: document.getElementById('is-active')?.value === 'true',
      jenis_diskon: jenis_diskon,
      nilai_diskon: nilai_diskon,
      diskon_bundle_min_qty: diskon_bundle_min_qty,
      diskon_bundle_value: diskon_bundle_value,
      buy_qty: buy_qty,
      free_qty: free_qty
    };

    // Hapus field diskon jika bukan tipe diskon terkait
    if (jenis_diskon !== "percentage" && jenis_diskon !== "amount") {
      delete body.nilai_diskon;
    }
    if (jenis_diskon !== "bundle") {
      delete body.diskon_bundle_min_qty;
      delete body.diskon_bundle_value;
    }
    if (jenis_diskon !== "buyxgety") {
      delete body.buy_qty;
      delete body.free_qty;
    }

    // Pastikan jika jenis_diskon null, field diskon lain juga null
    if (!jenis_diskon) {
      body.nilai_diskon = null;
      body.diskon_bundle_min_qty = null;
      body.diskon_bundle_value = null;
      body.buy_qty = null;
      body.free_qty = null;
    }

    console.log('📤 Sending body:', JSON.stringify(body, null, 2));

    try {
      const response = await window.apiRequest(`/stores/${storeId}/products/${productId}`, {
        method: 'PUT',
        body
      });

      console.log('📤 Response dari server:', response);

      const fileInput = document.getElementById('product-image');
      if (fileInput?.files?.length > 0) {
        await uploadGambarProdukEdit(storeId, productId, fileInput.files[0]);
      }

      window.showToast?.('Produk berhasil diupdate!', 'success');
      setTimeout(() => {
        window.location.href = 'index.html#produk';
      }, 800);
    } catch (err) {
      console.error('❌ Update error:', err);
      window.showToast?.(`Gagal: ${err.message || 'Terjadi kesalahan'}`, 'error');
    }
  });
};

// Panggil saat DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      if (document.getElementById('form-edit-produk')) {
        window.initEditProdukPage();
        
        // ✅ TAMBAH: Setup event listener untuk promo-type dropdown
        const promoTypeEl = document.getElementById('promo-type');
        if (promoTypeEl) {
          promoTypeEl.addEventListener('change', () => {
            console.log(`🔄 Promo type changed to: ${promoTypeEl.value}`);
            if (window.handlePromoChangeEdit) {
              window.handlePromoChangeEdit();
            }
          });
        }
      }
    });
  } else {
    if (document.getElementById('form-edit-produk')) {
      window.initEditProdukPage();
      
      // ✅ TAMBAH: Setup event listener untuk promo-type dropdown
      const promoTypeEl = document.getElementById('promo-type');
      if (promoTypeEl) {
        promoTypeEl.addEventListener('change', () => {
          console.log(`🔄 Promo type changed to: ${promoTypeEl.value}`);
          if (window.handlePromoChangeEdit) {
            window.handlePromoChangeEdit();
          }
        });
      }
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
    console.log('✅ Upload gambar berhasil');
    return data;
  } catch (err) {
    console.error('❌ Upload gambar error:', err);
    throw err;
  }
}