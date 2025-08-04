// lib/db.js
import mysql from 'mysql2/promise';

const db = await mysql.createPool({
  host: 'localhost',      // atau IP database
  user: 'root',
  password: '',           // sesuaikan
  database: 'dmove_db1',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

export default db;
