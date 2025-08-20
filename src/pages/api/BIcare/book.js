// /pages/api/BIcare/book.js
import db from '@/lib/db';

function toMinutes(hms) {
  const [H, M] = String(hms).split(':').map((x) => parseInt(x, 10));
  return (H || 0) * 60 + (M || 0);
}
function toHHMM(mins) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
}
function expandSlots(start_time, end_time, stepMinutes) {
  const start = toMinutes(start_time);
  const end   = toMinutes(end_time);
  const out = [];
  for (let t = start; t < end; t += stepMinutes) out.push(toHHMM(t));
  return out;
}
const DOW = ['SUN','MON','TUE','WED','THU','FRI','SAT'];

export default async function handler(req, res) {
  try {
    /* ===================== GET: list booking milik user (tetap) ===================== */
    if (req.method === 'GET') {
      try {
        const userId = Number(req.query.userId || 0);
        const wa = String(req.query.wa || '').trim();

        if (!userId && !wa) {
          res.setHeader('Allow', ['GET', 'POST']);
          return res.status(400).json({ error: 'userId atau wa wajib diisi' });
        }

        let rows = [];
        if (userId) {
          [rows] = await db.query(
            `SELECT id, user_id, doctor_id, booking_date, slot_time, status,
                    booker_name, nip, wa, patient_name, patient_status,
                    gender, birth_date, complaint, created_at
               FROM dmove_db1.bicare_bookings
              WHERE user_id = ?
              ORDER BY booking_date DESC, slot_time DESC`,
            [userId]
          );
        } else {
          [rows] = await db.query(
            `SELECT id, user_id, doctor_id, booking_date, slot_time, status,
                    booker_name, nip, wa, patient_name, patient_status,
                    gender, birth_date, complaint, created_at
               FROM dmove_db1.bicare_bookings
              WHERE wa = ?
              ORDER BY booking_date DESC, slot_time DESC`,
            [wa]
          );

          const maybeUserId = Number(req.query.userId || 0);
          if (rows.length && maybeUserId > 0) {
            await db.query(
              `UPDATE dmove_db1.bicare_bookings
                  SET user_id = ?
                WHERE wa = ? AND user_id IS NULL`,
              [maybeUserId, wa]
            );
          }
        }

        return res.status(200).json(rows);
      } catch (e) {
        console.error('GET /api/BIcare/book error:', e);
        return res.status(500).json({ error: 'Gagal ambil data BI.Care' });
      }
    }

    /* ===================== POST: buat booking baru (validasi pakai aturan) ===================== */
    if (req.method === 'POST') {
      const b = req.body || {};

      // Catatan: kalau layer auth kamu menyuntikkan userId di server, bagian ini boleh di-relax.
      const userId = Number(b.userId || 0);
      if (!userId) {
        res.setHeader('Allow', ['GET', 'POST']);
        return res.status(400).json({ error: 'userId wajib diisi' });
      }

      const doctorId     = Number(b.doctorId || 1);
      const bookingDate  = String(b.bookingDate || '').trim(); // "YYYY-MM-DD"
      let   slotTime     = String(b.slotTime || '').trim();    // "HH:MM" atau "HH:MM:SS"

      const booker_name   = (b.booker_name || '').trim();
      const nip           = (b.nip || '').trim();
      const wa            = (b.wa || '').trim();
      const patient_name  = (b.patient_name || '').trim();
      const patient_status= (b.patient_status || '').trim();
      const gender        = (b.gender || '').trim();
      const birth_date    = (b.birth_date || '').trim();
      const complaint     = (b.complaint || null);

      if (!doctorId || !/^\d{4}-\d{2}-\d{2}$/.test(bookingDate)) {
        return res.status(400).json({ error: 'doctorId/bookingDate tidak valid' });
      }
      if (!slotTime) return res.status(400).json({ error: 'slotTime wajib diisi' });
      if (/^\d{2}:\d{2}$/.test(slotTime)) slotTime = `${slotTime}:00`;
      const hhmm = slotTime.slice(0,5);

      if (!booker_name || !nip || !wa || !patient_name || !patient_status || !gender || !birth_date) {
        return res.status(400).json({ error: 'Data pasien/pemesan belum lengkap' });
      }

      const conn = await db.getConnection();
      try {
        await conn.beginTransaction();

        // 1) Ambil aturan aktif untuk DOW tanggal tsb
        const dow = DOW[new Date(`${bookingDate}T00:00:00+07:00`).getDay()];
        const [rules] = await conn.query(
          `SELECT start_time, end_time, slot_minutes
             FROM dmove_db1.bicare_availability_rules
            WHERE doctor_id = ? AND is_active = 1 AND weekday = ?`,
          [doctorId, dow]
        );

        if (!rules.length) {
          await conn.rollback(); conn.release();
          return res.status(400).json({ error: 'Tanggal ini tidak ada jadwal praktik' });
        }

        // 2) Ekspansi slot dari aturan hari tsb
        let allowedSet = new Set();
        for (const r of rules) {
          const slots = expandSlots(String(r.start_time).slice(0,5), String(r.end_time).slice(0,5), Number(r.slot_minutes || 30));
          slots.forEach((s) => allowedSet.add(s));
        }
        if (!allowedSet.has(hhmm)) {
          await conn.rollback(); conn.release();
          return res.status(400).json({ error: 'Jam tidak tersedia pada tanggal tersebut' });
        }

        // 3) Cek konflik (Booked / ADMIN_BLOCK)
        const [exists] = await conn.query(
          `SELECT id, booker_name
             FROM dmove_db1.bicare_bookings
            WHERE doctor_id = ? AND booking_date = ? AND slot_time = ? AND status = 'Booked'
            FOR UPDATE`,
          [doctorId, bookingDate, slotTime]
        );
        if (exists.length) {
          await conn.rollback(); conn.release();
          return res.status(409).json({ error: 'Slot sudah terisi' });
        }

        // 4) Insert booking
        const [result] = await conn.query(
          `INSERT INTO dmove_db1.bicare_bookings
            (user_id, doctor_id, booking_date, slot_time, status,
             booker_name, nip, wa, patient_name, patient_status,
             gender, birth_date, complaint, created_at)
           VALUES (?, ?, ?, ?, 'Booked',
                   ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
          [
            userId, doctorId, bookingDate, slotTime,
            booker_name, nip, wa, patient_name, patient_status,
            gender, birth_date, complaint
          ]
        );

        await conn.commit();
        conn.release();
        return res.status(201).json({ ok: true, id: result?.insertId });
      } catch (e) {
        try { await conn.rollback(); } catch {}
        try { conn.release(); } catch {}

        if (e && (e.code === 'ER_DUP_ENTRY' || String(e.message || '').includes('Duplicate'))) {
          return res.status(409).json({ error: 'Slot sudah dibooking orang lain' });
        }
        console.error('POST /api/BIcare/book error:', e);
        return res.status(500).json({ error: 'Gagal booking', details: e?.message });
      }
    }

    /* ===================== Method lain ===================== */
    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  } catch (e) {
    console.error('API /BIcare/book outer error:', e);
    return res.status(500).json({ error: 'Internal Server Error', details: e?.message });
  }
}
