import db from '@/lib/db';

/**
 * GET /api/BImail/nextNumber?kategoriCode=M.01&tahun=2025
 * Balikkan estimasi next number (last+1). Nomor final tetap ditentukan saat POST.
 */

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
  try {
    const { kategoriCode = '', tahun } = req.query;
    const kode = String(kategoriCode || '').trim();
    const year = Number(tahun);
    if (!kode || !year) {
      return res.status(400).json({ error: 'kategoriCode dan tahun wajib diisi' });
    }

    // Pastikan jenis ada (auto-create bila belum)
    let jenisId;
    const [j1] = await db.query('SELECT id FROM bimail_jenis WHERE kode = ? LIMIT 1', [kode]);
    if (j1?.length) {
      jenisId = j1[0].id;
    } else {
      const [ins] = await db.query('INSERT INTO bimail_jenis (kode, nama) VALUES (?, ?)', [kode, kode]);
      jenisId = ins.insertId;
    }

    const [rows] = await db.query(
      'SELECT last_number FROM bimail_counters WHERE jenis_id = ? AND tahun = ? LIMIT 1',
      [jenisId, year]
    );
    const last = rows?.length ? Number(rows[0].last_number) : 0;
    return res.status(200).json({ next_number: last + 1 }); // estimasi
  } catch (e) {
    console.error('GET /api/BImail/nextNumber error:', e);
    return res.status(500).json({ error: 'Gagal mengambil next number' });
  }
}
