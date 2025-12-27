// Load pending transaction data from localStorage
function loadPendingTransaction() {
  const pendingData = localStorage.getItem('pending_transaction');
  if (!pendingData) {
    console.error('No pending transaction data found');
    return null;
  }
  try {
    return JSON.parse(pendingData);
  } catch (err) {
    console.error('Error parsing pending transaction data:', err);
    return null;
  }
}

// Render pending transaction info in proses-pembayaran.html
function renderPendingTransaction(pendingData) {
  if (!pendingData) return;

  // Update total
  const totalEl = document.querySelector('.card-total-pembayaran h4:nth-child(2)');
  if (totalEl) totalEl.textContent = `Rp ${Number(pendingData.total_cost || 0).toLocaleString('id-ID')}`;

  // Set initial kembalian to 0
  const kembalianEl = document.querySelectorAll('.card-total-pembayaran h4')[3];
  if (kembalianEl) kembalianEl.textContent = `Rp 0`;

  // Set uang diterima input to total_cost initially
  const inputTunai = document.querySelector('.card-tunai-diterima-pembayaran input[type="number"]');
  if (inputTunai) {
    inputTunai.value = pendingData.total_cost || 0;
    inputTunai.disabled = false; // Enable input for user to change
  }
}

// Event input uang diterima - calculate kembalian
function inisialisasiInputTunai(pendingData) {
  const inputTunai = document.querySelector('.card-tunai-diterima-pembayaran input[type="number"]');
  const kembalianEl = document.querySelectorAll('.card-total-pembayaran h4')[3];
  const total = pendingData.total_cost || 0;

  if (inputTunai && kembalianEl) {
    inputTunai.addEventListener('input', function() {
      const received = Number(this.value) || 0;
      const change = Math.max(0, received - total);
      kembalianEl.textContent = `Rp ${change.toLocaleString('id-ID')}`;
    });
  }
}

// Create transaction via API
async function createTransaction(pendingData, receivedAmount, changeAmount) {
  const storeId = pendingData.storeId;
  const token = localStorage.getItem('token');
  if (!storeId || !token) {
    throw new Error('Missing storeId or token');
  }

  const items = pendingData.cart.map(item => ({
    product_id: item.id,
    quantity: item.quantity,
    // Jika ada diskon custom dari kasir, boleh kirim:
    discount_type: item.discount_type || null,
    discount_value: item.discount_value || 0,
    notes: item.notes || ""
  }));

  const body = {
    user_id: Number(pendingData.userId),
    payment_type: "cash",
    payment_method: "cash",
    received_amount: receivedAmount,
    change_amount: changeAmount,
    items
  };

  console.info('[proses-pembayaran] create transaction payload', body);

  const res = await fetch(`http://103.126.116.119:8001/api/stores/${storeId}/transactions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body)
  });

  const text = await res.text();
  let data = null;
  try { data = JSON.parse(text); } catch(e) { data = { raw: text }; }

  console.info('[proses-pembayaran] create transaction response', res.status, data);

  if (res.ok && data && data.success) {
    return data.data;
  } else {
    throw new Error(data?.message || res.status || 'Gagal membuat transaksi');
  }
}

// Event tombol Bayar - create transaction and redirect to detail-transaksi.html
function inisialisasiBayar(pendingData) {
  const bayarBtn = document.querySelector('.wrap-button-proses-pembayaran a');
  if (!bayarBtn) return;

  bayarBtn.addEventListener('click', async function (e) {
    e.preventDefault();

    const inputTunai = document.querySelector('.card-tunai-diterima-pembayaran input[type="number"]');
    const receivedAmount = Number(inputTunai?.value) || 0;
    const total = pendingData.total_cost || 0;
    const changeAmount = Math.max(0, receivedAmount - total);

    if (receivedAmount < total) {
      alert('Uang diterima kurang dari total pembayaran!');
      return;
    }

    try {
      const transaction = await createTransaction(pendingData, receivedAmount, changeAmount);

      // Save to localStorage for detail-transaksi.js
      localStorage.setItem('last_transaction', JSON.stringify(transaction));

      // Clear pending transaction
      localStorage.removeItem('pending_transaction');

      // Clear cart
      if (typeof window.getKasirCart === 'function') window.getKasirCart().length = 0;
      if (typeof window.updateKeranjangView === 'function') window.updateKeranjangView();
      else if (typeof updateKeranjangView === 'function') updateKeranjangView();

      // Redirect to detail-transaksi.html
      window.location.href = '../pages/detail-transaksi.html';
    } catch (err) {
      console.error('Error creating transaction:', err);
      alert('Gagal membuat transaksi: ' + (err.message || err));
    }
  });
}

// Inisialisasi saat halaman proses-pembayaran dibuka
document.addEventListener('DOMContentLoaded', async () => {
  const pendingData = loadPendingTransaction();

  if (pendingData) {
    // Render pending transaction info
    renderPendingTransaction(pendingData);

    // Initialize input and bayar events
    inisialisasiInputTunai(pendingData);
    inisialisasiBayar(pendingData);
  } else {
    alert('Data transaksi pending tidak ditemukan!');
    // Redirect back to kasir
    window.location.href = '../pages/kasir.html';
  }
});
