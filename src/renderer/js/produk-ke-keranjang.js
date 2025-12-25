/* =========================
   ====== KERANJANG FRONTEND ======
========================= */
let cart = JSON.parse(localStorage.getItem('pos_cart') || '[]');

function normalizeId(id) {
  if (id === undefined || id === null || isNaN(Number(id))) return null;
  return Number(id);
}

// Update tampilan keranjang
function updateKeranjangView() {
  const itemsContainer = document.getElementById('keranjang-items');
  const emptyView = document.getElementById('keranjang-empty');
  if (!itemsContainer) return;

  // Selalu ambil cart dari localStorage agar sinkron
  cart = JSON.parse(localStorage.getItem('pos_cart') || '[]');

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
    let hargaSetelahDiskon = Number(item.price);
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
      <p>Harga: Rp ${Number(item.price).toLocaleString('id-ID')}</p>
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

// Tambah produk ke cart (frontend) — memastikan normalisasi id & sync localStorage
function addToCartFrontend({
  id, name, price, sku, stock,
  discount_type = null, discount_value = 0,
  buy_qty = 0, free_qty = 0,
  bundle_qty = 0, bundle_value = 0
}) {
  const normId = normalizeId(id);
  if (normId === null) {
    console.warn('addToCartFrontend: invalid id', id);
    return;
  }

  // Selalu sync cart dari localStorage!
  cart = JSON.parse(localStorage.getItem('pos_cart') || '[]');

  // Convert types
  const pPrice = Number(price || 0);
  const pStock = Number(stock || 0);

  let idx = cart.findIndex(item => normalizeId(item.id) === normId);
  if (idx !== -1) {
    // increase quantity but not beyond stock
    const newQty = (cart[idx].quantity || 0) + 1;
    cart[idx].quantity = pStock > 0 ? Math.min(newQty, pStock) : newQty;
  } else {
    cart.push({
      id: normId,
      name: String(name || ''),
      price: pPrice,
      sku: sku || '',
      stock: pStock,
      quantity: 1,
      discount_type,
      discount_value,
      buy_qty,
      free_qty,
      bundle_qty,
      bundle_value
    });
  }
  saveCart();
  if (typeof updateKeranjangView === 'function') updateKeranjangView();
  // optional global toast
  if (window.showToast) window.showToast('Berhasil ditambahkan ke keranjang!', 'success');
}

// Event tombol tambah ke keranjang (ambil discount dari data-attr jika tersedia)
document.addEventListener('click', function (e) {
  const btn = e.target.closest('.btn-add-cart');
  if (!btn) return;
  const id = normalizeId(btn.dataset.id);
  const name = btn.dataset.name;
  const price = Number(btn.dataset.price);
  const sku = btn.dataset.sku;
  const stock = Number(btn.dataset.stock);
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
});

// Event tombol +, -, hapus di cart
document.addEventListener('click', function (e) {
  if (e.target.classList.contains('increase-qty')) {
    const idx = parseInt(e.target.dataset.idx);
    cart = JSON.parse(localStorage.getItem('pos_cart') || '[]');
    if (cart[idx] && cart[idx].quantity < (cart[idx].stock || Infinity)) cart[idx].quantity += 1;
    saveCart();
    updateKeranjangView();
  }
  if (e.target.classList.contains('decrease-qty')) {
    const idx = parseInt(e.target.dataset.idx);
    cart = JSON.parse(localStorage.getItem('pos_cart') || '[]');
    if (cart[idx] && cart[idx].quantity > 1) cart[idx].quantity -= 1;
    saveCart();
    updateKeranjangView();
  }
  if (e.target.classList.contains('remove-item')) {
    const idx = parseInt(e.target.dataset.idx);
    cart = JSON.parse(localStorage.getItem('pos_cart') || '[]');
    cart.splice(idx, 1);
    saveCart();
    updateKeranjangView();
  }
});

// Inisialisasi tampilan keranjang saat load
document.addEventListener('DOMContentLoaded', () => {
  updateKeranjangView();
});

// Ensure barcode handler and kasir call same single source of truth
window.addToKasirCart = function(product) {
  // simple wrapper to reuse addToCartFrontend and keep single cart logic
  addToCartFrontend({
    id: product.id,
    name: product.name,
    price: product.price ?? product.sellPrice ?? product.price,
    sku: product.sku,
    stock: product.stock,
    discount_type: product.discount_type || product.jenis_diskon || null,
    discount_value: product.discount_value ?? product.nilai_diskon ?? 0,
    buy_qty: product.buy_qty ?? 0,
    free_qty: product.free_qty ?? 0,
    bundle_qty: product.bundle_qty ?? product.diskon_bundle_min_qty ?? 0,
    bundle_value: product.bundle_value ?? product.diskon_bundle_value ?? 0
  });
};

// Ensure kasir/getters read from localStorage
window.getKasirCart = function() {
  return JSON.parse(localStorage.getItem('pos_cart') || '[]');
};
