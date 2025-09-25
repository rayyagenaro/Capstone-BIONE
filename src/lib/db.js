// /lib/db.js
import mysql from 'mysql2/promise';

function createPool() {
  return mysql.createPool({
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'bione',
    password: process.env.DB_PASSWORD || 'bione2025',
    database: process.env.DB_NAME || 'bione',
    waitForConnections: true,  // antre kalau penuh
    connectionLimit: 10,       // dev cukup 10–20
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
  });
}

const g = globalThis;
if (!g._mysqlPool) {
  g._mysqlPool = createPool();
  if (process.env.NODE_ENV !== 'production') {
    console.log('[DB] MySQL pool created');
  }
}

const db = g._mysqlPool;
export default db;
