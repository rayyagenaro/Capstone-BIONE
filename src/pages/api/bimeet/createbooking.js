// /pages/api/bimeet/createbooking.js
import { jwtVerify } from 'jose';
import db from '@/lib/db';

const NS_RE = /^[A-Za-z0-9_-]{3,32}$/;

function toSqlDateTime(isoOrDate) {
  const d = new Date(isoOrDate);
  const pad = (n) => String(n).padStart(2, '0');
  const y = d.getFullYear();
  const m = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const h = pad(d.getHours());
  const mi = pad(d.getMinutes());
  const s = pad(d.getSeconds());
  return `${y}-${m}-${day} ${h}:${mi}:${s}`;
}

function pickAnyUserSessionCookie(cookies = {}) {
  const key = Object.keys(cookies).find((k) => /^user_session__/.test(k));
  return key ? cookies[key] : null;
}

function getUserToken(req) {
  const nsRaw = req.query?.ns ?? req.body?.ns;
  const ns = typeof nsRaw === 'string' && NS_RE.test(nsRaw) ? nsRaw : '';
  const token =
    (ns && req.cookies?.[`user_session__${ns}`]) ||
    req.cookies?.user_session ||
    pickAnyUserSessionCookie(req.cookies);

  return { token, ns };
}

async function verifyTokenToUserId(req) {
  const { token } = getUserToken(req);
  if (!token) return { ok: false, userId: null };

  const secret = process.env.JWT_SECRET;
  if (!secret) return { ok: false, userId: null };

  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret), {
      algorithms: ['HS256'],
      clockTolerance: 10,
    });
    const uid = payload?.user_id ?? payload?.id ?? payload?.sub ?? null;
    return { ok: true, userId: uid ? Number(uid) : null, payload };
  } catch {
    return { ok: false, userId: null };
  }
}

export default async function handler(req, res) {
  // =========== GET: ambil daftar booking BI.Meet milik user ===========
  if (req.method === 'GET') {
    let conn;
    try {
      // filter by explicit query OR by token
      const userIdQ = req.query.userId ? Number(req.query.userId) : null;

      let userId = Number.isFinite(userIdQ) && userIdQ > 0 ? userIdQ : null;
      if (!userId) {
        const v = await verifyTokenToUserId(req);
        if (v.ok && v.userId) userId = v.userId;
      }
      if (!userId) {
        return res.status(400).json({ error: 'userId tidak ditemukan (query atau token)' });
      }

      // optional status filter: pending|approved|rejected|finished
      const statusMap = { pending: 1, approved: 2, rejected: 3, finished: 4 };
      const statusKey = String(req.query.status || '').toLowerCase();
      const statusId = statusMap[statusKey] ?? null;

      const params = [userId];
      let whereSQL = 'WHERE b.user_id = ?';
      if (statusId) {
        whereSQL += ' AND b.status_id = ?';
        params.push(statusId);
      }

      conn = await db.getConnection();
      const [rows] = await conn.execute(
        `
        SELECT
          b.id, b.user_id, b.room_id, r.name AS room_name, r.capacity,
          b.unit_kerja, b.title, b.description,
          b.start_datetime, b.end_datetime,
          b.participants, b.contact_phone, b.pic_name,
          b.status_id, b.created_at, b.updated_at
        FROM bimeet_bookings b
        LEFT JOIN bimeet_rooms r ON r.id = b.room_id
        ${whereSQL}
        ORDER BY b.start_datetime DESC
        `,
        params
      );
      conn.release();

      return res.status(200).json({ items: rows });
    } catch (e) {
      try { conn?.release(); } catch {}
      console.error('GET /api/bimeet/createbooking error:', e);
      return res.status(500).json({
        error: 'INTERNAL_ERROR',
        message: e?.message,
        code: e?.code,
        sqlMessage: e?.sqlMessage,
      });
    }
  }

  // =========== POST: buat booking (kode kamu yang sudah ada) ===========
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    // --- Auth (namespaced aware)
    const { token } = getUserToken(req);
    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      console.error('Missing JWT_SECRET');
      return res.status(500).json({ error: 'Server misconfig' });
    }

    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret), {
      algorithms: ['HS256'],
      clockTolerance: 10,
    });

    if (payload?.role && payload.role !== 'user') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const {
      user_id,
      room_id,
      unit_kerja,
      title,
      description,
      start_datetime,
      end_datetime,
      participants,
      contact_phone,
      pic_name,
    } = req.body || {};

    const miss = [];
    if (!room_id) miss.push('room_id');
    if (!unit_kerja) miss.push('unit_kerja');
    if (!title) miss.push('title');
    if (!start_datetime) miss.push('start_datetime');
    if (!end_datetime) miss.push('end_datetime');
    if (!participants) miss.push('participants');
    if (!contact_phone) miss.push('contact_phone');
    if (!pic_name) miss.push('pic_name');
    if (miss.length) return res.status(400).json({ error: `Field wajib: ${miss.join(', ')}` });

    const start = new Date(start_datetime);
    const end = new Date(end_datetime);
    if (Number.isNaN(start.valueOf()) || Number.isNaN(end.valueOf()) || end <= start) {
      return res.status(400).json({ error: 'Rentang waktu tidak valid' });
    }

    const participantsNum = Number.parseInt(participants, 10);
    if (!Number.isFinite(participantsNum) || participantsNum <= 0) {
      return res.status(400).json({ error: 'participants harus angka > 0' });
    }

    const [rooms] = await db.execute(
      'SELECT capacity FROM bimeet_rooms WHERE id = ?',
      [room_id]
    );
    if (!rooms.length) return res.status(404).json({ error: 'Ruangan tidak ditemukan' });
    const capacity = Number(rooms[0].capacity);
    if (participantsNum > capacity) {
      return res.status(400).json({ error: `Melebihi kapasitas (${capacity} org)` });
    }

    const [conflict] = await db.execute(
      `SELECT id FROM bimeet_bookings
       WHERE room_id = ?
         AND status_id = 2
         AND NOT (end_datetime <= ? OR start_datetime >= ?)
       LIMIT 1`,
      [room_id, toSqlDateTime(start), toSqlDateTime(end)]
    );
    if (conflict.length) {
      return res.status(409).json({ error: 'Jadwal bentrok dengan pemakaian lain' });
    }

    const userIdFromToken = payload?.user_id ?? payload?.id ?? payload?.sub ?? null;

    const [result] = await db.execute(
      `INSERT INTO bimeet_bookings
        (user_id, room_id, unit_kerja, title, description,
         start_datetime, end_datetime, participants, contact_phone, pic_name, status_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, NOW(), NOW())`,
      [
        user_id || userIdFromToken,
        room_id,
        unit_kerja,
        title,
        description || null,
        toSqlDateTime(start),
        toSqlDateTime(end),
        participantsNum,
        contact_phone,
        pic_name,
      ]
    );

    return res.status(200).json({ ok: true, id: result.insertId });
  } catch (e) {
    console.error('createbooking error:', e);
    return res.status(500).json({
      error: 'Server error',
      message: e?.message,
      code: e?.code,
      sqlMessage: e?.sqlMessage,
      sqlState: e?.sqlState,
    });
  }
}
