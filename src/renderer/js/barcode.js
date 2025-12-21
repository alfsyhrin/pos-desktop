
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
      
      // Isi kolom barcode di tools
      document.getElementById('barcode-value').value = barcode;
      
      // Isi kolom barcode di form produk
      document.getElementById('product-barcode').value = barcode;
      
      // Generate preview barcode
      generateBarcodeFromValue(barcode);
        // --- NEW: inform global handler (produk page) ---
  if (window.onBarcodeScanned && typeof window.onBarcodeScanned === 'function') {
    try { window.onBarcodeScanned(barcode); } catch (e) { console.error('onBarcodeScanned handler error', e); }
  }
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
      const container = document.getElementById('camera-container');
      const btn = document.getElementById('btn-camera');
      
      try {
        container.classList.add('active');
        
        html5QrCode = new Html5Qrcode("camera-reader");
        
        const config = {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0
        };
        
        await html5QrCode.start(
          { facingMode: "environment" },
          config,
          (decodedText) => {
            // Barcode/QR berhasil di-scan
            handleScannedBarcode(decodedText);
            stopCamera();
          },
          (errorMessage) => {
            // Ignore scan errors (normal saat mencari barcode)
          }
        );
        
        cameraActive = true;
        btn.innerHTML = '<span class="material-symbols-outlined">videocam_off</span> Stop Kamera';
        showToast('Kamera aktif - Arahkan ke barcode', 'info');
        
      } catch (error) {
        container.classList.remove('active');
        showToast('Gagal membuka kamera: ' + error.message, 'error');
        console.error('Camera error:', error);
      }
    }

    function stopCamera() {
      const container = document.getElementById('camera-container');
      const btn = document.getElementById('btn-camera');
      
      if (html5QrCode && cameraActive) {
        html5QrCode.stop().then(() => {
          html5QrCode.clear();
          cameraActive = false;
          container.classList.remove('active');
          btn.innerHTML = '<span class="material-symbols-outlined">photo_camera</span> Scan Kamera';
        }).catch(err => {
          console.error('Error stopping camera:', err);
        });
      } else {
        container.classList.remove('active');
        btn.innerHTML = '<span class="material-symbols-outlined">photo_camera</span> Scan Kamera';
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