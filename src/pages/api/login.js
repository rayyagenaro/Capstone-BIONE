// pages/api/login.js
import db from '@/lib/db';
import bcrypt from 'bcryptjs';
import { SignJWT } from 'jose';


export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const email = (req.body?.email || '').trim();
  const password = req.body?.password || '';

  if (!email || !password) {
    return res.status(400).json({ error: 'Email dan password wajib diisi' });
  }

  try {
    const [rows] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    if (!rows.length) return res.status(401).json({ error: 'Email tidak ditemukan' });

    const user = rows[0];
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ error: 'Password salah' });

    const secret = process.env.JWT_SECRET;
    if (!secret) return res.status(500).json({ error: 'JWT_SECRET belum diset.' });

    const maxAge = 60 * 60 * 24 * 7; // 7 hari
    const token = await new SignJWT({
      sub: String(user.id),
      email: user.email,
      name: user.name,
      role: 'user',
      phone: user.phone ?? null,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(`${maxAge}s`)
      .sign(new TextEncoder().encode(secret));

    const isProd = process.env.NODE_ENV === 'production';
    // Set cookie HttpOnly tanpa package
    res.setHeader(
      'Set-Cookie',
      `token=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${maxAge};${isProd ? ' Secure;' : ''}`
    );

    return res.status(200).json({ message: 'Login berhasil' });
  } catch (e) {
    console.error('Login User Error:', e);
    return res.status(500).json({ error: 'Terjadi kesalahan server.' });
  }
}
