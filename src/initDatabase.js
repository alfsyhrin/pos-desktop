const fs = require('fs');
const path = require('path');
const db = require('./database'); // sudah ada dari database.js

const dbPath = db.name; // path file db dari better-sqlite3 instance

function initDatabase() {
  const sqlFile = path.join(__dirname, '../offline_db.sql');
  const sql = fs.readFileSync(sqlFile, 'utf8');
  db.exec(sql);
}

// Jalankan hanya jika file database baru dibuat
if (!fs.existsSync(dbPath) || fs.statSync(dbPath).size === 0) {
  initDatabase();
}