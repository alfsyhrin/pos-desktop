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

// Format number to Rupiah currency
function formatRupiah(angka) {
  return angka.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

// Unformat Rupiah currency to number
function unformatRupiah(str) {
  return Number(str.replace(/\./g, ''));
}

// Event input uang diterima - calculate kembalian
function inisialisasiInputTunai(pendingData) {
  const inputTunai = document.querySelector('.card-tunai-diterima-pembayaran input[type="number"]');
  const kembalianEl = document.querySelectorAll('.card-total-pembayaran h4')[3];
  const taxPercentage = pendingData.tax_percentage || 10; // atau ambil dari store
const subtotal = pendingData.total_cost || 0;
const tax = subtotal * (taxPercentage / 100);
const totalFinal = subtotal + tax;


  if (inputTunai && kembalianEl) {
    inputTunai.addEventListener('input', function () {
      const received = Number(this.value) || 0;
      const change = Math.max(0, received - totalFinal);
      kembalianEl.textContent = `Rp ${change.toLocaleString('id-ID')}`;
    });
  }
}

// Format input tunai to Rupiah and calculate kembalian
function inisialisasiInputTunaiFormat(pendingData) {
  const inputTunai = document.querySelector('.card-tunai-diterima-pembayaran input');
  // Ambil elemen kembalian yang labelnya "KEMBALIAN"
  const kembalianCard = Array.from(document.querySelectorAll('.card-total-pembayaran'))
    .find(card => card.textContent.toUpperCase().includes('KEMBALIAN'));
  const kembalianEl = kembalianCard ? kembalianCard.querySelector('h4[style]') : null;
  const total = pendingData.total_cost || 0;

  if (inputTunai && kembalianEl) {
    inputTunai.type = "text";
    inputTunai.addEventListener('input', function(e) {
      let val = this.value.replace(/\D/g, '');
      if (!val) {
        this.value = '';
        kembalianEl.textContent = `Rp 0`;
        return;
      }
      this.value = formatRupiah(val);
      const received = unformatRupiah(this.value);
      const change = Math.max(0, received - total);
      kembalianEl.textContent = `Rp ${change.toLocaleString('id-ID')}`;
    });
    // Set default value
    inputTunai.value = formatRupiah(total);
    // Trigger event untuk update kembalian awal
    inputTunai.dispatchEvent(new Event('input'));
  }
}

// Create transaction via API
async function createTransaction(pendingData, receivedAmount) {
  const storeId = pendingData.storeId;
  const token = localStorage.getItem('token');
  if (!storeId || !token) {
    throw new Error('Missing storeId or token');
  }

  const items = pendingData.cart.map(item => ({
    product_id: item.id,
    quantity: item.quantity,
    discount_type: item.discount_type || null,
    discount_value: item.discount_value || 0,
    notes: item.notes || ""
  }));

  const body = {
    // user_id: Number(pendingData.userId),
    payment_type: "cash",
    payment_method: "cash",
    received_amount: receivedAmount,
    items
  };

  console.info('[proses-pembayaran] create transaction payload', body);

  const res = await fetch(
    `http://103.126.116.119:8001/api/stores/${storeId}/transactions`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(body)
    }
  );

  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text };
  }

  if (res.ok && data?.success) {
    return data.data;
  } else {
    throw new Error(data?.message || 'Gagal membuat transaksi');
  }
}


// Event tombol Bayar - create transaction and redirect to detail-transaksi.html
function inisialisasiBayar(pendingData) {
  const bayarBtn = document.querySelector('.wrap-button-proses-pembayaran a');
  if (!bayarBtn) return;

  bayarBtn.addEventListener('click', async function (e) {
    e.preventDefault();

    // Ambil input sebagai string, lalu unformat
    const inputTunai = document.querySelector('.card-tunai-diterima-pembayaran input');
    const receivedAmount = unformatRupiah(inputTunai?.value) || 0;
    const total = pendingData.total_cost || 0;
    const changeAmount = Math.max(0, receivedAmount - total);

    if (receivedAmount < total) {
      showToast('Nominal pembayaran kurang. Silakan masukkan jumlah yang cukup.', 'warn');
      return;
    }

    try {
      const transaction = await createTransaction(pendingData, receivedAmount);

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
      showToast('Gagal membuat transaksi: ' + (err.message || err), 'error');
    }
  });
}

// Event pecahan uang button - set input tunai value
function inisialisasiPecahanUang(pendingData) {
  const pecahanBtns = document.querySelectorAll('.wrapper-pecahan-uang-pembayaran button');
  // Perbaikan: selector input type text
  const inputTunai = document.querySelector('.card-tunai-diterima-pembayaran input');
  const total = pendingData.total_cost || 0;

  pecahanBtns.forEach(btn => {
    btn.addEventListener('click', function() {
      let val = btn.textContent.replace(/\D/g, '');
      if (btn.textContent.toLowerCase().includes('uang pas')) {
        val = total;
      }
      if (inputTunai) {
        // Perbaikan: format langsung ke input
        inputTunai.value = val ? formatRupiah(val) : '';
        inputTunai.dispatchEvent(new Event('input'));
      }
    });
  });
}

// Inisialisasi saat halaman proses-pembayaran dibuka
document.addEventListener('DOMContentLoaded', async () => {
  const pendingData = loadPendingTransaction();

  if (pendingData) {
    // Render pending transaction info
    renderPendingTransaction(pendingData);

    // Initialize input and bayar events
    inisialisasiInputTunaiFormat(pendingData); // Ganti
    inisialisasiBayar(pendingData);
    inisialisasiPecahanUang(pendingData);
  } else {
    alert('Data transaksi pending tidak ditemukan!');
    // Redirect back to kasir
    window.location.href = '../pages/kasir.html';
  }
});
