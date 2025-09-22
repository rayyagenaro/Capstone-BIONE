import db from '@/lib/db';
import { verifyAuth } from '@/lib/auth';

export default async function handler(req, res) {
  try {
    /* ================= GET ================= */
    if (req.method === 'GET') {
      const isAdminScope = String(req.query?.scope || '').toLowerCase() === 'admin';
      const auth = isAdminScope
        ? await verifyAuth(req, ['super_admin', 'admin_fitur'], 'admin')
        : await verifyAuth(req, ['user'], 'user');

      if (!auth.ok) {
        res.setHeader('Allow', ['GET', 'POST']);
        return res.status(401).json({ error: 'Unauthorized', reason: auth.reason });
      }

      const requestedUserId = req.query.userId ? Number(req.query.userId) : null;
      const listForUserId =
        isAdminScope && Number.isFinite(requestedUserId) && requestedUserId > 0
          ? requestedUserId
          : !isAdminScope
          ? auth.userId
          : null; // admin tanpa userId => semua dokumen

      const page    = Math.max(1, parseInt(req.query.page || '1', 10));
      const perPage = Math.min(100, Math.max(1, parseInt(req.query.perPage || '50', 10)));
      const q       = String(req.query.q || '').trim();

      const where = [];
      const params = [];

      if (listForUserId) {
        where.push('user_id = ?');
        params.push(listForUserId);
      }
      if (q) {
        where.push('(perihal LIKE ? OR nomor_surat LIKE ?)');
        params.push(`%${q}%`, `%${q}%`);
      }
      const whereSQL = where.length ? `WHERE ${where.join(' AND ')}` : '';

      // data utama
      const offset = (page - 1) * perPage;
      const [rows] = await db.query(
        `SELECT
           id, user_id, jenis_id, tahun, nomor_urut, nomor_surat,
           tipe_dokumen, unit_code, wilayah_code,
           tanggal_dokumen, perihal, dari, kepada, link_dokumen,
           created_at
         FROM bimail_docs
         ${whereSQL}
         ORDER BY created_at DESC
         LIMIT ? OFFSET ?`,
        [...params, perPage, offset]
      );

      // total count
      const [[{ cnt }]] = await db.query(
        `SELECT COUNT(*) AS cnt FROM bimail_docs ${whereSQL}`,
        params
      );

      return res.status(200).json({
        items: rows,
        total: cnt,
        page,
        perPage,
      });
    }

    /* ================= POST ================= */
    if (req.method === 'POST') {
      const isAdminScope = String(req.query?.scope || '').toLowerCase() === 'admin';
      const auth = isAdminScope
        ? await verifyAuth(req, ['super_admin', 'admin_fitur'], 'admin')
        : await verifyAuth(req, ['user'], 'user');

      if (!auth.ok) {
        res.setHeader('Allow', ['GET', 'POST']);
        return res.status(401).json({ error: 'Unauthorized', reason: auth.reason });
      }

      const b = req.body || {};
      // user biasa -> userId dari token, admin bisa override
      const userId = !isAdminScope ? auth.userId : (b.user_id || auth.userId);

      const tanggal   = b.tanggal_dokumen ? new Date(b.tanggal_dokumen) : null;
      const kodeJenis = (b.kategori_code || '').trim();
      const unitCode  = (b.unit_code || '').trim().toUpperCase();
      const tipe      = (b.tipe_dokumen || '').trim(); // 'B' | 'RHS'
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
      const wilayah = 'Sb';
      const wilayahUnit = unitCode ? `${wilayah}-${unitCode}` : wilayah;

      const MAX_ATTEMPTS = 2;
      let attempt = 0;

      while (attempt < MAX_ATTEMPTS) {
        const conn = await db.getConnection();
        try {
          attempt++;
          await conn.beginTransaction();

          // jenis
          let jenisId;
          const [j1] = await conn.query(
            'SELECT id FROM bimail_jenis WHERE kode = ? LIMIT 1',
            [kodeJenis]
          );
          if (j1?.length) {
            jenisId = j1[0].id;
          } else {
            const [ins] = await conn.query(
              'INSERT INTO bimail_jenis (kode, nama) VALUES (?, ?)',
              [kodeJenis, kodeJenis]
            );
            jenisId = ins.insertId;
          }

          // upsert counter
          const unit = unitCode || '';
          await conn.query(
            `INSERT INTO bimail_counters (jenis_id, tahun, unit_code, last_number)
              VALUES (?, ?, ?, 0)
              ON DUPLICATE KEY UPDATE last_number = last_number`,
            [jenisId, tahun, unit]
          );

          // lock counter
          const [[rowLock]] = await conn.query(
            `SELECT last_number FROM bimail_counters
              WHERE jenis_id = ? AND tahun = ? AND unit_code = ?
              FOR UPDATE`,
            [jenisId, tahun, unit]
          );
          
          const nextNumber = Number(rowLock?.last_number || 0) + 1;

          await conn.query(
            `UPDATE bimail_counters
              SET last_number = ?
              WHERE jenis_id = ? AND tahun = ? AND unit_code = ?`,
            [nextNumber, jenisId, tahun, unit]
          );

          // nomor final
          const yyPlus2 = String((tahun + 2) % 100).padStart(2, '0'); // 2025 -> '27'
          const nomorSurat = `No.${yyPlus2}/${nextNumber}/${wilayahUnit}/${kodeJenis}/${tipe}`;

          // insert dokumen
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
            nomor_urut: nextNumber,
          });
        } catch (e) {
          try { await conn.rollback(); } catch {}
          conn.release();

          if (e && (e.code === 'ER_DUP_ENTRY' || String(e.message || '').includes('Duplicate'))) {
            if (attempt < MAX_ATTEMPTS) continue;
          }
          console.error('POST /api/BImail error:', e);
          return res.status(500).json({ error: 'Gagal menyimpan BI.MAIL', details: e.message });
        }
      }
    }

    /* ================= Method Lain ================= */
    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  } catch (e) {
    console.error('API /BImail outer error:', e);
    return res.status(500).json({ error: 'Internal Server Error', details: e?.message });
  }
}
