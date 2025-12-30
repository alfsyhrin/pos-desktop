// Robust modal + save with PUT -> PATCH fallback and UI refresh
document.addEventListener('DOMContentLoaded', () => {
  const modal = document.getElementById('modalEditToko');
  const modalCard = modal?.querySelector('.modal-card');
  const editButtons = Array.from(document.querySelectorAll('.edit-toko'));
  const cancelButtons = Array.from(document.querySelectorAll('.modal-cancel'));
  const saveButtons = Array.from(document.querySelectorAll('.modal-save'));

  // ensure modal does NOT block page when not active
  if (modal) {
    modal.classList.remove('active');
    modal.style.display = 'none';
    modal.style.pointerEvents = 'none';
    modal.style.zIndex = modal.style.zIndex || '9999';
    modal.style.position = modal.style.position || 'fixed';
    modal.style.inset = modal.style.inset || '0';
    modal.style.justifyContent = modal.style.justifyContent || 'center';
    modal.style.alignItems = modal.style.alignItems || 'center';
  }

  function setModalVisible(show) {
    if (!modal) return;
    modal.classList.toggle('active', !!show);
    modal.style.display = show ? 'flex' : 'none';
    modal.style.pointerEvents = show ? 'auto' : 'none';
    document.body.style.overflow = show ? 'hidden' : '';
  }

  function fillFormFromPage() {
    const namaEl = document.getElementById('namaToko') || document.querySelector('[data-field="nama"]');
    const alamatEl = document.getElementById('alamatToko') || document.querySelector('[data-field="alamat"]');
    const teleponEl = document.getElementById('teleponToko') || document.querySelector('[data-field="telepon"]');
    const inputNama = document.getElementById('editNama');
    const inputAlamat = document.getElementById('editAlamat');
    const inputTelepon = document.getElementById('editTelepon');
    if (inputNama) inputNama.value = namaEl ? (namaEl.textContent || '') : '';
    if (inputAlamat) inputAlamat.value = alamatEl ? (alamatEl.textContent || '') : '';
    if (inputTelepon) inputTelepon.value = teleponEl ? (teleponEl.textContent || '') : '';
  }

  window.openModal = function openModal() {
    if (!modal) return;
    fillFormFromPage();
    setModalVisible(true);
    // focus first input
    const i = document.getElementById('editNama') || modal.querySelector('input, textarea');
    if (i) i.focus();
  };

  window.closeModal = function closeModal() {
    setModalVisible(false);
  };

  async function tryRequest(url, method, token, body) {
    const opts = { method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` } };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(url, opts);
    const json = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, json };
  }

  async function saveEditInternal() {
    const storeId = localStorage.getItem('store_id');
    const token = localStorage.getItem('token');
    if (!storeId || !token) {
      if (window.showToast) showToast('Store atau token tidak ditemukan', 'error');
      return { success: false };
    }

    const inputNama = document.getElementById('editNama');
    const inputAlamat = document.getElementById('editAlamat');
    const inputTelepon = document.getElementById('editTelepon');
    const payload = {
      name: inputNama ? inputNama.value.trim() : '',
      address: inputAlamat ? inputAlamat.value.trim() : '',
      phone: inputTelepon ? inputTelepon.value.trim() : ''
    };

    const base = window.BASE_URL || 'http://103.126.116.119:8001/api';
    const url = `${base}/stores/${storeId}`;

    // try PUT
    let attempt = await tryRequest(url, 'PUT', token, payload);
    if (!attempt.ok) {
      // fallback PATCH
      attempt = await tryRequest(url, 'PATCH', token, payload);
    }

    return attempt.json || {};
  }

  async function setSavingState(saving) {
    saveButtons.forEach(b => {
      b.disabled = saving;
      b.style.opacity = saving ? '0.6' : '';
      b.textContent = saving ? 'Menyimpan...' : (b.getAttribute('data-label') || 'Simpan');
    });
  }

  window.saveEdit = async function saveEdit() {
    await setSavingState(true);
    try {
      const result = await saveEditInternal();
      if (result && (result.success || result.status === 'success')) {
        if (window.showToast) showToast('Informasi toko berhasil diupdate', 'success');

        // refresh store info UI: prefer calling existing loader
        if (typeof window.loadStoreInfo === 'function') {
          await window.loadStoreInfo();
        } else {
          // fallback: update fields directly from result.data or payload
          const store = result.data || {};
          const namaEl = document.getElementById('namaToko') || document.querySelector('[data-field="nama"]');
          const alamatEl = document.getElementById('alamatToko') || document.querySelector('[data-field="alamat"]');
          const teleponEl = document.getElementById('teleponToko') || document.querySelector('[data-field="telepon"]');
          if (namaEl && store.name) namaEl.textContent = store.name;
          if (alamatEl && store.address) alamatEl.textContent = store.address;
          if (teleponEl && store.phone) teleponEl.textContent = store.phone;
          if (store.name) {
            localStorage.setItem('store_name', store.name);
            const headerEl = document.getElementById('headerStoreName');
            if (headerEl) headerEl.textContent = store.name;
          }
        }

        closeModal();
      } else {
        const msg = (result && (result.message || result.error)) || 'Gagal update toko';
        if (window.showToast) showToast(msg, 'error');
        console.warn('edit-toko: update failed', result);
      }
    } catch (e) {
      console.error('edit-toko save error', e);
      if (window.showToast) showToast('Gagal update toko: ' + (e?.message || e), 'error');
    } finally {
      await setSavingState(false);
    }
  };

  // Attach click listeners to edit buttons
  if (editButtons.length) {
    editButtons.forEach(btn => {
      btn.style.cursor = 'pointer';
      btn.addEventListener('click', ev => { ev.preventDefault(); openModal(); });
    });
  }

  // modal action buttons
  if (cancelButtons.length) cancelButtons.forEach(b => b.addEventListener('click', ev => { ev.preventDefault(); closeModal(); }));
  if (saveButtons.length) saveButtons.forEach(b => {
    // preserve label if present
    if (!b.getAttribute('data-label')) b.setAttribute('data-label', b.textContent.trim() || 'Simpan');
    b.addEventListener('click', ev => { ev.preventDefault(); if (typeof window.saveEdit === 'function') window.saveEdit(); });
  });

  // click outside modal-card closes modal
  if (modal) {
    modal.addEventListener('click', (ev) => {
      if (!modalCard) return;
      if (!modalCard.contains(ev.target)) closeModal();
    });
  }

  // ESC key to close
  document.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape') closeModal();
  });

  // Delegation fallback for dynamically added buttons
  document.addEventListener('click', (ev) => {
    const b = ev.target.closest?.('.edit-toko');
    if (b) { ev.preventDefault(); openModal(); }
  });

  // Debug log
  console.debug('edit-toko initialized', { modal: !!modal, editButtons: editButtons.length, saveButtons: saveButtons.length });
});
