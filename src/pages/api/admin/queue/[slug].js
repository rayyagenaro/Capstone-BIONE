// /src/pages/api/admin/queue/[slug].js
import db from '@/lib/db';

/**
 * Konfigurasi per layanan
 * - from: bisa pakai alias "b" dan join seperlunya
 * - select: kolom yang ditampilkan ke UI
 * - defaultOrder: ORDER BY yang dipakai
 * - pendingWhere: kondisi untuk "pending/masuk". Jika null -> anggap semua.
 */
const CFG = {
  dmove: {
    from: 'bidrive_bookings b LEFT JOIN booking_statuses s ON s.id = b.status_id',
    tableForCount: 'bidrive_bookings b',
    select: 'b.id, b.tujuan, b.start_date, b.end_date, b.status_id, s.name AS status_name, b.created_at',
    defaultOrder: 'ORDER BY b.created_at DESC',
    pendingWhere: 'b.status_id = 1'
  },
  bicare: {
    from: 'bicare_bookings b',
    tableForCount: 'bicare_bookings b',
    select: "b.id, b.booking_date, b.slot_time, b.status, b.booker_name, b.patient_name, b.created_at",
    defaultOrder: 'ORDER BY b.created_at DESC',
    pendingWhere: "b.status = 'booked'"
  },
  bimeal: {
    // belum ada tabel booking, kirim kosong
    from: null,
    tableForCount: null,
    select: null,
    defaultOrder: null,
    pendingWhere: null
  },
  bimeet: {
    from: 'bimeet_bookings b LEFT JOIN booking_statuses s ON s.id = b.status_id',
    tableForCount: 'bimeet_bookings b',
    select: 'b.id, b.title, b.start_datetime, b.end_datetime, b.status_id, s.name AS status_name, b.created_at',
    defaultOrder: 'ORDER BY b.created_at DESC',
    pendingWhere: '(b.status_id IS NULL OR b.status_id = 1)'
  },
  bimail: {
    from: 'bimail_docs b',
    tableForCount: 'bimail_docs b',
    select: 'b.id, b.nomor_surat, b.tanggal_dokumen, b.perihal, b.created_at',
    defaultOrder: 'ORDER BY b.created_at DESC',
    pendingWhere: null // tidak ada status -> treat as ALL
  },
  bistay: {
    from: 'bistay_bookings b',
    tableForCount: 'bistay_bookings b',
    select: 'b.id, b.nama_pemesan, b.check_in, b.check_out, b.created_at',
    defaultOrder: 'ORDER BY b.created_at DESC',
    pendingWhere: null // treat as ALL
  }
};

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const slug = String(req.query.slug || '').toLowerCase();
    const cfg = CFG[slug];
    if (!cfg) return res.status(404).json({ error: 'Unknown service' });

    // pagination & filter
    const page = Math.max(1, parseInt(req.query.page || '1', 10));
    const perPage = Math.min(50, Math.max(1, parseInt(req.query.perPage || '10', 10)));
    const status = (req.query.status || 'pending').toLowerCase(); // 'pending' | 'all'

    // layanan tanpa tabel -> kosong saja
    if (!cfg.from) {
      return res.status(200).json({ items: [], total: 0, page, perPage });
    }

    const whereParts = [];
    if (status === 'pending' && cfg.pendingWhere) {
      whereParts.push(cfg.pendingWhere);
    }
    const whereSQL = whereParts.length ? `WHERE ${whereParts.join(' AND ')}` : '';

    // total
    const [[{ cnt: total }]] = await db.execute(
      `SELECT COUNT(*) AS cnt FROM ${cfg.tableForCount} ${whereSQL}`
    );

    // data
    const offset = (page - 1) * perPage;
    const [rows] = await db.execute(
      `SELECT ${cfg.select} FROM ${cfg.from} ${whereSQL} ${cfg.defaultOrder} LIMIT ? OFFSET ?`,
      [perPage, offset]
    );

    res.status(200).json({ items: rows, total, page, perPage });
  } catch (e) {
    console.error('queue API error:', e);
    res.status(500).json({ error: 'Gagal mengambil data antrian' });
  }
}
