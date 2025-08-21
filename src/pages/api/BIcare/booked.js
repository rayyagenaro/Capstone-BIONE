// /pages/api/BIcare/booked.js
import db from '@/lib/db';
import { jwtVerify } from 'jose';

/* ===================== Helpers waktu & slot ===================== */
function toMinutes(hms) {
  const [H, M] = String(hms || '').split(':').map((x) => parseInt(x, 10));
  return (H || 0) * 60 + (M || 0);
}
function toHHMM(mins) {
  const h = Math.floor((mins || 0) / 60);
  const m = (mins || 0) % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}
function expandSlots(start_time, end_time, stepMinutes = 30) {
  const start = toMinutes(start_time);
  const end = toMinutes(end_time);
  const out = [];
  for (let t = start; t < end; t += stepMinutes) out.push(toHHMM(t));
  return out;
}
const DOW = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
function toYmd(val) {
  if (val instanceof Date) {
    const d = new Date(val.getTime() - val.getTimezoneOffset() * 60000);
    return d.toISOString().slice(0, 10);
  }
  const s = String(val || '');
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) {
    const d2 = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
    return d2.toISOString().slice(0, 10);
  }
  return '';
}

/* ===================== NS + Auth ===================== */
const NS_RE = /^[A-Za-z0-9_-]{3,32}$/;
function getNsFromReq(req) {
  const q = req.query?.ns;
  if (typeof q === 'string' && NS_RE.test(q)) return q;
  const stickyUser = req.cookies?.current_user_ns;
  if (typeof stickyUser === 'string' && NS_RE.test(stickyUser)) return stickyUser;
  const stickyAdmin = req.cookies?.current_admin_ns;
  if (typeof stickyAdmin === 'string' && NS_RE.test(stickyAdmin)) return stickyAdmin;
  const keys = Object.keys(req.cookies || {});
  for (const pref of ['user_session__', 'admin_session__']) {
    const found = keys.find((k) => k.startsWith(pref));
    if (found) return found.slice(pref.length);
  }
  return '';
}
function getBearerToken(req) {
  const h = req.headers?.authorization || req.headers?.Authorization;
  if (!h || typeof h !== 'string') return null;
  const m = /^Bearer\s+(.+)$/.exec(h);
  return m ? m[1] : null;
}
function findToken(req, ns, scopeHint) {
  const prefOrder =
    scopeHint === 'admin'
      ? [`admin_session__${ns}`, `user_session__${ns}`]
      : [`user_session__${ns}`, `admin_session__${ns}`];
  for (const name of prefOrder) {
    const val = req.cookies?.[name];
    if (val) return { token: val, source: `cookie:${name}` };
  }
  const bearer = getBearerToken(req);
  if (bearer) return { token: bearer, source: 'bearer' };
  return { token: null, source: null };
}
async function verifyUser(req) {
  try {
    const ns = getNsFromReq(req);
    if (!ns) return { ok: false, reason: 'NO_NS' };
    const scope = String(req.query?.scope || 'user').toLowerCase();
    const { token, source } = findToken(req, ns, scope);
    if (!token) return { ok: false, reason: `NO_TOKEN_${scope.toUpperCase()}` };
    const secret = process.env.JWT_SECRET;
    if (!secret) return { ok: false, reason: 'NO_SECRET' };
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret), {
      algorithms: ['HS256'],
      clockTolerance: 10,
    });
    if (payload?.ns && String(payload.ns) !== ns) return { ok: false, reason: 'NS_MISMATCH' };

    const roleRaw = payload?.role ?? payload?.role_name ?? (payload?.roleId ?? payload?.role_id);
    let isAdmin = false;
    let role = 'user';
    if (typeof roleRaw === 'string') {
      if (/^super\s*admin$/i.test(roleRaw) || /^admin$/i.test(roleRaw) || /admin/i.test(roleRaw)) {
        isAdmin = true; role = 'admin';
      }
    } else if (typeof roleRaw === 'number') {
      if ([1, 2].includes(Number(roleRaw))) { isAdmin = true; role = 'admin'; }
    }
    const userId = Number(payload?.sub ?? payload?.user_id ?? payload?.id ?? payload?.uid);
    if (!userId) return { ok: false, reason: 'NO_USERID' };
    return { ok: true, ns, userId, role, isAdmin, payload, tokenSource: source };
  } catch (e) {
    console.error('verifyUser BIcare fail:', e);
    return { ok: false, reason: e?.name || 'VERIFY_FAIL' };
  }
}

/* ===================== Handler ===================== */
export default async function handler(req, res) {
  /* ---------- PUT: finish booking bila slot (30m) sudah lewat ---------- */
  if (req.method === 'PUT') {
    try {
      const id = Number(req.body?.bookingId ?? req.body?.id);
      if (!Number.isFinite(id) || id <= 0) {
        return res.status(400).json({ error: 'bookingId tidak valid' });
      }

      // Back-compat: kalau client kirim "status", hanya terima "Finished"
      const bodyStatus = (req.body?.status ?? '').toString().trim();
      if (bodyStatus && !/^finished$/i.test(bodyStatus)) {
        return res.status(400).json({ error: "Status wajib 'Finished'." });
      }

      const auth = await verifyUser(req);
      if (!auth.ok) return res.status(401).json({ error: 'Unauthorized', reason: auth.reason });

      const scope = String(req.query?.scope || 'user').toLowerCase();

      // 1) Ambil row (hanya kolom yang memang ada di tabel)
      const [rows] = await db.query(
        `SELECT id, user_id, doctor_id, booking_date, slot_time, status
           FROM bicare_bookings
          WHERE id = ?`,
        [id]
      );
      if (rows.length === 0) return res.status(404).json({ error: 'NOT_FOUND' });

      const b = rows[0];

      // 2) Otorisasi pemilik (kecuali admin). user_id bisa NULL (admin block) => bukan milik user.
      if (scope !== 'admin' && b.user_id !== auth.userId) {
        return res.status(403).json({ error: 'NOT_YOURS' });
      }

      // 3) Idempotensi & validasi status enum('Booked','Finished')
      const curStatus = String(b.status || '');
      if (/^finished$/i.test(curStatus)) {
        return res.status(200).json({ ok: true, id, status: 'Finished', already: true });
      }
      if (!/^booked$/i.test(curStatus)) {
        return res.status(409).json({ error: 'ILLEGAL_STATE', from: b.status, want: 'Finished' });
      }

      // 4) Hitung waktu akhir slot = booking_date + slot_time + 30 menit (fixed)
      const [[nowRow]] = await db.query(
        `SELECT CONVERT_TZ(UTC_TIMESTAMP(), '+00:00', '+07:00') AS now_jkt`
      );
      const [[endRow]] = await db.query(
        `SELECT TIMESTAMP(?, TIME(?)) + INTERVAL 30 MINUTE AS slot_end`,
        [b.booking_date, b.slot_time]
      );
      const nowJkt = new Date(nowRow.now_jkt);
      const slotEnd = new Date(endRow.slot_end);

      if (Number.isFinite(slotEnd.valueOf()) && nowJkt < slotEnd) {
        return res.status(409).json({ error: 'NOT_YET', end_time: endRow.slot_end });
      }

      // 5) Update (idempotent safeguard)
      const [upd] = await db.query(
        `UPDATE bicare_bookings
            SET status = 'Finished'
          WHERE id = ? AND UPPER(status) = 'BOOKED'`,
        [id]
      );

      if (upd.affectedRows === 0) {
        // mungkin sudah di-auto-finish oleh GET
        const [[chk]] = await db.query(`SELECT status FROM bicare_bookings WHERE id = ?`, [id]);
        if (chk && /^finished$/i.test(chk.status)) {
          return res.status(200).json({ ok: true, id, status: 'Finished', already: true });
        }
        return res.status(409).json({ error: 'CONFLICT_UNKNOWN' });
      }

      return res.status(200).json({ ok: true, id, status: 'Finished' });
    } catch (e) {
      console.error('PUT /api/BIcare/booked error:', e);
      return res.status(500).json({ error: 'INTERNAL_ERROR', details: e?.message });
    }
  }

  /* ---------- GET: Mode Kalender & Listing ---------- */
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET, PUT');
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }

  const auth = await verifyUser(req);
  if (!auth.ok) {
    res.setHeader('Allow', 'GET, PUT');
    return res.status(401).json({ error: 'Unauthorized', reason: auth.reason });
  }

  const scope = String(req.query.scope || 'user').toLowerCase();
  if (scope === 'admin' && !auth.isAdmin) {
    return res.status(403).json({ error: 'FORBIDDEN', reason: 'ADMIN_SCOPE_ONLY' });
  }

  // ===== Branch A: Kalender =====
  const monthStr = String(req.query.month || '').trim();
  const isCalendar = /^\d{4}-\d{2}$/.test(monthStr);
  if (isCalendar) {
    const doctorId = Number(req.query.doctorId || req.query.doctor_id || 0);
    if (!Number.isFinite(doctorId) || doctorId <= 0) {
      return res.status(400).json({ error: 'Param doctorId tidak valid' });
    }

    try {
      const [y, m] = monthStr.split('-').map(Number);
      const startDate = `${y}-${String(m).padStart(2, '0')}-01`;
      const endDateObj = new Date(y, m, 0);
      const endDate = `${endDateObj.getFullYear()}-${String(endDateObj.getMonth() + 1).padStart(2, '0')}-${String(endDateObj.getDate()).padStart(2, '0')}`;

      const conn = await db.getConnection();
      try {
        // rules masih bisa memiliki slot_minutes; tabel rules terpisah dari bookings
        const [rules] = await conn.query(
          `SELECT id, weekday, start_time, end_time, slot_minutes
             FROM bicare_availability_rules
            WHERE doctor_id = ? AND is_active = 1`,
          [doctorId]
        );

        const rulesByDOW = new Map();
        for (const r of rules) {
          const key = String(r.weekday || '').toUpperCase();
          if (!rulesByDOW.has(key)) rulesByDOW.set(key, []);
          rulesByDOW.get(key).push({
            start: String(r.start_time).slice(0, 5),
            end: String(r.end_time).slice(0, 5),
            step: Number(r.slot_minutes || 30),
          });
        }

        const slotMap = {};
        const cur = new Date(startDate + 'T00:00:00');
        const stop = new Date(endDate + 'T00:00:00');
        while (cur <= stop) {
          const key = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}-${String(cur.getDate()).padStart(2, '0')}`;
          const dow = DOW[cur.getDay()];
          const dayRules = rulesByDOW.get(dow) || [];
          let slots = [];
          for (const R of dayRules) slots = slots.concat(expandSlots(R.start, R.end, R.step));
          if (slots.length) slotMap[key] = Array.from(new Set(slots)).sort();
          cur.setDate(cur.getDate() + 1);
        }

        const [rows] = await conn.query(
          `SELECT booking_date, slot_time, booker_name
             FROM bicare_bookings
            WHERE doctor_id = ?
              AND status = 'Booked'
              AND booking_date BETWEEN ? AND ?
            ORDER BY booking_date, slot_time`,
          [doctorId, startDate, endDate]
        );

        const bookedMap = {};
        const adminBlocks = {};
        for (const r of rows) {
          const dateKey = toYmd(r.booking_date);
          const hhmm = String(r.slot_time).slice(0, 5);
          (bookedMap[dateKey] ||= []);
          if (!bookedMap[dateKey].includes(hhmm)) bookedMap[dateKey].push(hhmm);
          if (String(r.booker_name).toUpperCase() === 'ADMIN_BLOCK') {
            (adminBlocks[dateKey] ||= []).push(hhmm);
          }
        }
        for (const k of Object.keys(bookedMap)) bookedMap[k].sort();
        for (const k of Object.keys(adminBlocks)) adminBlocks[k].sort();

        return res.status(200).json({
          ok: true, ns: auth.ns, scope, type: 'calendar', doctorId, month: monthStr, slotMap, bookedMap, adminBlocks
        });
      } finally {
        conn.release();
      }
    } catch (e) {
      console.error('GET /api/BIcare/booked calendar error:', e);
      return res.status(500).json({ error: 'INTERNAL_ERROR', details: e?.message });
    }
  }

  // ===== Branch B: Listing =====
  const statusRaw = (req.query.status || '').toString().trim();
  const status =
    /^finished$/i.test(statusRaw) ? 'Finished' :
    /^booked$/i.test(statusRaw)   ? 'Booked'   :
    statusRaw;

  const fromDate = (req.query.from || '').toString().trim();
  const toDate   = (req.query.to   || '').toString().trim();
  const doctorId = req.query.doctorId ? Number(req.query.doctorId) : null;
  const qUserId  = req.query.userId ? Number(req.query.userId) : null;

  if (fromDate && !/^\d{4}-\d{2}-\d{2}$/.test(fromDate)) return res.status(400).json({ error: 'from harus YYYY-MM-DD' });
  if (toDate   && !/^\d{4}-\d{2}-\d{2}$/.test(toDate))   return res.status(400).json({ error: 'to harus YYYY-MM-DD' });
  if (doctorId !== null && (!Number.isFinite(doctorId) || doctorId <= 0)) return res.status(400).json({ error: 'doctorId tidak valid' });
  if (qUserId  !== null && (!Number.isFinite(qUserId)  || qUserId  <= 0)) return res.status(400).json({ error: 'userId tidak valid' });

  const limit  = Math.min(Math.max(Number(req.query.limit)  || 50, 1), 200);
  const offset = Math.max(Number(req.query.offset) || 0, 0);

  try {
    /* --- AUTO-FINISH on read (30 menit, sebelum SELECT) --- */
    const userScopeClause  = scope === 'admin' ? '' : 'AND user_id = ?';
    const autofinishParams = scope === 'admin' ? [] : [auth.userId];
    await db.query(
      `UPDATE bicare_bookings
          SET status = 'Finished'
        WHERE UPPER(status) = 'BOOKED'
          AND slot_time IS NOT NULL
          ${userScopeClause}
          AND TIMESTAMP(booking_date, TIME(slot_time)) + INTERVAL 30 MINUTE
              <= CONVERT_TZ(UTC_TIMESTAMP(), '+00:00', '+07:00')`,
      autofinishParams
    );

    /* --- WHERE untuk SELECT --- */
    const where = [];
    const params = [];
    if (scope === 'admin') {
      if (qUserId) { where.push('user_id = ?'); params.push(qUserId); }
    } else {
      where.push('user_id = ?'); params.push(auth.userId);
    }
    if (status)   { where.push('status = ?');        params.push(status); }
    if (fromDate) { where.push('booking_date >= ?'); params.push(fromDate); }
    if (toDate)   { where.push('booking_date <= ?'); params.push(toDate); }
    if (doctorId) { where.push('doctor_id = ?');     params.push(doctorId); }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const sql = `
      SELECT id, user_id, doctor_id, booking_date, slot_time, status,
             booker_name, nip, wa, patient_name, patient_status, gender,
             birth_date, complaint, created_at
        FROM bicare_bookings
      ${whereSql}
      ORDER BY booking_date DESC, slot_time DESC, id DESC
      LIMIT ? OFFSET ?
    `;
    const dataParams = params.concat([limit, offset]);
    const [rows] = await db.query(sql, dataParams);

    const countSql = `SELECT COUNT(*) AS total FROM bicare_bookings ${whereSql}`;
    const [countRows] = await db.query(countSql, params);
    const total = Number(countRows?.[0]?.total || 0);

    return res.status(200).json({
      ok: true,
      ns: auth.ns,
      scope,
      userId: scope === 'user' ? auth.userId : (qUserId || null),
      items: rows,
      meta: { limit, offset, total },
    });
  } catch (e) {
    console.error('GET /api/BIcare/booked error:', e);
    return res.status(500).json({ error: 'INTERNAL_ERROR', details: e?.message });
  }
}
