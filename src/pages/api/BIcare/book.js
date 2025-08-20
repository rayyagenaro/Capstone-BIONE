// /pages/api/BIcare/book.js
import db from '@/lib/db';

const NS_RE = /^[A-Za-z0-9_-]{3,32}$/;

/* ========== NS-aware helpers (user + admin) ========== */
function getNsFromReq(req) {
  // 1) dari query ?ns=
  const q = req.query?.ns;
  if (typeof q === 'string' && NS_RE.test(q)) return q;

  // 2) dari sticky ns
  const sticky = req.cookies?.current_user_ns;
  if (typeof sticky === 'string' && NS_RE.test(sticky)) return sticky;

  // 3) tebak dari nama cookie user/admin
  const keys = Object.keys(req.cookies || {});
  const u = keys.find((k) => k.startsWith('user_session__'));
  const a = keys.find((k) => k.startsWith('admin_session__'));
  if (u) return u.slice('user_session__'.length);
  if (a) return a.slice('admin_session__'.length);

  return '';
}

async function verifyUser(req) {
  try {
    const ns = getNsFromReq(req);
    if (!ns) return { ok: false, reason: 'NO_NS' };

    const scope = String(req.query?.scope || '').toLowerCase(); // "" | "admin"
    const cookieName = scope === 'admin' ? `admin_session__${ns}` : `user_session__${ns}`;
    const token = req.cookies?.[cookieName];
    if (!token) return { ok: false, reason: 'NO_TOKEN' };

    const { jwtVerify } = await import('jose');
    const secret = process.env.JWT_SECRET;
    if (!secret) return { ok: false, reason: 'NO_SECRET' };

    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret), {
      algorithms: ['HS256'],
      clockTolerance: 10,
    });

    const role = payload?.role;
    const roleOk = scope === 'admin' ? role === 'admin' : (role === 'user' || role === 'admin');
    if (!roleOk) return { ok: false, reason: 'ROLE' };

    return { ok: true, payload, ns, scope };
  } catch (e) {
    console.error('verifyUser(BCare) fail:', e);
    return { ok: false, reason: 'VERIFY_FAIL' };
  }
}

/* ========== time helpers (tidak berubah) ========== */
function toMinutes(hms){const [H,M]=String(hms).split(':').map((x)=>parseInt(x,10));return (H||0)*60+(M||0)}
function toHHMM(mins){const h=Math.floor(mins/60);const m=mins%60;return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`}
function expandSlots(start_time,end_time,step){const s=toMinutes(start_time),e=toMinutes(end_time),out=[];for(let t=s;t<e;t+=step)out.push(toHHMM(t));return out}
const DOW=['SUN','MON','TUE','WED','THU','FRI','SAT'];

/* ========== handler ========== */
export default async function handler(req, res) {
  try {
    const auth = await verifyUser(req);
    if (!auth.ok) {
      res.setHeader('Allow', ['GET', 'POST']);
      return res.status(401).json({ error: 'Unauthorized', reason: auth.reason });
    }
    const userIdFromToken = Number(auth.payload.sub);

    // ===== GET =====
    if (req.method === 'GET') {
      try {
        // Admin dapat melihat semuanya (silakan tambah pagination/filter kalau perlu)
        if (auth.scope === 'admin') {
          const [rows] = await db.query(
            `SELECT id, user_id, doctor_id, booking_date, slot_time, status,
                    booker_name, nip, wa, patient_name, patient_status,
                    gender, birth_date, complaint, created_at
               FROM dmove_db1.bicare_bookings
              ORDER BY booking_date DESC, slot_time DESC`
          );
          return res.status(200).json(Array.isArray(rows) ? rows : []);
        }

        // User biasa: tetap logika lama (by userId/wa atau fallback ke token)
        const userIdQ = Number(req.query.userId || 0);
        const wa = String(req.query.wa || '').trim();
        const effectiveUserId = userIdQ > 0 ? userIdQ : (wa ? 0 : userIdFromToken || 0);

        if (!effectiveUserId && !wa) {
          return res.status(400).json({ error: 'userId atau wa wajib diisi (atau login yang valid)' });
        }

        let rows = [];
        if (effectiveUserId) {
          const [r] = await db.query(
            `SELECT id, user_id, doctor_id, booking_date, slot_time, status,
                    booker_name, nip, wa, patient_name, patient_status,
                    gender, birth_date, complaint, created_at
               FROM dmove_db1.bicare_bookings
              WHERE user_id = ?
              ORDER BY booking_date DESC, slot_time DESC`,
            [effectiveUserId]
          );
          rows = Array.isArray(r) ? r : [];
        } else {
          const [r] = await db.query(
            `SELECT id, user_id, doctor_id, booking_date, slot_time, status,
                    booker_name, nip, wa, patient_name, patient_status,
                    gender, birth_date, complaint, created_at
               FROM dmove_db1.bicare_bookings
              WHERE wa = ?
              ORDER BY booking_date DESC, slot_time DESC`,
            [wa]
          );
          rows = Array.isArray(r) ? r : [];
          if (rows.length && userIdFromToken > 0) {
            await db.query(
              `UPDATE dmove_db1.bicare_bookings
                  SET user_id = ?
                WHERE wa = ? AND (user_id IS NULL OR user_id = 0)`,
              [userIdFromToken, wa]
            );
          }
        }

        return res.status(200).json(rows);
      } catch (e) {
        console.error('GET /api/BIcare/book error:', e);
        return res.status(500).json({ error: 'Gagal ambil data BI.Care' });
      }
    }

    // ===== POST (tidak berubah) =====
    if (req.method === 'POST') {
      // ... (blok POST kamu tetap, tak perlu diubah)
      // pastikan tetap pakai userIdFromToken sebagai fallback
    }

    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  } catch (e) {
    console.error('POST /api/BIcare/book error:', e?.message, e);
    return res.status(500).json({ error: 'INTERNAL_ERROR', details: e?.message });
  }
}
