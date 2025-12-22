// Ambil data cart dari localStorage/frontend
function getCartForPayment() {
  return (typeof window.getKasirCart === 'function') ? window.getKasirCart() : [];
}

// Hitung total, diskon, dan grand total
function hitungTotalPembayaran(cart) {
  let subtotal = 0, totalDiskon = 0;
  cart.forEach(item => {
    let hargaSetelahDiskon = item.price;
    let diskonItem = 0;
    if (item.discount_type && item.discount_value) {
      if (item.discount_type === 'percentage') {
        diskonItem = Math.round(item.price * item.discount_value / 100);
        hargaSetelahDiskon = item.price - diskonItem;
      } else if (item.discount_type === 'amount' || item.discount_type === 'nominal') {
        diskonItem = item.discount_value;
        hargaSetelahDiskon = Math.max(0, item.price - diskonItem);
      }
    }
    // Bundle/buyxgety: diskon dihitung manual jika ingin, atau biarkan backend
    subtotal += hargaSetelahDiskon * item.quantity;
    totalDiskon += diskonItem * item.quantity;
  });
  return { subtotal, totalDiskon, grandTotal: subtotal };
}

// Render info pembayaran di proses-pembayaran.html
function renderInfoPembayaran() {
  const cart = getCartForPayment();
  const { subtotal, totalDiskon, grandTotal } = hitungTotalPembayaran(cart);

  // Update tampilan total, diskon, grand total
  const totalEl = document.querySelector('.card-total-pembayaran h4:nth-child(2)');
  if (totalEl) totalEl.textContent = `Rp ${subtotal.toLocaleString('id-ID')}`;

  // Kembalian default
  const kembalianEl = document.querySelectorAll('.card-total-pembayaran h4')[3];
  if (kembalianEl) kembalianEl.textContent = `Rp 0`;
}

// Event input uang diterima
function inisialisasiInputTunai() {
  const inputTunai = document.querySelector('.card-tunai-diterima-pembayaran input[type="number"]');
  if (!inputTunai) return;
  inputTunai.addEventListener('input', function () {
    const cart = getCartForPayment();
    const { grandTotal } = hitungTotalPembayaran(cart);
    const uangDiterima = Number(this.value || 0);
    const kembalian = uangDiterima - grandTotal;
    const kembalianEl = document.querySelectorAll('.card-total-pembayaran h4')[3];
    if (kembalianEl) kembalianEl.textContent = `Rp ${Math.max(0, kembalian).toLocaleString('id-ID')}`;
  });
}

// Event tombol Bayar
function inisialisasiBayar() {
  const bayarBtn = document.querySelector('.wrap-button-proses-pembayaran a');
  if (!bayarBtn) return;
  bayarBtn.addEventListener('click', async function (e) {
    e.preventDefault();
    const cart = getCartForPayment();
    const { grandTotal } = hitungTotalPembayaran(cart);
    const inputTunai = document.querySelector('.card-tunai-diterima-pembayaran input[type="number"]');
    const uangDiterima = Number(inputTunai?.value || 0);
    const kembalian = uangDiterima - grandTotal;

    // Validasi
    if (!cart.length) return alert('Keranjang kosong!');
    if (uangDiterima < grandTotal) return alert('Uang diterima kurang dari total belanja!');

    // Siapkan payload transaksi
    const storeId = localStorage.getItem('store_id');
    const token = localStorage.getItem('token');
    const userId = localStorage.getItem('user_id') || 1;
    const items = cart.map(item => ({
      product_id: item.id,
      quantity: item.quantity,
      price: item.price,
      discount_type: item.discount_type || null,
      discount_value: item.discount_value || 0,
      buy_qty: item.buy_qty || 0,
      free_qty: item.free_qty || 0,
      bundle_qty: item.bundle_qty || 0,
      bundle_value: item.bundle_value || 0
    }));

    const body = {
      user_id: userId,
      total_cost: grandTotal,
      payment_type: "tunai",
      payment_method: "cash",
      received_amount: uangDiterima,
      change_amount: kembalian,
      items
    };

    // Kirim transaksi ke backend
    try {
      const res = await fetch(`http://103.126.116.119:5000/api/stores/${storeId}/transactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (res.ok && data.success) {
        // Simpan data transaksi ke localStorage untuk detail-transaksi.html
        localStorage.setItem('last_transaction', JSON.stringify(data.data));
        // Kosongkan cart
        if (typeof window.getKasirCart === 'function') window.getKasirCart().length = 0;
        localStorage.removeItem('pos_cart');
        // Redirect ke detail transaksi
        window.location.href = 'detail-transaksi.html';
      } else {
        alert('Gagal transaksi: ' + (data.message || res.status));
      }
    } catch (err) {
      alert('Gagal transaksi: ' + (err.message || err));
    }
  });
}

// Inisialisasi saat halaman proses-pembayaran dibuka
document.addEventListener('DOMContentLoaded', () => {
  renderInfoPembayaran();
  inisialisasiInputTunai();
  inisialisasiBayar();
});