// ...existing code...
window.initEditProdukPage = async function() {
  const urlParams = new URLSearchParams(window.location.search);
  const productId = urlParams.get('id');
  const storeId = localStorage.getItem('store_id');
  if (!productId || !storeId) {
    loadPage('produk');
    return;
  }

  // helper untuk tampilkan / sembunyikan input promo di edit page
  window.handlePromoChangeEdit = function() {
    const type = document.getElementById('promo-type').value;
    document.getElementById('promo-percent-wrapper').style.display = (type === 'percentage') ? 'block' : 'none';
    document.getElementById('promo-amount-wrapper').style.display = (type === 'amount') ? 'block' : 'none';
    document.getElementById('buyxgety-wrapper').style.display = (type === 'buyxgety') ? 'block' : 'none';
    document.getElementById('bundle-wrapper').style.display = (type === 'bundle') ? 'block' : 'none';
  };

  // Fetch detail produk
  try {
    const res = await window.apiRequest(`/stores/${storeId}/products/${productId}`);
    const produk = res?.data || res;

    document.getElementById('product-id').value = produk.id;
    document.getElementById('nama-produk').value = produk.name || '';
    document.getElementById('sku').value = produk.sku || '';
    document.getElementById('harga-jual').value = produk.price || produk.sellPrice || 0;
    document.getElementById('stok').value = produk.stock || 0;
    document.getElementById('is-active').value = String(produk.is_active ?? true);

    // --- POPULATE PROMO/DISKON FIELDS (baru) ---
    // backend fields naming: jenis_diskon, nilai_diskon, buy_qty, free_qty, diskon_bundle_min_qty, diskon_bundle_value
    const jenis = produk.jenis_diskon || produk.discount_type || '';
    const nilai = produk.nilai_diskon ?? produk.discount_value ?? 0;
    const buyQty = produk.buy_qty ?? 0;
    const freeQty = produk.free_qty ?? 0;
    const bundleMin = produk.diskon_bundle_min_qty ?? produk.bundle_min_qty ?? 0;
    const bundleVal = produk.diskon_bundle_value ?? produk.diskon_bundle_price ?? 0;

    if (jenis) document.getElementById('promo-type').value = jenis;
    if (jenis === 'percentage') document.getElementById('promo-percent').value = nilai;
    if (jenis === 'amount') document.getElementById('promo-amount').value = nilai;
    if (jenis === 'buyxgety') {
      document.getElementById('buy-qty').value = buyQty;
      document.getElementById('free-qty').value = freeQty;
    }
    if (jenis === 'bundle') {
      document.getElementById('bundle-qty').value = bundleMin;
      document.getElementById('bundle-total-price').value = bundleVal;
    }
    // tampilkan wrapper sesuai jenis
    handlePromoChangeEdit();
    // --- end populate ---
  } catch (err) {
    alert('Gagal mengambil data produk!');
    loadPage('produk');
    return;
  }

  // Handle submit update (perbarui mapping termasuk promo fields)
  const form = document.getElementById('form-edit-produk');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const promoType = document.getElementById('promo-type').value || "";

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

    const body = {
      name: document.getElementById('nama-produk').value,
      sku: document.getElementById('sku').value,
      price: Number(document.getElementById('harga-jual').value),
      stock: Number(document.getElementById('stok').value),
      is_active: document.getElementById('is-active').value === 'true',
      jenis_diskon,
      nilai_diskon,
      diskon_bundle_min_qty,
      diskon_bundle_value,
      buy_qty,
      free_qty
    };

    // remove nulls
    Object.keys(body).forEach(k => { if (body[k] === null) delete body[k]; });

    try {
      await window.apiRequest(`/stores/${storeId}/products/${productId}`, {
        method: 'PUT',
        body
      });

      // === Tambahan: upload gambar jika ada file ===
      const fileInput = document.getElementById('product-image');
      if (fileInput && fileInput.files && fileInput.files.length > 0) {
        await uploadGambarProdukEdit(storeId, productId, fileInput.files[0]);
      }

      if (window.showToast) showToast('Produk berhasil diupdate!', 'success');
      else alert('Produk berhasil diupdate!');
      // Setelah sukses tambah/edit produk:
      window.location.href = 'index.html#produk';
    } catch (err) {
      if (window.showToast) showToast('Gagal update produk!', 'error');
      else alert('Gagal update produk!');
    }
  });
};

async function uploadGambarProdukEdit(storeId, productId, file) {
  if (!file) return;
  const formData = new FormData();
  formData.append('product_id', productId);
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
    return data;
  } catch (err) {
    console.error('Gagal upload gambar produk:', err);
    throw err;
  }
}