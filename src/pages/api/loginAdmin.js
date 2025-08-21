// /pages/api/loginAdmin.js
import db from '@/lib/db';
import bcrypt from 'bcryptjs';
import { SignJWT } from 'jose';
import { getNsFromReq } from '@/lib/ns-server';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 🔹 Ambil ns: body > query/cookie
  const ns = (req.body?.ns || getNsFromReq(req) || '').trim();
  const email = (req.body?.email || '').trim().toLowerCase();
  const password = req.body?.password || '';

  if (!email || !password || !/^[a-zA-Z0-9_-]{3,32}$/.test(ns)) {
    return res.status(400).json({ error: 'Email, password, dan ns wajib diisi (ns 3-32 alnum_-).' });
  }

  try {
    const [rows] = await db.query(
      `SELECT a.id, a.email, a.nama, a.password, a.role_id, a.verification_id,
              r.role AS role_name
       FROM admins a
       LEFT JOIN admin_roles r ON r.id = a.role_id
       WHERE a.email = ? LIMIT 1`,
      [email]
    );

    if (!rows.length) {
      return res.status(401).json({ error: 'Email atau password salah' });
    }

    const admin = rows[0];

    // ✅ Cek password
    const ok = await bcrypt.compare(password, admin.password);
    if (!ok) return res.status(401).json({ error: 'Email atau password salah' });

    const isSuperAdmin = Number(admin.role_id) === 1;
    const isVerified   = Number(admin.verification_status_id) === 2;

    if (!isSuperAdmin && !isVerified) {
      return res.status(403).json({
        error:
          Number(admin.verification_status_id) === 1
            ? 'Akun admin menunggu verifikasi Super Admin.'
            : 'Akun admin ditolak. Hubungi Super Admin.',
      });
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) return res.status(500).json({ error: 'JWT_SECRET belum diset.' });

    // ✅ Buat JWT
    const maxAge = 60 * 60; // 1 jam
    const token = await new SignJWT({
      sub: String(admin.id),
      email: admin.email,
      name: admin.nama,
      role: 'admin',
      role_id: Number(admin.role_id),
      role_name: admin.role_name || (isSuperAdmin ? 'super_admin' : 'admin_fitur'),
      ns,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(`${maxAge}s`)
      .sign(new TextEncoder().encode(secret));

    const isProd = process.env.NODE_ENV === 'production';

    // ✅ Set cookie
    const cookieName = `admin_session__${ns}`;
    const baseAttrs = [
      'Path=/',
      'HttpOnly',
      'SameSite=Lax',
      isProd ? 'Secure' : '',
      `Max-Age=${maxAge}`,
    ].filter(Boolean).join('; ');

    const stickyAttrs = [
      'Path=/',
      'SameSite=Lax',
      isProd ? 'Secure' : '',
      `Max-Age=${maxAge}`,
    ].filter(Boolean).join('; ');

    res.setHeader('Set-Cookie', [
      `${cookieName}=${token}; ${baseAttrs}`,
      `current_admin_ns=${encodeURIComponent(ns)}; ${stickyAttrs}`,
      `admin_session=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0;${isProd ? ' Secure;' : ''}`,
      `admin_token=;  HttpOnly; Path=/; SameSite=Lax; Max-Age=0;${isProd ? ' Secure;' : ''}`,
      `token=;        HttpOnly; Path=/; SameSite=Lax; Max-Age=0;${isProd ? ' Secure;' : ''}`,
    ]);

    // ✅ Redirect
    let redirectUrl = '';
    if (isSuperAdmin) {
      redirectUrl = `/Admin/HalamanUtama/hal-utamaAdmin?ns=${encodeURIComponent(ns)}`;
    } else {
      // fallback kalau role_name kosong
      const roleName = admin.role_name || 'default';
      redirectUrl = `/Admin/Fitur/${roleName}/dashboard?ns=${encodeURIComponent(ns)}`;
    }

    return res.status(200).json({
      ok: true,
      redirect: redirectUrl,
      whoami: {
        id: admin.id,
        email: admin.email,
        name: admin.nama,
        role: 'admin',
        role_id: admin.role_id,
        role_name: admin.role_name || (isSuperAdmin ? 'super_admin' : 'admin_fitur'),
        verification_status_id: admin.verification_status_id,
        ns,
      },
    });
  } catch (e) {
    console.error('Login Admin Error:', e);
    return res.status(500).json({ error: 'Terjadi kesalahan server', detail: e.message });
  }
}
