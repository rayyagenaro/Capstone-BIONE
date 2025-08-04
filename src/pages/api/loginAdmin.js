// pages/api/loginAdmin.js
import db from '@/lib/db';
import bcrypt from 'bcryptjs';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email, password } = req.body;

  if (!email || !password) return res.status(400).json({ error: 'Email dan password wajib diisi' });

  try {
    const [rows] = await db.query('SELECT * FROM admins WHERE email = ?', [email]);

    if (rows.length === 0) return res.status(401).json({ error: 'Admin tidak ditemukan' });

    const admin = rows[0];
    const match = await bcrypt.compare(password, admin.password);
    if (!match) return res.status(401).json({ error: 'Password salah' });

    return res.status(200).json({ message: 'Login admin berhasil' });
  } catch (err) {
    console.error('Login Admin Error:', err);
    return res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
}
