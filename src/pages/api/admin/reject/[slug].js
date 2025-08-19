import db from '@/lib/db';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }

  const { slug } = req.query;
  const { id, reason } = req.body || {};
  const key = String(slug || '').toLowerCase();

  // BI-DOCS tidak ikut reject generic
  if (key === 'bimail') return res.status(400).json({ error: 'BI-DOCS tidak menggunakan endpoint ini' });
  if (!id || Number.isNaN(Number(id))) return res.status(400).json({ error: 'Param id wajib & harus numerik' });

  try {
    let sql, params;

    if (key === 'bimeet') {
      // bimeet_bookings punya kolom reject_reason
      sql = 'UPDATE bimeet_bookings SET status_id = 3, reject_reason = ?, updated_at = NOW() WHERE id = ? LIMIT 1';
      params = [reason || null, Number(id)];
    } else if (key === 'bimeal') {
      // kalau kamu tambahkan kolom bimeal_bookings.reject_reason, ganti SQL ini jadi mirip bimeet
      sql = 'UPDATE bimeal_bookings SET status_id = 3, updated_at = NOW() WHERE id = ? LIMIT 1';
      params = [Number(id)];
    } else if (key === 'bistay') {
      // pastikan kolom status_id sudah ada (lihat catatan SQL di bawah)
      sql = 'UPDATE bistay_bookings SET status_id = 3, updated_at = NOW() WHERE id = ? LIMIT 1';
      params = [Number(id)];
    } else {
      return res.status(404).json({ error: `Unsupported slug: ${slug}` });
    }

    const [result] = await db.query(sql, params);
    if (!result?.affectedRows) return res.status(404).json({ error: 'Data tidak ditemukan' });
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error('POST /api/admin/reject error:', e);
    return res.status(500).json({ error: e.message });
  }
}
