/* =========================
   HELPER: UPDATE VIEW
========================= */
function updateKeranjangView() {
  const emptyView = document.getElementById('keranjang-empty');
  const itemsContainer = document.getElementById('keranjang-items');

  if (!emptyView || !itemsContainer) return;

  if (itemsContainer.children.length > 0) {
    emptyView.style.display = 'none';
  } else {
    emptyView.style.display = 'flex';
  }
}

/* =========================
   ADD TO CART
========================= */
function addToCart(productName, productPrice, productSKU, productStock) {
  const itemsContainer = document.getElementById('keranjang-items');
  if (!itemsContainer) return;

  let cartItem = document.getElementById(`cart-${productSKU}`);

  // =====================
  // JIKA PRODUK SUDAH ADA
  // =====================
  if (cartItem) {
    const qtyEl = cartItem.querySelector('.product-qty');
    const totalEl = cartItem.querySelector('.product-total');
    let qty = parseInt(qtyEl.textContent);

    if (qty < productStock) {
      qty++;
      qtyEl.textContent = qty;
      totalEl.textContent = `Rp ${qty * productPrice}`;
    }

  } else {
    // =====================
    // JIKA PRODUK BARU
    // =====================
    const newCartItem = document.createElement('div');
    newCartItem.className = 'keranjang-item';
    newCartItem.id = `cart-${productSKU}`;

    newCartItem.innerHTML = `
      <h4>${productName}</h4>
      <p>SKU: ${productSKU}</p>
      <p>Harga: Rp ${productPrice}</p>
      
      <div class="actions">
        <h4 class="product-total">Rp ${productPrice}</h4>
        <div class="product-buttons-wrapper">
          <button class="decrease-qty">-</button>
          <span class="product-qty">1</span>
          <button class="increase-qty">+</button>
          <button class="remove-item">✕</button>
        </div>
      </div>
    `;

    itemsContainer.appendChild(newCartItem);

    const qtyEl = newCartItem.querySelector('.product-qty');
    const totalEl = newCartItem.querySelector('.product-total');

    // ➕ Tambah qty
    newCartItem.querySelector('.increase-qty').addEventListener('click', () => {
      let qty = parseInt(qtyEl.textContent);
      if (qty < productStock) {
        qty++;
        qtyEl.textContent = qty;
        totalEl.textContent = `Rp ${qty * productPrice}`;
      }
    });

    // ➖ Kurangi qty
    newCartItem.querySelector('.decrease-qty').addEventListener('click', () => {
      let qty = parseInt(qtyEl.textContent);
      if (qty > 1) {
        qty--;
        qtyEl.textContent = qty;
        totalEl.textContent = `Rp ${qty * productPrice}`;
      }
    });

    // ❌ Hapus item
    newCartItem.querySelector('.remove-item').addEventListener('click', () => {
      newCartItem.remove();
      updateKeranjangView();
    });
  }

  updateKeranjangView();
}

/* =========================
   EVENT LISTENER BUTTON
========================= */
document.addEventListener('click', function (e) {
  const btn = e.target.closest('.btn-add-cart');
  if (!btn) return;

  const name = btn.dataset.name;
  const price = parseInt(btn.dataset.price);
  const sku = btn.dataset.sku;
  const stock = parseInt(btn.dataset.stock);

  addToCart(name, price, sku, stock);
});

/* =========================
   INIT SAAT HALAMAN LOAD
========================= */
document.addEventListener('DOMContentLoaded', () => {
  updateKeranjangView();
});
