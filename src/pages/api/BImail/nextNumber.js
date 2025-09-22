// src/pages/api/BImail/nextNumber.js
import db from '@/lib/db';

/**
 * GET /api/BImail/nextNumber?kategoriCode=M.01&tahun=2025&unitCode=DIK-HUM
 * Estimasi next number untuk kombinasi (jenis, tahun, unit).
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
  try {
    const { kategoriCode = '', tahun, unitCode = '' } = req.query;
    const kode = String(kategoriCode || '').trim();
    const year = Number(tahun);
    // normalisasi unit ke UPPERCASE supaya konsisten
    const unit = String(unitCode || '').trim().toUpperCase();

    if (!kode || !year) {
      return res.status(400).json({ error: 'kategoriCode dan tahun wajib diisi' });
    }

    // pastikan jenis ada
    let jenisId;
    const [j1] = await db.query('SELECT id FROM bimail_jenis WHERE kode = ? LIMIT 1', [kode]);
    if (j1?.length) {
      jenisId = j1[0].id;
    } else {
      const [ins] = await db.query('INSERT INTO bimail_jenis (kode, nama) VALUES (?, ?)', [kode, kode]);
      jenisId = ins.insertId;
    }

    // upsert baris counter (jenis, tahun, unit)
    await db.query(
      `INSERT INTO bimail_counters (jenis_id, tahun, unit_code, last_number)
       VALUES (?, ?, ?, 0)
       ON DUPLICATE KEY UPDATE last_number = last_number`,
      [jenisId, year, unit]
    );

    const [rows] = await db.query(
      `SELECT last_number FROM bimail_counters
       WHERE jenis_id = ? AND tahun = ? AND unit_code = ?
       LIMIT 1`,
      [jenisId, year, unit]
    );

    const last = rows?.length ? Number(rows[0].last_number) : 0;
    return res.status(200).json({ next_number: last + 1 });
  } catch (e) {
    console.error('GET /api/BImail/nextNumber error:', e);
    return res.status(500).json({ error: 'Gagal mengambil next number' });
  }
}
