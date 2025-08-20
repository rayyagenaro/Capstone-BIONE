// /pages/api/bimeal/book.js
import db from '@/lib/db';

const NS_RE = /^[A-Za-z0-9_-]{3,32}$/;
const PENDING_STATUS_ID = 1;

/* ===== auth helpers (user/admin + namespaced) ===== */
function getNsFromReq(req) {
  const v = req.query?.ns ?? req.body?.ns ?? req.cookies?.current_user_ns;
  return (typeof v === 'string' && NS_RE.test(v)) ? v : '';
}
function pickAnySessionToken(cookies = {}) {
  const key = Object.keys(cookies).find((k) =>
    /^user_session__|^admin_session__|^user_session$|^admin_session$/.test(k)
  );
  return key ? cookies[key] : null;
}
async function verifyAuth(req, roles = ['user']) {
  try {
    const ns = getNsFromReq(req);
    const token =
      (ns && (req.cookies?.[`user_session__${ns}`] || req.cookies?.[`admin_session__${ns}`])) ||
      req.cookies?.user_session ||
      req.cookies?.admin_session ||
      pickAnySessionToken(req.cookies);

    if (!token) return { ok: false, reason: 'NO_TOKEN' };

    const { jwtVerify } = await import('jose');
    const secret = process.env.JWT_SECRET;
    if (!secret) return { ok: false, reason: 'NO_SECRET' };

    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret), {
      algorithms: ['HS256'],
      clockTolerance: 10,
    });

    const role = payload?.role || '';
    if (!roles.includes(role)) return { ok: false, reason: 'ROLE' };

    const userId = Number(payload?.sub ?? payload?.user_id ?? payload?.id);
    return { ok: true, payload, userId, role, ns };
  } catch (e) {
    console.error('verifyAuth fail', e);
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
  // ===== GET =====
  if (req.method === 'GET') {
    const isAdminScope = String(req.query?.scope || '').toLowerCase() === 'admin';
    const auth = await verifyAuth(req, isAdminScope ? ['user', 'admin'] : ['user']);
    if (!auth.ok) {
      res.setHeader('Allow', ['GET', 'POST', 'PUT']);
      return res.status(401).json({ error: 'Unauthorized', reason: auth.reason });
    }
    const { ns } = auth;
    if (!ns) return res.status(400).json({ error: 'Namespace (ns) wajib' });

    const requestedUserId = req.query.userId ? Number(req.query.userId) : null;
    const listForUserId =
      isAdminScope && Number.isFinite(requestedUserId) && requestedUserId > 0
        ? requestedUserId
        : (!isAdminScope ? auth.userId : null);

    let conn;
    try {
      conn = await db.getConnection();

      let rows;
      if (listForUserId) {
        [rows] = await conn.query(
          `SELECT id, user_id, nama_pic, nip_pic, no_wa_pic, unit_kerja,
                  waktu_pesanan, status_id, created_at
             FROM bimeal_bookings
            WHERE user_id = ? AND ns = ?
            ORDER BY created_at DESC`,
          [listForUserId, ns]
        );
      } else {
        [rows] = await conn.query(
          `SELECT id, user_id, nama_pic, nip_pic, no_wa_pic, unit_kerja,
                  waktu_pesanan, status_id, created_at
             FROM bimeal_bookings
            WHERE ns = ?
            ORDER BY created_at DESC`,
          [ns]
        );
      }

      const bookings = Array.isArray(rows) ? rows : [];
      if (bookings.length === 0) {
        conn?.release();
        return res.status(200).json([]);
      }

      const ids = bookings.map((r) => r.id);
      const [items] = await conn.query(
        `SELECT booking_id, nama_pesanan, jumlah
           FROM bimeal_booking_items
          WHERE booking_id IN (?)`,
        [ids]
      );

      const itemsMap = {};
      for (const it of Array.isArray(items) ? items : []) {
        (itemsMap[it.booking_id] ||= []).push({ item: it.nama_pesanan, qty: it.jumlah });
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

  // ===== POST =====
  if (req.method === 'POST') {
    const auth = await verifyAuth(req, ['user']);
    if (!auth.ok) {
      res.setHeader('Allow', ['GET', 'POST', 'PUT']);
      return res.status(401).json({ error: 'Unauthorized', reason: auth.reason });
    }
    const { userId, ns } = auth;
    if (!ns) return res.status(400).json({ error: 'Namespace (ns) wajib' });

    let body = {};
    try { body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body; }
    catch { return res.status(400).json({ error: 'Body harus JSON' }); }

    const nama = String(body?.nama || '').trim();
    const nip = String(body?.nip || '').trim();
    const wa = String(body?.wa || '').trim();
    const uker = String(body?.uker || '').trim();
    const tgl = body?.tgl ? new Date(body.tgl) : null;
    const pesanan = normalizeItems(body?.pesanan);

    if (!nama || !nip || !wa || !uker || !tgl || Number.isNaN(tgl.getTime()) || !pesanan.length) {
      return res.status(422).json({ error: 'VALIDATION_ERROR' });
    }

    const waktu_pesanan = toMysqlDatetime(tgl);

    let conn;
    try {
      conn = await db.getConnection();
      await conn.beginTransaction();

      const [result] = await conn.query(
        `INSERT INTO bimeal_bookings
           (user_id, ns, nama_pic, nip_pic, no_wa_pic, unit_kerja, waktu_pesanan, status_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [userId, ns, nama, nip, wa, uker, waktu_pesanan, PENDING_STATUS_ID]
      );
      const bookingId = result.insertId;

      if (pesanan.length) {
        const values = pesanan.map((p) => [bookingId, p.item, p.qty]);
        await conn.query(
          `INSERT INTO bimeal_booking_items (booking_id, nama_pesanan, jumlah)
           VALUES ?`,
          [values]
        );
      }

      await conn.commit();
      return res.status(201).json({ ok: true, booking_id: bookingId, status_id: PENDING_STATUS_ID });
    } catch (e) {
      if (conn) await conn.rollback();
      console.error('POST /api/bimeal/book error:', e?.message, e);
      return res.status(500).json({ error: 'INTERNAL_ERROR', details: e?.message });
    } finally {
      conn?.release();
    }
  }

  // ===== PUT =====
  if (req.method === 'PUT') {
    const auth = await verifyAuth(req, ['user', 'admin']);
    if (!auth.ok) {
      res.setHeader('Allow', ['GET', 'POST', 'PUT']);
      return res.status(401).json({ error: 'Unauthorized', reason: auth.reason });
    }
    const { ns } = auth;
    if (!ns) return res.status(400).json({ error: 'Namespace (ns) wajib' });

    let body = {};
    try { body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body; }
    catch { return res.status(400).json({ error: 'Body harus JSON' }); }

    const bookingId = Number(body?.bookingId);
    const newStatusId = Number(body?.newStatusId);

    if (!Number.isFinite(bookingId) || bookingId <= 0)
      return res.status(400).json({ error: 'bookingId tidak valid' });
    if (![1, 2, 3, 4].includes(newStatusId))
      return res.status(400).json({ error: 'newStatusId harus salah satu dari 1,2,3,4' });

    let conn;
    try {
      conn = await db.getConnection();

      const [own] = await conn.query(
        'SELECT id, user_id FROM bimeal_bookings WHERE id = ? AND ns = ? LIMIT 1',
        [bookingId, ns]
      );
      if (!Array.isArray(own) || own.length === 0) {
        conn?.release();
        return res.status(404).json({ error: 'Booking tidak ditemukan' });
      }
      const isOwner = String(own[0].user_id) === String(auth.userId);
      if (auth.role === 'user' && !isOwner) {
        conn?.release();
        return res.status(403).json({ error: 'Booking bukan milik Anda' });
      }

      const [upd] = await conn.query(
        `UPDATE bimeal_bookings
            SET status_id = ?, updated_at = NOW()
          WHERE id = ? AND ns = ?`,
        [newStatusId, bookingId, ns]
      );

      conn?.release();
      return res.status(200).json({ ok: true, affected: upd.affectedRows });
    } catch (e) {
      conn?.release();
      console.error('PUT /api/bimeal/book error:', e?.message, e);
      return res.status(500).json({ error: 'INTERNAL_ERROR', details: e?.message });
    }
  }

  res.setHeader('Allow', ['GET', 'POST', 'PUT']);
  return res.status(405).json({ error: `Method ${req.method} not allowed` });
}
