const db = require('../../database');
const bcrypt = require('bcryptjs');

// Tambah user offline (password di-hash)
function tambahUserOffline(data) {
  const hash = bcrypt.hashSync(data.password, 10);
  const stmt = db.prepare(`
    INSERT INTO users (store_id, username, password, role, is_active, is_synced)
    VALUES (?, ?, ?, ?, ?, 0)
  `);
  stmt.run(
    data.store_id,
    data.username,
    hash,
    data.role,
    data.is_active ? 1 : 0
  );
}

// Ambil semua user offline
function getUsersOffline(store_id) {
  return db.prepare('SELECT * FROM users WHERE store_id = ?').all(store_id);
}

// Update user offline (password di-hash jika diubah)
function updateUserOffline(id, data) {
  let query = `UPDATE users SET username = ?, role = ?, is_active = ?, is_synced = 0`;
  let params = [data.username, data.role, data.is_active ? 1 : 0];
  if (data.password) {
    query += `, password = ?`;
    params.push(bcrypt.hashSync(data.password, 10));
  }
  query += ` WHERE id = ?`;
  params.push(id);
  db.prepare(query).run(...params);
}

// Hapus user offline
function hapusUserOffline(id) {
  db.prepare('DELETE FROM users WHERE id = ?').run(id);
}

// Login offline (verifikasi hash)
function loginOffline(username, password) {
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!user) return false;
  return bcrypt.compareSync(password, user.password) ? user : false;
}

module.exports = {
  tambahUserOffline,
  getUsersOffline,
  updateUserOffline,
  hapusUserOffline,
  loginOffline
};