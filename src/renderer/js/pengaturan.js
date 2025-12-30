/**
 * ======================================================
 * PENGATURAN TOKO - MOVE TO BODY FIX
 * ======================================================
 */

// Pastikan setup hanya sekali
let isSetupComplete = false;

// Gunakan multiple triggers untuk memastikan DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// Fallback jika DOMContentLoaded sudah lewat
window.addEventListener('load', function() {
  if (!isSetupComplete) {
    init();
  }
});

function init() {
  console.log('🚀 Pengaturan.js loaded');
  
  // Load data toko
  loadStoreInfo();

  // Setup modal dengan retry mechanism
  setupModalWithRetry();
}

/* ======================================================
 * SETUP MODAL DENGAN RETRY
 * ====================================================== */
function setupModalWithRetry() {
  let attempts = 0;
  const maxAttempts = 20;
  
  const trySetup = () => {
    attempts++;
    console.log(`⏳ Mencoba setup modal... percobaan ke-${attempts}`);
    
    const editBtn = document.querySelector('.edit-toko');
    const modal = document.getElementById('modalEditToko');
    const cancelBtn = document.querySelector('.modal-cancel');
    const saveBtn = document.querySelector('.modal-save');
    
    if (editBtn && modal && cancelBtn && saveBtn) {
      console.log('✅ Semua elemen ditemukan! Setup modal...');
      
      // PENTING: Pindahkan modal ke body jika belum
      if (modal.parentElement !== document.body) {
        console.log('📦 Memindahkan modal ke body...');
        document.body.appendChild(modal);
      }
      
      // Setup event listeners
      setupModalEvents(editBtn, modal, cancelBtn, saveBtn);
      
      isSetupComplete = true;
    } else {
      console.warn('⚠️ Elemen belum lengkap:', {
        editBtn: !!editBtn,
        modal: !!modal,
        cancelBtn: !!cancelBtn,
        saveBtn: !!saveBtn
      });
      
      if (attempts < maxAttempts) {
        setTimeout(trySetup, 200);
      } else {
        console.error('❌ Gagal setup modal setelah ' + maxAttempts + ' percobaan');
      }
    }
  };
  
  trySetup();
}

/* ======================================================
 * SETUP MODAL EVENTS
 * ====================================================== */
function setupModalEvents(editBtn, modal, cancelBtn, saveBtn) {
  console.log('⚙️ Memasang event listeners...');
  
  // Fungsi untuk membuka modal
  function openModal() {
    console.log('🎯 Opening modal...');
    
    // Ambil data dari halaman
    const namaEl = document.getElementById('namaToko');
    const alamatEl = document.getElementById('alamatToko');
    const teleponEl = document.getElementById('teleponToko');

    const inputNama = document.getElementById('editNama');
    const inputAlamat = document.getElementById('editAlamat');
    const inputTelepon = document.getElementById('editTelepon');

    // Isi form dengan data yang ada
    if (inputNama && namaEl) {
      inputNama.value = namaEl.textContent.trim();
    }
    if (inputAlamat && alamatEl) {
      inputAlamat.value = alamatEl.textContent.trim();
    }
    if (inputTelepon && teleponEl) {
      inputTelepon.value = teleponEl.textContent.trim();
    }

    // Reset all styles first
    modal.removeAttribute('style');
    
    // PERBAIKAN: Set CSS secara eksplisit dengan prioritas tinggi
    modal.style.cssText = `
      display: flex !important;
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      right: 0 !important;
      bottom: 0 !important;
      width: 100vw !important;
      height: 100vh !important;
      background-color: rgba(0, 0, 0, 0.6) !important;
      justify-content: center !important;
      align-items: center !important;
      z-index: 999999 !important;
      opacity: 1 !important;
      visibility: visible !important;
      pointer-events: auto !important;
      overflow: auto !important;
      margin: 0 !important;
      padding: 0 !important;
    `;
    
    modal.classList.add('active');

    // Pastikan modal card juga visible
    const modalCard = modal.querySelector('.modal-card');
    if (modalCard) {
      modalCard.style.cssText = `
        background: var(--card-color, #1a1a1a) !important;
        padding: 24px !important;
        border-radius: 12px !important;
        max-width: 400px !important;
        width: 90% !important;
        max-height: 90vh !important;
        overflow-y: auto !important;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.9) !important;
        position: relative !important;
        z-index: 1000000 !important;
        opacity: 1 !important;
        visibility: visible !important;
        pointer-events: auto !important;
        margin: auto !important;
      `;
    }

    // Cek posisi modal di DOM
    console.log('📍 Modal parent:', modal.parentElement.tagName);
    console.log('📍 Modal computed style:', {
      display: window.getComputedStyle(modal).display,
      visibility: window.getComputedStyle(modal).visibility,
      zIndex: window.getComputedStyle(modal).zIndex,
      position: window.getComputedStyle(modal).position
    });

    console.log('✅ Modal sekarang:', {
      classList: modal.classList.value,
      display: modal.style.display,
      zIndex: modal.style.zIndex,
      visibility: modal.style.visibility
    });

    // Focus ke input pertama
    setTimeout(() => {
      if (inputNama) {
        inputNama.focus();
        inputNama.select();
      }
    }, 100);
  }
  
  // Fungsi untuk menutup modal
  function closeModal() {
    console.log('🔴 Closing modal...');
    modal.classList.remove('active');
    modal.style.display = 'none';
    modal.style.visibility = 'hidden';
    modal.style.opacity = '0';
  }
  
  // EVENT: Tombol Edit (gunakan event delegation)
  document.body.addEventListener('click', function(e) {
    // Cek apakah yang diklik adalah tombol edit atau child-nya
    if (e.target.closest('.edit-toko')) {
      e.preventDefault();
      e.stopPropagation();
      console.log('🖱️ Edit button clicked!');
      openModal();
    }
  });
  
  // EVENT: Tombol Cancel
  cancelBtn.addEventListener('click', function(e) {
    e.preventDefault();
    e.stopPropagation();
    console.log('🖱️ Cancel button clicked!');
    closeModal();
  });
  
  // EVENT: Tombol Save
  saveBtn.addEventListener('click', function(e) {
    e.preventDefault();
    e.stopPropagation();
    console.log('🖱️ Save button clicked!');
    updateStoreInfo();
  });
  
  // EVENT: Klik di luar modal
  modal.addEventListener('click', function(e) {
    if (e.target === modal) {
      console.log('🖱️ Clicked outside modal');
      closeModal();
    }
  });
  
  // EVENT: ESC key
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && modal.classList.contains('active')) {
      console.log('⌨️ ESC pressed');
      closeModal();
    }
  });
  
  console.log('✅ Event listeners terpasang!');
}

/* ======================================================
 * LOAD & RENDER INFO TOKO
 * ====================================================== */
async function loadStoreInfo() {
  const storeId = localStorage.getItem('store_id');
  const token = localStorage.getItem('token');

  if (!storeId || !token) {
    console.warn('⚠️ Store ID atau token tidak ditemukan');
    return;
  }

  try {
    const res = await fetch(`http://103.126.116.119:8001/api/stores/${storeId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const data = await res.json();
    if (!data?.success || !data?.data) return;

    renderStoreInfo(data.data);

    // Simpan ke localStorage
    localStorage.setItem('store_name', data.data.name || '');
    localStorage.setItem('store_address', data.data.address || '');
    localStorage.setItem('store_phone', data.data.phone || '');

    // Update header
    const headerEl = document.getElementById('headerStoreName');
    if (headerEl) headerEl.textContent = data.data.name || '';

  } catch (err) {
    console.error('❌ Gagal load store info:', err);
  }
}

function renderStoreInfo(store) {
  // Render menggunakan ID
  const namaEl = document.getElementById('namaToko');
  const alamatEl = document.getElementById('alamatToko');
  const teleponEl = document.getElementById('teleponToko');
  
  if (namaEl) namaEl.textContent = store.name || '-';
  if (alamatEl) alamatEl.textContent = store.address || '-';
  if (teleponEl) teleponEl.textContent = store.phone || '-';

  // Render field lainnya
  document.querySelectorAll('.detail-toko-judul').forEach(el => {
    const valueEl = el.nextElementSibling;
    if (!valueEl) return;

    const label = el.textContent.trim().toLowerCase();
    
    switch (label) {
      case 'id': 
        valueEl.textContent = store.id ?? '-'; 
        break;
      case 'owner id': 
        valueEl.textContent = store.owner_id ?? '-'; 
        break;
      case 'receipt template': 
        valueEl.textContent = store.receipt_template ?? '-'; 
        break;
      case 'created at': 
        valueEl.textContent = store.created_at ?? '-'; 
        break;
      case 'updated at': 
        valueEl.textContent = store.updated_at ?? '-'; 
        break;
    }
  });
}

/* ======================================================
 * UPDATE STORE INFO
 * ====================================================== */
async function updateStoreInfo() {
  const storeId = localStorage.getItem('store_id');
  const token = localStorage.getItem('token');
  
  if (!storeId || !token) {
    alert('Session tidak valid, silakan login kembali');
    return;
  }

  const name = document.getElementById('editNama')?.value.trim() || '';
  const address = document.getElementById('editAlamat')?.value.trim() || '';
  const phone = document.getElementById('editTelepon')?.value.trim() || '';

  if (!name || !address || !phone) {
    alert('Semua field harus diisi!');
    return;
  }

  console.log('📤 Mengirim update:', { name, address, phone });

  try {
    const res = await fetch(`http://103.126.116.119:8001/api/stores/${storeId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ name, address, phone })
    });

    const data = await res.json();

    if (data?.success) {
      console.log('✅ Update berhasil');
      
      // Tutup modal
      const modal = document.getElementById('modalEditToko');
      if (modal) {
        modal.classList.remove('active');
        modal.style.display = 'none';
        modal.style.visibility = 'hidden';
        modal.style.opacity = '0';
      }
      
      // Tampilkan notifikasi
      if (window.showToast) {
        window.showToast('Informasi toko berhasil diupdate', 'success');
      } else {
        alert('Informasi toko berhasil diupdate!');
      }
      
      // Reload data toko
      await loadStoreInfo();
    } else {
      console.error('❌ Update gagal:', data);
      
      if (window.showToast) {
        window.showToast('Gagal update toko: ' + (data.message || 'Unknown error'), 'error');
      } else {
        alert('Gagal update toko: ' + (data.message || 'Unknown error'));
      }
    }
  } catch (err) {
    console.error('❌ Update store error:', err);
    
    if (window.showToast) {
      window.showToast('Gagal update toko', 'error');
    } else {
      alert('Gagal update toko: ' + err.message);
    }
  }
}
