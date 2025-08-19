// /pages/api/BIcare/book.js
import db from '@/lib/db';

export default async function handler(req, res) {
  try {
    /* ===================== GET: list booking milik user ===================== */
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
          // normal: by userId
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
          // fallback: by wa
          [rows] = await db.query(
            `SELECT id, user_id, doctor_id, booking_date, slot_time, status,
                    booker_name, nip, wa, patient_name, patient_status,
                    gender, birth_date, complaint, created_at
               FROM dmove_db1.bicare_bookings
              WHERE wa = ?
              ORDER BY booking_date DESC, slot_time DESC`,
            [wa]
          );

          // Backfill user_id kalau dikirimkan di query & masih NULL di tabel
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

    /* ===================== POST: buat booking baru ===================== */
    if (req.method === 'POST') {
      const b = req.body || {};

      // Wajib: userId (karena sudah FK ke users)
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
      const birth_date    = (b.birth_date || '').trim();      // "YYYY-MM-DD"
      const complaint     = (b.complaint || null);

      // Validasi
      if (!doctorId || !/^\d{4}-\d{2}-\d{2}$/.test(bookingDate)) {
        return res.status(400).json({ error: 'doctorId/bookingDate tidak valid' });
      }
      if (!slotTime) return res.status(400).json({ error: 'slotTime wajib diisi' });
      if (/^\d{2}:\d{2}$/.test(slotTime)) slotTime = `${slotTime}:00`;

      if (!booker_name || !nip || !wa || !patient_name || !patient_status || !gender || !birth_date) {
        return res.status(400).json({ error: 'Data pasien/pemesan belum lengkap' });
      }

      const conn = await db.getConnection();
      try {
        await conn.beginTransaction();

        // Validasi hari praktik (Sen/Jum) — pakai zona +07:00
        const dow = new Date(`${bookingDate}T00:00:00+07:00`).getDay(); // 0..6
        const isMon = dow === 1;
        const isFri = dow === 5;
        if (!isMon && !isFri) {
          await conn.rollback(); conn.release();
          return res.status(400).json({ error: 'Tanggal bukan hari praktik (Senin/Jumat)' });
        }

        // Validasi jam slot
        const allowed = ['12:00:00', '12:30:00', '13:00:00'];
        if (!allowed.includes(slotTime)) {
          await conn.rollback(); conn.release();
          return res.status(400).json({ error: 'Jam tidak valid untuk slot' });
        }

        // Insert
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
