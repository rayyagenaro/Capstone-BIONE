import db from '@/lib/db';

/**
 * POST /api/BIcare/book
 * Body JSON:
 * {
 *   doctorId: number,
 *   bookingDate: "YYYY-MM-DD",
 *   slotTime: "HH:MM" | "HH:MM:SS",
 *   booker_name: string,
 *   nip: string,
 *   wa: string,
 *   patient_name: string,
 *   patient_status: "Pegawai"|"Pensiun"|"Keluarga"|"Tamu",
 *   gender: "Laki-laki"|"Perempuan",
 *   birth_date: "YYYY-MM-DD",
 *   complaint: string|null
 * }
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const b = req.body || {};
    const doctorId = Number(b.doctorId || 1);
    const bookingDate = String(b.bookingDate || '').trim(); // "YYYY-MM-DD"
    let slotTime = String(b.slotTime || '').trim();         // "HH:MM" atau "HH:MM:SS"

    const booker_name   = (b.booker_name || '').trim();
    const nip           = (b.nip || '').trim();
    const wa            = (b.wa || '').trim();
    const patient_name  = (b.patient_name || '').trim();
    const patient_status= (b.patient_status || '').trim();
    const gender        = (b.gender || '').trim();
    const birth_date    = (b.birth_date || '').trim();      // "YYYY-MM-DD"
    const complaint     = (b.complaint || null);

    // Validasi minimal
    if (!doctorId || !/^\d{4}-\d{2}-\d{2}$/.test(bookingDate)) {
      return res.status(400).json({ error: 'doctorId/bookingDate tidak valid' });
    }
    if (!slotTime) return res.status(400).json({ error: 'slotTime wajib diisi' });
    // normalisasi slotTime ke "HH:MM:SS" untuk MySQL
    if (/^\d{2}:\d{2}$/.test(slotTime)) slotTime = `${slotTime}:00`;

    if (!booker_name || !nip || !wa || !patient_name || !patient_status || !gender || !birth_date) {
      return res.status(400).json({ error: 'Data pasien/pemesan belum lengkap' });
    }

    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      // Cek rule availability sederhana: hanya izinkan Senin/Jumat, 12:00-13:30
      const dow = new Date(bookingDate + 'T00:00:00Z').getUTCDay(); // 1..5 (UTC); 1=Sen,5=Jum (konteks)
      const isMon = dow === 1;
      const isFri = dow === 5;

      if (!isMon && !isFri) {
        await conn.rollback();
        conn.release();
        return res.status(400).json({ error: 'Tanggal bukan hari praktik (Senin/Jumat)' });
      }
      const allowed = ['12:00:00', '12:30:00', '13:00:00'];
      if (!allowed.includes(slotTime)) {
        await conn.rollback();
        conn.release();
        return res.status(400).json({ error: 'Jam tidak valid untuk slot' });
      }

      // Insert booking – unik di (doctor_id, booking_date, slot_time)
      await conn.query(
        `INSERT INTO dmove_db1.bicare_bookings
          (doctor_id, booking_date, slot_time, status,
           booker_name, nip, wa, patient_name, patient_status, gender, birth_date, complaint, created_at)
         VALUES (?, ?, ?, 'booked', ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          doctorId, bookingDate, slotTime,
          booker_name, nip, wa, patient_name, patient_status, gender, birth_date, complaint
        ]
      );

      await conn.commit();
      conn.release();

      return res.status(201).json({ ok: true });
    } catch (e) {
      try { await db.query('ROLLBACK'); } catch {}
      try { conn.release(); } catch {}

      // Tangani double-book
      if (e && (e.code === 'ER_DUP_ENTRY' || String(e.message || '').includes('Duplicate'))) {
        return res.status(409).json({ error: 'Slot sudah dibooking orang lain' });
      }

      console.error('POST /api/BIcare/book error:', e);
      return res.status(500).json({ error: 'Gagal booking', details: e?.message });
    }
  } catch (e) {
    console.error('POST /api/BIcare/book outer error:', e);
    return res.status(500).json({ error: 'Internal Server Error', details: e?.message });
  }
}
