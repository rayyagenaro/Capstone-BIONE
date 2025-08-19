// pages/api/BIstaybook/bistaybooking.js
import db from '@/lib/db';
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

function toInt(value, fallback) {
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

const ALLOWED_SORT = new Set([
  'id',
  'nama_pemesan',
  'nip',
  'check_in',
  'check_out',
  'created_at',
]);

/* ---------- Handler ---------- */

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      // Query params:
      // - id: number (jika diset -> fetch detail)
      // - page: number (default 1)
      // - limit: number (default 10)
      // - q: string (search nama_pemesan/nip/no_wa/asal_kpw)
      // - from, to: date string (filter rentang tanggal berdasarkan check_in/check_out)
      // - orderBy: field (whitelist)
      // - order: ASC|DESC
      // - mine: "1" untuk hanya data milik user (berdasarkan cookie)
      const {
        id,
        page = '1',
        limit = '10',
        q = '',
        from = '',
        to = '',
        orderBy = 'created_at',
        order = 'DESC',
        mine = '0',
      } = req.query || {};

      // Detail by id
      if (id) {
        const [rows] = await db.execute(
          `
          SELECT
            b.id,
            b.user_id,
            b.nama_pemesan,
            b.nip,
            b.no_wa,
            b.status_pegawai_id,
            sp.status AS status_pegawai,
            b.asal_kpw,
            b.check_in,
            b.check_out,
            b.keterangan,
            b.created_at,
            b.updated_at
          FROM bistay_bookings b
          LEFT JOIN bistay_status_pegawai sp ON sp.id = b.status_pegawai_id
          WHERE b.id = ?
          LIMIT 1
        `,
          [id]
        );
        if (!rows?.length) return res.status(404).json({ error: 'Data tidak ditemukan' });

        // Opsi: batasi ke milik user
        if (mine === '1') {
          const uid = await getUserIdFromCookie(req);
          if (!uid || String(rows[0].user_id ?? '') !== String(uid)) {
            return res.status(403).json({ error: 'Tidak berhak mengakses data ini.' });
          }
        }

        return res.status(200).json({ ok: true, data: rows[0] });
      }

      // List with filters
      const pageNum = toInt(page, 1);
      const limitNum = toInt(limit, 10);
      const offset = (pageNum - 1) * limitNum;

      const where = [];
      const params = [];

      if (q) {
        where.push(`(b.nama_pemesan LIKE ? OR b.nip LIKE ? OR b.no_wa LIKE ? OR b.asal_kpw LIKE ?)`);
        const like = `%${q}%`;
        params.push(like, like, like, like);
      }

      if (from) {
        where.push(`b.check_in >= ?`);
        params.push(toMySQLDateTime(from));
      }
      if (to) {
        where.push(`b.check_out <= ?`);
        params.push(toMySQLDateTime(to));
      }

      if (mine === '1') {
        const uid = await getUserIdFromCookie(req);
        if (!uid) return res.status(401).json({ error: 'Butuh login untuk melihat data Anda.' });
        where.push(`b.user_id = ?`);
        params.push(uid);
      }

      const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

      const sortField = ALLOWED_SORT.has(String(orderBy)) ? String(orderBy) : 'created_at';
      const sortDir = String(order).toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

      const [rows] = await db.execute(
        `
        SELECT
          b.id,
          b.user_id,
          b.nama_pemesan,
          b.nip,
          b.no_wa,
          b.status_pegawai_id,
          sp.status AS status_pegawai,
          b.asal_kpw,
          b.check_in,
          b.check_out,
          b.keterangan,
          b.created_at,
          b.updated_at
        FROM bistay_bookings b
        LEFT JOIN bistay_status_pegawai sp ON sp.id = b.status_pegawai_id
        ${whereSql}
        ORDER BY b.${sortField} ${sortDir}
        LIMIT ? OFFSET ?
      `,
        [...params, limitNum, offset]
      );

      const [[{ total }]] = await db.execute(
        `
        SELECT COUNT(*) AS total
        FROM bistay_bookings b
        ${whereSql}
      `,
        params
      );

      return res.status(200).json({
        ok: true,
        data: rows,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.max(1, Math.ceil(total / limitNum)),
        },
      });
    } catch (e) {
      console.error('API bistaybooking GET error:', e);
      return res.status(500).json({ error: 'Terjadi kesalahan pada server.' });
    }
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      user_id,
      nama_pemesan,
      nip,
      no_wa,
      status,
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

    // Map status -> status_pegawai_id
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

    // Ambil user id dari cookie jika tidak dikirim
    let finalUserId = user_id ?? null;
    if (finalUserId == null) {
      finalUserId = await getUserIdFromCookie(req);
    }

    // Simpan ke tabel
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
