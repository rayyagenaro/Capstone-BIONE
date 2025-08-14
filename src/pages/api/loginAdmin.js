// pages/api/loginAdmin.js
import db from '@/lib/db';
import bcrypt from 'bcryptjs';
import { SignJWT } from 'jose';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 1) NS & normalisasi email
  const ns = (req.body?.ns || '').trim();
  const email = (req.body?.email || '').trim().toLowerCase();
  const password = req.body?.password || '';

  const nsOk = /^[a-zA-Z0-9_-]{3,32}$/.test(ns);
  if (!email || !password || !nsOk) {
    return res.status(400).json({ error: 'Email, password, dan ns wajib diisi (ns 3-32 alnum_-).' });
  }

  try {
    // Ambil admin
    const [rows] = await db.query(
      'SELECT id, email, nama, password FROM admins WHERE email = ? LIMIT 1',
      [email]
    );
    if (!rows.length) return res.status(401).json({ error: 'Email atau password salah' });

    const admin = rows[0];
    const ok = await bcrypt.compare(password, admin.password);
    if (!ok) return res.status(401).json({ error: 'Email atau password salah' });

    const secret = process.env.JWT_SECRET;
    if (!secret) return res.status(500).json({ error: 'JWT_SECRET belum diset.' });

    // 2) Tentukan super-admin & ambil fitur yang di-assign bila bukan super
    const isSuper = Number(admin.id) === 1; // id=1 = super admin
    let features = [];

    if (!isSuper) {
      // ✅ Sesuaikan nama tabel/kolom di bawah dengan skema kamu:
      // Tabel pivot: admin_services (admin_id, service_id)
      // Tabel layanan: services (id, service_code)
      const [featRows] = await db.query(
        `SELECT s.service_code AS code
         FROM admin_services ads
         JOIN services s ON s.id = ads.service_id
         WHERE ads.admin_id = ?`,
        [admin.id]
      );
      features = (featRows || []).map(r => r.code);
    }

    // 3) Buat JWT
    const maxAge = 60 * 60; // 1 jam
    const token = await new SignJWT({
      sub: String(admin.id),
      email: admin.email,
      name: admin.nama,
      role: 'admin',               // tetap 'admin' agar cocok dengan middleware
      super: isSuper,              // penanda super admin
      features: isSuper ? ['*'] : features, // '*' = semua fitur
      ns,                          // simpan ns untuk audit/debug
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(`${maxAge}s`)
      .sign(new TextEncoder().encode(secret));

    // 4) Set cookie per-NS + sticky cookie
    const isProd = process.env.NODE_ENV === 'production';

    // HttpOnly session cookie
    const cookieName = `admin_session__${ns}`;
    const sessionAttrs = [
      'Path=/',
      'HttpOnly',
      'SameSite=Lax',
      isProd ? 'Secure' : '',
      `Max-Age=${maxAge}`,
    ].filter(Boolean).join('; ');

    // 🔹 Sticky cookie non-HttpOnly (untuk bantu middleware memulihkan ?ns=)
    const stickyMaxAge = 60 * 60 * 24 * 30; // 30 hari
    const sticky = [
      `current_admin_ns=${encodeURIComponent(ns)}`,
      'Path=/Admin',
      'SameSite=Lax',
      isProd ? 'Secure' : '',
      `Max-Age=${stickyMaxAge}`,
      `Expires=${new Date(Date.now() + stickyMaxAge * 1000).toUTCString()}`,
    ].filter(Boolean).join('; ');

    res.setHeader('Set-Cookie', [
      `${cookieName}=${token}; ${sessionAttrs}`,
      sticky, // ⬅️ penting
      // bersihkan legacy
      `admin_session=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0;${isProd ? ' Secure;' : ''}`,
      `admin_token=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0;${isProd ? ' Secure;' : ''}`,
      `token=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0;${isProd ? ' Secure;' : ''}`,
    ]);

    // 5) Response
    return res.status(200).json({
      ok: true,
      redirect: `/Admin/HalamanUtama/hal-utamaAdmin?ns=${encodeURIComponent(ns)}`,
      whoami: {
        id: admin.id,
        email: admin.email,
        name: admin.nama,
        ns,
        super: isSuper,
        features: isSuper ? ['*'] : features,
      },
    });
  } catch (e) {
    console.error('Login Admin Error:', e);
    return res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
}
