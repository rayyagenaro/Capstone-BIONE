// /pages/api/bimeet/createbooking.js
import { jwtVerify } from 'jose';
import db from '@/lib/db';

// ===== Utils
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

// ===== Handler
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
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

    // optional: enforce user role
    if (payload?.role && payload.role !== 'user') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // --- Body
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
      ns, // boleh ikut dikirim dari client, tapi tidak wajib
    } = req.body || {};

    // --- Validasi wajib
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

    // --- Kapasitas ruangan
    const [rooms] = await db.execute(
      'SELECT capacity FROM bimeet_rooms WHERE id = ?',
      [room_id]
    );
    if (!rooms.length) return res.status(404).json({ error: 'Ruangan tidak ditemukan' });
    const capacity = Number(rooms[0].capacity);
    if (participantsNum > capacity) {
      return res.status(400).json({ error: `Melebihi kapasitas (${capacity} org)` });
    }

    // --- Cek bentrok (Approved saja yang mengunci)
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

    // --- Insert (default status = 1/Pending)
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
