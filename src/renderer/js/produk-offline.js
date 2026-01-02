const db = require('../../database');

// Tambah produk offline
function tambahProdukOffline(data) {
  const stmt = db.prepare(`
    INSERT INTO products (store_id, name, sku, barcode, price, cost_price, stock, category, description, is_active, is_synced)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
  `);
  stmt.run(
    data.store_id,
    data.name,
    data.sku,
    data.barcode,
    data.price,
    data.cost_price || 0,
    data.stock || 0,
    data.category || null,
    data.description || null,
    data.is_active ? 1 : 0
  );
}

// Ambil semua produk offline
function getProdukOffline(store_id) {
  return db.prepare('SELECT * FROM products WHERE store_id = ?').all(store_id);
}

// Update produk offline
function updateProdukOffline(id, data) {
  const stmt = db.prepare(`
    UPDATE products SET
      name = ?, sku = ?, barcode = ?, price = ?, cost_price = ?, stock = ?, category = ?, description = ?, is_active = ?, is_synced = 0
    WHERE id = ?
  `);
  stmt.run(
    data.name,
    data.sku,
    data.barcode,
    data.price,
    data.cost_price || 0,
    data.stock || 0,
    data.category || null,
    data.description || null,
    data.is_active ? 1 : 0,
    id
  );
}

// Hapus produk offline
function hapusProdukOffline(id) {
  db.prepare('DELETE FROM products WHERE id = ?').run(id);
}

module.exports = {
  tambahProdukOffline,
  getProdukOffline,
  updateProdukOffline,
  hapusProdukOffline
};