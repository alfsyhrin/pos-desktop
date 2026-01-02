const path = require('path');
const os = require('os');
const fs = require('fs');
const Database = require('better-sqlite3');

// Tentukan lokasi file database
const dbPath = path.join(
  process.env.APPDATA || path.join(os.homedir(), '.config', 'NamaAplikasi'),
  'pos-offline.db'
);

// Pastikan folder ada
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

// Inisialisasi database
const db = new Database(dbPath);

// Ekspor db untuk digunakan di seluruh aplikasi
module.exports = db;