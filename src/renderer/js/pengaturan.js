/**
 * ======================================================
 * PENGATURAN TOKO - MOVE TO BODY FIX
 * ======================================================
 */

let isSetupComplete = false;
let allStores = []; // Simpan semua stores

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

window.addEventListener('load', function() {
  if (!isSetupComplete) {
    init();
  }
});

function init() {
  console.log('🚀 Pengaturan.js loaded');
  
  const userRole = localStorage.getItem('role');
  console.log('👤 User Role:', userRole);
  
  // Set role class ke body
  document.body.className = 'role-' + userRole;
  
  // Load data owner hanya untuk OWNER
  if (userRole === 'owner') {
    loadOwnerInfo();
  }
  
  // Load semua stores
  loadAllStores();

  // Setup modal toko
  setupModalWithRetry();
  
  // Setup modal owner hanya untuk owner
  if (userRole === 'owner') {
    setupOwnerModalWithRetry();
  }
}

/* ======================================================
 * LOAD ALL STORES (FIXED - data.stores)
 * ====================================================== */
async function loadAllStores() {
  const token = localStorage.getItem('token');

  if (!token) {
    console.warn('⚠️ Token tidak ditemukan');
    return;
  }

  try {
    console.log('📡 Fetching stores from API...');
    const res = await fetch('http://103.126.116.119:8001/api/stores', {
      headers: { Authorization: `Bearer ${token}` }
    });

    const data = await res.json();
    console.log('📦 API Response:', data);
    
    // FIX: data.stores bukan data.data
    if (data?.success && Array.isArray(data.data?.stores)) {
      allStores = data.data.stores;
      console.log('✅ All stores loaded:', allStores);
      console.log('📊 Total stores:', allStores.length);
      renderStoreAccordions(allStores);
    } else {
      console.error('❌ Failed to load stores:', data?.message);
      showNotification('Gagal memuat data toko', 'error');
    }
  } catch (err) {
    console.error('❌ Error loading stores:', err);
    showNotification('Gagal memuat data toko: ' + err.message, 'error');
  }
}

/* ======================================================
 * RENDER MULTIPLE ACCORDION STORES
 * ====================================================== */
function renderStoreAccordions(stores) {
  const container = document.getElementById('storesContainer');
  if (!container) return;

  container.innerHTML = '';

  if (!stores || stores.length === 0) {
    container.innerHTML = '<p style="color: var(--paragraph-color); padding: 16px;">Tidak ada toko yang ditemukan</p>';
    return;
  }

  stores.forEach((store, index) => {
    const accordion = createStoreAccordion(store, index);
    container.appendChild(accordion);
  });

  console.log('✅ Rendered ' + stores.length + ' store accordion(s)');
}

/* ======================================================
 * CREATE SINGLE STORE ACCORDION
 * ====================================================== */
function createStoreAccordion(store, index) {
  const wrapper = document.createElement('div');
  wrapper.className = 'accordion-toko-wrapper';
  wrapper.dataset.storeId = store.id;

  const button = document.createElement('button');
  button.className = 'accordion-toko-btn active';
  button.innerHTML = `
    <span class="material-symbols-outlined accordion-icon">expand_more</span>
    <span class="accordion-store-name">${store.name || 'Toko ' + (index + 1)}</span>
  `;

  const content = document.createElement('div');
  content.className = 'accordion-toko-content active';
  content.innerHTML = `
    <div class="informasi-toko-bisnis" style="margin: 0; border-top: none; border-radius: 0 0 8px 8px;">
      <div class="card-informasi-toko">
        <div class="judul-informasi-toko">
          <span class="material-symbols-outlined logo-toko">store</span>
          <div class="informasi-toko">
            <h3>Informasi Toko</h3>
            <p>Data toko yang digunakan untuk identitas & nota</p>
          </div>
          <button class="edit-toko" data-store-id="${store.id}" data-permissions="owner, admin">
            <span class="material-symbols-outlined">edit</span>Edit
          </button>
        </div>
        <div class="detail-info-toko">
          <div class="detail-toko-wrapper">
            <p class="detail-toko-judul">ID</p>
            <p class="detail-toko-deskripsi">${store.id ?? '-'}</p>
          </div>
    
          <div class="detail-toko-wrapper">
            <p class="detail-toko-judul">Owner ID</p>
            <p class="detail-toko-deskripsi">${store.owner_id ?? '-'}</p>
          </div>
    
          <div class="detail-toko-wrapper">
            <p class="detail-toko-judul">Nama</p>
            <p class="detail-toko-deskripsi" data-field="nama">${store.name || '-'}</p>
          </div>

          <div class="detail-toko-wrapper">
            <p class="detail-toko-judul">Alamat</p>
            <p class="detail-toko-deskripsi" data-field="alamat">${store.address || '-'}</p>
          </div>

          <div class="detail-toko-wrapper">
            <p class="detail-toko-judul">Telepon</p>
            <p class="detail-toko-deskripsi" data-field="telepon">${store.phone || '-'}</p>
          </div>

          <div class="detail-toko-wrapper">
            <p class="detail-toko-judul">Pajak (PPN)</p>
            <p class="detail-toko-deskripsi" data-field="pajak">${(store.tax_percentage || '10') + '%'}</p>
          </div>
    
          <div class="detail-toko-wrapper">
            <p class="detail-toko-judul">Receipt Template</p>
            <p class="detail-toko-deskripsi">${store.receipt_template || '-'}</p>
          </div>
    
          <div class="detail-toko-wrapper">
            <p class="detail-toko-judul">Created At</p>
            <p class="detail-toko-deskripsi">${store.created_at || '-'}</p>
          </div>
    
          <div class="detail-toko-wrapper" style="margin: 0; border: none; padding: 0;">
            <p class="detail-toko-judul">Updated At</p>
            <p class="detail-toko-deskripsi">${store.updated_at || '-'}</p>
          </div>
        </div>
      </div>
    </div>
  `;

  // Toggle accordion
  button.addEventListener('click', function(e) {
    e.preventDefault();
    button.classList.toggle('active');
    content.classList.toggle('active');
  });

  wrapper.appendChild(button);
  wrapper.appendChild(content);

  return wrapper;
}

/* ======================================================
 * SETUP MODAL DENGAN RETRY (TOKO - JANGAN DIUBAH)
 * ====================================================== */
function setupModalWithRetry() {
  let attempts = 0;
  const maxAttempts = 20;
  
  const trySetup = () => {
    attempts++;
    console.log(`⏳ Mencoba setup modal... percobaan ke-${attempts}`);
    
    const modal = document.getElementById('modalEditToko');
    const cancelBtn = modal?.querySelector('.modal-cancel');
    const saveBtn = modal?.querySelector('.modal-save');
    
    if (modal && cancelBtn && saveBtn) {
      console.log('✅ Modal elements found! Setup modal...');
      
      if (modal.parentElement !== document.body) {
        console.log('📦 Moving modal to body...');
        document.body.appendChild(modal);
      }
      
      setupModalEvents(modal, cancelBtn, saveBtn);
      isSetupComplete = true;
    } else {
      if (attempts < maxAttempts) {
        setTimeout(trySetup, 200);
      } else {
        console.error('❌ Failed setup modal after ' + maxAttempts + ' attempts');
      }
    }
  };
  
  trySetup();
}

/* ======================================================
 * SETUP MODAL EVENTS (TOKO - JANGAN DIUBAH)
 * ====================================================== */
function setupModalEvents(modal, cancelBtn, saveBtn) {
  console.log('⚙️ Setting up modal event listeners...');
  
  let currentStoreId = null;

  function openModal(storeId) {
    currentStoreId = storeId;
    console.log('🎯 Opening modal for store:', storeId);
    
    // Cari store dari allStores
    const store = allStores.find(s => s.id == storeId);
    if (!store) {
      showNotification('Toko tidak ditemukan', 'error');
      return;
    }

    const inputNama = document.getElementById('editNama');
    const inputAlamat = document.getElementById('editAlamat');
    const inputTelepon = document.getElementById('editTelepon');
    const inputPajak = document.getElementById('editPajak');

    if (inputNama) inputNama.value = store.name || '';
    if (inputAlamat) inputAlamat.value = store.address || '';
    if (inputTelepon) inputTelepon.value = store.phone || '';
    if (inputPajak) inputPajak.value = store.tax_percentage || '10';

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

    setTimeout(() => {
      if (inputNama) {
        inputNama.focus();
        inputNama.select();
      }
    }, 100);
  }
  
  function closeModal() {
    console.log('🔴 Closing modal...');
    modal.classList.remove('active');
    modal.style.display = 'none';
    modal.style.visibility = 'hidden';
    modal.style.opacity = '0';
    currentStoreId = null;
  }
  
  // EVENT: Edit button (delegation)
  document.body.addEventListener('click', function(e) {
    if (e.target.closest('.edit-toko')) {
      e.preventDefault();
      e.stopPropagation();
      const storeId = e.target.closest('.edit-toko').dataset.storeId;
      console.log('🖱️ Edit button clicked for store:', storeId);
      openModal(storeId);
    }
  });
  
  // EVENT: Cancel button
  cancelBtn.addEventListener('click', function(e) {
    e.preventDefault();
    e.stopPropagation();
    closeModal();
  });
  
  // EVENT: Save button
  saveBtn.addEventListener('click', function(e) {
    e.preventDefault();
    e.stopPropagation();
    updateStoreInfo(currentStoreId);
  });
  
  // EVENT: Click outside modal
  modal.addEventListener('click', function(e) {
    if (e.target === modal) {
      closeModal();
    }
  });
  
  // EVENT: ESC key
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && modal.classList.contains('active')) {
      closeModal();
    }
  });
  
  console.log('✅ Modal event listeners attached!');
}

/* ======================================================
 * UPDATE STORE INFO (UPDATED untuk multiple stores)
 * ====================================================== */
async function updateStoreInfo(storeId) {
  const token = localStorage.getItem('token');
  
  if (!storeId || !token) {
    showNotification('Session tidak valid', 'error');
    return;
  }

  const name = document.getElementById('editNama')?.value.trim() || '';
  const address = document.getElementById('editAlamat')?.value.trim() || '';
  const phone = document.getElementById('editTelepon')?.value.trim() || '';
  const tax_percentage = document.getElementById('editPajak')?.value.trim() || '10';

  if (!name || !address || !phone) {
    showNotification('Semua field harus diisi!', 'warning');
    return;
  }

  console.log('📤 Updating store:', storeId, { name, address, phone, tax_percentage });

  try {
    const res = await fetch(`http://103.126.116.119:8001/api/stores/${storeId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ name, address, phone, tax_percentage })
    });

    const data = await res.json();

    if (data?.success) {
      console.log('✅ Store updated successfully');
      
      const modal = document.getElementById('modalEditToko');
      if (modal) {
        modal.classList.remove('active');
        modal.style.display = 'none';
        modal.style.visibility = 'hidden';
        modal.style.opacity = '0';
      }
      
      showNotification('Informasi toko berhasil diupdate', 'success');
      await loadAllStores();
    } else {
      showNotification(data?.message || 'Gagal update toko', 'error');
    }
  } catch (err) {
    console.error('❌ Update error:', err);
    showNotification('Gagal update toko', 'error');
  }
}

/* ======================================================
 * LOAD OWNER INFO
 * ====================================================== */
async function loadOwnerInfo() {
  const ownerId = localStorage.getItem('owner_id');
  const token = localStorage.getItem('token');

  if (!ownerId || !token) {
    console.log('⚠️ Owner ID or token not found');
    return;
  }

  try {
    const res = await fetch(`http://103.126.116.119:8001/api/owners/${ownerId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    if (data?.success && data?.data) {
      renderOwnerInfo(data.data);
    }
  } catch (err) {
    console.error('❌ Error loading owner info:', err);
  }
}

function renderOwnerInfo(owner) {
  document.getElementById('ownerId').textContent = owner.id ?? '-';
  document.getElementById('ownerBusinessName').textContent = owner.business_name ?? '-';
  document.getElementById('ownerEmail').textContent = owner.email ?? '-';
  document.getElementById('ownerPhone').textContent = owner.phone ?? '-';
  document.getElementById('ownerAddress').textContent = owner.address ?? '-';
  document.getElementById('ownerCreatedAt').textContent = owner.created_at ?? '-';

  const editBtn = document.querySelector('.edit-owner');
  const userRole = localStorage.getItem('role');
  if (editBtn) {
    editBtn.style.display = (userRole === 'owner') ? 'flex' : 'none';
  }
}

/* ======================================================
 * SETUP MODAL OWNER
 * ====================================================== */
function setupOwnerModalWithRetry() {
  let attempts = 0;
  const maxAttempts = 20;

  const trySetup = () => {
    attempts++;
    const editBtn = document.querySelector('.edit-owner');
    const modal = document.getElementById('modalEditOwner');
    const cancelBtn = modal?.querySelector('.modal-owner-cancel');
    const saveBtn = modal?.querySelector('.modal-owner-save');

    if (editBtn && modal && cancelBtn && saveBtn) {
      if (modal.parentElement !== document.body) {
        document.body.appendChild(modal);
      }
      setupOwnerModalEvents(editBtn, modal, cancelBtn, saveBtn);
    } else {
      if (attempts < maxAttempts) {
        setTimeout(trySetup, 200);
      }
    }
  };
  trySetup();
}

function setupOwnerModalEvents(editBtn, modal, cancelBtn, saveBtn) {
  if (editBtn._ownerModalSetup) return;
  editBtn._ownerModalSetup = true;

  editBtn.addEventListener('click', function(e) {
    e.preventDefault();
    e.stopPropagation();
    document.getElementById('editOwnerBusinessName').value = document.getElementById('ownerBusinessName').textContent.trim();
    document.getElementById('editOwnerEmail').value = document.getElementById('ownerEmail').textContent.trim();
    document.getElementById('editOwnerPhone').value = document.getElementById('ownerPhone').textContent.trim();
    document.getElementById('editOwnerAddress').value = document.getElementById('ownerAddress').textContent.trim();

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
  });

  cancelBtn.addEventListener('click', function(e) {
    e.preventDefault();
    e.stopPropagation();
    modal.classList.remove('active');
    modal.style.display = 'none';
  });

  saveBtn.addEventListener('click', async function(e) {
    e.preventDefault();
    e.stopPropagation();
    await updateOwnerInfo();
  });

  modal.addEventListener('click', function(e) {
    if (e.target === modal) {
      modal.classList.remove('active');
      modal.style.display = 'none';
    }
  });

  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && modal.classList.contains('active')) {
      modal.classList.remove('active');
      modal.style.display = 'none';
    }
  });
}

async function updateOwnerInfo() {
  const ownerId = localStorage.getItem('owner_id');
  const token = localStorage.getItem('token');

  if (!ownerId || !token) {
    showNotification('Session tidak valid', 'error');
    return;
  }

  const business_name = document.getElementById('editOwnerBusinessName')?.value.trim() || '';
  const email = document.getElementById('editOwnerEmail')?.value.trim() || '';
  const phone = document.getElementById('editOwnerPhone')?.value.trim() || '';
  const address = document.getElementById('editOwnerAddress')?.value.trim() || '';

  if (!business_name || !email || !phone || !address) {
    showNotification('Semua field harus diisi!', 'warning');
    return;
  }

  try {
    const res = await fetch(`http://103.126.116.119:8001/api/owners/${ownerId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ business_name, email, phone, address })
    });
    const data = await res.json();
    if (data?.success) {
      const modal = document.getElementById('modalEditOwner');
      modal.classList.remove('active');
      modal.style.display = 'none';
      showNotification('Informasi bisnis berhasil diupdate', 'success');
      await loadOwnerInfo();
    } else {
      showNotification(data?.message || 'Gagal update bisnis', 'error');
    }
  } catch (err) {
    showNotification('Gagal update bisnis', 'error');
  }
}

/* ======================================================
 * HELPER: SHOW NOTIFICATION
 * ====================================================== */
function showNotification(message, type = 'info') {
  if (typeof window.showToast === 'function') {
    window.showToast(message, type);
  } else {
    console.warn('⚠️ showToast not available, using alert');
    alert(message);
  }
}
