const db = require('../../database');

// Tambah transaksi offline
function tambahTransaksiOffline(data) {
  const stmt = db.prepare(`
    INSERT INTO transactions (store_id, transaction_id, total, method, items, created_at, is_synced)
    VALUES (?, ?, ?, ?, ?, ?, 0)
  `);
  stmt.run(
    data.store_id,
    data.transaction_id,
    data.total,
    data.method,
    JSON.stringify(data.items || []),
    data.created_at || new Date().toISOString()
  );
}

// Ambil semua transaksi offline
function getTransaksiOffline(store_id) {
  return db.prepare('SELECT * FROM transactions WHERE store_id = ?').all(store_id);
}

// Update transaksi offline
function updateTransaksiOffline(id, data) {
  const stmt = db.prepare(`
    UPDATE transactions SET
      total = ?, method = ?, items = ?, is_synced = 0
    WHERE transaction_id = ?
  `);
  stmt.run(
    data.total,
    data.method,
    JSON.stringify(data.items || []),
    id
  );
}

// Hapus transaksi offline
function hapusTransaksiOffline(id) {
  db.prepare('DELETE FROM transactions WHERE transaction_id = ?').run(id);
}

module.exports = {
  tambahTransaksiOffline,
  getTransaksiOffline,
  updateTransaksiOffline,
  hapusTransaksiOffline
};