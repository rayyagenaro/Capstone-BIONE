// /pages/api/BIcare/booked.js
import db from '@/lib/db';
import { verifyAuth } from '@/lib/auth';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }

  // Bisa diakses oleh user maupun admin
  const auth = await verifyAuth(req, ['user', 'admin']);
  if (!auth.ok) {
    return res.status(401).json({ error: 'Unauthorized', reason: auth.reason });
  }

  try {
    // --- ambil semua booking ---
    const [rows] = await db.query(
      `SELECT id, user_id, doctor_id, booking_date, slot_time, status, 
              booker_name, nip, wa, 
              patient_name, patient_status, gender, birth_date, complaint, created_at
      FROM bicare_bookings
      ORDER BY booking_date DESC, slot_time DESC`
    );


    // --- auto-finish kalau waktunya sudah lewat ---
    const now = new Date();
    for (const b of rows) {
      if (b.status === 'Booked') {
        const slotEnd = new Date(`${b.booking_date}T${b.slot_time}`);
        slotEnd.setMinutes(slotEnd.getMinutes() + 30);

        if (now > slotEnd) {
          await db.query(`UPDATE bicare_bookings SET status='Finished' WHERE id=?`, [b.id]);
          b.status = 'Finished'; // update in-memory juga
        }
      }
    }

    return res.status(200).json({
      ok: true,
      ns: auth.ns,
      bookings: rows,
    });
  } catch (e) {
    console.error('Error in GET /BIcare/booked:', e);
    return res.status(500).json({ error: 'Internal server error', details: e.message });
  }
}
