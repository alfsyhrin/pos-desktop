const db = require('../../database');
const API_BASE = 'http://103.126.116.119:8001/sync';

// =======================
// SINKRONISASI PRODUK
// =======================

// Kirim produk yang belum tersinkron ke server (batch)
async function syncProdukKeServer() {
  const unsynced = db.prepare('SELECT * FROM products WHERE is_synced = 0').all();
  if (!unsynced.length) return;
  try {
    const res = await fetch(`${API_BASE}/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(unsynced)
    });
    if (res.ok) {
      const stmt = db.prepare('UPDATE products SET is_synced = 1 WHERE id = ?');
      for (const p of unsynced) stmt.run(p.id);
    }
  } catch (e) {
    // gagal sync, biarkan tetap is_synced = 0
  }
}

// Ambil produk terbaru dari server ke lokal (replace)
async function syncProdukDariServer(store_id) {
  const res = await fetch(`${API_BASE}/products?store_id=${store_id}`);
  const products = await res.json();
  db.prepare('DELETE FROM products WHERE store_id = ?').run(store_id);
  const insert = db.prepare(`
    INSERT OR REPLACE INTO products (id, store_id, name, sku, barcode, price, cost_price, stock, category, description, image_url, is_active, created_at, updated_at, jenis_diskon, nilai_diskon, diskon_bundle_min_qty, diskon_bundle_value, buy_qty, free_qty, is_synced)
    VALUES (@id, @store_id, @name, @sku, @barcode, @price, @cost_price, @stock, @category, @description, @image_url, @is_active, @created_at, @updated_at, @jenis_diskon, @nilai_diskon, @diskon_bundle_min_qty, @diskon_bundle_value, @buy_qty, @free_qty, 1)
  `);
  const insertMany = db.transaction((prods) => {
    for (const p of prods) insert.run(p);
  });
  insertMany(products);
}

// =======================
// SINKRONISASI TRANSAKSI
// =======================

// Kirim transaksi yang belum tersinkron ke server (beserta items)
async function syncTransaksiKeServer() {
  const unsynced = db.prepare('SELECT * FROM transactions WHERE is_synced = 0').all();
  for (const trx of unsynced) {
    // Ambil item transaksi
    const items = db.prepare('SELECT * FROM transaction_items WHERE transaction_id = ?').all(trx.id);
    trx.items = items;
  }
  if (!unsynced.length) return;
  try {
    const res = await fetch(`${API_BASE}/transactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(unsynced)
    });
    if (res.ok) {
      const stmt = db.prepare('UPDATE transactions SET is_synced = 1 WHERE id = ?');
      for (const trx of unsynced) stmt.run(trx.id);
    }
  } catch (e) {}
}

// Ambil transaksi dari server ke lokal (beserta items)
async function syncTransaksiDariServer(store_id) {
  const res = await fetch(`${API_BASE}/transactions?store_id=${store_id}`);
  const transactions = await res.json();
  db.prepare('DELETE FROM transactions WHERE store_id = ?').run(store_id);
  db.prepare('DELETE FROM transaction_items WHERE transaction_id NOT IN (SELECT id FROM transactions)').run();
  const insertTrx = db.prepare(`
    INSERT OR REPLACE INTO transactions (id, store_id, user_id, total_cost, payment_type, payment_method, received_amount, change_amount, customer_name, customer_phone, payment_status, created_at, updated_at, tax, tax_percentage, role, is_owner, is_synced)
    VALUES (@id, @store_id, @user_id, @total_cost, @payment_type, @payment_method, @received_amount, @change_amount, @customer_name, @customer_phone, @payment_status, @created_at, @updated_at, @tax, @tax_percentage, @role, @is_owner, 1)
  `);
  const insertItem = db.prepare(`
    INSERT OR REPLACE INTO transaction_items (id, transaction_id, product_id, product_name, qty, price, subtotal)
    VALUES (@id, @transaction_id, @product_id, @product_name, @qty, @price, @subtotal)
  `);
  const insertMany = db.transaction((trxs) => {
    for (const trx of trxs) {
      insertTrx.run(trx);
      if (Array.isArray(trx.items)) {
        for (const item of trx.items) insertItem.run(item);
      }
    }
  });
  insertMany(transactions);
}

// =======================
// SINKRONISASI USER
// =======================

async function syncUserKeServer() {
  const unsynced = db.prepare('SELECT * FROM users WHERE is_synced = 0').all();
  if (!unsynced.length) return;
  try {
    const res = await fetch(`${API_BASE}/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(unsynced)
    });
    if (res.ok) {
      const stmt = db.prepare('UPDATE users SET is_synced = 1 WHERE id = ?');
      for (const u of unsynced) stmt.run(u.id);
    }
  } catch (e) {}
}

async function syncUserDariServer(store_id) {
  const res = await fetch(`${API_BASE}/users?store_id=${store_id}`);
  const users = await res.json();
  db.prepare('DELETE FROM users WHERE store_id = ?').run(store_id);
  const insert = db.prepare(`
    INSERT OR REPLACE INTO users (id, owner_id, store_id, name, email, username, password, role, is_active, created_at, is_synced)
    VALUES (@id, @owner_id, @store_id, @name, @email, @username, @password, @role, @is_active, @created_at, 1)
  `);
  const insertMany = db.transaction((usrs) => {
    for (const u of usrs) insert.run(u);
  });
  insertMany(users);
}

// =======================
// SINKRONISASI STORE & OWNER
// =======================

async function syncStoreKeServer() {
  const unsynced = db.prepare('SELECT * FROM stores WHERE is_synced = 0').all();
  if (!unsynced.length) return;
  try {
    const res = await fetch(`${API_BASE}/stores`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(unsynced)
    });
    if (res.ok) {
      const stmt = db.prepare('UPDATE stores SET is_synced = 1 WHERE id = ?');
      for (const s of unsynced) stmt.run(s.id);
    }
  } catch (e) {}
}

async function syncStoreDariServer(owner_id) {
  const res = await fetch(`${API_BASE}/stores?owner_id=${owner_id}`);
  const stores = await res.json();
  db.prepare('DELETE FROM stores WHERE owner_id = ?').run(owner_id);
  const insert = db.prepare(`
    INSERT OR REPLACE INTO stores (id, type, owner_id, name, business_name, address, phone, receipt_template, created_at, updated_at, tax_percentage, is_synced)
    VALUES (@id, @type, @owner_id, @name, @business_name, @address, @phone, @receipt_template, @created_at, @updated_at, @tax_percentage, 1)
  `);
  const insertMany = db.transaction((sts) => {
    for (const s of sts) insert.run(s);
  });
  insertMany(stores);
}

async function syncOwnerKeServer() {
  const unsynced = db.prepare('SELECT * FROM owners WHERE is_synced = 0').all();
  if (!unsynced.length) return;
  try {
    const res = await fetch(`${API_BASE}/owners`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(unsynced)
    });
    if (res.ok) {
      const stmt = db.prepare('UPDATE owners SET is_synced = 1 WHERE id = ?');
      for (const o of unsynced) stmt.run(o.id);
    }
  } catch (e) {}
}

async function syncOwnerDariServer(id) {
  const res = await fetch(`${API_BASE}/owners?id=${id}`);
  const owners = await res.json();
  db.prepare('DELETE FROM owners WHERE id = ?').run(id);
  const insert = db.prepare(`
    INSERT OR REPLACE INTO owners (id, business_name, email, phone, password, package_id, package_expired_at, created_at, address, is_synced)
    VALUES (@id, @business_name, @email, @phone, @password, @package_id, @package_expired_at, @created_at, @address, 1)
  `);
  const insertMany = db.transaction((os) => {
    for (const o of os) insert.run(o);
  });
  insertMany(owners);
}

// =======================
// SINKRONISASI UTAMA
// =======================

async function syncAllData() {
  const store_id = localStorage.getItem('store_id');
  const owner_id = localStorage.getItem('owner_id');
  const ownerId = owner_id || 1; // fallback

  await syncOwnerKeServer();
  await syncOwnerDariServer(ownerId);

  await syncStoreKeServer();
  await syncStoreDariServer(ownerId);

  await syncUserKeServer();
  await syncUserDariServer(store_id);

  await syncProdukKeServer();
  await syncProdukDariServer(store_id);

  await syncTransaksiKeServer();
  await syncTransaksiDariServer(store_id);

  // Tambahkan entitas lain jika ada
}
window.syncAllData = syncAllData;