// /pages/api/register.js
import db from '@/lib/db';
import bcrypt from 'bcryptjs';
import { getNsFromReq } from '@/lib/ns-server'; // ← pakai helper

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const ns = getNsFromReq(req);   // ← konsisten pakai helper
  const nama = (req.body?.nama || '').trim();
  const nip = (req.body?.nip || '').trim();
  const hp = (req.body?.hp || '').trim();
  const email = (req.body?.email || '').trim().toLowerCase();
  const password = req.body?.password || '';

  if (!ns) {
    return res.status(400).json({ error: 'ns wajib diisi (3–32 alnum _-)' });
  }
  if (!nama || !nip || !hp || !email || !password) {
    return res.status(400).json({ error: 'Semua field wajib diisi' });
  }

  try {
    const [existing] = await db.query(
      `SELECT id FROM users WHERE email = ? AND ns = ? LIMIT 1`,
      [email, ns]
    );
    if (existing.length > 0) {
      return res.status(409).json({ error: 'Email sudah terdaftar di namespace ini' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await db.query(
      `INSERT INTO users
        (name, email, phone, nip, password, verification_status_id, rejection_reason, ns)
       VALUES (?, ?, ?, ?, ?, 1, NULL, ?)`,
      [nama, email, hp, nip, hashedPassword, ns]
    );

    return res.status(201).json({
      ok: true,
      message: 'Registrasi berhasil. Akun menunggu verifikasi admin.',
      redirect: `/Login/hal-login?ns=${encodeURIComponent(ns)}`
    });
  } catch (err) {
    console.error('Register error:', err);
    return res.status(500).json({ error: 'Terjadi kesalahan di server' });
  }
}
