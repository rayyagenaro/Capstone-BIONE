// pages/api/bistaybooking.js
import mysql from 'mysql2/promise';

function toMySQLDateTime(value) {
  // Terima ISO string / Date / number -> 'YYYY-MM-DD HH:mm:ss' (local server time)
  const d = new Date(value);
  const pad = (n) => String(n).padStart(2, '0');
  const y = d.getFullYear();
  const m = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hh = pad(d.getHours());
  const mm = pad(d.getMinutes());
  const ss = pad(d.getSeconds());
  return `${y}-${m}-${day} ${hh}:${mm}:${ss}`;
}

let pool;
async function getPool() {
  if (!pool) {
    pool = mysql.createPool({
      host: process.env.DB_HOST || '127.0.0.1',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASS || '',
      database: process.env.DB_NAME || 'dmove_db1',
      waitForConnections: true,
      connectionLimit: 10,
    });
  }
  return pool;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      nama_pemesan,
      nip,
      no_wa,
      status,       // 'Pegawai' | 'Pensiun' (atau bisa id string/number)
      asal_kpw,
      check_in,
      check_out,
      keterangan,
    } = req.body || {};

    // Validasi minimal (server-side)
    const err = [];
    if (!nama_pemesan?.trim()) err.push('nama_pemesan');
    if (!nip?.trim()) err.push('nip');
    if (!no_wa?.trim()) err.push('no_wa');
    if (!status) err.push('status');
    if (!asal_kpw?.trim()) err.push('asal_kpw');
    if (!check_in) err.push('check_in');
    if (!check_out) err.push('check_out');

    const ci = new Date(check_in);
    const co = new Date(check_out);
    if (isFinite(ci) && isFinite(co) && co <= ci) {
      return res.status(400).json({ error: 'check_out harus setelah check_in' });
    }

    if (err.length) {
      return res.status(400).json({ error: `Field wajib: ${err.join(', ')}` });
    }

    const pool = await getPool();

    // Dapatkan bistay_status_pegawai_id
    let statusId = Number(status);
    if (!statusId) {
      const [rows] = await pool.execute(
        'SELECT id FROM bistay_status_pegawai WHERE status = ? LIMIT 1',
        [String(status)]
      );
      if (!rows?.length) {
        return res.status(400).json({ error: 'Status pegawai tidak valid' });
      }
      statusId = rows[0].id;
    }

    const sql = `
      INSERT INTO bistay_bookings
      (nama_pemesan, nip, no_wa, bistay_status_pegawai_id, asal_kpw, check_in, check_out, keterangan)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      nama_pemesan.trim(),
      nip.trim(),
      no_wa.trim(),
      statusId,
      asal_kpw.trim(),
      toMySQLDateTime(check_in),
      toMySQLDateTime(check_out),
      keterangan ?? null,
    ];

    const [result] = await pool.execute(sql, params);

    return res.status(201).json({
      ok: true,
      id: result.insertId,
      message: 'Booking BI.STAY berhasil disimpan.',
    });
  } catch (e) {
    console.error('API bistaybooking error:', e);
    return res.status(500).json({ error: 'Terjadi kesalahan pada server.' });
  }
}
