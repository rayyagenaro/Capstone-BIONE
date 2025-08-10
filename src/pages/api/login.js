import db from '@/lib/db';
import bcrypt from 'bcryptjs';
import { SignJWT } from 'jose';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const email = (req.body?.email || '').trim();
  const password = req.body?.password || '';
  if (!email || !password) return res.status(400).json({ error: 'Email dan password wajib diisi' });

  try {
    const [rows] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    if (!rows.length) return res.status(401).json({ error: 'Email tidak ditemukan' });

    const user = rows[0];
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ error: 'Password salah' });

    const secretStr = process.env.JWT_SECRET;
    if (!secretStr) return res.status(500).json({ error: 'Konfigurasi server belum lengkap (JWT_SECRET).' });
    const secret = new TextEncoder().encode(secretStr);

    const maxAgeSec = 60 * 60 * 24 * 7;

    const token = await new SignJWT({
      sub: String(user.id),
      email: user.email,
      name: user.name,
      role: 'user',
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(`${maxAgeSec}s`)
      .sign(secret);

    const isProd = process.env.NODE_ENV === 'production';
    res.setHeader('Set-Cookie', [
      `token=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${maxAgeSec};${isProd ? ' Secure;' : ''}`,
    ]);

    return res.status(200).json({
      message: 'Login berhasil',
      user: { id: user.id, name: user.name, email: user.email, phone: user.phone },
    });
  } catch (e) {
    console.error('Login User Error:', e);
    return res.status(500).json({ error: 'Terjadi kesalahan server.' });
  }
}
