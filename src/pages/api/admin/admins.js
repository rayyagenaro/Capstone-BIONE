// pages/api/admins.js
import db from '@/lib/db';

const VERIF_MAP = {
  pending: 1,
  verified: 2,
  rejected: 3,
};

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }

  try {
    const page  = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const offset = (page - 1) * limit;

    const verificationKey = String(req.query.verification || '').toLowerCase();
    const verificationId = VERIF_MAP[verificationKey] || null;

    // filter dasar: hanya role admin (1=super admin, 2=admin fitur)
    const where = [];
    const params = [];

    where.push('a.role_id IN (1,2)');

    if (verificationId) {
      where.push('a.verification_id = ?');
      params.push(verificationId);
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    // total items (distinct admin)
    const [countRows] = await db.query(
      `SELECT COUNT(*) AS total
       FROM admins a
       ${whereSql}`,
      params
    );
    const totalItems = Number(countRows?.[0]?.total || 0);

    // data page (dengan daftar layanan)
    const [rows] = await db.query(
      `
      SELECT 
        a.id,
        a.nama,
        a.email,
        a.role_id,
        a.verification_id,
        ar.role AS role_name,
        GROUP_CONCAT(DISTINCT s.name ORDER BY s.name SEPARATOR ', ') AS services_csv
      FROM admins a
      LEFT JOIN admin_roles ar ON ar.id = a.role_id
      LEFT JOIN admin_services asg ON asg.admin_id = a.id
      LEFT JOIN services s ON s.id = asg.service_id
      ${whereSql}
      GROUP BY a.id
      ORDER BY a.created_at DESC, a.id DESC
      LIMIT ? OFFSET ?
      `,
      [...params, limit, offset]
    );

    const data = rows.map(r => ({
      id: r.id,
      nama: r.nama,
      email: r.email,
      role_id: r.role_id,
      role_name: r.role_name || (r.role_id === 1 ? 'Super Admin' : 'Admin Fitur'),
      verification_id: r.verification_id,
      // untuk tampilan: pecah csv jadi array
      services: r.services_csv ? r.services_csv.split(', ').filter(Boolean) : [],
    }));

    return res.status(200).json({
      data,
      pagination: {
        currentPage: page,
        totalPages: Math.max(1, Math.ceil(totalItems / limit)),
        totalItems,
        perPage: limit,
      },
    });
  } catch (e) {
    console.error('GET /api/admins error:', e);
    return res.status(500).json({ error: 'Gagal memuat data admins' });
  }
}
