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

  // 2) Validasi input (ns 3–32, alnum _-)
  const nsOk = /^[a-zA-Z0-9_-]{3,32}$/.test(ns);
  if (!email || !password || !nsOk) {
    return res.status(400).json({ error: 'Email, password, dan ns wajib diisi (ns 3-32 alnum_-).' });
  }

  try {
    // Ambil data minimal yang diperlukan (termasuk verification_id)
    const [rows] = await db.query(
      `SELECT id, email, nama, password, role_id, verification_id
       FROM admins
       WHERE email = ? LIMIT 1`,
      [email]
    );
    if (!rows.length) {
      // samarkan pesan
      return res.status(401).json({ error: 'Email atau password salah' });
    }

    const admin = rows[0];

    // Cek password
    const ok = await bcrypt.compare(password, admin.password);
    if (!ok) {
      return res.status(401).json({ error: 'Email atau password salah' });
    }

    // 3) Gate: hanya Verified (2) yang boleh login, KECUALI super admin (role_id=1)
    // mapping: 1=Pending, 2=Verified, 3=Rejected
    const isSuperAdmin = Number(admin.role_id) === 1;
    const isVerified   = Number(admin.verification_id) === 2;

    if (!isSuperAdmin && !isVerified) {
      return res.status(403).json({
        error:
          Number(admin.verification_id) === 1
            ? 'Akun admin menunggu verifikasi Super Admin.'
            : 'Akun admin ditolak. Hubungi Super Admin.',
      });
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) return res.status(500).json({ error: 'JWT_SECRET belum diset.' });

    // 4) Buat JWT — IMPORTANT: role harus 'admin' agar lolos middleware
    const maxAge = 60 * 60; // 1 jam
    const token = await new SignJWT({
      sub: String(admin.id),
      email: admin.email,
      name: admin.nama,
      role: 'admin',                       // ← diselaraskan dengan middleware
      role_id: Number(admin.role_id),      // info tambahan
      role_name: isSuperAdmin ? 'super_admin' : 'admin_fitur',
      ns,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(`${maxAge}s`)
      .sign(new TextEncoder().encode(secret));

    const isProd = process.env.NODE_ENV === 'production';

    // 5) Cookie per-namespace + sticky ns (dipakai middleware saat ?ns= hilang)
    const cookieName = `admin_session__${ns}`;
    const baseAttrs = [
      'Path=/',
      'HttpOnly',
      'SameSite=Lax',
      isProd ? 'Secure' : '',
      `Max-Age=${maxAge}`,
    ].filter(Boolean).join('; ');

    // Sticky ns tidak perlu HttpOnly agar client-side bisa baca jika dibutuhkan (opsional)
    const stickyAttrs = [
      'Path=/',
      'SameSite=Lax',
      isProd ? 'Secure' : '',
      `Max-Age=${maxAge}`,
    ].filter(Boolean).join('; ');

    res.setHeader('Set-Cookie', [
      `${cookieName}=${token}; ${baseAttrs}`,
      `current_admin_ns=${encodeURIComponent(ns)}; ${stickyAttrs}`,
      // bersihkan cookie lama (opsional)
      `admin_session=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0;${isProd ? ' Secure;' : ''}`,
      `admin_token=;  HttpOnly; Path=/; SameSite=Lax; Max-Age=0;${isProd ? ' Secure;' : ''}`,
      `token=;        HttpOnly; Path=/; SameSite=Lax; Max-Age=0;${isProd ? ' Secure;' : ''}`,
    ]);

    // 6) Redirect ke ruang namespace
    return res.status(200).json({
      ok: true,
      redirect: `/Admin/HalamanUtama/hal-utamaAdmin?ns=${encodeURIComponent(ns)}`,
      whoami: {
        id: admin.id,
        email: admin.email,
        name: admin.nama,
        role: 'admin',
        role_id: admin.role_id,
        role_name: isSuperAdmin ? 'super_admin' : 'admin_fitur',
        verification_id: admin.verification_id,
        ns,
      },
    });
  } catch (e) {
    console.error('Login Admin Error:', e);
    return res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
}
