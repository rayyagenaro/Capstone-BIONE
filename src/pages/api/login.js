// pages/api/login.js
import db from '@/lib/db'; // koneksi ke MySQL
import bcrypt from 'bcryptjs';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email dan password wajib diisi' });
  }

  try {
    const [rows] = await db.query('SELECT * FROM users WHERE email = ?', [email]);

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Email tidak ditemukan' });
    }

    const user = rows[0];
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ error: 'Password salah' });
    }

    return res.status(200).json({
  message: 'Login berhasil',
  user: {
    id: user.id,
    name: user.name,
    email: user.email
  }
});

  } catch (error) {
    console.error('Login Error:', error);
    return res.status(500).json({ error: 'Terjadi kesalahan server.' });
  }
}
