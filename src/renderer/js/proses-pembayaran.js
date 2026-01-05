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


// Render pending transaction info in proses-pembayaran.html
async function renderPendingTransaction(pendingData) {
  if (!pendingData) return;

  let grossSubtotal = 0, discountTotal = 0;
  (pendingData.cart || []).forEach(item => {
    let harga = Number(item.price || 0);
    let qty = Number(item.quantity || 0);
    let discountAmount = 0;

    if (item.discount_type === 'percentage' && item.discount_value > 0) {
      discountAmount = harga * qty * (item.discount_value / 100);
    } else if (item.discount_type === 'nominal' && item.discount_value > 0) {
      discountAmount = Math.min(item.discount_value, harga * qty);
    } else if (item.discount_type === 'buyxgety' && item.buy_qty > 0 && item.free_qty > 0) {
      const x = Number(item.buy_qty);
      const y = Number(item.free_qty);
      const totalQty = qty;
      const groupQty = x + y;
      const paidQty = Math.floor(totalQty / groupQty) * x + (totalQty % groupQty);
      discountAmount = (totalQty - paidQty) * harga;
    }

    const netSubtotalItem = harga * qty - discountAmount;
    grossSubtotal += harga * qty;
    discountTotal += discountAmount;

    item._subtotal = netSubtotalItem;
    item._discountAmount = discountAmount;
  });

  const netSubtotal = grossSubtotal - discountTotal;
  const taxPercentage = Number(pendingData.tax_percentage || 10);
  const tax = netSubtotal * (taxPercentage / 100);
  const grandTotal = netSubtotal + tax;

  document.getElementById('subtotal-pembayaran').textContent = `Rp ${grossSubtotal.toLocaleString('id-ID')}`;
  document.getElementById('diskon-pembayaran').textContent = `Rp ${discountTotal.toLocaleString('id-ID')}`;
  document.getElementById('pajak-pembayaran').textContent = `Rp ${tax.toLocaleString('id-ID')} (${taxPercentage}%)`;
  document.getElementById('total-pembayaran').textContent = `Rp ${grandTotal.toLocaleString('id-ID')}`;

  const inputTunai = document.querySelector('.card-tunai-diterima-pembayaran input');
  if (inputTunai) {
    inputTunai.value = grandTotal.toLocaleString('id-ID');
    inputTunai.disabled = false;
  }

  pendingData._grossSubtotal = grossSubtotal;
  pendingData._discountTotal = discountTotal;
  pendingData._netSubtotal = netSubtotal;
  pendingData._tax = tax;
  pendingData._grandTotal = grandTotal;

  renderListItemPembayaran(pendingData.cart || []);
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
const subtotal = pendingData._grandTotalt || 0;
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
    const qty = Number(item.quantity || 0);
    const obj = {
      product_id: Number(item.id),
      quantity: qty,
      notes: item.notes || ""
    };

    if (item.discount_type === 'buyxgety' && item.buy_qty > 0 && item.free_qty > 0) {
      obj.discount_type = 'buyxgety';
      obj.buy_qty = Number(item.buy_qty);
      obj.free_qty = Number(item.free_qty);
      obj.discount_value = 0;
    } 
    else if (item.discount_type === 'percentage' && item.discount_value > 0) {
      obj.discount_type = 'percentage';
      obj.discount_value = Number(item.discount_value);
    } 
    else if (item.discount_type === 'nominal' && item.discount_value > 0) {
      obj.discount_type = 'nominal';
      obj.discount_value = Number(item.discount_value);
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
// Event tombol Bayar - create transaction and redirect to detail-transaksi.html
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

      // ======================= DEBUG =======================
      console.log('🔍 DEBUG pendingData sebelum save:', {
        tax_percentage: pendingData.tax_percentage,
        _tax: pendingData._tax,
        _grandTotal: pendingData._grandTotal,
        cartLength: pendingData.cart?.length
      });
      
      console.log('🔍 DEBUG transaction dari API:', {
        tax_percentage: transaction.tax_percentage,
        tax: transaction.tax,
        grandTotal: transaction.grandTotal
      });
      // ======================= END DEBUG =======================

      // SIMPAN DENGAN CARA YANG LEBIH AMAN:
      // JANGAN gunakan spread operator untuk field yang penting
      const trxToSave = {
        // Data penting dari API
        id: transaction.id,
        transaction_id: transaction.transaction_id,
        idFull: transaction.idFull,
        idShort: transaction.idShort,
        createdAt: transaction.createdAt,
        storeData: transaction.storeData,
        
        // SEMUA DATA PERHITUNGAN HARUS dari pendingData (LOKAL)
        storeId: pendingData.storeId,
        userId: pendingData.userId,
        
        // TAX PERCENTAGE - PASTIKAN DARI pendingData
        tax_percentage: pendingData.tax_percentage || 10,
        taxPercentage: pendingData.tax_percentage || 10,
        
        // DATA PERHITUNGAN LOKAL
        _grossSubtotal: pendingData._grossSubtotal || 0,
        _discountTotal: pendingData._discountTotal || 0,
        _netSubtotal: pendingData._netSubtotal || 0,
        _tax: pendingData._tax || 0,
        _grandTotal: pendingData._grandTotal || 0,
        
        // Untuk kompatibilitas (non-underscore fields)
        grossSubtotal: pendingData._grossSubtotal || 0,
        netSubtotal: pendingData._netSubtotal || 0,
        tax: pendingData._tax || 0,
        grandTotal: pendingData._grandTotal || 0,
        discountTotal: pendingData._discountTotal || 0,
        
        // Data pembayaran
        received: receivedAmount,
        change: changeAmount,
        received_amount: receivedAmount.toFixed(2),
        change_amount: changeAmount.toFixed(2),
        payment_method: "cash",
        method: "cash",
        
        // Cart items - SIMPAN LENGKAP dengan field perhitungan
        cart: pendingData.cart ? pendingData.cart.map(item => {
          const mappedItem = {
            id: item.id,
            name: item.name,
            price: item.price,
            sku: item.sku,
            stock: item.stock,
            quantity: item.quantity || item.buy_quantity || 1,
            buy_quantity: item.buy_quantity || item.quantity || 1,
            bonus_quantity: item.bonus_quantity || 0,
            
            // Field diskon
            discount_type: item.discount_type,
            discount_value: item.discount_value || 0,
            buy_qty: item.buy_qty,
            free_qty: item.free_qty,
            
            // Field perhitungan dari renderPendingTransaction
            _buyQty: item._buyQty,
            _bonusQty: item._bonusQty,
            _discountAmount: item._discountAmount,
            _grossItem: item._grossItem
          };
          
          console.log('📦 Cart item mapped:', {
            name: mappedItem.name,
            _buyQty: mappedItem._buyQty,
            _bonusQty: mappedItem._bonusQty,
            _discountAmount: mappedItem._discountAmount
          });
          
          return mappedItem;
        }) : [],
        
        // Items untuk kompatibilitas API structure
        items: pendingData.cart ? pendingData.cart.map(item => ({
          product_id: item.id,
          name: item.name,
          price: item.price,
          sku: item.sku,
          quantity: item.quantity || item.buy_quantity || 1,
          discount_type: item.discount_type,
          discount_value: item.discount_value || 0,
          buy_qty: item.buy_qty,
          free_qty: item.free_qty,
          _buyQty: item._buyQty,
          _bonusQty: item._bonusQty,
          _discountAmount: item._discountAmount
        })) : []
      };

      // ======================= DEBUG SETELAH MAPPING =======================
      console.log('💾 Data yang akan disimpan ke last_transaction:', {
        tax_percentage: trxToSave.tax_percentage,
        taxPercentage: trxToSave.taxPercentage,
        _tax: trxToSave._tax,
        _grandTotal: trxToSave._grandTotal,
        received: trxToSave.received,
        change: trxToSave.change,
        cartLength: trxToSave.cart?.length,
        itemsLength: trxToSave.items?.length
      });
      
      // Simpan juga ke console untuk inspeksi manual
      console.log('📋 FULL trxToSave:', JSON.stringify(trxToSave, null, 2));
      // ======================= END DEBUG =======================

      localStorage.setItem('last_transaction', JSON.stringify(trxToSave));
      
      // VERIFIKASI: Baca kembali dari localStorage
      const savedData = JSON.parse(localStorage.getItem('last_transaction'));
      console.log('✅ Data yang tersimpan di localStorage:', {
        tax_percentage: savedData?.tax_percentage,
        _tax: savedData?._tax,
        success: savedData?.tax_percentage === pendingData.tax_percentage
      });

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
    let harga = Number(item.price || 0);
    let qty = Number(item.quantity || 0);
    let bonusQty = 0;
    let diskonText = '';

    // Hitung bonus untuk buyxgety
    if (item.discount_type === 'buyxgety' && item.buy_qty > 0 && item.free_qty > 0) {
      const totalQty = Number(item.quantity || 0);
      const x = Number(item.buy_qty);
      const y = Number(item.free_qty);
      const groupQty = x + y;
      const paidQty = Math.floor(totalQty / groupQty) * x + (totalQty % groupQty);
      bonusQty = totalQty - paidQty;
      diskonText = `Buy ${x} Get ${y}`;
    } else if (item.discount_type === 'percentage' && item.discount_value > 0) {
      diskonText = `Diskon ${item.discount_value}%`;
    } else if (item.discount_type === 'nominal' && item.discount_value > 0) {
      diskonText = `Diskon Rp ${Number(item.discount_value).toLocaleString('id-ID')}`;
    }

    listEl.innerHTML += `
      <div style="margin-bottom:10px;">
        <div><b>${item.name || '-'}</b></div>
        <div>${formatRupiah(harga)} x ${qty}</div>
        ${bonusQty > 0 ? `<div style="color:#10b981;">Bonus : ${bonusQty}</div>` : ''}
        ${diskonText ? `<div style="color:#f59e42;font-size:13px;">${diskonText}</div>` : ''}
        <div style="color:#aaa;font-size:13px;">SKU: ${item.sku || '-'}</div>
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
