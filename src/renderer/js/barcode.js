// ===============================
// NORMALISASI ELECTRON API
// ===============================
const barcodePrinterAPI = window.barcodeAPI || null;

if (!barcodePrinterAPI?.printBarcode) {
  console.warn("barcodeAPI tidak tersedia (cek preload.js)");
}

let html5QrCode = null;
let cameraActive = false;
let scannerBuffer = '';
let scannerTimeout = null;

// ==========================================
// FUNGSI UTILITAS EAN-13
// ==========================================

// Fungsi untuk menghitung checksum EAN-13
function calculateEAN13Checksum(first12Digits) {
  if (!/^\d{12}$/.test(first12Digits)) {
    throw new Error('Harus 12 digit angka untuk EAN-13');
  }
  
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const digit = parseInt(first12Digits.charAt(i));
    // Digit di posisi ganjil (indeks genap) dikali 1
    // Digit di posisi genap (indeks ganjil) dikali 3
    sum += digit * (i % 2 === 0 ? 1 : 3);
  }
  
  const checksum = (10 - (sum % 10)) % 10;
  return checksum;
}

// ==========================================
// WIRED BARCODE SCANNER (WOYA) SUPPORT
// ==========================================

document.addEventListener('keydown', function(e) {
  const activeElement = document.activeElement;
  const isFormInput = activeElement.tagName === 'INPUT' || 
                      activeElement.tagName === 'TEXTAREA' || 
                      activeElement.tagName === 'SELECT';
  
  if (isFormInput && activeElement.id !== 'scanner-input') {
    return;
  }

  if (e.key === 'Enter') {
    if (scannerBuffer.length > 3) {
      handleScannedBarcode(scannerBuffer);
    }
    scannerBuffer = '';
    clearTimeout(scannerTimeout);
  } else if (e.key.length === 1) {
    scannerBuffer += e.key;
    clearTimeout(scannerTimeout);
    scannerTimeout = setTimeout(() => {
      scannerBuffer = '';
    }, 100);
  }
});

function handleScannedBarcode(barcode) {
  showToast('Barcode terdeteksi: ' + barcode, 'success');
  if (window.onBarcodeScanned) {
    window.onBarcodeScanned(barcode);
  }
  document.getElementById('barcode-value').value = barcode;
  document.getElementById('product-barcode').value = barcode;
  generateBarcodeFromValue(barcode);
}

function focusScannerInput() {
  document.addEventListener('DOMContentLoaded', function() {
    const scannerInput = document.getElementById('scanner-input');
    if (scannerInput) scannerInput.focus();
  });
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

function setInputValue(id, val) { const el = safeGet(id); if (el) el.value = val; }

// Fungsi utama yang diperbaiki untuk handle type change
// function handleTypeChange() {
//   const type = document.getElementById('barcode-type').value;
//   const input = document.getElementById('barcode-value');
//   const helpElement = document.getElementById('ean13-help');
  
//   if (type === 'EAN13') {
//     input.placeholder = 'Masukkan 12 atau 13 digit angka';
//     input.maxLength = 13; // Diperbolehkan 13 digit
    
//     // Tampilkan help text jika ada
//     if (helpElement) helpElement.style.display = 'block';
//     else {
//       // Buat help text jika belum ada
//       const help = document.createElement('div');
//       help.id = 'ean13-help';
//       help.style.cssText = 'font-size:12px; color:#666; margin-top:4px; background:#f0f9ff; padding:6px 10px; border-radius:4px; border-left:3px solid #0ea5e9;';
//       help.innerHTML = 'EAN-13: 12 digit data + 1 digit checksum = 13 digit total<br>Jika input 12 digit, checksum akan dihitung otomatis';
//       input.parentNode.appendChild(help);
//     }
//   } else if (type === 'QR') {
//     input.placeholder = 'Masukkan teks bebas';
//     input.maxLength = 500;
//     if (helpElement) helpElement.style.display = 'none';
//   } else {
//     input.placeholder = 'Masukkan atau scan barcode...';
//     input.maxLength = 50;
//     if (helpElement) helpElement.style.display = 'none';
//   }
// }

// Fungsi utama generate barcode dengan penanganan checksum
function generateBarcode() {
  const type = document.getElementById('barcode-type').value;
  let value = document.getElementById('barcode-value').value.trim();
  
  // Generate random value jika kosong
  if (!value) {
    if (type === 'EAN13') {
      value = generateEAN13(); // Fungsi ini sudah mengembalikan 13 digit
    } else if (type === 'QR') {
      value = 'PRODUCT-' + Date.now();
    } else {
      value = 'CODE-' + Math.random().toString(36).substring(2, 10).toUpperCase();
    }
    document.getElementById('barcode-value').value = value;
  }
  
  // Handle khusus EAN-13 dengan checksum
  if (type === 'EAN13') {
    const cleanValue = value.replace(/\D/g, '');
    
    if (cleanValue.length === 12) {
      // Hitung checksum untuk 12 digit
      try {
        const checksum = calculateEAN13Checksum(cleanValue);
        const fullEAN13 = cleanValue + checksum;
        
        // Update nilai di input
        document.getElementById('barcode-value').value = fullEAN13;
        value = fullEAN13;
        
        // Tampilkan info checksum
        showChecksumInfo(cleanValue, checksum, fullEAN13);
        
      } catch (error) {
        showToast('Error: ' + error.message, 'error');
        return;
      }
    } else if (cleanValue.length === 13) {
      // Validasi checksum jika input 13 digit
      const input12 = cleanValue.substring(0, 12);
      const inputChecksum = parseInt(cleanValue.charAt(12));
      const calculatedChecksum = calculateEAN13Checksum(input12);
      
      if (inputChecksum !== calculatedChecksum) {
        showToast(`Peringatan: Checksum tidak valid. Seharusnya ${calculatedChecksum}`, 'warning');
      }
    } else {
      showToast('EAN-13 membutuhkan 12 atau 13 digit angka', 'error');
      return;
    }
  }
  
  generateBarcodeFromValue(value);
}

// Fungsi untuk menampilkan info checksum
function showChecksumInfo(input12, checksum, fullEAN13) {
  const previewContainer = document.getElementById('barcode-preview').parentNode;
  let infoElement = document.getElementById('checksum-info');
  
  if (!infoElement) {
    infoElement = document.createElement('div');
    infoElement.id = 'checksum-info';
    infoElement.className = 'checksum-info';
    infoElement.style.cssText = 'background:#f8fafc; border-left:4px solid #3b82f6; padding:10px; margin:10px 0; border-radius:4px; font-size:14px;';
    previewContainer.appendChild(infoElement);
  }
  
  infoElement.innerHTML = `
    <strong>Info EAN-13:</strong><br>
    Input: <code>${input12}</code><br>
    Checksum: <strong>${checksum}</strong><br>
    Lengkap: <code><strong>${fullEAN13}</strong></code>
  `;
}

// Fungsi generate barcode utama (telah diperbaiki)
function generateBarcodeFromValue(value) {
  const type = document.getElementById('barcode-type').value;
  const barcodePreview = document.getElementById('barcode-preview');
  const qrPreview = document.getElementById('qr-preview');
  
  // Clear previews
  barcodePreview.innerHTML = '<span class="preview-empty">Belum ada barcode</span>';
  qrPreview.innerHTML = '<span class="preview-empty">Belum ada QR Code</span>';
  
  try {
    if (type === 'QR') {
      const canvas = document.createElement('canvas');
      QRCode.toCanvas(canvas, value, {
        width: 150,
        margin: 2,
        color: { dark: '#000000', light: '#ffffff' }
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
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      let barcodeFormat = type;
      let barcodeValue = value;
      
      if (type === 'EAN13') {
        // Ambil hanya angka dan pastikan panjangnya
        const clean = value.replace(/\D/g, '');
        if (clean.length === 13) {
          barcodeValue = clean; // Gunakan 13 digit lengkap
        } else if (clean.length === 12) {
          // Jika masih 12 digit, hitung checksum
          try {
            const checksum = calculateEAN13Checksum(clean);
            barcodeValue = clean + checksum;
          } catch (error) {
            showToast('Error EAN-13: ' + error.message, 'error');
            return;
          }
        } else {
          showToast('EAN-13 membutuhkan 12 atau 13 digit angka', 'error');
          return;
        }
      }
      
      // Generate barcode dengan pengaturan yang lebih baik
      JsBarcode(svg, barcodeValue, {
        format: barcodeFormat,
        width: 3,
        height: 120,
        displayValue: true,
        fontSize: 35,
        fontOptions: "bold",
        margin: 15,
        textMargin: 5,
        background: "#ffffff"
      });
      
      barcodePreview.innerHTML = '';
      barcodePreview.appendChild(svg);
      showToast('Barcode berhasil dibuat', 'success');
    }
    
    // Update product barcode field
    document.getElementById('product-barcode').value = value;
    
  } catch (error) {
    showToast('Error: ' + error.message, 'error');
  }
}

// Fungsi generate EAN13 yang diperbaiki (kembalikan 13 digit)
function generateEAN13() {
  let code = '';
  for (let i = 0; i < 12; i++) {
    code += Math.floor(Math.random() * 10);
  }
  
  const checksum = calculateEAN13Checksum(code);
  return code + checksum; // Kembalikan 13 digit
}

// Fungsi generate barcode canvas untuk cetakan
function generateBarcodeCanvas(value, type = "CODE128") {
  const allowedFormats = ["CODE128", "EAN13", "EAN8"];

  if (!allowedFormats.includes(type)) {
    throw new Error("Format barcode tidak didukung: " + type);
  }

  if (type === "EAN13") {
    const clean = value.replace(/\D/g, "");
    if (clean.length === 12) {
      // Jika 12 digit, hitung checksum
      const checksum = calculateEAN13Checksum(clean);
      value = clean + checksum;
    } else if (clean.length !== 13) {
      throw new Error("EAN13 harus 12 atau 13 digit angka");
    }
  }

  const canvas = document.createElement("canvas");

  JsBarcode(canvas, value, {
    format: type,
    width: 4,
    height: 180,
    displayValue: true,
    fontSize: 30,
    fontOptions: "bold",
    margin: 15,
    textMargin: 8,
    background: "#fff"
  });

  return canvas;
}

function normalizeProductName(name, maxLength = 24) {
  if (!name) return "";
  return name
    .toString()
    .trim()
    .substring(0, maxLength)
    .toUpperCase();
}

// Fungsi generate sharp barcode canvas
function generateSharpBarcodeCanvas(value, type = "CODE128") {
  const allowedFormats = ["CODE128", "EAN13", "EAN8"];
  
  if (!allowedFormats.includes(type)) {
    throw new Error("Format barcode tidak didukung: " + type);
  }

  if (type === "EAN13") {
    const clean = value.replace(/\D/g, "");
    if (clean.length === 12) {
      const checksum = calculateEAN13Checksum(clean);
      value = clean + checksum;
    } else if (clean.length !== 13) {
      throw new Error("EAN13 harus 12 atau 13 digit angka");
    }
  }

  const scale = 2;
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  
  canvas.width = 400 * scale;
  canvas.height = 200 * scale;
  
  JsBarcode(canvas, value, {
    format: type,
    width: 3 * scale,
    height: 100 * scale,
    displayValue: true,
    fontSize: 28 * scale,
    fontOptions: "bold",
    margin: 10 * scale,
    textMargin: 6 * scale
  });

  const finalCanvas = document.createElement("canvas");
  finalCanvas.width = 400;
  finalCanvas.height = 200;
  const finalCtx = finalCanvas.getContext("2d");
  
  finalCtx.imageSmoothingEnabled = false;
  finalCtx.drawImage(canvas, 0, 0, 400, 200);
  
  return finalCanvas;
}

function generateBarcodeLabelImage(barcodeValue, productName = "", type = "CODE128") {
  if (!barcodeValue) {
    throw new Error("Barcode kosong saat generate image");
  }

  const dpi = 300;
  const mmToPx = (mm) => Math.round((mm / 25.4) * dpi);

  const canvas = document.createElement("canvas");
  canvas.width  = mmToPx(100);
  canvas.height = mmToPx(150);

  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  ctx.textRendering = "geometricPrecision";

  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const cols = 2;
  const rows = 4;
  const cellW = canvas.width / cols;
  const cellH = canvas.height / rows;

  const safeName = (productName || "")
    .toString()
    .trim()
    .substring(0, 24)
    .toUpperCase();

  for (let i = 0; i < 8; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);

    const barcodeCanvas = generateSharpBarcodeCanvas(barcodeValue, type);

    const x = col * cellW + (cellW - barcodeCanvas.width) / 2;
    const y = row * cellH + 15;

    ctx.drawImage(barcodeCanvas, x, y);

    if (safeName) {
      ctx.fillStyle = "#000000";
      ctx.font = "bold 28px 'Arial Black', Arial, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "top";

      ctx.fillText(
        safeName,
        col * cellW + cellW / 2,
        y + barcodeCanvas.height + 18
      );
    }
  }

  return canvas.toDataURL("image/png", 1.0);
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
  let cameraReader = document.getElementById('camera-reader');
  let retry = 0;
  while (!cameraReader && retry < 20) {
    await new Promise(r => setTimeout(r, 100));
    cameraReader = document.getElementById('camera-reader');
    retry++;
  }

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

  const btn = document.getElementById('btn-camera') || document.getElementById('btn-scan-camera') || null;

  if (typeof Html5Qrcode === 'undefined') {
    showToast('Library scanner belum dimuat (Html5Qrcode).', 'error');
    return;
  }

  try {
    container.style.display = 'block';
    container.classList.add('active');
    cameraReader.innerHTML = '';

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
    
    document.getElementById('barcode-preview').innerHTML = '<span class="preview-empty">Belum ada barcode</span>';
    document.getElementById('qr-preview').innerHTML = '<span class="preview-empty">Belum ada QR Code</span>';
    
    // Hapus info checksum jika ada
    const infoElement = document.getElementById('checksum-info');
    if (infoElement) infoElement.remove();
    
    showToast('Form direset', 'info');
  }
}

// Auto-focus scanner input on load
document.addEventListener('DOMContentLoaded', function() {
  document.getElementById('scanner-input').focus();
});

// Handler barcode scan khusus halaman produk
window.handleScannedBarcode = async function(barcode) {
  const searchInput = document.querySelector('.bar-pencarian-produk input[type="text"]');
  if (searchInput) {
    searchInput.value = barcode;
  }
  showToast('Barcode terdeteksi: ' + barcode, 'success');
  
  const storeId = localStorage.getItem('store_id');
  if (!storeId) return;
  
  const listProdukEl = document.querySelector('.list-produk');
  if (!listProdukEl) return;
  
  listProdukEl.innerHTML = '<p>Mencari produk berdasarkan barcode...</p>';
  
  try {
    const res = await window.apiRequest(`/stores/${storeId}/products/search?query=${encodeURIComponent(barcode)}`);
    const products = extractProductsFromResponse(res);
    
    if (products.length > 0) {
      listProdukEl.innerHTML = '';
      products.forEach(product => {
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
      showProductNotFoundModal(barcode);
    }
  } catch (err) {
    listProdukEl.innerHTML = '<p style="color:red;">Gagal mencari produk.</p>';
  }
};

function showProductNotFoundModal(barcode) {
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
  
  modal.querySelector('#btn-notfound-cancel').onclick = () => { modal.style.display = 'none'; };
  modal.querySelector('#btn-notfound-add').onclick = () => {
    window.location.href = `tambah-produk.html?barcode=${encodeURIComponent(barcode)}`;
  };
}

async function cetakBarcode() {
  const barcodeValue = document.getElementById("barcode-value")?.value.trim();
  const type = document.getElementById("barcode-type")?.value || "CODE128";
  const productName = document.getElementById("nama-produk")?.value?.trim() || "";

  if (!barcodeValue) {
    showToast("Barcode belum diisi", "error");
    return;
  }

  if (!barcodePrinterAPI?.printBarcode) {
    showToast("Barcode Printer API tidak tersedia", "error");
    return;
  }

  let imageBase64;
  try {
    // Pastikan EAN-13 memiliki checksum yang benar
    let finalBarcodeValue = barcodeValue;
    if (type === "EAN13") {
      const clean = barcodeValue.replace(/\D/g, "");
      if (clean.length === 12) {
        const checksum = calculateEAN13Checksum(clean);
        finalBarcodeValue = clean + checksum;
      }
    }
    
    imageBase64 = generateBarcodeLabelImage(
      finalBarcodeValue,
      productName,
      type
    ).replace(/^data:image\/png;base64,/, "");
  } catch (e) {
    console.error("GAGAL GENERATE IMAGE:", e);
    showToast("Gagal membuat image barcode", "error");
    return;
  }

  console.log("IMAGE BASE64 LENGTH:", imageBase64.length);

  const res = await barcodePrinterAPI.printBarcode({
    image: imageBase64,
    printerName: "Xprinter XP-D4601B",
    copies: 1
  });

  if (!res?.success) {
    showToast("Gagal cetak barcode", "error");
  } else {
    showToast("Barcode berhasil dicetak", "success");
  }
}

// Event delegation untuk tombol Tutup Kamera
document.addEventListener('click', function (e) {
  const target = e.target;

  if (target.id === 'btn-close-camera') {
    e.preventDefault();
    stopCamera();
    const overlay = document.getElementById('camera-modal-overlay');
    if (overlay) overlay.style.display = 'none';
    return;
  }

  if (target.closest && target.closest('#btn-close-camera')) {
    e.preventDefault();
    stopCamera();
    const overlay = document.getElementById('camera-modal-overlay');
    if (overlay) overlay.style.display = 'none';
    return;
  }
});

// Preview barcode
function previewBarcode() {
  const barcodeValue = document.getElementById("barcode-value").value.trim();

  if (!barcodeValue) {
    alert("Barcode belum diisi");
    return;
  }

  const payload = {
    value: barcodeValue,
    copies: 8,
    type: document.getElementById("barcode-type")?.value || "CODE128"
  };

  localStorage.setItem("barcode-preview-data", JSON.stringify(payload));

  window.open(
    "../pages/preview-barcode.html",
    "_blank",
    "width=420,height=650"
  );
}

window.addEventListener("message", async (event) => {
  if (event.data?.type !== "PRINT_BARCODE") return;

  if (!barcodePrinterAPI?.printBarcode) return;

  const { barcodeValue, copies, type = "CODE128" } = event.data.payload;
  const productName = document.getElementById("nama-produk")?.value || "";

  let imageBase64;
  try {
    imageBase64 = generateBarcodeLabelImage(
      barcodeValue,
      productName,
      type
    ).replace(/^data:image\/png;base64,/, "");
  } catch (e) {
    alert("Gagal generate barcode");
    return;
  }

  const res = await barcodePrinterAPI.printBarcode({
    image: imageBase64,
    printerName: "Xprinter XP-D4601B",
    copies
  });

  if (!res?.success) {
    alert("Gagal mencetak: " + res.error);
  }
});

// Barcode dispatch helper — pastikan scan tidak hilang walau kasir.js di-load belakangan
window._barcodePending = window._barcodePending || [];
window._barcodeHandler = window._barcodeHandler || null;

window.registerBarcodeHandler = function (fn) {
    if (typeof fn !== 'function') return;
    window._barcodeHandler = fn;
    // proses pending
    while (window._barcodePending.length) {
        const code = window._barcodePending.shift();
        try { fn(code); } catch (e) { console.error('barcode handler error', e); }
    }
};

window._dispatchBarcode = function (code) {
    if (!code) return;
    // prioritas: registered handler, legacy onBarcodeScanned, legacy onBarcodeScannedKasir
    if (typeof window._barcodeHandler === 'function') {
        try { window._barcodeHandler(code); return; } catch (e) { console.error(e); }
    }
    if (typeof window.onBarcodeScanned === 'function' && window.onBarcodeScanned !== window._dispatchBarcode) {
        try { window.onBarcodeScanned(code); return; } catch (e) { console.error(e); }
    }
    if (typeof window.onBarcodeScannedKasir === 'function') {
        try { window.onBarcodeScannedKasir(code); return; } catch (e) { console.error(e); }
    }
    // simpan sementara jika belum ada handler
    window._barcodePending.push(code);
};

// backward compatible alias: native code may call window.onBarcodeScanned(...)
window.onBarcodeScanned = window._dispatchBarcode;
window.onNativeBarcode = window._dispatchBarcode;

// Jika ada integrasi native yang memanggil fungsi internal, pastikan memanggil window._dispatchBarcode(barcode)