import db from '@/lib/db';
import bcrypt from 'bcryptjs';
import { SignJWT } from 'jose';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const email = (req.body?.email || '').trim();
  const password = req.body?.password || '';
  if (!email || !password) return res.status(400).json({ error: 'Email dan password wajib diisi' });

  try {
    const [rows] = await db.query('SELECT * FROM admins WHERE email = ?', [email]);
    if (!rows.length) return res.status(401).json({ error: 'Admin tidak ditemukan' });

    const admin = rows[0];
    const ok = await bcrypt.compare(password, admin.password);
    if (!ok) return res.status(401).json({ error: 'Password salah' });

    const secretStr = process.env.JWT_SECRET;
    if (!secretStr) return res.status(500).json({ error: 'Konfigurasi server belum lengkap (JWT_SECRET).' });
    const secret = new TextEncoder().encode(secretStr);

    // Masa berlaku token (contoh: 7 hari)
    const maxAgeSec = 60 * 60 * 24 * 7;

    const token = await new SignJWT({
      sub: String(admin.id),
      email: admin.email,
      name: admin.nama,
      role: 'admin',
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(`${maxAgeSec}s`)
      .sign(secret);

    const isProd = process.env.NODE_ENV === 'production';
    res.setHeader('Set-Cookie', [
      // Secure hanya di production (biar di localhost cookie tetap tersimpan)
      `token=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${maxAgeSec};${isProd ? ' Secure;' : ''}`,
    ]);

    return res.status(200).json({ message: 'Login admin berhasil' });
  } catch (e) {
    console.error('Login Admin Error:', e);
    return res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
}
 