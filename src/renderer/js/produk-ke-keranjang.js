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

// TAMBAH: Function untuk kalkulasi diskon bundle
function applyBundleDiscount(item) {
  if (!item.diskon_bundle_min_qty || !item.diskon_bundle_value) {
    return 0; // Tidak ada bundle
  }

  const qty = Number(item.quantity || 0);
  const minQty = Number(item.diskon_bundle_min_qty || 0);
  const bundlePrice = Number(item.diskon_bundle_value || 0);

  if (qty < minQty) {
    return 0; // Qty belum mencapai min, tidak apply bundle
  }

  // Hitung berapa bundle tier yang applicable
  const bundleCount = Math.floor(qty / minQty);
  const remainingQty = qty % minQty;
  
  // Total harga dengan bundle
  const bundleTotal = bundleCount * bundlePrice + (remainingQty * item.price);
  const normalTotal = qty * item.price;
  
  // Diskon = selisih harga normal vs bundle
  const discount = normalTotal - bundleTotal;
  
  item.bundle_discount = discount;
  item.applied_bundle = true;
  
  return discount;
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
    const qty = Number(item.quantity || 0);
    const price = Number(item.price || 0);
    
    // Hitung diskon sesuai priority
    let diskonLabel = '';
    let hargaSetelahDiskon = price;
    let totalDiskon = 0;

    // Priority 1: BUNDLE
    if (item.diskon_bundle_min_qty && item.diskon_bundle_value) {
      totalDiskon = applyBundleDiscount(item);
      if (totalDiskon > 0) {
        diskonLabel = `Promo Bundle: Rp ${Number(totalDiskon).toLocaleString('id-ID')}`;
      }
    }
    // Priority 2: BUY X GET Y
    else if (item.discount_type === 'buyxgety') {
      applyBuyXGetY(item);
      diskonLabel = `Promo: Beli ${item.buy_qty} Gratis ${item.free_qty}`;
    }
    // Priority 3: PERCENTAGE
    else if (item.discount_type === 'percentage') {
      diskonLabel = `Diskon: ${item.discount_value}%`;
      totalDiskon = price * qty * (item.discount_value / 100);
      hargaSetelahDiskon = price * (1 - item.discount_value / 100);
    }
    // Priority 4: NOMINAL
    else if (item.discount_type === 'nominal') {
      diskonLabel = `Diskon: Rp ${Number(item.discount_value).toLocaleString('id-ID')}`;
      totalDiskon = Math.min(item.discount_value, price * qty);
      hargaSetelahDiskon = price - (totalDiskon / qty);
    }

    const totalItem = (price * qty) - totalDiskon;
    subtotal += totalItem;

    const el = document.createElement('div');
    el.className = 'keranjang-item';
    el.innerHTML = `
      <h4>${item.name}</h4>
      <p>Harga: Rp ${Number(price).toLocaleString('id-ID')}</p>
      ${diskonLabel ? `<p class="diskon-info">${diskonLabel}</p>` : ''}
      <div class="actions">
        <h4 class="product-total">Rp ${totalItem.toLocaleString('id-ID')}</h4>
        <div class="product-buttons-wrapper">
          <button class="decrease-qty" data-idx="${idx}">-</button>
          <input type="number" class="product-qty-input" data-idx="${idx}" value="${item.quantity}" min="1" style="width: 50px; text-align: center; padding: 4px;">
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
  diskon_bundle_min_qty = 0,  // ✅ PERBAIKI: gunakan snake_case
  diskon_bundle_value = 0     // ✅ PERBAIKI: gunakan snake_case
}) {
  const pPrice = Number(price || 0);
  const pStock = Number(stock || 0);
  const normId = normalizeId(id);

  let idx = cart.findIndex(item => normalizeId(item.id) === normId);
  if (idx !== -1) {
    cart[idx].quantity += 1;
  } else {
    const item = {
      id: normId,
      name: String(name || ''),
      price: pPrice,
      sku: sku || '',
      stock: pStock,
      buy_quantity: 1,
      bonus_quantity: 0,
      quantity: discount_type === 'buyxgety' ? 1 : 1,
      discount_type,
      discount_value,
      buy_qty,
      free_qty,
      diskon_bundle_min_qty,    // ✅ SIMPAN dengan nama yang benar
      diskon_bundle_value       // ✅ SIMPAN dengan nama yang benar
    };
    applyBuyXGetY(item);
    cart.push(item);
  }

  saveCart();
  if (typeof updateKeranjangView === 'function') updateKeranjangView();
  if (window.showToast) window.showToast('Berhasil ditambahkan ke keranjang!', 'success');
}

// Event listener untuk input quantity langsung
document.addEventListener('change', function (e) {
  if (e.target.classList.contains('product-qty-input')) {
    const idx = parseInt(e.target.dataset.idx);
    let newQty = parseInt(e.target.value) || 1;
    
    cart = JSON.parse(localStorage.getItem('pos_cart') || '[]');

    if (cart[idx]) {
      // Minimum quantity is 1
      newQty = Math.max(1, newQty);
      
      // Jika product punya buyxgety, update buy_quantity, bukan quantity
      if (cart[idx].discount_type === 'buyxgety') {
        cart[idx].buy_quantity = newQty;
        applyBuyXGetY(cart[idx]); // quantity akan diupdate oleh applyBuyXGetY
      } else {
        // Untuk produk normal, update quantity langsung
        cart[idx].quantity = newQty;
        cart[idx].buy_quantity = newQty;
      }
    }

    saveCart();
    updateKeranjangView();
  }
});

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