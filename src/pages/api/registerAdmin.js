// pages/api/registerAdmin.js
import db from '@/lib/db';
import bcrypt from 'bcryptjs';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Metode tidak diizinkan' });
  }

  const { nama, email, password, role_id, service_ids = [] } = req.body;

  if (!nama || !email || !password || !role_id) {
    return res.status(400).json({ error: 'Semua field wajib diisi' });
  }

  if (Number(role_id) === 2) {
    // Validasi layanan
    if (!Array.isArray(service_ids) || service_ids.length < 1) {
      return res.status(400).json({ error: 'Minimal pilih 1 layanan untuk Admin Fitur' });
    }
    if (service_ids.length > 2) {
      return res.status(400).json({ error: 'Maksimal pilih 2 layanan untuk Admin Fitur' });
    }
  }

  try {
    // Cek email unik
    const [existing] = await db.query('SELECT id FROM admins WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(409).json({ error: 'Email sudah digunakan' });
    }

    // Hash password
    const hashed = await bcrypt.hash(password, 10);

    // Insert admin
    const [result] = await db.query(
      'INSERT INTO admins (nama, email, password, role_id) VALUES (?, ?, ?, ?)',
      [nama, email, hashed, role_id]
    );

    const adminId = result.insertId;

    // Kalau admin fitur → simpan ke tabel admin_services
    if (Number(role_id) === 2 && service_ids.length > 0) {
      const values = service_ids.map(sid => [adminId, sid]);
      await db.query(
        'INSERT INTO admin_services (admin_id, service_id) VALUES ?',
        [values]
      );
    }

    return res.status(200).json({ message: 'Admin berhasil didaftarkan' });
  } catch (err) {
    console.error('Error register admin:', err);
    return res.status(500).json({ error: 'Terjadi kesalahan pada server' });
  }
}
