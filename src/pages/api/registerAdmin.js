// pages/api/registerAdmin.js
import db from '@/lib/db';
import bcrypt from 'bcryptjs';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Metode tidak diizinkan' });
  }

  const { nama, email, password } = req.body;

  if (!nama || !email || !password) {
    return res.status(400).json({ error: 'Semua field wajib diisi' });
  }

  try {
    // Cek apakah email sudah terdaftar
    const [existing] = await db.query('SELECT id FROM admins WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(409).json({ error: 'Email sudah digunakan' });
    }

    // Hash password
    const hashed = await bcrypt.hash(password, 10);

    // Simpan ke database
    await db.query('INSERT INTO admins (nama, email, password) VALUES (?, ?, ?)', [
      nama, email, hashed
    ]);

    return res.status(200).json({ message: 'Admin berhasil didaftarkan' });
  } catch (err) {
    console.error('Error register admin:', err);
    return res.status(500).json({ error: 'Terjadi kesalahan pada server' });
  }
}
