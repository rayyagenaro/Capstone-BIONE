// pages/api/registerAdmin.js
import db from '@/lib/db';
import bcrypt from 'bcryptjs';

function isValidPhone(raw) {
  if (!raw) return false;
  const s = String(raw).replace(/[^\d+]/g, '');
  // minimal 8 digit, maksimal 15 (WhatsApp range umum), boleh mulai +, 62, atau 0
  return /^(?:\+?62|0)\d{7,13}$/.test(s);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Metode tidak diizinkan' });
  }

  // role_id DIHARDCODE = 2 (admin fitur)
  const { nama, email, phone, password, service_ids = [] } = req.body || {};

  if (!nama || !email || !password) {
    return res.status(400).json({ error: 'Semua field wajib diisi' });
  }
  if (!Array.isArray(service_ids) || service_ids.length < 1) {
    return res.status(400).json({ error: 'Minimal pilih 1 layanan' });
  }
  if (service_ids.length > 2) {
    return res.status(400).json({ error: 'Maksimal pilih 2 layanan' });
  }
  if (phone && !isValidPhone(phone)) {
    return res.status(400).json({ error: 'Format nomor telepon tidak valid (gunakan 08xx atau 62xx)' });
  }

  const ROLE_ADMIN_FITUR = 2;
  const uniqueServiceIds = [...new Set(service_ids.map(Number))];

  const conn = (await db.getConnection?.()) || db;

  try {
    if (conn.beginTransaction) await conn.beginTransaction();

    // Cek email unik
    const [existing] = await conn.query(
      'SELECT id FROM admins WHERE email = ? LIMIT 1',
      [email]
    );
    if (existing.length > 0) {
      if (conn.rollback) await conn.rollback();
      return res.status(409).json({ error: 'Email sudah digunakan' });
    }

    // Validasi role & layanan
    const [roles] = await conn.query(
      'SELECT id FROM admin_roles WHERE id = ? LIMIT 1',
      [ROLE_ADMIN_FITUR]
    );
    if (roles.length === 0) {
      if (conn.rollback) await conn.rollback();
      return res.status(500).json({ error: 'Role Admin Fitur belum tersedia di database' });
    }

    const placeholdersSvc = uniqueServiceIds.map(() => '?').join(',');
    const [validSvcs] = await conn.query(
      `SELECT id FROM services WHERE id IN (${placeholdersSvc})`,
      uniqueServiceIds
    );
    if (validSvcs.length !== uniqueServiceIds.length) {
      if (conn.rollback) await conn.rollback();
      return res.status(400).json({ error: 'Terdapat service_id yang tidak valid' });
    }

    // Hash password
    const hashed = await bcrypt.hash(password, 10);

    // Insert admin (dengan phone)
    const [result] = await conn.query(
      'INSERT INTO admins (nama, email, phone, password, role_id, verification_id) VALUES (?, ?, ?, ?, ?, 1)',
      [nama, email, phone || null, hashed, ROLE_ADMIN_FITUR]
    );
    const adminId = result.insertId;

    // Mapping layanan (maks 2)
    const values = uniqueServiceIds.slice(0, 2).map((sid) => [adminId, sid]);
    await conn.query('INSERT INTO admin_services (admin_id, service_id) VALUES ?', [values]);

    if (conn.commit) await conn.commit();

    return res.status(201).json({
      message: 'Pendaftaran admin berhasil dan layanan tersimpan.',
      admin_id: adminId,
      service_ids: uniqueServiceIds,
    });
  } catch (err) {
    if (conn.rollback) await conn.rollback();
    if (err?.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Email/Telepon sudah digunakan' });
    }
    console.error('Error register admin:', err);
    return res.status(500).json({ error: 'Terjadi kesalahan pada server' });
  } finally {
    if (conn.release) conn.release();
  }
}
