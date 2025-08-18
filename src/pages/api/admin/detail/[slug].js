// /src/pages/api/admin/detail/[slug].js
import db from '@/lib/db';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // --- Normalisasi slug + alias layanan
  const rawSlug = String(req.query.slug || '').trim().toLowerCase();
  const SERVICE_ALIAS = {
    bicare: 'bicare',
    bimeet: 'bimeet',
    bistay: 'bistay',
    bimeal: 'bimeal',   // opsional, jaga-jaga
    // alias untuk dokumen
    bimail: 'bimail',
    bidocs: 'bimail',
    docs:   'bimail',
    mail:   'bimail',
  };
  const service = SERVICE_ALIAS[rawSlug];

  // --- Validasi id
  const idParam = Array.isArray(req.query.id) ? req.query.id[0] : req.query.id;
  if (!idParam) return res.status(400).json({ error: 'Missing id' });
  const id = Number(idParam);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'Invalid id' });
  }

  if (!service) {
    return res.status(400).json({ error: 'Layanan tidak dikenali', received: rawSlug });
  }

  try {
    let sql = '';
    let params = [id];

    switch (service) {
      // ===================== BI.CARE =====================
      case 'bicare':
        sql = `
          SELECT
            b.*,
            d.name AS doctor_name
          FROM bicare_bookings b
          LEFT JOIN bicare_doctors d ON d.id = b.doctor_id
          WHERE b.id = ? LIMIT 1
        `;
        break;

      // ===================== BI.MEET =====================
      case 'bimeet':
        sql = `
          SELECT
            b.*,
            r.name  AS room_name,
            r.floor AS room_floor
          FROM bimeet_bookings b
          LEFT JOIN bimeet_rooms r ON r.id = b.room_id
          WHERE b.id = ? LIMIT 1
        `;
        break;

      // ===================== BI.STAY =====================
      case 'bistay':
        sql = `
          SELECT b.*
          FROM bistay_bookings b
          WHERE b.id = ? LIMIT 1
        `;
        break;

      // ===================== BI.MEAL (opsional placeholder) =====================
      case 'bimeal':
        sql = `
          SELECT b.*
          FROM bimeal_bookings b
          WHERE b.id = ? LIMIT 1
        `;
        break;

      // ===================== BI.MAIL / BI-DOCS =====================
      // Tabel: bimail_docs (sesuai struktur yang kamu berikan)
      // Field penting untuk UI:
      //  - nomor_surat        -> mail_number
      //  - tipe_dokumen       -> mail_type
      //  - tanggal_dokumen    -> mail_date
      //  - perihal            -> subject
      //  - dari               -> from_name
      //  - kepada             -> to_name
      //  - link_dokumen       -> link_dokumen (dan attachments 1 item dibuat di JS)
      //  - created_at         -> created_at
      case 'bimail':
        sql = `
          SELECT
            d.id,
            d.user_id,
            d.jenis_id,
            d.tahun,
            d.nomor_urut,
            d.nomor_surat,
            d.tipe_dokumen,
            d.unit_code,
            d.wilayah_code,
            d.tanggal_dokumen,
            d.perihal,
            d.dari,
            d.kepada,
            d.link_dokumen,
            d.created_at
          FROM bimail_docs d
          WHERE d.id = ? LIMIT 1
        `;
        break;

      default:
        return res.status(400).json({ error: 'Layanan tidak dikenali' });
    }

    const [rows] = await db.query(sql, params);
    if (!rows.length) return res.status(404).json({ error: 'Data tidak ditemukan' });

    let item = rows[0];

    if (service === 'bimeal') {
      const [items] = await db.query(
        `SELECT id, nama_pesanan, jumlah
         FROM bimeal_booking_items
         WHERE booking_id = ?
         ORDER BY id ASC`,
        [id]
      );
      return res.status(200).json({ item: { ...rows[0], items } });
    }

    // Post-processing khusus BI.MAIL biar field match ke UI
    if (service === 'bimail') {
      const attachments = item.link_dokumen
        ? [{ name: 'Dokumen', url: item.link_dokumen }]
        : [];

      item = {
        // Kolom asli (kalau kamu butuh)
        ...item,

        // Alias untuk UI kamu:
        mail_number: item.nomor_surat,
        mail_type: item.tipe_dokumen,          // tampilkan kode apa adanya (A/B/...)
        mail_date: item.tanggal_dokumen,       // dipakai formatDateOnly di FE
        subject: item.perihal,
        from_name: item.dari,
        to_name: item.kepada,
        attachments,                           // array {name, url}
        // Kolom yang belum ada di tabel → null supaya UI aman
        summary: null,
        classification: null,
        status: null,
        status_id: null,
        received_at: null,
        updated_at: null,
      };
    }

    return res.status(200).json({ item });
  } catch (e) {
    console.error('detail-api error:', e);
    return res.status(500).json({
      error: 'Server error',
      message: e?.message,
      code: e?.code,
      sqlMessage: e?.sqlMessage,
      sqlState: e?.sqlState,
    });
  }
}