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

// Ambil data store untuk mendapatkan tax_percentage
async function fetchStoreTaxPercentage(storeId) {
  const token = localStorage.getItem('token');
  if (!storeId || !token) return 10; // fallback default 10%

  try {
    const res = await fetch(`http://103.126.116.119:8001/api/stores/${storeId}`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    const data = await res.json();
    if (data.success && data.data && data.data.tax_percentage) {
      return Number(data.data.tax_percentage) || 10;
    }
    return 10;
  } catch (err) {
    console.error('Error fetching store tax percentage:', err);
    return 10; // default
  }
}

function calculateBuyXGetY(buyCount, buyQty, freeQty) {
  if (!buyQty || !freeQty || buyCount < buyQty) return 0;
  return Math.floor(buyCount / buyQty) * freeQty;
}


// Render pending transaction info in proses-pembayaran.html
function renderPendingTransaction(pendingData) {
  if (!pendingData || !Array.isArray(pendingData.cart)) return;

  let grossSubtotal = 0;
  let discountTotal = 0;

  pendingData.cart.forEach(item => {
    const harga = Number(item.price || 0);
    const qty = Number(item.quantity || 0);

    let buyQty = qty;
    let bonusQty = 0;
    let discountAmount = 0;

    // === BUY X GET Y ===
    if (
      item.discount_type === 'buyxgety' &&
      Number(item.buy_qty) > 0 &&
      Number(item.free_qty) > 0
    ) {
      const group = item.buy_qty + item.free_qty;
      const promoCount = Math.floor(qty / group);
      bonusQty = promoCount * item.free_qty;
      buyQty = qty - bonusQty;
      discountAmount = bonusQty * harga;
    }

    // === DISKON PERSENTASE ===
    else if (item.discount_type === 'percentage') {
      discountAmount = harga * qty * (item.discount_value / 100);
    }

    // === DISKON NOMINAL ===
    else if (item.discount_type === 'nominal') {
      discountAmount = Math.min(harga * qty, item.discount_value);
    }

    const grossItem = harga * qty;
    grossSubtotal += grossItem;
    discountTotal += discountAmount;

    item._buyQty = buyQty;
    item._bonusQty = bonusQty;
    item._discountAmount = discountAmount;
  });

  const netSubtotal = grossSubtotal - discountTotal;
  const taxPercentage = Number(pendingData.tax_percentage || 10);
  const tax = netSubtotal * (taxPercentage / 100);
  const grandTotal = netSubtotal + tax;

  document.getElementById('subtotal-pembayaran').textContent =
    `Rp ${grossSubtotal.toLocaleString('id-ID')}`;
  document.getElementById('diskon-pembayaran').textContent =
    `Rp ${discountTotal.toLocaleString('id-ID')}`;
  document.getElementById('pajak-pembayaran').textContent =
    `Rp ${tax.toLocaleString('id-ID')} (${taxPercentage}%)`;
  document.getElementById('total-pembayaran').textContent =
    `Rp ${grandTotal.toLocaleString('id-ID')}`;

  pendingData._grossSubtotal = grossSubtotal;
  pendingData._discountTotal = discountTotal;
  pendingData._netSubtotal = netSubtotal;
  pendingData._tax = tax;
  pendingData._grandTotal = grandTotal;

  localStorage.setItem('pending_transaction', JSON.stringify(pendingData));
}



// Format number to Rupiah currency
function formatRupiah(angka) {
  return angka.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

// Unformat Rupiah currency to number
function unformatRupiah(str) {
  return Number(String(str).replace(/\./g, '').replace(/[^0-9]/g, '')) || 0;
}

// Event input uang diterima - calculate kembalian
function inisialisasiInputTunai(pendingData) {
  const inputTunai = document.querySelector('.card-tunai-diterima-pembayaran input[type="number"]');
  const kembalianEl = document.querySelectorAll('.card-total-pembayaran h4')[3];
  const taxPercentage = pendingData.tax_percentage || 10; // atau ambil dari store
const subtotal = pendingData._grandTotal || 0;
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
  const kembalianCard = Array.from(document.querySelectorAll('.card-total-pembayaran'))
    .find(card => card.textContent.toUpperCase().includes('KEMBALIAN'));
  const kembalianEl = kembalianCard ? kembalianCard.querySelector('h4[style]') : null;
  const total = pendingData._grandTotal || 0;

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

const items = pendingData.cart.map(item => {
  const obj = {
    product_id: Number(item.id),
    quantity: Number(item.quantity || 0), // TOTAL keluar
    notes: item.notes || ""
  };

  if (
    item.discount_type === 'buyxgety' &&
    Number(item.buy_qty) > 0 &&
    Number(item.free_qty) > 0
  ) {
    obj.discount_type = 'buyxgety';
    obj.buy_qty = Number(item.buy_qty);
    obj.free_qty = Number(item.free_qty);
    obj.discount_value = 0;
  }

  else if (item.discount_type === 'percentage') {
    obj.discount_type = 'percentage';
    obj.discount_value = Number(item.discount_value || 0);
  }

  else if (item.discount_type === 'nominal') {
    obj.discount_type = 'nominal';
    obj.discount_value = Number(item.discount_value || 0);
  }

  return obj;
});



  const body = {
    payment_type: "cash",
    payment_method: "cash",
    received_amount: Number(receivedAmount),
    items
  };

  console.info('[CREATE TRANSACTION PAYLOAD]', body);

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
  try { data = JSON.parse(text); } catch { data = { raw: text }; }

  if (res.ok && data?.success) {
    return data.data;
  }

  throw new Error(data?.message || `HTTP ${res.status}`);
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
    const total = pendingData._grandTotal || 0;
    const changeAmount = Math.max(0, receivedAmount - total);

    if (receivedAmount < total) {
      showToast('Nominal pembayaran kurang. Silakan masukkan jumlah yang cukup.', 'warn');
      return;
    }

    try {
      const transaction = await createTransaction(pendingData, receivedAmount);

      // Save to localStorage for detail-transaksi.js
      // Ambil nilai yang sudah dihitung di pendingData
      const trxToSave = {
        ...transaction,
        _grossSubtotal: pendingData._grossSubtotal || 0,
        _discountTotal: pendingData._discountTotal || 0,
        _netSubtotal: pendingData._netSubtotal || 0,
        _tax: pendingData._tax || 0,
        _grandTotal: pendingData._grandTotal || 0,
        tax_percentage: pendingData.tax_percentage || 10,
        received: receivedAmount,
        change: Math.max(0, receivedAmount - (pendingData._grandTotal || 0))
      };

      localStorage.setItem('last_transaction', JSON.stringify(trxToSave));

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
  const inputTunai = document.querySelector('.card-tunai-diterima-pembayaran input');
  const total = pendingData._grandTotal || 0;

  pecahanBtns.forEach(btn => {
    btn.addEventListener('click', function() {
      let val = btn.textContent.replace(/\D/g, '');
      if (btn.textContent.toLowerCase().includes('uang pas')) {
        val = total;
      }
      if (inputTunai) {
        inputTunai.value = val ? formatRupiah(val) : '';
        inputTunai.dispatchEvent(new Event('input'));
      }
    });
  });
}

// Render list item pembayaran
// Render list item pembayaran dengan diskon jelas
function renderListItemPembayaran(cart) {
  const listEl = document.getElementById('list-item-pembayaran');
  if (!listEl) return;

  listEl.innerHTML = '';

  cart.forEach(item => {
    const harga = Number(item.price || 0);

    if (item.discount_type === 'buyxgety') {
      listEl.innerHTML += `
        <div style="margin-bottom:10px;">
          <b>${item.name}</b>
          <div>${formatRupiah(harga)} x ${item._buyQty}</div>
          <div style="color:#10b981;">Bonus ${item._bonusQty}</div>
          <div style="font-size:12px;color:#aaa;">
            Total keluar: ${item.quantity}
          </div>
        </div>
      `;
      return;
    }

    let diskon = '';
    if (item.discount_type === 'percentage') {
      diskon = `Diskon ${item.discount_value}%`;
    } else if (item.discount_type === 'nominal') {
      diskon = `Diskon Rp ${item.discount_value.toLocaleString('id-ID')}`;
    }

    listEl.innerHTML += `
      <div style="margin-bottom:10px;">
        <b>${item.name}</b>
        <div>${formatRupiah(harga)} x ${item.quantity}</div>
        ${diskon ? `<div style="color:#f59e42;font-size:13px;">${diskon}</div>` : ''}
      </div>
    `;
  });
}


// Inisialisasi saat halaman proses-pembayaran dibuka
document.addEventListener('DOMContentLoaded', async () => {
  const pendingData = loadPendingTransaction();

  if (pendingData) {

    // Ambil tax_percentage dari API store
    const taxPercentage = await fetchStoreTaxPercentage(pendingData.storeId);
    pendingData.tax_percentage = taxPercentage; // simpan di pendingData
    // Render pending transaction info
    renderPendingTransaction(pendingData);
    renderListItemPembayaran(pendingData.cart); // Render list item pembayaran

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
