// /lib/db.js
import mysql from 'mysql2/promise';

function required(key) {
  const v = process.env[key];
  if (v === undefined) throw new Error(`[DB] Missing env: ${key}`);
  return v;
}

const config = {
  host: process.env.DB_HOST || '127.0.0.1',           // boleh ada default
  port: Number(process.env.DB_PORT || 3306),          // boleh ada default
  user: required('DB_USER'),                          // WAJIB dari env
  password: required('DB_PASSWORD'),                  // WAJIB dari env (boleh kosong string)
  database: required('DB_NAME'),                      // WAJIB dari env
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
};

const g = globalThis;
if (!g._mysqlPool) {
  if (process.env.NODE_ENV !== 'production') {
    const { password, ...safe } = config;
    console.log('[DB] MySQL pool created with:', safe); // debug tanpa password
  }
  g._mysqlPool = mysql.createPool(config);
}
export default g._mysqlPool;
