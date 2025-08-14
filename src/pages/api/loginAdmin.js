// pages/api/loginAdmin.js
import db from '@/lib/db';
import bcrypt from 'bcryptjs';
import { SignJWT } from 'jose';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 1) TERAPKAN NS & NORMALISASI EMAIL
  const ns = (req.body?.ns || '').trim();                  // << tambahkan
  const email = (req.body?.email || '').trim().toLowerCase(); // << normalisasi
  const password = req.body?.password || '';

  // 2) VALIDASI INPUT (termasuk ns)
  //    ns = 3-32 char, alnum + "-" + "_" (sesuaikan kebutuhan)
  const nsOk = /^[a-zA-Z0-9_-]{3,32}$/.test(ns);
  if (!email || !password || !nsOk) {
    return res.status(400).json({ error: 'Email, password, dan ns wajib diisi (ns 3-32 alnum_-).' });
  }

  try {
    // (opsional: pilih kolom seperlunya)
    const [rows] = await db.query('SELECT id, email, nama, password FROM admins WHERE email = ?', [email]);

    // 3) SAMARKAN ERROR KREDENSIAL (opsional tapi disarankan)
    if (!rows.length) return res.status(401).json({ error: 'Email atau password salah' });

    const admin = rows[0];
    const ok = await bcrypt.compare(password, admin.password);
    if (!ok) return res.status(401).json({ error: 'Email atau password salah' });

    const secret = process.env.JWT_SECRET;
    if (!secret) return res.status(500).json({ error: 'JWT_SECRET belum diset.' });

    // 4) SELARASKAN EXPIRE JWT & COOKIE
    const maxAge = 60 * 60; // 1 jam
    const token = await new SignJWT({
      sub: String(admin.id),
      email: admin.email,
      name: admin.nama,
      role: 'admin',
      ns, // (opsional) taruh ns dalam payload untuk audit
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(`${maxAge}s`)
      .sign(new TextEncoder().encode(secret));

    const isProd = process.env.NODE_ENV === 'production';

    // 5) GUNAKAN COOKIE PER NAMESPACE
    const cookieName = `admin_session__${ns}`;
    const cookieAttrs = [
      'Path=/',
      'HttpOnly',
      'SameSite=Lax',
      isProd ? 'Secure' : '',
      `Max-Age=${maxAge}`,
    ].filter(Boolean).join('; ');

    res.setHeader('Set-Cookie', [
      `${cookieName}=${token}; ${cookieAttrs}`,
      // hapus legacy (optional)
      `admin_session=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0;${isProd ? ' Secure;' : ''}`,
      `admin_token=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0;${isProd ? ' Secure;' : ''}`,
      `token=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0;${isProd ? ' Secure;' : ''}`,
    ]);

    // 6) KEMBALIKAN REDIRECT KE RUANG NAMESPACE
    return res.status(200).json({
      ok: true,
      redirect: `/Admin/HalamanUtama/hal-utamaAdmin?ns=${encodeURIComponent(ns)}`,
      whoami: { id: admin.id, email: admin.email, name: admin.nama, ns },
    });
  } catch (e) {
    console.error('Login Admin Error:', e);
    return res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
}
