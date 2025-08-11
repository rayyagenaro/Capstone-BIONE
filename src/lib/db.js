// /lib/db.js
import mysql from 'mysql2/promise';

function createPool() {
  return mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'dmove_db1',
    waitForConnections: true,  // antre kalau penuh
    connectionLimit: 10,       // dev cukup 10–20
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
  });
}

// ❗ simpan di global supaya Next dev (hot-reload) tidak bikin pool baru
const g = globalThis;
if (!g._mysqlPool) {
  g._mysqlPool = createPool();
  if (process.env.NODE_ENV !== 'production') {
    console.log('[DB] MySQL pool created');
  }
}

const db = g._mysqlPool;
export default db;
