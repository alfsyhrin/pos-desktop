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
  // kumpulkan karakter scanner
  if (e.key === 'Enter') {
    if (scannerBuffer.length > 3) {
      const code = scannerBuffer;
      scannerBuffer = '';
      clearTimeout(scannerTimeout);

      // PRIORITAS: gunakan dispatcher pusat jika tersedia (registerBarcodeHandler / _dispatchBarcode)
      if (typeof window._dispatchBarcode === 'function') {
        try { window._dispatchBarcode(code); }
        catch(err) { console.error('dispatchBarcode error', err); }
        return;
      }

      // fallback: jika halaman kasir aktif, panggil handler kasir
      if (document.getElementById('produk-list-kasir') && typeof window.handleScannedBarcodeKasir === 'function') {
        try { window.handleScannedBarcodeKasir(code); } catch(err) { console.error(err); }
        return;
      }

      // terakhir fallback ke global handleScannedBarcode (produk/page handler)
      if (typeof window.handleScannedBarcode === 'function') {
        try { window.handleScannedBarcode(code); } catch(err) { console.error(err); }
      }
    } else {
      scannerBuffer = '';
      clearTimeout(scannerTimeout);
    }
  } else if (e.key.length === 1) {
    scannerBuffer += e.key;
    clearTimeout(scannerTimeout);
    scannerTimeout = setTimeout(() => { scannerBuffer = ''; }, 100);
  }
});

function handleScannedBarcode(barcode) {
  console.log('🔍 [barcode.js] handleScannedBarcode dipanggil dengan barcode:', barcode);
  console.log('📍 [barcode.js] window.location.pathname:', window.location.pathname);
  console.log('📍 [barcode.js] window.location.hash:', window.location.hash);
  
  // Cek apakah ada di halaman kasir
  const isKasirPage = document.getElementById('produk-list-kasir') !== null;
  console.log('🎯 [barcode.js] isKasirPage:', isKasirPage);
  
  // Jika di halaman kasir dan handler ada, gunakan handler kasir
  if (isKasirPage && typeof window.handleScannedBarcodeKasir === 'function') {
    console.log('✅ [barcode.js] ROUTE → handleScannedBarcodeKasir');
    window.handleScannedBarcodeKasir(barcode);
    return;
  }
  
  // Jika di halaman kasir tapi handler belum ada, tunggu sebentar
  if (isKasirPage && typeof window.handleScannedBarcodeKasir !== 'function') {
    console.warn('⚠️ [barcode.js] Handler kasir belum siap, tunggu 500ms...');
    setTimeout(() => {
      if (typeof window.handleScannedBarcodeKasir === 'function') {
        console.log('✅ [barcode.js] Handler siap sekarang, ROUTE → handleScannedBarcodeKasir');
        window.handleScannedBarcodeKasir(barcode);
      } else {
        console.error('❌ [barcode.js] Handler tetap tidak ditemukan!');
        console.log('📋 [barcode.js] window.handleScannedBarcodeKasir:', window.handleScannedBarcodeKasir);
        console.log('📋 [barcode.js] window.addToCartFrontend:', window.addToCartFrontend);
      }
    }, 500);
    return;
  }
  
  // Fallback: tidak di halaman kasir, input ke field
  console.log('⚠️ [barcode.js] Fallback → input field');
  setInputValue('barcode-value', barcode);
  setInputValue('product-barcode', barcode);
  if (typeof generateBarcodeFromValue === 'function') {
    generateBarcodeFromValue(barcode);
  }
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

function generateBarcodeLabelImage(barcodeValue, productName = "", type = "CODE128", opts = {}) {
  if (!barcodeValue) {
    throw new Error("Barcode kosong saat generate image");
  }

  const {
    dpi = 300,
    topTrimMm = 6,    // default trim 6mm dari atas (tune sesuai printer)
    verticalGapMm = 4,
    horizontalGapMm = 0,
    displayFontSize = 12  // angka barcode sedikit dibesarkan
  } = opts;

  const labelWidthMm = 33;
  const labelHeightMm = 15;

  const labelWidthPx = mmToPx(labelWidthMm, dpi);
  const labelHeightPx = mmToPx(labelHeightMm, dpi);
  const verticalGapPx = mmToPx(verticalGapMm, dpi);
  const horizontalGapPx = mmToPx(horizontalGapMm, dpi);

  const colsPerRow = 2;
  const rowsPerPage = 4;
  const totalLabels = colsPerRow * rowsPerPage;

  const pageWidthMm = labelWidthMm * colsPerRow + horizontalGapMm * (colsPerRow - 1);
  const pageHeightMm = labelHeightMm * rowsPerPage + verticalGapMm * (rowsPerPage - 1);
  const pageWidthPx = mmToPx(pageWidthMm, dpi);
  const pageHeightPx = mmToPx(pageHeightMm, dpi);

  const canvas = document.createElement("canvas");
  canvas.width = pageWidthPx;
  canvas.height = pageHeightPx;

  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  ctx.textRendering = "geometricPrecision";

  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const safeName = (productName || "")
    .toString()
    .trim()
    .substring(0, 16)
    .toUpperCase();

  let finalBarcodeValue = barcodeValue;
  if (type === "EAN13") {
    const clean = barcodeValue.replace(/\D/g, "");
    if (clean.length === 12) {
      try {
        const checksum = calculateEAN13Checksum(clean);
        finalBarcodeValue = clean + checksum;
      } catch (e) {
        console.error("EAN-13 checksum error:", e);
        finalBarcodeValue = clean.substring(0, 13);
      }
    } else if (clean.length === 13) {
      finalBarcodeValue = clean;
    } else {
      throw new Error("EAN13 harus 12 atau 13 digit angka");
    }
  }

  return new Promise((resolve, reject) => {
    try {
      const svgPromises = [];

      for (let i = 0; i < totalLabels; i++) {
        const col = i % colsPerRow;
        const row = Math.floor(i / colsPerRow);

        const labelX = col * (labelWidthPx + horizontalGapPx);
        const labelY = row * (labelHeightPx + verticalGapPx);

        const labelCanvas = document.createElement("canvas");
        labelCanvas.width = labelWidthPx;
        labelCanvas.height = labelHeightPx;

        const labelCtx = labelCanvas.getContext("2d");
        labelCtx.imageSmoothingEnabled = false;
        labelCtx.textRendering = "geometricPrecision";

        labelCtx.fillStyle = "#FFFFFF";
        labelCtx.fillRect(0, 0, labelCanvas.width, labelCanvas.height);

        const svgPromise = new Promise((resolveLabel) => {
          try {
            const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");

            JsBarcode(svg, finalBarcodeValue, {
              format: type,
              width: 2,
              height: labelHeightPx - mmToPx(4, dpi),
              displayValue: true,
              fontSize: displayFontSize,   // apply larger number size
              fontOptions: "bold",
              margin: mmToPx(1, dpi),
              textMargin: 2,
              background: "#FFFFFF",
              lineColor: "#000000"
            });

            const svgData = new XMLSerializer().serializeToString(svg);
            const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
            const svgUrl = URL.createObjectURL(svgBlob);
            const svgImg = new Image();

            svgImg.onload = function() {
              labelCtx.drawImage(svgImg, 0, 0, labelCanvas.width, labelCanvas.height);

              if (safeName) {
                labelCtx.fillStyle = "#000000";
                labelCtx.font = "bold 8px Arial";
                labelCtx.textAlign = "center";
                labelCtx.textBaseline = "bottom";
                labelCtx.fillText(safeName, labelCanvas.width / 2, labelCanvas.height - 1);
              }

              URL.revokeObjectURL(svgUrl);
              ctx.drawImage(labelCanvas, labelX, labelY);
              resolveLabel();
            };

            svgImg.onerror = function() {
              labelCtx.fillStyle = "#000000";
              labelCtx.font = "bold 9px Arial";
              labelCtx.textAlign = "center";
              labelCtx.fillText(finalBarcodeValue, labelCanvas.width / 2, labelCanvas.height / 2);
              ctx.drawImage(labelCanvas, labelX, labelY);
              resolveLabel();
            };

            svgImg.src = svgUrl;
          } catch (err) {
            labelCtx.fillStyle = "#000000";
            labelCtx.font = "bold 9px Arial";
            labelCtx.textAlign = "center";
            labelCtx.fillText(finalBarcodeValue, labelCanvas.width / 2, labelCanvas.height / 2);
            ctx.drawImage(labelCanvas, labelX, labelY);
            resolveLabel();
          }
        });

        svgPromises.push(svgPromise);
      }

      Promise.all(svgPromises)
        .then(() => {
          console.log('✅ All labels rendered successfully');
          setTimeout(() => {
            // Jika canvas landscape, rotate 90° CW agar sesuai orientasi kertas (portrait)
            let outCanvas = canvas;
            if (canvas.width > canvas.height) {
              const finalCanvas = document.createElement('canvas');
              finalCanvas.width = canvas.height;
              finalCanvas.height = canvas.width;
              const fctx = finalCanvas.getContext('2d');
              fctx.imageSmoothingEnabled = false;
              fctx.translate(finalCanvas.width, 0);
              fctx.rotate(Math.PI / 2);
              fctx.drawImage(canvas, 0, 0);
              outCanvas = finalCanvas;
            }

            // Trim top area (crop) untuk kompensasi offset kertas/printer
            const trimPx = Math.max(0, mmToPx(topTrimMm, dpi));
            if (trimPx > 0 && trimPx < outCanvas.height - 1) {
              const cropped = document.createElement('canvas');
              cropped.width = outCanvas.width;
              cropped.height = Math.max(1, outCanvas.height - trimPx);
              const cctx = cropped.getContext('2d');
              cctx.imageSmoothingEnabled = false;
              cctx.drawImage(outCanvas, 0, trimPx, outCanvas.width, outCanvas.height - trimPx, 0, 0, cropped.width, cropped.height);
              resolve(cropped.toDataURL("image/png", 1.0));
            } else {
              resolve(outCanvas.toDataURL("image/png", 1.0));
            }
          }, 100);
        })
        .catch((err) => {
          console.error('❌ Error in Promise.all:', err);
          resolve(canvas.toDataURL("image/png", 1.0));
        });

    } catch (err) {
      reject(err);
    }
  });
}

function mmToPx(mm, dpi = 300) {
  return Math.round((mm / 25.4) * dpi);
}

// ==========================================
// CAMERA SCANNER
// ==========================================

// ========== PERBAIKAN SCAN KAMERA ==========

// Pastikan overlay dan container siap
function ensureCameraDOM() {
  let overlay = document.getElementById('camera-modal-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'camera-modal-overlay';
    overlay.className = 'camera-modal-overlay';
    overlay.style.cssText = `
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.9);
      display: none;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      z-index: 9999;
    `;
    document.body.appendChild(overlay);
  }

  let container = document.getElementById('camera-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'camera-container';
    container.className = 'camera-container';
    container.style.cssText = `
      display: none;
      flex-direction: column;
      align-items: center;
      gap: 16px;
      background: #1a1a1a;
      padding: 20px;
      border-radius: 12px;
      max-width: 500px;
      width: 90%;
    `;
    overlay.appendChild(container);
  }

  let reader = document.getElementById('camera-reader');
  if (!reader) {
    reader = document.createElement('div');
    reader.id = 'camera-reader';
    reader.style.cssText = `
      width: 100%;
      aspect-ratio: 1;
      border-radius: 8px;
      background: #000;
      overflow: hidden;
    `;
    container.appendChild(reader);
  }

  // Pastikan controls ada
  let controls = container.querySelector('.camera-controls');
  if (!controls) {
    controls = document.createElement('div');
    controls.className = 'camera-controls';
    controls.style.cssText = `
      width: 100%;
      display: flex;
      gap: 12px;
      justify-content: center;
      flex-wrap: wrap;
    `;
    
    const closeBtn = document.createElement('button');
    closeBtn.id = 'btn-close-camera';
    closeBtn.className = 'btn btn-outline';
    closeBtn.type = 'button';
    closeBtn.style.cssText = `
      padding: 10px 20px;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
      background: #fff;
      color: #1a1a1a;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: 500;
    `;
    closeBtn.innerHTML = '<span class="material-symbols-outlined">close</span> Tutup Kamera';
    
    controls.appendChild(closeBtn);
    container.appendChild(controls);
  }

  return { overlay, container, reader };
}

// Perbaikan startCamera dengan error handling lebih baik
async function startCamera() {
  console.log('🎥 [startCamera] Memulai proses scan kamera...');
  
  // Ensure DOM elements exist
  const { overlay, container, reader } = ensureCameraDOM();
  
  const btn = document.getElementById('btn-scan-camera') || document.getElementById('btn-camera');

  if (typeof Html5Qrcode === 'undefined') {
    showToast('Library scanner (Html5Qrcode) belum dimuat!', 'error');
    return;
  }

  try {
    // 1. Cleanup instance lama
    if (html5QrCode) {
      try {
        await html5QrCode.stop();
        await html5QrCode.clear();
      } catch (_) {}
      html5QrCode = null;
    }

    // 2. Clear reader
    reader.innerHTML = '';

    // 3. Tampilkan overlay & container
    overlay.style.display = 'flex';
    container.style.display = 'flex';
    console.log('✅ [startCamera] Modal overlay ditampilkan');

    // 4. Create instance baru
    html5QrCode = new Html5Qrcode("camera-reader");
    console.log('✅ [startCamera] Html5Qrcode instance dibuat');

    // 5. Start scanning
    const config = {
      fps: 10,
      qrbox: { width: 250, height: 250 },
      aspectRatio: 1.0,
      showTorchButtonIfSupported: true
    };

    await html5QrCode.start(
      { facingMode: "environment" },
      config,
      (decodedText) => {
        console.log('✅ [startCamera] Barcode terdeteksi:', decodedText);
        handleScannedBarcode(decodedText);
        stopCamera();
      },
      (errorMessage) => {
        // Ignore frame errors
      }
    );

    cameraActive = true;
    if (btn) {
      btn.innerHTML = '<span class="material-symbols-outlined">videocam_off</span> Stop Kamera';
      btn.style.background = '#ef4444';
      btn.style.color = '#fff';
    }
    
    showToast('🎥 Kamera aktif - Arahkan ke barcode untuk scan', 'success');
    console.log('✅ [startCamera] Scanning dimulai, menunggu barcode...');

  } catch (error) {
    console.error('❌ [startCamera] Gagal membuka kamera:', error);
    
    // Cleanup & hide overlay
    if (overlay) overlay.style.display = 'none';
    if (container) container.style.display = 'none';
    
    showToast(
      `Gagal membuka kamera: ${error?.message || 'Cek permission atau browser compatibility'}`,
      'error'
    );
    
    // Reset button
    if (btn) {
      btn.innerHTML = '<span class="material-symbols-outlined">photo_camera</span> Scan Kamera';
      btn.style.background = '';
      btn.style.color = '';
    }
    
    cameraActive = false;
  }
}

// Perbaikan stopCamera dengan cleanup proper
function stopCamera() {
  console.log('🎥 [stopCamera] Menutup kamera...');
  
  const overlay = document.getElementById('camera-modal-overlay');
  const container = document.getElementById('camera-container');
  const btn = document.getElementById('btn-scan-camera') || document.getElementById('btn-camera');

  if (html5QrCode && cameraActive) {
    html5QrCode.stop()
      .then(() => {
        console.log('✅ [stopCamera] Camera stream stopped');
        return html5QrCode.clear();
      })
      .then(() => {
        console.log('✅ [stopCamera] Instance cleared');
        html5QrCode = null;
      })
      .catch(err => {
        console.error('⚠️ [stopCamera] Error saat stop:', err);
        html5QrCode = null;
      })
      .finally(() => {
        // Hide overlay & container
        if (overlay) overlay.style.display = 'none';
        if (container) container.style.display = 'none';
        
        // Reset button
        if (btn) {
          btn.innerHTML = '<span class="material-symbols-outlined">photo_camera</span> Scan Kamera';
          btn.style.background = '';
          btn.style.color = '';
        }
        
        cameraActive = false;
        showToast('Kamera ditutup', 'info');
        console.log('✅ [stopCamera] Selesai');
      });
  } else {
    if (overlay) overlay.style.display = 'none';
    if (container) container.style.display = 'none';
    cameraActive = false;
    if (html5QrCode) {
      try { html5QrCode.clear(); } catch (_) {}
      html5QrCode = null;
    }
  }
}

// Update event listener untuk button close
document.addEventListener('click', function (e) {
  const target = e.target;
  
  // Detect close button click (bisa dari span atau button)
  if (target.id === 'btn-close-camera' || 
      target.closest('#btn-close-camera')) {
    e.preventDefault();
    e.stopPropagation();
    console.log('🎥 [click] Close button dipencet');
    stopCamera();
    return;
  }

  // Close jika klik di outside container
  const overlay = document.getElementById('camera-modal-overlay');
  if (overlay && target === overlay) {
    e.preventDefault();
    console.log('🎥 [click] Overlay dipencet (outside), tutup kamera');
    stopCamera();
    return;
  }
});

// ====== CAMERA MODAL HANDLER UNTUK TAMBAH PRODUK ======
window.toggleCamera = function() {
  // Untuk halaman tambah-produk.html, gunakan #camera-container (bukan overlay)
  const container = document.getElementById('camera-container');
  if (!container) {
    alert('Element kamera tidak ditemukan!');
    return;
  }
  if (window.cameraActive) {
    stopCamera();
  } else {
    startCamera();
  }
};

// Pastikan startCamera dan stopCamera juga global
window.startCamera = startCamera;
window.stopCamera = stopCamera;

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

  showToast("Sedang memproses barcode...", "info");

  let imageBase64;
  try {
    let finalBarcodeValue = barcodeValue;
    
    // Normalize EAN-13
    if (type === "EAN13") {
      const clean = barcodeValue.replace(/\D/g, "");
      if (clean.length === 12) {
        try {
          const checksum = calculateEAN13Checksum(clean);
          finalBarcodeValue = clean + checksum;
        } catch (e) {
          console.error("EAN-13 checksum error:", e);
          finalBarcodeValue = clean.substring(0, 13);
        }
      } else if (clean.length === 13) {
        finalBarcodeValue = clean;
      } else {
        throw new Error("EAN13 harus 12 atau 13 digit angka");
      }
    }

    console.log('🎨 Generating barcode image...');
    console.log('  Value:', finalBarcodeValue);
    console.log('  Type:', type);
    console.log('  Name:', productName);
    
    // 🔴 PENTING: AWAIT untuk generate barcode dengan benar
    const imageDataUrl = await generateBarcodeLabelImage(
      finalBarcodeValue,
      productName,
      type
    );
    
    imageBase64 = imageDataUrl.replace(/^data:image\/png;base64,/, "");
    console.log('✅ Image generated, size:', imageBase64.length);

  } catch (e) {
    console.error("❌ GAGAL GENERATE IMAGE:", e);
    showToast("Gagal membuat image barcode: " + e.message, "error");
    return;
  }

  try {
    console.log('🖨️ Opening print window...');
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    
    if (!printWindow) {
      showToast("Popup print diblokir oleh browser", "error");
      return;
    }

    const html = `
      <!DOCTYPE html>
      <html lang="id">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Print Barcode Label 33x15mm</title>
        <style>
          * { margin: 0; padding: 0; }
          /* Page size: 2x33mm width, 4x15mm + 3x4mm gaps height => 66mm x 72mm */
          @page {
            size: 66mm 72mm;
            margin: 0;
            orphans: 0;
            widows: 0;
          }
          html, body {
            margin: 0;
            padding: 0;
            background: #fff;
            width: 100%;
            height: 100%;
          }
          .page-break {
            width: 66mm;
            height: 72mm;
            display: block;
            page-break-after: always;
            page-break-inside: avoid;
          }
          img {
            width: 66mm;   /* force exact physical dimensions */
            height: 72mm;
            display: block;
            margin: 0;
            padding: 0;
            object-fit: contain;
            background: white;
          }
          @media print {
            * {
              margin: 0 !important;
              padding: 0 !important;
            }
            html, body {
              width: 66mm;
              height: 72mm;
              margin: 0;
              padding: 0;
            }
            .page-break {
              margin: 0;
              padding: 0;
              width: 66mm;
              height: 72mm;
              page-break-after: always;
            }
          }
        </style>
      </head>
      <body>
        <div class="page-break">
          <img src="data:image/png;base64,${imageBase64}" alt="Barcode Label">
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();

    console.log('📄 HTML written to print window');

    // TUNGGU sampai dokumen siap, BARU print
    let loaded = false;
    printWindow.addEventListener('load', function() {
      if (!loaded) {
        loaded = true;
        console.log('✅ Print window fully loaded, starting print...');
        setTimeout(() => {
          printWindow.focus();
          printWindow.print();
        }, 300);
      }
    });

    // Timeout fallback jika load event tidak trigger
    setTimeout(() => {
      if (!loaded && !printWindow.closed) {
        loaded = true;
        console.log('⚠️ Load timeout, starting print anyway...');
        printWindow.focus();
        printWindow.print();
      }
    }, 2000);

    // Handle after print - close window
    setTimeout(() => {
      if (!printWindow.closed) {
        printWindow.onafterprint = function() {
          printWindow.close();
        };
      }
    }, 300);

  } catch (err) {
    console.error("❌ Gagal membuka window print:", err);
    showToast("Gagal membuka window print: " + err.message, "error");
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
    // generateBarcodeLabelImage returns Promise -> await it
    const imageDataUrl = await generateBarcodeLabelImage(barcodeValue, productName, type);
    imageBase64 = imageDataUrl.replace(/^data:image\/png;base64,/, "");
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