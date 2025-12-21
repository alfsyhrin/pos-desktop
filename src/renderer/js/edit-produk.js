// ...existing code...
window.initEditProdukPage = async function() {
  const urlParams = new URLSearchParams(window.location.search);
  const productId = urlParams.get('id');
  const storeId = localStorage.getItem('store_id');
  if (!productId || !storeId) {
    loadPage('produk');
    return;
  }

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
  } catch (err) {
    alert('Gagal mengambil data produk!');
    loadPage('produk');
    return;
  }

  // Handle submit update
  const form = document.getElementById('form-edit-produk');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const body = {
      name: document.getElementById('nama-produk').value,
      sku: document.getElementById('sku').value,
      price: Number(document.getElementById('harga-jual').value),
      stock: Number(document.getElementById('stok').value),
      is_active: document.getElementById('is-active').value === 'true'
    };

    try {
      // Update product first
      await window.apiRequest(`/stores/${storeId}/products/${productId}`, {
        method: 'PUT',
        body
      });

      // If image selected, upload it
      const fileInput = document.getElementById('product-image');
      if (fileInput && fileInput.files && fileInput.files.length > 0) {
        // gunakan global upload function (ada di produk.js)
        if (window.uploadGambarProduk) {
          await window.uploadGambarProduk(productId, fileInput.files[0]);
        } else {
          // fallback: perform manual upload here
          const formData = new FormData();
          formData.append('image', fileInput.files[0]);
          formData.append('product_id', productId);
          const token = localStorage.getItem('token');
          const resUpload = await fetch(`${BASE_URL}/products/upload-image`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
            body: formData
          });
          if (!resUpload.ok) throw new Error('Gagal upload gambar');
        }
      }

      alert('Produk berhasil diupdate!');
      loadPage('produk');
    } catch (err) {
      console.error('Gagal update produk:', err);
      alert('Gagal update produk!');
    }
  });
};