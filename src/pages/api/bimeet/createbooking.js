// /pages/api/bimeet/createbooking.js
import db from '@/lib/db';
import { verifyAuth } from '@/lib/auth';

function toSqlDateTime(isoOrDate) {
  const d = new Date(isoOrDate);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export default async function handler(req, res) {
  /* ===================== GET ===================== */
  if (req.method === 'GET') {
    try {
      const auth = await verifyAuth(req, ['user', 'admin']);
      if (!auth.ok) return res.status(401).json({ error: 'Unauthorized', reason: auth.reason });

      const { userId, role } = auth;
      const statusMap = { pending: 1, approved: 2, rejected: 3, finished: 4 };
      const statusKey = String(req.query.status || '').toLowerCase();
      const statusId = statusMap[statusKey] ?? null;
      const bookingId = req.query.bookingId ? Number(req.query.bookingId) : null;

      let whereSQL = '';
      const params = [];

      // filter booking by user
      if (role === 'user') {
        whereSQL = 'WHERE b.user_id = ?';
        params.push(userId);
      }

      // filter by status
      if (statusId) {
        whereSQL += whereSQL ? ' AND b.status_id = ?' : 'WHERE b.status_id = ?';
        params.push(statusId);
      }

      // filter by id
      if (bookingId) {
        whereSQL += whereSQL ? ' AND b.id = ?' : 'WHERE b.id = ?';
        params.push(bookingId);
      }

      const [rows] = await db.query(
        `
        SELECT
          b.id, b.user_id, b.room_id, r.name AS room_name, r.capacity AS room_capacity,
          b.unit_kerja, b.title, b.description,
          b.start_datetime AS start_date, b.end_datetime AS end_date,
          b.participants, b.contact_phone, b.pic_name,
          b.status_id, b.created_at, b.updated_at
        FROM bimeet_bookings b
        LEFT JOIN bimeet_rooms r ON r.id = b.room_id
        ${whereSQL}
        ORDER BY b.start_datetime DESC

        `,
        params
      );

      if (bookingId) {
        return res.status(200).json({ item: rows[0] || null });
      }
      return res.status(200).json({ items: rows });
    } catch (e) {
      console.error('GET /api/bimeet/createbooking error:', e);
      return res.status(500).json({ error: 'INTERNAL_ERROR', message: e?.message });
    }
  }

  /* ===================== POST ===================== */
  if (req.method === 'POST') {
    try {
      const auth = await verifyAuth(req, ['user']);
      if (!auth.ok) return res.status(401).json({ error: 'Unauthorized', reason: auth.reason });

      const userId = auth.userId;
      const {
        room_id, unit_kerja, title, description,
        start_date, end_date, participants,
        contact_phone, pic_name
      } = req.body || {};

      // validasi field wajib
      const miss = [];
      if (!room_id) miss.push('room_id');
      if (!unit_kerja) miss.push('unit_kerja');
      if (!title) miss.push('title');
      if (!start_date) miss.push('start_date');
      if (!end_date) miss.push('end_date');
      if (!participants) miss.push('participants');
      if (!contact_phone) miss.push('contact_phone');
      if (!pic_name) miss.push('pic_name');
      if (miss.length) return res.status(400).json({ error: `Field wajib: ${miss.join(', ')}` });

      const start = new Date(start_date);
      const end = new Date(end_date);
      if (Number.isNaN(start) || Number.isNaN(end) || end <= start) {
        return res.status(400).json({ error: 'Rentang waktu tidak valid' });
      }

      const participantsNum = parseInt(participants, 10);
      if (!participantsNum || participantsNum <= 0) {
        return res.status(400).json({ error: 'participants harus angka > 0' });
      }

      const [rooms] = await db.query('SELECT capacity FROM bimeet_rooms WHERE id=?', [room_id]);
      if (!rooms.length) return res.status(404).json({ error: 'Ruangan tidak ditemukan' });

      // cek bentrok booking
      const [conflict] = await db.query(
        `SELECT id FROM bimeet_bookings
         WHERE room_id=? AND status_id=2
         AND NOT (end_datetime <= ? OR start_datetime >= ?)
         LIMIT 1`,
        [room_id, toSqlDateTime(start), toSqlDateTime(end)]
      );
      if (conflict.length) {
        return res.status(409).json({ error: 'Jadwal bentrok dengan pemakaian lain' });
      }

      const [result] = await db.query(
        `INSERT INTO bimeet_bookings
        (user_id, room_id, unit_kerja, title, description,
        start_datetime, end_datetime, participants, contact_phone, pic_name,
        status_id, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, NOW(), NOW())`,
        [userId, room_id, unit_kerja, title, description || null,
         toSqlDateTime(start), toSqlDateTime(end),
         participantsNum, contact_phone, pic_name]
      );

      return res.status(201).json({ ok: true, id: result.insertId });
    } catch (e) {
      console.error('POST /api/bimeet/createbooking error:', e);
      return res.status(500).json({ error: 'INTERNAL_ERROR', message: e?.message });
    }
  }

  /* ===================== PUT ===================== */
  if (req.method === 'PUT') {
    try {
      const auth = await verifyAuth(req, ['user', 'admin']);
      if (!auth.ok) return res.status(401).json({ error: 'Unauthorized', reason: auth.reason });

      const { bookingId, newStatusId } = req.body || {};
      const id = Number(bookingId);
      const statusId = Number(newStatusId);

      if (!id || ![1,2,3,4].includes(statusId)) {
        return res.status(400).json({ error: 'Input tidak valid' });
      }

      const [rows] = await db.query('SELECT user_id FROM bimeet_bookings WHERE id=?', [id]);
      if (!rows.length) return res.status(404).json({ error: 'Booking tidak ditemukan' });

      // optional: user hanya boleh update miliknya, kecuali admin
      // if (rows[0].user_id !== auth.userId && auth.role !== 'admin') {
      //   return res.status(403).json({ error: 'Forbidden' });
      // }

      await db.query('UPDATE bimeet_bookings SET status_id=?, updated_at=NOW() WHERE id=?', [statusId, id]);
      return res.status(200).json({ ok: true });
    } catch (e) {
      console.error('PUT /api/bimeet/createbooking error:', e);
      return res.status(500).json({ error: 'INTERNAL_ERROR', message: e?.message });
    }
  }

  res.setHeader('Allow', 'GET, POST, PUT');
  return res.status(405).json({ error: 'Method Not Allowed' });
}
