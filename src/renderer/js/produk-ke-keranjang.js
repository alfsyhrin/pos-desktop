/* =========================
   ====== KERANJANG FRONTEND ======
========================= */
let cart = JSON.parse(localStorage.getItem('pos_cart') || '[]');

// Update tampilan keranjang
function updateKeranjangView() {
  const itemsContainer = document.getElementById('keranjang-items');
  const emptyView = document.getElementById('keranjang-empty');
  if (!itemsContainer) return;

  itemsContainer.innerHTML = '';
  if (!cart.length) {
    if (emptyView) emptyView.style.display = 'flex';
    updateSubtotalTotal(0);
    return;
  }
  if (emptyView) emptyView.style.display = 'none';

  let subtotal = 0;
  cart.forEach((item, idx) => {
    let diskonLabel = '';
    let hargaSetelahDiskon = item.price;
    if (item.discount_type && item.discount_value) {
      if (item.discount_type === 'percentage') {
        diskonLabel = `Diskon: ${item.discount_value}%`;
        hargaSetelahDiskon = Math.round(item.price * (1 - item.discount_value / 100));
      } else if (item.discount_type === 'amount' || item.discount_type === 'nominal') {
        diskonLabel = `Diskon: Rp ${Number(item.discount_value).toLocaleString('id-ID')}`;
        hargaSetelahDiskon = Math.max(0, item.price - item.discount_value);
      }
    }
    // Info bundle/buyxgety
    if (item.discount_type === 'buyxgety' && item.buy_qty && item.free_qty) {
      diskonLabel = `Promo: Beli ${item.buy_qty} Gratis ${item.free_qty}`;
    }
    if (item.discount_type === 'bundle' && item.bundle_qty && item.bundle_value) {
      diskonLabel = `Promo: ${item.bundle_qty} pcs Rp ${Number(item.bundle_value).toLocaleString('id-ID')}`;
    }
    const totalItem = hargaSetelahDiskon * item.quantity;
    subtotal += totalItem;

    const el = document.createElement('div');
    el.className = 'keranjang-item';
    el.innerHTML = `
      <h4>${item.name}</h4>
      <p>SKU: ${item.sku}</p>
      <p>Harga: Rp ${item.price.toLocaleString('id-ID')}</p>
      ${diskonLabel ? `<p class="diskon-info">${diskonLabel}</p>` : ''}
      <div class="actions">
        <h4 class="product-total">Rp ${totalItem.toLocaleString('id-ID')}</h4>
        <div class="product-buttons-wrapper">
          <button class="decrease-qty" data-idx="${idx}">-</button>
          <span class="product-qty">${item.quantity}</span>
          <button class="increase-qty" data-idx="${idx}">+</button>
          <button class="remove-item" data-idx="${idx}">✕</button>
        </div>
      </div>
    `;
    itemsContainer.appendChild(el);
  });
  updateSubtotalTotal(subtotal);
}

// Update subtotal dan total
function updateSubtotalTotal(subtotal) {
  const subtotalEl = document.querySelector('.wrap-subtotal p');
  const totalEl = document.querySelector('.wrap-total p');
  if (subtotalEl) subtotalEl.textContent = subtotal.toLocaleString('id-ID');
  if (totalEl) totalEl.textContent = subtotal.toLocaleString('id-ID');
}

// setelah update cart, simpan
function saveCart() {
  localStorage.setItem('pos_cart', JSON.stringify(cart));
}

// Tambah produk ke cart (frontend) — sekarang menyimpan diskon jika ada
function addToCartFrontend({
  id, name, price, sku, stock,
  discount_type = null, discount_value = 0,
  buy_qty = 0, free_qty = 0,
  bundle_qty = 0, bundle_value = 0
}) {
  let idx = cart.findIndex(item => item.id === id);
  if (idx !== -1) {
    if (cart[idx].quantity < stock) cart[idx].quantity += 1;
  } else {
    cart.push({
      id, name, price, sku, stock, quantity: 1,
      discount_type, discount_value,
      buy_qty, free_qty,
      bundle_qty, bundle_value
    });
  }
  saveCart && saveCart();
  updateKeranjangView();
}

// Event tombol tambah ke keranjang (ambil discount dari data-attr jika tersedia)
document.addEventListener('click', function (e) {
  const btn = e.target.closest('.btn-add-cart');
  if (!btn) return;
  const id = parseInt(btn.dataset.id);
  const name = btn.dataset.name;
  const price = parseInt(btn.dataset.price);
  const sku = btn.dataset.sku;
  const stock = parseInt(btn.dataset.stock);
  const discount_type = btn.dataset.discountType || btn.dataset.jenisDiskon || null;
  const discount_value = Number(btn.dataset.discountValue || btn.dataset.nilaiDiskon || 0);
  const buy_qty = Number(btn.dataset.buyQty || 0);
  const free_qty = Number(btn.dataset.freeQty || 0);
  const bundle_qty = Number(btn.dataset.bundleQty || 0);
  const bundle_value = Number(btn.dataset.bundleValue || 0);
  addToCartFrontend({
    id, name, price, sku, stock,
    discount_type, discount_value,
    buy_qty, free_qty,
    bundle_qty, bundle_value
  });
  alert('Berhasil ditambahkan ke keranjang!');
});

// Event tombol +, -, hapus di cart
document.addEventListener('click', function (e) {
  if (e.target.classList.contains('increase-qty')) {
    const idx = parseInt(e.target.dataset.idx);
    if (cart[idx].quantity < cart[idx].stock) cart[idx].quantity += 1;
    saveCart();
    updateKeranjangView();
  }
  if (e.target.classList.contains('decrease-qty')) {
    const idx = parseInt(e.target.dataset.idx);
    if (cart[idx].quantity > 1) cart[idx].quantity -= 1;
    saveCart();
    updateKeranjangView();
  }
  if (e.target.classList.contains('remove-item')) {
    const idx = parseInt(e.target.dataset.idx);
    cart.splice(idx, 1);
    saveCart();
    updateKeranjangView();
  }
});

// Inisialisasi tampilan keranjang saat load
document.addEventListener('DOMContentLoaded', () => {
  updateKeranjangView();
});

// Export cart untuk proses pembayaran
window.getKasirCart = () => cart;
