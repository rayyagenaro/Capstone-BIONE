// pages/api/bimeal/book.js
import db from '@/lib/db';

const PENDING_STATUS_ID = 1;
const NS_RE = /^[A-Za-z0-9_-]{3,32}$/;

// helper: cari ns dari query / cookie
function getNsFromReq(req) {
  const q = req.query?.ns;
  if (typeof q === 'string' && NS_RE.test(q)) return q;

  // fallback: sticky cookie
  const sticky = req.cookies?.current_user_ns;
  if (typeof sticky === 'string' && NS_RE.test(sticky)) return sticky;

  // fallback terakhir: cek key cookie yang ada
  const keys = Object.keys(req.cookies || {});
  const pref = 'user_session__';
  const found = keys.find((k) => k.startsWith(pref));
  if (found) return found.slice(pref.length);

  return '';
}

// helper: verifikasi token user
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

    if (!payload || payload.role !== 'user') {
      return { ok: false, reason: 'ROLE' };
    }

    return { ok: true, payload, ns };
  } catch (e) {
    console.error('verifyUser fail', e);
    return { ok: false, reason: 'VERIFY_FAIL' };
  }
}

// normalisasi pesanan [{item, qty}] + sanitasi
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

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }

  // auth
  const auth = await verifyUser(req);
  if (!auth.ok) {
    return res.status(401).json({ error: 'Unauthorized', reason: auth.reason });
  }

  // parse body
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

  // validasi
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

  // konversi Date JS -> 'YYYY-MM-DD HH:mm:ss'
  const toMysqlDatetime = (d) =>
    new Date(d.getTime() - d.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 19)
      .replace('T', ' ');

  const waktu_pesanan = toMysqlDatetime(tgl);

  let conn;
  try {
    conn = await db.getConnection();
    await conn.beginTransaction();

    const [result] = await conn.query(
      `
      INSERT INTO bimeal_bookings
        (nama_pic, nip_pic, no_wa_pic, unit_kerja, waktu_pesanan, status_id)
      VALUES (?, ?, ?, ?, ?, ?)
      `,
      [nama, nip, wa, uker, waktu_pesanan, PENDING_STATUS_ID]
    );

    const bookingId = result.insertId;

    const values = pesanan.map((p) => [bookingId, p.item, p.qty]);
    await conn.query(
      `
      INSERT INTO bimeal_booking_items
        (booking_id, nama_pesanan, jumlah)
      VALUES ?
      `,
      [values]
    );

    await conn.commit();
    return res.status(201).json({
      ok: true,
      booking_id: bookingId,
      status_id: PENDING_STATUS_ID,
      message: 'Booking BI.MEAL berhasil dibuat',
    });
  } catch (e) {
    if (conn) await conn.rollback();
    console.error('bimeal/book error:', e);
    return res.status(500).json({ error: 'INTERNAL_ERROR' });
  } finally {
    if (conn) conn.release();
  }
}
