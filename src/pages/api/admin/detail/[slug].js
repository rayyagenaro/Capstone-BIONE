// /src/pages/api/admin/detail/[slug].js
import db from '@/lib/db';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { slug } = req.query;
  const id = Number(req.query.id);
  if (!id) return res.status(400).json({ error: 'Missing id' });

  try {
    let sql = '';
    let params = [id];

    switch (String(slug).toLowerCase()) {
      // ===================== BI.CARE =====================
      // Tabel: bicare_bookings (semua kolom) + nama dokter
      case 'bicare':
        sql = `
          SELECT
            b.*,
            d.name AS doctor_name
          FROM bicare_bookings b
          LEFT JOIN bicare_doctors d ON d.id = b.doctor_id
          WHERE b.id = ? LIMIT 1
        `;
        break;

      // ===================== BI.MEET =====================
      // Tabel: bimeet_bookings (semua kolom) + nama & lantai ruangan
      case 'bimeet':
        sql = `
          SELECT
            b.*,
            r.name  AS room_name,
            r.floor AS room_floor
          FROM bimeet_bookings b
          LEFT JOIN bimeet_rooms r ON r.id = b.room_id
          WHERE b.id = ? LIMIT 1
        `;
        break;

      // ===================== BI.STAY =====================
      // Tabel: bistay_bookings (semua kolom)
      case 'bistay':
        sql = `
          SELECT b.* 
          FROM bistay_bookings b
          WHERE b.id = ? LIMIT 1
        `;
        break;

      // (opsional) BI.DOCS / BI.MEAL bisa ditambah di sini dengan pola yang sama

      default:
        return res.status(400).json({ error: 'Layanan tidak dikenali' });
    }

    const [rows] = await db.query(sql, params);
    if (!rows.length) return res.status(404).json({ error: 'Data tidak ditemukan' });

    return res.status(200).json({ item: rows[0] });
  } catch (e) {
    console.error('detail-api error:', e);
    return res.status(500).json({
      error: 'Server error',
      message: e?.message,
      code: e?.code,
      sqlMessage: e?.sqlMessage,
      sqlState: e?.sqlState,
    });
  }
}
