import db from '@/lib/db';

/**
 * POST /api/BImail
 * Body:
 * {
 *   user_id: number|null,
 *   tanggal_dokumen: ISO string,
 *   kategori_code: string,     // ex: "M.01"
 *   unit_code: string,         // ex: "SPPUR-FIKSP" (boleh '' untuk kosong)
 *   tipe_dokumen: "B"|"RHS",
 *   perihal: string,
 *   dari: string,
 *   kepada: string,
 *   link_dokumen: string (http/https)
 * }
 *
 * Nomor final ditetapkan di server (anti-tabrakan) pakai:
 *  - BEGIN
 *  - upsert counter (jenis_id,tahun)
 *  - SELECT last_number ... FOR UPDATE (lock row)
 *  - next = last+1 → UPDATE
 *  - INSERT dokumen
 *  - COMMIT
 * Retry 1x kalau kena ER_DUP_ENTRY.
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const b = req.body || {};
  const userId    = b.user_id || null;
  const tanggal   = b.tanggal_dokumen ? new Date(b.tanggal_dokumen) : null;
  const kodeJenis = (b.kategori_code || '').trim();
  const unitCode  = (b.unit_code || '').trim();     // opsional
  const tipe      = (b.tipe_dokumen || '').trim();  // 'B' | 'RHS'
  const perihal   = (b.perihal || '').trim();
  const dari      = (b.dari || '').trim();
  const kepada    = (b.kepada || '').trim();
  const link      = (b.link_dokumen || '').trim();

  if (!tanggal || !kodeJenis || !tipe || !perihal || !dari || !kepada || !link) {
    return res.status(400).json({ error: 'Data wajib belum lengkap.' });
  }
  if (tipe !== 'B' && tipe !== 'RHS') {
    return res.status(400).json({ error: 'tipe_dokumen harus B atau RHS' });
  }
  if (!/^https?:\/\//i.test(link)) {
    return res.status(400).json({ error: 'link_dokumen harus diawali http:// atau https://' });
  }

  const tahun = tanggal.getFullYear();
  const wilayah = 'Sb'; // fixed per requirement
  const wilayahUnit = unitCode ? `${wilayah}-${unitCode}` : wilayah;

  const MAX_ATTEMPTS = 2;
  let attempt = 0;

  while (attempt < MAX_ATTEMPTS) {
    const conn = await db.getConnection();
    try {
      attempt++;
      await conn.beginTransaction();

      // Pastikan jenis ada
      let jenisId;
      const [j1] = await conn.query('SELECT id FROM bimail_jenis WHERE kode = ? LIMIT 1', [kodeJenis]);
      if (j1?.length) {
        jenisId = j1[0].id;
      } else {
        const [ins] = await conn.query('INSERT INTO bimail_jenis (kode, nama) VALUES (?, ?)', [kodeJenis, kodeJenis]);
        jenisId = ins.insertId;
      }

      // Upsert counter (jenis_id,tahun)
      await conn.query(
        `INSERT INTO bimail_counters (jenis_id, tahun, last_number)
         VALUES (?, ?, 0)
         ON DUPLICATE KEY UPDATE last_number = last_number`,
        [jenisId, tahun]
      );

      // Lock baris counter
      const [[rowLock]] = await conn.query(
        `SELECT last_number FROM bimail_counters
         WHERE jenis_id = ? AND tahun = ?
         FOR UPDATE`,
        [jenisId, tahun]
      );

      const nextNumber = Number(rowLock?.last_number || 0) + 1;

      // Update counter
      await conn.query(
        `UPDATE bimail_counters
           SET last_number = ?
         WHERE jenis_id = ? AND tahun = ?`,
        [nextNumber, jenisId, tahun]
      );

      // Rakit nomor final
      const yyPlus2 = String((tahun + 2) % 100).padStart(2, '0'); // 2025 -> '27'
      const nomorSurat = `No.${yyPlus2}/${nextNumber}/${wilayahUnit}/${kodeJenis}/${tipe}`;

      // Simpan dokumen
      await conn.query(
        `INSERT INTO bimail_docs
         (user_id, jenis_id, tahun, nomor_urut, nomor_surat,
          tipe_dokumen, unit_code, wilayah_code,
          tanggal_dokumen, perihal, dari, kepada, link_dokumen, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          userId, jenisId, tahun, nextNumber, nomorSurat,
          tipe, unitCode || null, wilayah,
          tanggal, perihal, dari, kepada, link
        ]
      );

      await conn.commit();
      conn.release();

      return res.status(201).json({
        ok: true,
        nomor_surat: nomorSurat,
        nomor_urut: nextNumber
      });

    } catch (e) {
      try { await conn.rollback(); } catch {}
      conn.release();

      // Retry sekali jika duplicate
      if (e && (e.code === 'ER_DUP_ENTRY' || String(e.message || '').includes('Duplicate'))) {
        if (attempt < MAX_ATTEMPTS) continue;
      }
      console.error('POST /api/BImail error:', e);
      return res.status(500).json({ error: 'Gagal menyimpan BI.MAIL', details: e.message });
    }
  }
}
