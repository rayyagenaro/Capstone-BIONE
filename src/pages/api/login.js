// pages/api/login.js
import db from '@/lib/db';
import bcrypt from 'bcryptjs';
import { SignJWT } from 'jose';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const ns = (req.body?.ns || '').trim();
  const email = (req.body?.email || '').trim().toLowerCase();
  const password = req.body?.password || '';

  const nsOk = /^[a-zA-Z0-9_-]{3,32}$/.test(ns);
  if (!email || !password || !nsOk) {
    return res.status(400).json({
      error: 'Email, password, dan ns wajib diisi (ns 3-32 char: a-zA-Z0-9_-).'
    });
  }

  try {
    const [rows] = await db.query(
      `SELECT u.id, u.email, u.name, u.phone, u.password, u.verification_status_id, u.rejection_reason,
              vs.name AS verification_status_name
       FROM users u
       JOIN verification_status vs ON vs.id = u.verification_status_id
       WHERE u.email = ? LIMIT 1`,
      [email]
    );

    if (!rows.length) {
      return res.status(401).json({ error: 'Email atau password salah' });
    }

    const user = rows[0];

    if (user.verification_status_id === 1) {
      return res.status(403).json({ error: 'Akun Anda masih menunggu verifikasi admin (Pending).' });
    }
    if (user.verification_status_id === 3) {
      return res.status(403).json({
        error: `Akun Anda ditolak.${user.rejection_reason ? ' Alasan: ' + user.rejection_reason : ''}`
      });
    }

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ error: 'Email atau password salah' });

    const secret = process.env.JWT_SECRET;
    if (!secret) return res.status(500).json({ error: 'JWT_SECRET belum diset.' });

    const maxAge = 60 * 60; // 1 jam
    const token = await new SignJWT({
      sub: String(user.id),
      email: user.email,
      name: user.name,
      role: 'user',
      phone: user.phone ?? null,
      ns,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(`${maxAge}s`)
      .sign(new TextEncoder().encode(secret));

    const isProd = process.env.NODE_ENV === 'production';

    // HttpOnly session cookie (per-namespace)
    const cookieName = `user_session__${ns}`;
    const sessionAttrs = [
      'Path=/',
      'HttpOnly',
      'SameSite=Lax',
      isProd ? 'Secure' : '',
      `Max-Age=${maxAge}`,
    ].filter(Boolean).join('; ');

    // 🔹 Sticky cookie non-HttpOnly (agar middleware bisa memulihkan ?ns= saat hilang)
    //    Simpan agak lama (30 hari) & batasi ke area /User
    const stickyMaxAge = 60 * 60 * 24 * 30; // 30 hari
    const stickyParts = [
      `current_user_ns=${encodeURIComponent(ns)}`,
      'Path=/User',
      'SameSite=Lax',
      isProd ? 'Secure' : '',
      `Max-Age=${stickyMaxAge}`,
      // Expires tambahan untuk kompat Safari lama
      `Expires=${new Date(Date.now() + stickyMaxAge * 1000).toUTCString()}`,
    ].filter(Boolean);
    const sticky = stickyParts.join('; ');

    res.setHeader('Set-Cookie', [
      `${cookieName}=${token}; ${sessionAttrs}`,
      sticky, // ⬅️ penting: masukkan sticky ke header cookie
      // Bersihkan legacy/global supaya tidak bentrok (opsional tapi disarankan)
      `user_session=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0;${isProd ? ' Secure;' : ''}`,
      `user_token=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0;${isProd ? ' Secure;' : ''}`,
      `token=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0;${isProd ? ' Secure;' : ''}`,
    ]);

    return res.status(200).json({
      ok: true,
      redirect: `/User/HalamanUtama/hal-utamauser?ns=${encodeURIComponent(ns)}`,
      whoami: { id: user.id, email: user.email, name: user.name, ns },
    });
  } catch (e) {
    console.error('Login User Error:', e);
    return res.status(500).json({ error: 'Terjadi kesalahan server.' });
  }
}
