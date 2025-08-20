// /pages/api/bimeal/book.js
import db from '@/lib/db';

const NS_RE = /^[A-Za-z0-9_-]{3,32}$/;
const PENDING_STATUS_ID = 1;

/* ===== auth helpers ===== */
function getNsFromReq(req) {
  const q = req.query?.ns;
  if (typeof q === 'string' && NS_RE.test(q)) return q;
  const sticky = req.cookies?.current_user_ns;
  if (typeof sticky === 'string' && NS_RE.test(sticky)) return sticky;
  const keys = Object.keys(req.cookies || {});
  const pref = 'user_session__';
  const found = keys.find((k) => k.startsWith(pref));
  if (found) return found.slice(pref.length);
  return '';
}

async function verifyUser(req) {
  try {
    const ns = getNsFromReq(req);
    if (!ns) return { ok: false, reason: 'NO_NS' };
    const cookieName = `user_session__${ns}`;
    const token = req.cookies?.[cookieName];
    if (!token) return { ok: false, reason: 'NO_TOKEN' };
    const { jwtVerify } = await import('jose');
    const secret = process.env.JWT_SECRET;
    if (!secret) return { ok: false, reason: 'NO_SECRET' };
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret), {
      algorithms: ['HS256'],
      clockTolerance: 10,
    });
    if (!payload || payload.role !== 'user') return { ok: false, reason: 'ROLE' };
    return { ok: true, payload, ns };
  } catch (e) {
    console.error('verifyUser fail', e);
    return { ok: false, reason: 'VERIFY_FAIL' };
  }
}

/* ===== utils ===== */
function normalizeItems(items) {
  if (!Array.isArray(items)) return [];
  return items
    .map((x) => {
      const item = (typeof x === 'string' ? x : x?.item) ?? '';
      const qtyNum = Number((typeof x === 'string' ? 1 : x?.qty) ?? 1);
      const qty = Number.isFinite(qtyNum) ? Math.max(1, Math.min(999, qtyNum)) : 1;
      return { item: String(item).trim(), qty };
    })
    .filter((r) => r.item.length > 0);
}
const toMysqlDatetime = (d) =>
  new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 19)
    .replace('T', ' ');

/* ===== handler ===== */
export default async function handler(req, res) {
  const auth = await verifyUser(req);
  if (!auth.ok) {
    res.setHeader('Allow', ['GET', 'POST', 'PUT']);
    return res.status(401).json({ error: 'Unauthorized', reason: auth.reason });
  }
  const userId = Number(auth.payload.sub);

  if (req.method === 'GET') {
    let conn;
    try {
      conn = await db.getConnection();

      // 1) ambil header booking milik user
      const [rows] = await conn.query(
        `
        SELECT
          b.id,
          b.user_id,
          b.nama_pic,
          b.nip_pic,
          b.no_wa_pic,
          b.unit_kerja,
          b.waktu_pesanan,
          b.status_id,
          b.created_at
        FROM bimeal_bookings b
        WHERE b.user_id = ?
        ORDER BY b.created_at DESC
        `,
        [userId]
      );

      const bookings = Array.isArray(rows) ? rows : [];
      if (bookings.length === 0) {
        conn?.release();
        return res.status(200).json([]);
      }

      // 2) ambil items
      const ids = bookings.map((r) => r.id);
      const [items] = await conn.query(
        `
        SELECT booking_id, nama_pesanan, jumlah
        FROM bimeal_booking_items
        WHERE booking_id IN (?)
        ORDER BY booking_id, id
        `,
        [ids]
      );

      const itemsArr = Array.isArray(items) ? items : [];
      const itemsMap = {};
      for (const it of itemsArr) {
        const bid = it.booking_id;
        if (!itemsMap[bid]) itemsMap[bid] = [];
        itemsMap[bid].push({ item: it.nama_pesanan, qty: it.jumlah });
      }

      const result = bookings.map((b) => ({ ...b, items: itemsMap[b.id] || [] }));
      conn?.release();
      return res.status(200).json(result);
    } catch (e) {
      conn?.release();
      console.error('GET /api/bimeal/book error:', e?.message, e);
      return res.status(500).json({ error: 'INTERNAL_ERROR', details: e?.message });
    }
  }

  if (req.method === 'POST') {
    let body = {};
    try {
      body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    } catch {
      return res.status(400).json({ error: 'Body harus JSON' });
    }

    const nama = String(body?.nama || '').trim();
    const nip = String(body?.nip || '').trim();
    const wa = String(body?.wa || '').trim();
    const uker = String(body?.uker || '').trim();
    const tgl = body?.tgl ? new Date(body.tgl) : null;
    const pesanan = normalizeItems(body?.pesanan);

    const errors = {};
    if (!nama) errors.nama = 'Nama wajib diisi';
    if (!nip) errors.nip = 'NIP wajib diisi';
    if (!wa) errors.wa = 'No WA wajib diisi';
    if (!uker) errors.uker = 'Unit Kerja wajib dipilih';
    if (!tgl || Number.isNaN(tgl.getTime())) errors.tgl = 'Tanggal pesanan tidak valid';
    if (!pesanan.length) errors.pesanan = 'Minimal satu pesanan diisi';
    if (Object.keys(errors).length) {
      return res.status(422).json({ error: 'VALIDATION_ERROR', details: errors });
    }

    const waktu_pesanan = toMysqlDatetime(tgl);

    let conn;
    try {
      conn = await db.getConnection();
      await conn.beginTransaction();

      const [result] = await conn.query(
        `
        INSERT INTO bimeal_bookings
          (user_id, nama_pic, nip_pic, no_wa_pic, unit_kerja, waktu_pesanan, status_id)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        `,
        [userId, nama, nip, wa, uker, waktu_pesanan, PENDING_STATUS_ID]
      );
      const bookingId = result.insertId;

      if (pesanan.length) {
        const values = pesanan.map((p) => [bookingId, p.item, p.qty]);
        await conn.query(
          `
          INSERT INTO bimeal_booking_items
            (booking_id, nama_pesanan, jumlah)
          VALUES ?
          `,
          [values]
        );
      }

      await conn.commit();
      return res.status(201).json({
        ok: true,
        booking_id: bookingId,
        status_id: PENDING_STATUS_ID,
        message: 'Booking BI.MEAL berhasil dibuat',
      });
    } catch (e) {
      if (conn) await conn.rollback();
      console.error('POST /api/bimeal/book error:', e?.message, e);
      return res.status(500).json({ error: 'INTERNAL_ERROR', details: e?.message });
    } finally {
      conn?.release();
    }
  }

  // ===== PUT: update status booking (Finish, Approve/Reject, dll) =====
  if (req.method === 'PUT') {
    let body = {};
    try {
      body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    } catch {
      return res.status(400).json({ error: 'Body harus JSON' });
    }

    const bookingId = Number(body?.bookingId);
    const newStatusId = Number(body?.newStatusId);
    const reason = typeof body?.reason === 'string' ? body.reason.trim() : null;

    if (!Number.isFinite(bookingId) || bookingId <= 0) {
      return res.status(400).json({ error: 'bookingId tidak valid' });
    }
    if (![1, 2, 3, 4].includes(newStatusId)) {
      return res.status(400).json({ error: 'newStatusId harus salah satu dari 1,2,3,4' });
    }

    let conn;
    try {
      conn = await db.getConnection();

      // Pastikan booking milik user yang login
      const [chk] = await conn.query(
        'SELECT id FROM bimeal_bookings WHERE id = ? AND user_id = ? LIMIT 1',
        [bookingId, userId]
      );
      if (!Array.isArray(chk) || chk.length === 0) {
        conn?.release();
        return res.status(404).json({ error: 'Booking tidak ditemukan atau bukan milik Anda' });
      }

      // Jika kamu punya kolom untuk alasan penolakan, aktifkan query berikut
      // const [upd] = await conn.query(
      //   `UPDATE bimeal_bookings
      //     SET status_id = ?, rejection_reason = ?, updated_at = NOW()
      //    WHERE id = ? AND user_id = ?`,
      //   [newStatusId, newStatusId === 3 ? (reason || null) : null, bookingId, userId]
      // );

      const [upd] = await conn.query(
        `UPDATE bimeal_bookings
           SET status_id = ?, updated_at = NOW()
         WHERE id = ? AND user_id = ?`,
        [newStatusId, bookingId, userId]
      );

      if (upd.affectedRows === 0) {
        conn?.release();
        return res.status(404).json({ error: 'Booking tidak ditemukan' });
      }

      conn?.release();
      return res.status(200).json({ ok: true });
    } catch (e) {
      conn?.release();
      console.error('PUT /api/bimeal/book error:', e?.message, e);
      return res.status(500).json({ error: 'INTERNAL_ERROR', details: e?.message });
    }
  }

  res.setHeader('Allow', ['GET', 'POST', 'PUT']);
  return res.status(405).json({ error: `Method ${req.method} not allowed` });
}
