let html5QrCode = null;
    let cameraActive = false;
    let scannerBuffer = '';
    let scannerTimeout = null;

    // ==========================================
    // WIRED BARCODE SCANNER (WOYA) SUPPORT
    // ==========================================
    // Scanner kabel bekerja seperti keyboard - mengirim karakter diakhiri Enter
    
    document.addEventListener('keydown', function(e) {
      // Jika fokus di input form, abaikan
      const activeElement = document.activeElement;
      const isFormInput = activeElement.tagName === 'INPUT' || 
                          activeElement.tagName === 'TEXTAREA' || 
                          activeElement.tagName === 'SELECT';
      
      if (isFormInput && activeElement.id !== 'scanner-input') {
        return;
      }

      // Tangkap karakter dari scanner
      if (e.key === 'Enter') {
        if (scannerBuffer.length > 3) {
          // Barcode terdeteksi!
          handleScannedBarcode(scannerBuffer);
        }
        scannerBuffer = '';
        clearTimeout(scannerTimeout);
      } else if (e.key.length === 1) {
        scannerBuffer += e.key;
        
        // Reset buffer setelah 100ms tidak ada input (scanner sangat cepat)
        clearTimeout(scannerTimeout);
        scannerTimeout = setTimeout(() => {
          scannerBuffer = '';
        }, 100);
      }
    });

    function handleScannedBarcode(barcode) {
      showToast('Barcode terdeteksi: ' + barcode, 'success');
      // Panggil handler pencarian produk di produk.js
      if (window.onBarcodeScanned) {
        window.onBarcodeScanned(barcode);
      }
      // Isi kolom barcode di tools
      document.getElementById('barcode-value').value = barcode;
      
      // Isi kolom barcode di form produk
      document.getElementById('product-barcode').value = barcode;
      
      // Generate preview barcode
      generateBarcodeFromValue(barcode);
    }

    function focusScannerInput() {
      document.getElementById('scanner-input').focus();
      showToast('Scanner mode aktif - Arahkan scanner Woya ke barcode', 'info');
    }

    function focusProductBarcode() {
      document.getElementById('scanner-input').focus();
      showToast('Scan barcode produk dengan scanner Woya', 'info');
    }

    // ==========================================
    // BARCODE GENERATION
    // ==========================================
    
// Defensive helpers + ensure UI
function safeGet(id) { return document.getElementById(id) || null; }

function ensureToastContainer() {
  let t = safeGet('toast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'toast';
    t.style.position = 'fixed';
    t.style.right = '16px';
    t.style.bottom = '16px';
    t.style.zIndex = '99999';
    document.body.appendChild(t);
  }
  return t;
}
function showToast(msg, type = 'info') {
  const toast = ensureToastContainer();
  toast.textContent = msg;
  toast.className = 'toast ' + type + ' show';
  if (toast._hideTimeout) clearTimeout(toast._hideTimeout);
  toast._hideTimeout = setTimeout(() => toast.classList.remove('show'), 3000);
}

// Safe DOM operations wrappers used later
function setInputValue(id, val) { const el = safeGet(id); if (el) el.value = val; }

    function handleTypeChange() {
      const type = document.getElementById('barcode-type').value;
      const input = document.getElementById('barcode-value');
      
      if (type === 'EAN13') {
        input.placeholder = 'Masukkan 12 digit angka';
        input.maxLength = 12;
      } else if (type === 'QR') {
        input.placeholder = 'Masukkan teks bebas';
        input.maxLength = 500;
      } else {
        input.placeholder = 'Masukkan atau scan barcode...';
        input.maxLength = 50;
      }
    }

    function generateBarcode() {
      const type = document.getElementById('barcode-type').value;
      let value = document.getElementById('barcode-value').value.trim();
      
      // Generate random value jika kosong
      if (!value) {
        if (type === 'EAN13') {
          value = generateEAN13();
        } else if (type === 'QR') {
          value = 'PRODUCT-' + Date.now();
        } else {
          value = 'CODE-' + Math.random().toString(36).substring(2, 10).toUpperCase();
        }
        document.getElementById('barcode-value').value = value;
      }
      
      generateBarcodeFromValue(value);
    }

    function generateBarcodeFromValue(value) {
      const type = document.getElementById('barcode-type').value;
      const barcodePreview = document.getElementById('barcode-preview');
      const qrPreview = document.getElementById('qr-preview');
      
      // Clear previews
      barcodePreview.innerHTML = '<span class="preview-empty">Belum ada barcode</span>';
      qrPreview.innerHTML = '<span class="preview-empty">Belum ada QR Code</span>';
      
      try {
        if (type === 'QR') {
          // Generate QR Code
          const canvas = document.createElement('canvas');
          QRCode.toCanvas(canvas, value, {
            width: 150,
            margin: 2,
            color: {
              dark: '#000000',
              light: '#ffffff'
            }
          }, function(error) {
            if (error) {
              showToast('Gagal generate QR Code: ' + error, 'error');
            } else {
              qrPreview.innerHTML = '';
              qrPreview.appendChild(canvas);
              showToast('QR Code berhasil dibuat', 'success');
            }
          });
        } else {
          // Generate Barcode (Code128 or EAN13)
          const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
          
          let barcodeFormat = type;
          let barcodeValue = value;
          
          if (type === 'EAN13') {
            // Validasi EAN-13: harus 12 digit
            barcodeValue = value.replace(/\D/g, '').substring(0, 12);
            if (barcodeValue.length !== 12) {
              showToast('EAN-13 membutuhkan tepat 12 digit angka', 'error');
              return;
            }
          }
          
          JsBarcode(svg, barcodeValue, {
            format: barcodeFormat,
            width: 2,
            height: 80,
            displayValue: true,
            fontSize: 14,
            margin: 10
          });
          
          barcodePreview.innerHTML = '';
          barcodePreview.appendChild(svg);
          showToast('Barcode berhasil dibuat', 'success');
        }
        
        // Update product barcode field juga
        document.getElementById('product-barcode').value = value;
        
      } catch (error) {
        showToast('Error: ' + error.message, 'error');
      }
    }

    function generateEAN13() {
      let code = '';
      for (let i = 0; i < 12; i++) {
        code += Math.floor(Math.random() * 10);
      }
      return code;
    }

    // ==========================================
    // CAMERA SCANNER
    // ==========================================
    
    function toggleCamera() {
      if (cameraActive) {
        stopCamera();
      } else {
        startCamera();
      }
    }

async function startCamera() {
  // tunggu singkat agar SPA bisa menyisipkan elemen produk.html ke DOM
  let cameraReader = document.getElementById('camera-reader');
  let retry = 0;
  while (!cameraReader && retry < 20) { // tunggu sampai 2s total
    await new Promise(r => setTimeout(r, 100));
    cameraReader = document.getElementById('camera-reader');
    retry++;
  }

  // fallback: buat container/reader jika belum ada (mencegah null)
  let container = document.getElementById('camera-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'camera-container';
    container.style.display = 'none';
    document.body.appendChild(container);
  }
  if (!cameraReader) {
    cameraReader = document.createElement('div');
    cameraReader.id = 'camera-reader';
    container.appendChild(cameraReader);
  }

  // pilih button yang ada di halaman (dukung btn-camera atau btn-scan-camera)
  const btn = document.getElementById('btn-camera') || document.getElementById('btn-scan-camera') || null;

  // pastikan library Html5Qrcode tersedia
  if (typeof Html5Qrcode === 'undefined') {
    showToast('Library scanner belum dimuat (Html5Qrcode).', 'error');
    return;
  }

  try {
    container.style.display = 'block';
    container.classList.add('active');
    cameraReader.innerHTML = ''; // aman karena kita sudah memastikan cameraReader ada

    // inisialisasi html5QrCode
    if (html5QrCode) {
      try { await html5QrCode.clear(); } catch (_) {}
      html5QrCode = null;
    }
    html5QrCode = new Html5Qrcode("camera-reader");

    const config = { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 };
    await html5QrCode.start(
      { facingMode: "environment" },
      config,
      (decodedText) => {
        handleScannedBarcode(decodedText);
        stopCamera();
      },
      (errorMessage) => { /* ignore frame decode errors */ }
    );

    cameraActive = true;
    if (btn) btn.innerHTML = '<span class="material-symbols-outlined">videocam_off</span> Stop Kamera';
    showToast('Kamera aktif - Arahkan ke barcode', 'info');
  } catch (error) {
    container.classList.remove('active');
    container.style.display = 'none';
    showToast('Gagal membuka kamera: ' + (error?.message || error), 'error');
    console.error('Camera error:', error);
  }
}

function stopCamera() {
  const container = document.getElementById('camera-container');
  const btn = document.getElementById('btn-camera') || document.getElementById('btn-scan-camera') || null;

  if (html5QrCode && cameraActive) {
    html5QrCode.stop().then(() => {
      try { html5QrCode.clear(); } catch (_) {}
      html5QrCode = null;
      cameraActive = false;
      if (container) {
        container.classList.remove('active');
        container.style.display = 'none';
      }
      if (btn) btn.innerHTML = '<span class="material-symbols-outlined">photo_camera</span> Scan Kamera';
    }).catch(err => {
      console.error('Error stopping camera:', err);
      if (container) {
        container.classList.remove('active');
        container.style.display = 'none';
      }
      if (btn) btn.innerHTML = '<span class="material-symbols-outlined">photo_camera</span> Scan Kamera';
      cameraActive = false;
      html5QrCode = null;
    });
  } else {
    if (container) {
      container.classList.remove('active');
      container.style.display = 'none';
    }
    if (btn) btn.innerHTML = '<span class="material-symbols-outlined">photo_camera</span> Scan Kamera';
    cameraActive = false;
    if (html5QrCode) { try { html5QrCode.clear(); } catch (_) {} html5QrCode = null; }
  }
}

    // ==========================================
    // FORM ACTIONS
    // ==========================================
    
    function simpan() {
      const namaProduk = document.getElementById('nama-produk').value.trim();
      
      if (!namaProduk) {
        showToast('Nama produk harus diisi!', 'error');
        return;
      }
      
      const data = {
        nama: namaProduk,
        barcode: document.getElementById('product-barcode').value,
        hargaModal: document.getElementById('harga-modal').value,
        hargaJual: document.getElementById('harga-jual').value,
        sku: document.getElementById('sku').value,
        stok: document.getElementById('stok').value,
        kategori: document.getElementById('kategori').value,
        diskon: document.getElementById('diskon').value,
        deskripsi: document.getElementById('deskripsi').value,
        imageUrl: document.getElementById('image-url').value
      };
      
      console.log('Data Produk:', data);
      showToast('Produk berhasil disimpan!', 'success');
    }

    function batalkan() {
      if (confirm('Yakin ingin membatalkan? Data yang diisi akan hilang.')) {
        // Reset semua form
        document.getElementById('nama-produk').value = '';
        document.getElementById('product-barcode').value = '';
        document.getElementById('barcode-value').value = '';
        document.getElementById('harga-modal').value = '';
        document.getElementById('harga-jual').value = '';
        document.getElementById('sku').value = '';
        document.getElementById('stok').value = '';
        document.getElementById('kategori').value = '';
        document.getElementById('diskon').value = '';
        document.getElementById('deskripsi').value = '';
        document.getElementById('image-url').value = '';
        
        // Reset preview
        document.getElementById('barcode-preview').innerHTML = '<span class="preview-empty">Belum ada barcode</span>';
        document.getElementById('qr-preview').innerHTML = '<span class="preview-empty">Belum ada QR Code</span>';
        
        showToast('Form direset', 'info');
      }
    }

    // ==========================================
    // TOAST NOTIFICATION
    // ==========================================
    
    function showToast(message, type = 'info') {
      const toast = document.getElementById('toast');
      if (!toast) return; // <-- Tambahkan ini agar tidak error jika toast tidak ada
      toast.textContent = message;
      toast.className = 'toast ' + type + ' show';
      setTimeout(() => {
        toast.classList.remove('show');
      }, 3000);
    }

    // Auto-focus scanner input on load
    document.addEventListener('DOMContentLoaded', function() {
      document.getElementById('scanner-input').focus();
    });

    // Handler barcode scan khusus halaman produk
window.handleScannedBarcode = async function(barcode) {
  // Isi field search
  const searchInput = document.querySelector('.bar-pencarian-produk input[type="text"]');
  if (searchInput) {
    searchInput.value = barcode;
  }
  showToast('Barcode terdeteksi: ' + barcode, 'success');
  // Cari produk berdasarkan barcode
  const storeId = localStorage.getItem('store_id');
  if (!storeId) return;
  const listProdukEl = document.querySelector('.list-produk');
  if (!listProdukEl) return;
  listProdukEl.innerHTML = '<p>Mencari produk berdasarkan barcode...</p>';
  try {
    const res = await window.apiRequest(`/stores/${storeId}/products/search?query=${encodeURIComponent(barcode)}`);
    const products = extractProductsFromResponse(res);
    if (products.length > 0) {
      // Render hasil pencarian (gunakan fungsi render produk yang sudah ada)
      listProdukEl.innerHTML = '';
      products.forEach(product => {
        // ...gunakan kode render produk card seperti biasa...
        const imageUrlRaw = product.image_url || product.imageUrl || '';
        const imageUrl = imageUrlRaw
          ? (imageUrlRaw.startsWith('http') ? imageUrlRaw : `${window.BASE_URL.replace('/api','')}/${imageUrlRaw.replace(/^\/+/,'')}`)
          : '';
        const imgTag = imageUrl
          ? `<img src="${imageUrl}" alt="Gambar Produk" class="card-img" style="width:48px;height:48px;object-fit:cover;border-radius:8px;background:#eee;"
              onerror="this.outerHTML='<span class=&quot;material-symbols-outlined card-icon&quot; style=&quot;font-size:48px;color:#b91c1c;background:#e4363638;&quot;>shopping_bag</span>';">`
          : `<span class="material-symbols-outlined card-icon" style="font-size:48px;color:#b91c1c;background:#e4363638;">shopping_bag</span>`;

        const productCard = `
          <div class="card-produk">
            ${imgTag}
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
    } else {
      // Produk tidak ditemukan, tampilkan modal notifikasi
      showProductNotFoundModal(barcode);
    }
  } catch (err) {
    listProdukEl.innerHTML = '<p style="color:red;">Gagal mencari produk.</p>';
  }
};

// Modal produk tidak ditemukan
function showProductNotFoundModal(barcode) {
  // Buat modal sederhana jika belum ada
  let modal = document.getElementById('modal-notfound');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'modal-notfound';
    modal.style.position = 'fixed';
    modal.style.inset = '0';
    modal.style.background = 'rgba(0,0,0,0.6)';
    modal.style.display = 'flex';
    modal.style.alignItems = 'center';
    modal.style.justifyContent = 'center';
    modal.style.zIndex = '99999';
    modal.innerHTML = `
      <div style="background:#fff; padding:32px 24px; border-radius:12px; max-width:340px; text-align:center;">
        <span class="material-symbols-outlined" style="font-size:48px;color:#e43636;">warning</span>
        <h3 style="margin:16px 0 8px 0;">Produk belum ditambahkan</h3>
        <p style="color:#64748b;font-size:14px;">Barcode: <b>${barcode}</b></p>
        <div style="margin-top:24px; display:flex; gap:12px; justify-content:center;">
          <button id="btn-notfound-cancel" style="padding:8px 18px;border-radius:8px;border:1px solid #e2e8f0;background:#fff;">Batal</button>
          <button id="btn-notfound-add" style="padding:8px 18px;border-radius:8px;background:#10b981;color:#fff;border:none;">Tambah Produk</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  } else {
    modal.querySelector('p').innerHTML = `Barcode: <b>${barcode}</b>`;
    modal.style.display = 'flex';
  }
  // Event
  modal.querySelector('#btn-notfound-cancel').onclick = () => { modal.style.display = 'none'; };
  modal.querySelector('#btn-notfound-add').onclick = () => {
    window.location.href = `tambah-produk.html?barcode=${encodeURIComponent(barcode)}`;
  };
}

// Pastikan preload sudah expose window.electronAPI.sendBarcodeToPrint

async function cetakBarcode() {
  const type = document.getElementById("barcode-type").value; // boleh tetap
  const value = document.getElementById("barcode-value").value.trim();

  if (!value) {
    showToast("Isi atau scan barcode dulu sebelum cetak.");
    return;
  }

  try {
    const res = await window.electronAPI.printBarcode({ type, value });
    if (!res.success) {
      showToast("Gagal cetak: " + res.error);
    } else {
      showToast("Barcode dikirim ke printer.");
    }
  } catch (err) {
    showToast("Error: " + err.message);
  }
}

// Event delegation: tombol Tutup Kamera (dinamis) selalu bisa memanggil stopCamera
document.addEventListener('click', function (e) {
  // Cek jika yang diklik adalah tombol dengan id="btn-close-camera"
  const target = e.target;

  // Jika langsung klik button-nya
  if (target.id === 'btn-close-camera') {
    e.preventDefault();
    stopCamera();
    const overlay = document.getElementById('camera-modal-overlay');
    if (overlay) overlay.style.display = 'none';
    return;
  }

  // Jika yang diklik ikon <span> di dalam button
  if (target.closest && target.closest('#btn-close-camera')) {
    e.preventDefault();
    stopCamera();
    const overlay = document.getElementById('camera-modal-overlay');
    if (overlay) overlay.style.display = 'none';
    return;
  }
});
