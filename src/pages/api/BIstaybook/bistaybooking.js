// pages/api/BIstaybook/bistaybooking.js
import db from '@/lib/db';               // ganti sesuai alias/proyekmu
import { jwtVerify } from 'jose';

/* ---------- Helpers ---------- */

function toMySQLDateTime(value) {
  const d = new Date(value);
  const pad = (n) => String(n).padStart(2, '0');
  const y = d.getFullYear();
  const m = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hh = pad(d.getHours());
  const mm = pad(d.getMinutes());
  const ss = pad(d.getSeconds());
  return `${y}-${m}-${day} ${hh}:${mm}:${ss}`;
}

async function getUserIdFromCookie(req) {
  try {
    const token = req.cookies?.user_session;
    if (!token) return null;
    const secret = process.env.JWT_SECRET;
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret), {
      algorithms: ['HS256'],
      clockTolerance: 10,
    });
    return payload?.sub || payload?.user_id || null;
  } catch {
    return null;
  }
}

/* ---------- Handler ---------- */

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      user_id,        // optional; fallback ke cookie
      nama_pemesan,
      nip,
      no_wa,
      status,         // 'Pegawai' | 'Pensiun' | numeric ID
      asal_kpw,
      check_in,
      check_out,
      keterangan,
    } = req.body || {};

    // Validasi dasar
    const missing = [];
    if (!nama_pemesan?.trim()) missing.push('nama_pemesan');
    if (!nip?.trim()) missing.push('nip');
    if (!no_wa?.trim()) missing.push('no_wa');
    if (!status) missing.push('status');
    if (!asal_kpw?.trim()) missing.push('asal_kpw');
    if (!check_in) missing.push('check_in');
    if (!check_out) missing.push('check_out');
    if (missing.length) {
      return res.status(400).json({ error: `Field wajib: ${missing.join(', ')}` });
    }

    const ci = new Date(check_in);
    const co = new Date(check_out);
    if (isFinite(ci) && isFinite(co) && co <= ci) {
      return res.status(400).json({ error: 'check_out harus setelah check_in' });
    }

    // 1) Map status -> status_pegawai_id (tabel: bistay_status_pegawai)
    let statusId = Number(status);
    if (!statusId) {
      const [rows] = await db.execute(
        'SELECT id FROM bistay_status_pegawai WHERE status = ? LIMIT 1',
        [String(status)]
      );
      if (!rows?.length) {
        return res.status(400).json({ error: 'Status pegawai tidak valid' });
      }
      statusId = rows[0].id;
    }

    // 2) Ambil user id dari cookie jika tidak dikirim
    let finalUserId = user_id ?? null;
    if (finalUserId == null) {
      finalUserId = await getUserIdFromCookie(req);
    }

    // 3) Simpan ke tabel bistay_bookings
    const sql = `
      INSERT INTO bistay_bookings
        (user_id, nama_pemesan, nip, no_wa, status_pegawai_id, asal_kpw, check_in, check_out, keterangan)
      VALUES
        (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const params = [
      finalUserId ?? null,
      nama_pemesan.trim(),
      nip.trim(),
      no_wa.trim(),
      statusId,
      asal_kpw.trim(),
      toMySQLDateTime(check_in),
      toMySQLDateTime(check_out),
      keterangan ?? null,
    ];

    const [result] = await db.execute(sql, params);

    return res.status(201).json({
      ok: true,
      id: result.insertId,
      message: 'Booking BI.STAY berhasil disimpan.',
    });
  } catch (e) {
    console.error('API bistaybooking error:', e);
    return res.status(500).json({ error: 'Terjadi kesalahan pada server.' });
  }
}
