// pages/api/admin-services.js
import db from '@/lib/db';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }

  try {
    const adminId = req.query.adminId ? Number(req.query.adminId) : null;

    // Jika minta layanan milik admin tertentu
    if (adminId) {
      const [adminRows] = await db.query(
        'SELECT id FROM admins WHERE id = ? LIMIT 1',
        [adminId]
      );
      if (!adminRows.length) {
        return res.status(404).json({ error: 'Admin tidak ditemukan' });
      }

      const [rows] = await db.query(
        `
        SELECT s.id, s.name
        FROM admin_services asg
        JOIN services s ON s.id = asg.service_id
        WHERE asg.admin_id = ?
        ORDER BY s.name ASC
        `,
        [adminId]
      );

      return res.status(200).json({ adminId, services: rows });
    }

    // Default: kembalikan semua layanan
    const [rows] = await db.query(
      'SELECT id, name FROM services ORDER BY name ASC'
    );
    return res.status(200).json(rows);
  } catch (e) {
    console.error('GET /api/admin-services error:', e);
    return res.status(500).json({ error: 'Gagal memuat data layanan' });
  }
}
