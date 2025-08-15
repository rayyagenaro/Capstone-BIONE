import db from '@/lib/db';

/**
 * GET /api/BIcare/booked?doctorId=1&month=YYYY-MM
 * Response:
 * {
 *   bookedMap: { "YYYY-MM-DD": ["12:00","12:30", ...] }
 * }
 */
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
    if (!doctorId) {
      return res.status(400).json({ error: 'doctorId tidak valid' });
    }

    // Hitung rentang tanggal bulan tsb
    const [y, m] = monthStr.split('-').map(Number);
    const startDate = `${y}-${String(m).padStart(2, '0')}-01`;
    const endDateObj = new Date(y, m, 0); // hari terakhir bulan tsb
    const endDate = `${endDateObj.getFullYear()}-${String(endDateObj.getMonth()+1).padStart(2,'0')}-${String(endDateObj.getDate()).padStart(2,'0')}`;

    const conn = await db.getConnection();
    try {
      const [rows] = await conn.query(
        `SELECT booking_date, slot_time
           FROM dmove_db1.bicare_bookings
          WHERE doctor_id = ?
            AND status = 'booked'
            AND booking_date BETWEEN ? AND ?
          ORDER BY booking_date, slot_time`,
        [doctorId, startDate, endDate]
      );

      const bookedMap = {};
      for (const r of rows) {
        // JANGAN parse ke Date – pakai string original dari MySQL
        const dateKey = String(r.booking_date); // "YYYY-MM-DD"
        // Normalisasi jam ke "HH:MM"
        const hhmm = String(r.slot_time).slice(0, 5);

        (bookedMap[dateKey] ||= []).push(hhmm);
      }

      return res.status(200).json({ bookedMap });
    } finally {
      conn.release();
    }
  } catch (e) {
    console.error('GET /api/BIcare/booked error:', e);
    return res.status(500).json({ error: 'Internal Server Error', details: e?.message });
  }
}
