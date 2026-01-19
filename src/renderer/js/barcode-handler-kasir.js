// ============================================
// UNIFIED BARCODE HANDLER UNTUK KASIR
// Menangani scan barcode dengan validasi + tambah ke keranjang
// ============================================

console.log('✅ [barcode-handler-kasir.js] File dimuat');

/**
 * Handler barcode untuk halaman kasir
 * Fetch produk dari API → Validasi → Tambah ke keranjang
 */
window.handleScannedBarcodeKasir = async function(barcode) {
  console.log('🔍 [handleScannedBarcodeKasir] Mulai proses barcode:', barcode);
  
  if (!barcode || barcode.trim().length === 0) {
    console.warn('⚠️ [handleScannedBarcodeKasir] Barcode kosong');
    showToastKasir('Barcode kosong!', 'error');
    return;
  }

  const storeId = localStorage.getItem('store_id');
  const token = localStorage.getItem('token');

  console.log('📋 [handleScannedBarcodeKasir] Data:', { storeId, barcode });

  // Validasi data
  if (!storeId) {
    console.error('❌ Store ID kosong');
    showToastKasir('Pilih toko terlebih dahulu!', 'error');
    return;
  }

  if (!token) {
    console.error('❌ Token kosong');
    showToastKasir('Session expired!', 'error');
    return;
  }

  try {
    // Step 1: Fetch produk by barcode
    console.log(`📡 [handleScannedBarcodeKasir] Fetch produk by barcode...`);
    const url = `http://103.126.116.119:8001/api/stores/${storeId}/products/barcode/${encodeURIComponent(barcode)}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    console.log(`📡 [handleScannedBarcodeKasir] Response status: ${response.status}`);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.warn('❌ [handleScannedBarcodeKasir] API error:', errorData);
      showProductNotFoundModalKasir(barcode);
      return;
    }

    const json = await response.json();
    console.log('📋 [handleScannedBarcodeKasir] Response data:', json);

    // Step 2: Extract product data
    const product = json?.data || json;
    
    if (!product) {
      console.warn('❌ [handleScannedBarcodeKasir] Product data kosong');
      showProductNotFoundModalKasir(barcode);
      return;
    }

    const productId = product.id || product.product_id || product.productId;
    const productName = product.name || product.title;
    const productPrice = Number(product.sellPrice || product.price || product.unit_price || 0);
    const productStock = Number(product.stock || product.quantity || 0);

    console.log('📋 [handleScannedBarcodeKasir] Product parsed:', {
      productId, productName, productPrice, productStock
    });

    // Step 3: Validasi
    if (!productId) {
      console.error('❌ Product ID tidak valid');
      showToastKasir('Product ID tidak valid!', 'error');
      return;
    }

    if (!productName) {
      console.error('❌ Product name tidak valid');
      showToastKasir('Nama produk tidak valid!', 'error');
      return;
    }

    if (productPrice <= 0) {
      console.error('❌ Product price tidak valid:', productPrice);
      showToastKasir('Harga produk tidak valid!', 'error');
      return;
    }

    if (productStock <= 0) {
      console.warn('⚠️ Stock tidak tersedia');
      showToastKasir(`❌ Stok "${productName}" tidak tersedia!`, 'warning');
      return;
    }

    // Step 4: Cek apakah addToCartFrontend ada
    if (typeof addToCartFrontend !== 'function') {
      console.error('❌ addToCartFrontend tidak ditemukan!');
      console.log('📋 Fungsi yang tersedia:', {
        'addToCartFrontend': typeof addToCartFrontend,
        'updateKeranjangView': typeof updateKeranjangView
      });
      showToastKasir('⚠️ Sistem keranjang belum siap, silakan refresh halaman!', 'error');
      return;
    }

    // Step 5: Siapkan data untuk keranjang
    const cartData = {
      id: Number(productId),
      name: productName,
      price: productPrice,
      sku: product.sku || '',
      stock: productStock,
      discount_type: product.discount_type || product.jenis_diskon || null,
      discount_value: Number(product.discount_value || product.nilai_diskon || 0),
      buy_qty: Number(product.buy_qty || product.buyQty || 0),
      free_qty: Number(product.free_qty || product.freeQty || 0),
      diskon_bundle_min_qty: Number(product.diskon_bundle_min_qty || product.bundle_min_qty || 0),
      diskon_bundle_value: Number(product.diskon_bundle_value || product.bundle_total_price || 0)
    };

    console.log('✅ [handleScannedBarcodeKasir] Data valid, siap tambah ke keranjang:', cartData);

    // Step 6: Tambah ke keranjang
    addToCartFrontend(cartData);
    console.log('✅ [handleScannedBarcodeKasir] addToCartFrontend() dipanggil');

    // Step 7: Update view
    if (typeof updateKeranjangView === 'function') {
      updateKeranjangView();
      console.log('✅ [handleScannedBarcodeKasir] updateKeranjangView() dipanggil');
    }

    // Step 8: Feedback user
    showToastKasir(`✓ "${productName}" ditambahkan ke keranjang!`, 'success');
    console.log('✅ [handleScannedBarcodeKasir] SELESAI - Produk ditambahkan');

  } catch (error) {
    console.error('❌ [handleScannedBarcodeKasir] Exception:', error);
    showToastKasir(`❌ Gagal: ${error.message}`, 'error');
  }
};

/**
 * Show modal ketika produk tidak ditemukan
 */
function showProductNotFoundModalKasir(barcode) {
  console.log('📋 [showProductNotFoundModalKasir] Barcode not found:', barcode);
  
  let modal = document.getElementById('modal-produk-notfound-kasir');
  
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'modal-produk-notfound-kasir';
    document.body.appendChild(modal);
  }

  modal.innerHTML = `
    <div style="
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.7);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 99999;
    ">
      <div style="
        background: #1f1414;
        padding: 32px 24px;
        border-radius: 12px;
        max-width: 380px;
        text-align: center;
        color: #fff;
      ">
        <h3>⚠️ Produk Tidak Ditemukan</h3>
        <p>Barcode: <strong>${barcode}</strong></p>
        <p style="color: #a1a1a1; font-size: 14px;">Scan barcode yang berbeda atau tambahkan produk baru</p>
        <button style="
          margin-top: 16px;
          padding: 10px 20px;
          border: none;
          background: #ef4444;
          color: #fff;
          border-radius: 8px;
          cursor: pointer;
        " onclick="document.getElementById('modal-produk-notfound-kasir').style.display='none'">
          Tutup
        </button>
      </div>
    </div>
  `;
  
  modal.style.display = 'flex';
}

/**
 * Toast helper
 */
function showToastKasir(message, type = 'info') {
  console.log(`[Toast-${type}] ${message}`);
  
  if (typeof window.showToast === 'function') {
    window.showToast(message, type);
  } else {
    // Fallback: buat toast manual
    const toast = document.createElement('div');
    toast.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
      color: #fff;
      padding: 12px 20px;
      border-radius: 8px;
      z-index: 99999;
    `;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => toast.remove(), 3000);
  }
}

console.log('✅ [barcode-handler-kasir.js] Semua function terdaftar');
console.log('📋 window.handleScannedBarcodeKasir =', typeof window.handleScannedBarcodeKasir);