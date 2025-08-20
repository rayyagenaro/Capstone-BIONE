// /pages/api/BIcare/booked.js
import db from '@/lib/db';

/* ===== helpers ===== */
function toMinutes(hms) {
  const [H, M] = String(hms).split(':').map((x) => parseInt(x, 10));
  return (H || 0) * 60 + (M || 0);
}
function toHHMM(mins) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}
// ekspansi slot: start <= t < end (end eksklusif)
function expandSlots(start_time, end_time, stepMinutes) {
  const start = toMinutes(start_time);
  const end = toMinutes(end_time);
  const out = [];
  for (let t = start; t < end; t += stepMinutes) out.push(toHHMM(t));
  return out;
}
const DOW = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

// Normalisasi tanggal ke 'YYYY-MM-DD' (aman dari timezone)
function toYmd(val) {
  // kalau dari driver MySQL berupa Date
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
  return s;
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const doctorId = Number(req.query.doctorId || 1);
    const monthStr = String(req.query.month || '').trim(); // "YYYY-MM"

    if (!/^\d{4}-\d{2}$/.test(monthStr)) {
      return res.status(400).json({ error: 'Param month harus "YYYY-MM"' });
    }
    if (!doctorId) return res.status(400).json({ error: 'doctorId tidak valid' });

    // Rentang tanggal bulan tsb
    const [y, m] = monthStr.split('-').map(Number);
    const startDate = `${y}-${String(m).padStart(2, '0')}-01`;
    const endDateObj = new Date(y, m, 0); // last day of month m
    const endDate = `${endDateObj.getFullYear()}-${String(
      endDateObj.getMonth() + 1
    ).padStart(2, '0')}-${String(endDateObj.getDate()).padStart(2, '0')}`;

    const conn = await db.getConnection();
    try {
      // 1) Aturan ketersediaan dokter
      const [rules] = await conn.query(
        `SELECT id, weekday, start_time, end_time, slot_minutes
           FROM bicare_availability_rules
          WHERE doctor_id = ? AND is_active = 1`,
        [doctorId]
      );

      const rulesByDOW = new Map(); // 'MON' -> [rule, ...]
      for (const r of rules) {
        const key = String(r.weekday || '').toUpperCase();
        if (!rulesByDOW.has(key)) rulesByDOW.set(key, []);
        rulesByDOW.get(key).push({
          start: String(r.start_time).slice(0, 5), // HH:MM
          end: String(r.end_time).slice(0, 5),
          step: Number(r.slot_minutes || 30),
        });
      }

      // 2) Ekspansi ke slotMap per tanggal
      const slotMap = {}; // 'YYYY-MM-DD' -> ['HH:MM', ...]
      const cur = new Date(startDate + 'T00:00:00');
      const stop = new Date(endDate + 'T00:00:00');
      while (cur <= stop) {
        const key = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(
          2,
          '0'
        )}-${String(cur.getDate()).padStart(2, '0')}`;
        const dow = DOW[cur.getDay()];
        const dayRules = rulesByDOW.get(dow) || [];
        let slots = [];
        for (const R of dayRules) slots = slots.concat(expandSlots(R.start, R.end, R.step));
        if (slots.length) slotMap[key] = Array.from(new Set(slots)).sort();
        cur.setDate(cur.getDate() + 1);
      }

      // 3) Booking yang sudah terisi (status 'Booked')
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
        const dateKey = toYmd(r.booking_date);           // << normalisasi tanggal
        const hhmm = String(r.slot_time).slice(0, 5);    // "HH:MM"
        if (!bookedMap[dateKey]) bookedMap[dateKey] = [];
        if (!bookedMap[dateKey].includes(hhmm)) bookedMap[dateKey].push(hhmm);
        if (String(r.booker_name).toUpperCase() === 'ADMIN_BLOCK') {
          (adminBlocks[dateKey] ||= []).push(hhmm);
        }
      }
      // urutkan times agar rapi
      for (const k of Object.keys(bookedMap)) bookedMap[k].sort();
      for (const k of Object.keys(adminBlocks)) adminBlocks[k].sort();

      return res.status(200).json({ slotMap, bookedMap, adminBlocks });
    } finally {
      conn.release();
    }
  } catch (e) {
    console.error('GET /api/BIcare/booked error:', e);
    return res.status(500).json({ error: 'Internal Server Error', details: e?.message });
  }
}
