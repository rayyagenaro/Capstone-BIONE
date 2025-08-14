import db from '@/lib/db';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const conn = await db.getConnection();
  try {
    const b = req.body || {};
    const userId    = b.user_id || null;
    const tanggal   = b.tanggal_dokumen ? new Date(b.tanggal_dokumen) : null;
    const kodeJenis = (b.kategori_code || '').trim(); // 'M.01', dll
    const unitCode  = (b.unit_code || '').trim();     // bisa '' (opsional)
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
    const tahun = tanggal.getFullYear();

    await conn.beginTransaction();

    // pastikan jenis ada
    let jenisId;
    const [j1] = await conn.query('SELECT id FROM bimail_jenis WHERE kode = ? LIMIT 1', [kodeJenis]);
    if (j1?.length) jenisId = j1[0].id;
    else {
      const [ins] = await conn.query('INSERT INTO bimail_jenis (kode, nama) VALUES (?, ?)', [kodeJenis, kodeJenis]);
      jenisId = ins.insertId;
    }

    // upsert counter
    await conn.query(
      `INSERT INTO bimail_counters (jenis_id, tahun, last_number)
       VALUES (?, ?, 0)
       ON DUPLICATE KEY UPDATE last_number = last_number`,
      [jenisId, tahun]
    );

    // increment & get
    await conn.query(
      'UPDATE bimail_counters SET last_number = last_number + 1 WHERE jenis_id = ? AND tahun = ?',
      [jenisId, tahun]
    );
    const [[rowAfter]] = await conn.query(
      'SELECT last_number FROM bimail_counters WHERE jenis_id = ? AND tahun = ? LIMIT 1',
      [jenisId, tahun]
    );
    const nomorUrut = Number(rowAfter.last_number);

    // rakit nomor
    const yyPlus2 = String((tahun + 2) % 100).padStart(2, '0'); // 2025 => 27
    const wilayah = 'Sb';
    const wilayahUnit = unitCode ? `${wilayah}-${unitCode}` : wilayah;
    const nomorSurat = `No.${yyPlus2}/${nomorUrut}/${wilayahUnit}/${kodeJenis}/${tipe}`;

    await conn.query(
      `INSERT INTO bimail_docs
       (user_id, jenis_id, tahun, nomor_urut, nomor_surat,
        tipe_dokumen, unit_code, wilayah_code,
        tanggal_dokumen, perihal, dari, kepada, link_dokumen, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        userId, jenisId, tahun, nomorUrut, nomorSurat,
        tipe, unitCode || null, wilayah,
        tanggal, perihal, dari, kepada, link
      ]
    );

    await conn.commit();
    res.status(201).json({ ok: true, nomor_surat: nomorSurat, nomor_urut: nomorUrut });
  } catch (e) {
    try { await conn.rollback(); } catch {}
    console.error('POST /api/bi-mail error:', e);
    res.status(500).json({ error: 'Gagal menyimpan BI.MAIL', details: e.message });
  } finally {
    try { conn.release(); } catch {}
  }
}
