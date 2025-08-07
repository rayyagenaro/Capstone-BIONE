import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '', // ganti jika pakai password MySQL
  database: 'dmove_db1',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const { type } = req.query;
    try {
      if (type === 'drivers') {
        const [rows] = await pool.query('SELECT id, nim, name, phone FROM drivers ORDER BY id ASC');
        return res.status(200).json({ success: true, data: rows });
      }
      if (type === 'vehicles') {
        const [rows] = await pool.query('SELECT id, plat_nomor, tahun, vehicle_type_id, vehicle_status_id FROM vehicles ORDER BY id ASC');
        return res.status(200).json({ success: true, data: rows });
      }
      return res.status(400).json({ success: false, message: 'Type not valid' });
    } catch (e) {
      return res.status(500).json({ success: false, message: e.message });
    }
  }

  if (req.method === 'POST') {
    const { type, ...data } = req.body;
    try {
      if (type === 'drivers') {
        const { nim, name, phone } = data;
        await pool.query('INSERT INTO drivers (nim, name, phone) VALUES (?, ?, ?)', [nim, name, phone]);
        return res.status(200).json({ success: true });
      }
      if (type === 'vehicles') {
        const { plat_nomor, tahun, vehicle_type_id, vehicle_status_id } = data;
        await pool.query(
          'INSERT INTO vehicles (plat_nomor, tahun, vehicle_type_id, vehicle_status_id) VALUES (?, ?, ?, ?)',
          [plat_nomor, tahun, vehicle_type_id, vehicle_status_id]
        );
        return res.status(200).json({ success: true });
      }
      return res.status(400).json({ success: false, message: 'Type not valid' });
    } catch (e) {
      return res.status(500).json({ success: false, message: e.message });
    }
  }

  if (req.method === 'PUT') {
    const { type, ...data } = req.body;
    try {
      if (type === 'drivers') {
        const { id, nim, name, phone } = data;
        await pool.query('UPDATE drivers SET nim=?, name=?, phone=? WHERE id=?', [nim, name, phone, id]);
        return res.status(200).json({ success: true });
      }
      if (type === 'vehicles') {
        const { id, plat_nomor, tahun, vehicle_type_id, vehicle_status_id } = data;
        await pool.query(
          'UPDATE vehicles SET plat_nomor=?, tahun=?, vehicle_type_id=?, vehicle_status_id=? WHERE id=?',
          [plat_nomor, tahun, vehicle_type_id, vehicle_status_id, id]
        );
        return res.status(200).json({ success: true });
      }
      return res.status(400).json({ success: false, message: 'Type not valid' });
    } catch (e) {
      return res.status(500).json({ success: false, message: e.message });
    }
  }

  if (req.method === 'DELETE') {
    const { type, id } = req.body;
    try {
      if (type === 'drivers') {
        await pool.query('DELETE FROM drivers WHERE id=?', [id]);
        return res.status(200).json({ success: true });
      }
      if (type === 'vehicles') {
        await pool.query('DELETE FROM vehicles WHERE id=?', [id]);
        return res.status(200).json({ success: true });
      }
      return res.status(400).json({ success: false, message: 'Type not valid' });
    } catch (e) {
      return res.status(500).json({ success: false, message: e.message });
    }
  }

  return res.status(405).json({ success: false, message: 'Method Not Allowed' });
}