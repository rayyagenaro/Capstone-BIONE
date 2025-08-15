// pages/api/admin-verification.js
import db from '@/lib/db';

/**
 * Verifikasi / Reject Admin Fitur
 * POST body:
 *  {
 *    adminId: number,
 *    action: "verify" | "reject",
 *    reason?: string   // wajib kalau action=reject (kalau ada kolomnya)
 *  }
 *
 * verification_status.id:
 *  1 = Pending, 2 = Verified, 3 = Rejected
 *
 * Catatan:
 * - TIDAK memakai admin_pending_services.
 * - Service yang dipakai saat verifikasi adalah baris di tabel admin_services.
 * - Valid: admin harus punya 1–2 service di admin_services.
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }

  const { adminId, action, reason } = req.body || {};
  const aid = Number(adminId);

  if (!aid || !action) {
    return res.status(400).json({ error: 'adminId dan action wajib diisi.' });
  }
  if (!['verify', 'reject'].includes(action)) {
    return res.status(400).json({ error: 'action harus "verify" atau "reject".' });
  }
  if (action === 'reject' && !String(reason || '').trim()) {
    return res.status(400).json({ error: 'Alasan penolakan wajib diisi untuk aksi reject.' });
  }

  const STATUS = { PENDING: 1, VERIFIED: 2, REJECTED: 3 };

  const conn = (await db.getConnection?.()) || db;
  try {
    if (conn.beginTransaction) await conn.beginTransaction();

    // Ambil admin
    const [rows] = await conn.query(
      'SELECT id, role_id, verification_id FROM admins WHERE id = ? LIMIT 1',
      [aid]
    );
    if (rows.length === 0) {
      if (conn.rollback) await conn.rollback();
      return res.status(404).json({ error: 'Admin tidak ditemukan.' });
    }
    const admin = rows[0];

    // Cegah double final action
    if (admin.verification_id === STATUS.VERIFIED && action === 'verify') {
      if (conn.rollback) await conn.rollback();
      return res.status(409).json({ error: 'Admin sudah diverifikasi sebelumnya.' });
    }
    if (admin.verification_id === STATUS.REJECTED && action === 'reject') {
      if (conn.rollback) await conn.rollback();
      return res.status(409).json({ error: 'Admin sudah ditolak sebelumnya.' });
    }

    // Hanya admin fitur
    if (admin.role_id !== 2) {
      if (conn.rollback) await conn.rollback();
      return res.status(400).json({ error: 'Hanya admin fitur (role_id = 2) yang bisa diverifikasi/ditolak lewat endpoint ini.' });
    }

    if (action === 'reject') {
      // Update status -> Rejected
      await conn.query(
        // Jika kamu punya kolom rejection_reason, aktifkan baris di bawah:
        // 'UPDATE admins SET verification_id = ?, rejection_reason = ? WHERE id = ?',
        // [STATUS.REJECTED, String(reason).trim(), aid]
        'UPDATE admins SET verification_id = ? WHERE id = ?',
        [STATUS.REJECTED, aid]
      );
      if (conn.commit) await conn.commit();
      return res.status(200).json({ ok: true, message: 'Admin ditolak.', verification_id: STATUS.REJECTED });
    }

    // ===== VERIFY =====
    // Ambil service milik admin dari admin_services (wajib 1–2)
    const [svcRows] = await conn.query(
      `SELECT asg.service_id
       FROM admin_services asg
       JOIN services s ON s.id = asg.service_id
       WHERE asg.admin_id = ?`,
      [aid]
    );

    const serviceIds = [...new Set(svcRows.map(r => Number(r.service_id)))].filter(Number.isFinite);

    if (serviceIds.length < 1 || serviceIds.length > 2) {
      if (conn.rollback) await conn.rollback();
      return res.status(400).json({
        error: 'Admin harus memiliki 1–2 layanan di admin_services sebelum diverifikasi.'
      });
    }

    // (Opsional) validasi lagi di tabel services sudah dilakukan via JOIN di atas.

    // Update status -> VERIFIED
    await conn.query(
      'UPDATE admins SET verification_id = ? WHERE id = ?',
      [STATUS.VERIFIED, aid]
    );

    if (conn.commit) await conn.commit();
    return res.status(200).json({
      ok: true,
      message: 'Admin berhasil diverifikasi.',
      verification_id: STATUS.VERIFIED,
      services: serviceIds
    });

  } catch (err) {
    if (conn.rollback) await conn.rollback();
    console.error('admin-verification error:', err);
    // Jika kolom verification_id belum ada di DB, kasih pesan yang mudah dipahami
    if (String(err?.sqlMessage || '').includes('verification_id')) {
      return res.status(500).json({
        error: 'Kolom admins.verification_id belum tersedia. Tambahkan kolom tersebut (TINYINT) dan coba lagi.'
      });
    }
    return res.status(500).json({ error: 'Terjadi kesalahan server.' });
  } finally {
    if (conn.release) conn.release();
  }
}
