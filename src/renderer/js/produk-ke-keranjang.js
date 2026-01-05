// Function to apply Buy X Get Y logic
function applyBuyXGetY(item) {
  if (item.discount_type !== 'buyxgety') {
    return item; // Skip BuyXGetY logic for products that don't have this discount
  }

  const buyQty = Number(item.buy_qty || 0);
  const freeQty = Number(item.free_qty || 0);
  const beli = Number(item.buy_quantity || item.quantity || 0);

  if (buyQty <= 0 || freeQty <= 0) {
    return item;
  }

  const bonus = Math.floor(beli / buyQty) * freeQty;
  item.bonus_quantity = bonus;
  item.quantity = beli + bonus; // Total quantity = beli + bonus

  return item;
}

let cart = JSON.parse(localStorage.getItem('pos_cart') || '[]');

// Normalize product id
function normalizeId(id) {
  if (id === undefined || id === null || isNaN(Number(id))) return null;
  return Number(id);
}

// Update the cart view
function updateKeranjangView() {
  const itemsContainer = document.getElementById('keranjang-items');
  const emptyView = document.getElementById('keranjang-empty');
  if (!itemsContainer) return;

  // Always sync the cart from localStorage
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

    // Applying discount logic
    if (item.discount_type && item.discount_value) {
      if (item.discount_type === 'percentage') {
        diskonLabel = `Diskon: ${item.discount_value}%`;
        hargaSetelahDiskon = Math.round(item.price * (1 - item.discount_value / 100));
      } else if (item.discount_type === 'amount' || item.discount_type === 'nominal') {
        diskonLabel = `Diskon: Rp ${Number(item.discount_value).toLocaleString('id-ID')}`;
        hargaSetelahDiskon = Math.max(0, item.price - item.discount_value);
      }
    }

    // Info promo bundle/buyxgety
    if (item.discount_type === 'buyxgety' && item.buy_qty && item.free_qty) {
      diskonLabel = `Promo: Beli ${item.buy_qty} Gratis ${item.free_qty}`;
    }
    if (item.discount_type === 'bundle' && item.bundle_qty && item.bundle_value) {
      diskonLabel = `Promo: ${item.bundle_qty} pcs Rp ${Number(item.bundle_value).toLocaleString('id-ID')}`;
    }

    // Calculate total price for the item
    // For products with buyxgety, use buy_quantity for calculation (not quantity which includes free items)
    const bayarQty = item.discount_type === 'buyxgety' ? 
      Number(item.buy_quantity || 0) : 
      Number(item.quantity || 0);
    
    const totalItem = hargaSetelahDiskon * bayarQty;
    subtotal += totalItem;

    const el = document.createElement('div');
    el.className = 'keranjang-item';
    el.innerHTML = `
      <h4>${item.name}</h4>
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

// Update subtotal and total
function updateSubtotalTotal(subtotal) {
  const subtotalEl = document.querySelector('.wrap-subtotal p');
  const totalEl = document.querySelector('.wrap-total p');
  if (subtotalEl) subtotalEl.textContent = subtotal.toLocaleString('id-ID');
  if (totalEl) totalEl.textContent = subtotal.toLocaleString('id-ID');
}

// Save cart to localStorage
function saveCart() {
  localStorage.setItem('pos_cart', JSON.stringify(cart));
}

// Add product to cart
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

  // Always sync cart from localStorage
  cart = JSON.parse(localStorage.getItem('pos_cart') || '[]');

  // Convert types
  const pPrice = Number(price || 0);
  const pStock = Number(stock || 0);

  let idx = cart.findIndex(item => normalizeId(item.id) === normId);
  if (idx !== -1) {
    // For products without buyxgety discount, increase quantity normally
    if (cart[idx].discount_type !== 'buyxgety') {
      cart[idx].quantity = (cart[idx].quantity || 0) + 1;
    }
    // For all products, increase buy_quantity (quantity to pay for)
    cart[idx].buy_quantity = (cart[idx].buy_quantity || 0) + 1;
    applyBuyXGetY(cart[idx]); // Apply BuyXGetY if applicable
  } else {
    const item = {
      id: normId,
      name: String(name || ''),
      price: pPrice,
      sku: sku || '',
      stock: pStock,
      buy_quantity: 1,
      bonus_quantity: 0,
      // For non-buyxgety products, quantity starts at 1
      // For buyxgety products, quantity will be updated by applyBuyXGetY
      quantity: discount_type === 'buyxgety' ? 1 : 1,
      discount_type,
      discount_value,
      buy_qty,
      free_qty,
      bundle_qty,
      bundle_value
    };
    applyBuyXGetY(item);
    cart.push(item);
  }

  saveCart();
  if (typeof updateKeranjangView === 'function') updateKeranjangView();
  // optional global toast
  if (window.showToast) window.showToast('Berhasil ditambahkan ke keranjang!', 'success');
}

// Event listener for increase/decrease quantity buttons in cart
document.addEventListener('click', function (e) {
  // Handle increase quantity
  if (e.target.classList.contains('increase-qty')) {
    const idx = parseInt(e.target.dataset.idx);
    cart = JSON.parse(localStorage.getItem('pos_cart') || '[]');

    if (cart[idx]) {
      // For products without buyxgety discount, increase quantity normally
      if (cart[idx].discount_type !== 'buyxgety') {
        cart[idx].quantity = (cart[idx].quantity || 0) + 1;
      }
      
      // Always increase buy_quantity (quantity to pay for)
      cart[idx].buy_quantity = (cart[idx].buy_quantity || 0) + 1;
      
      // Apply BuyXGetY logic if applicable
      applyBuyXGetY(cart[idx]);
    }

    saveCart();
    updateKeranjangView(); // Update cart view
  }

  // Handle decrease quantity
  if (e.target.classList.contains('decrease-qty')) {
    const idx = parseInt(e.target.dataset.idx);
    cart = JSON.parse(localStorage.getItem('pos_cart') || '[]');

    if (cart[idx] && cart[idx].buy_quantity > 1) {
      // For products without buyxgety discount, decrease quantity normally
      if (cart[idx].discount_type !== 'buyxgety') {
        cart[idx].quantity = Math.max(1, (cart[idx].quantity || 0) - 1);
      }
      
      // Decrease buy_quantity (quantity to pay for)
      cart[idx].buy_quantity -= 1;
      
      // Apply BuyXGetY logic if applicable
      applyBuyXGetY(cart[idx]);
    }

    saveCart();
    updateKeranjangView(); // Update cart view
  }

  // Handle remove item
  if (e.target.classList.contains('remove-item')) {
    const idx = parseInt(e.target.dataset.idx);
    cart = JSON.parse(localStorage.getItem('pos_cart') || '[]');
    cart.splice(idx, 1); // Remove product from cart
    saveCart();
    updateKeranjangView(); // Update cart view
  }
});

// Initialize the cart view on page load
document.addEventListener('DOMContentLoaded', function() {
  updateKeranjangView();
});