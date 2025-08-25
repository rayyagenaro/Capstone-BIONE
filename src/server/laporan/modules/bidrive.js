// Adapter BI.DRIVE – cocok dengan tabel bidrive_bookings yang kamu kirim
// Tabel: bidrive_bookings (id,user_id,status_id,tujuan,jumlah_orang,jumlah_kendaraan,volume_kg,start_date,end_date,phone,keterangan,rejection_reason,created_at,updated_at,file_link,jumlah_driver)

function statusName(id) {
  switch (Number(id)) {
    case 1: return 'Pending';
    case 2: return 'Approved';
    case 3: return 'Rejected';
    case 4: return 'Finished';
    default: return `Status-${id}`;
  }
}

export const excel = {
  filenamePrefix: 'bi-drive',
  columns: [
    { header: 'ID',                key: 'id',                 width: 8 },
    { header: 'Start Date',        key: 'start_date',         width: 16 },
    { header: 'End Date',          key: 'end_date',           width: 16 },
    { header: 'Status',            key: 'status_name',        width: 12 },
    { header: 'Tujuan',            key: 'tujuan',             width: 20 },
    { header: 'Jml Orang',         key: 'jumlah_orang',       width: 10 },
    { header: 'Jml Kendaraan',     key: 'jumlah_kendaraan',   width: 14 },
    { header: 'Volume (kg)',       key: 'volume_kg',          width: 12 },
    { header: 'Jml Driver',        key: 'jumlah_driver',      width: 12 },
    { header: 'Phone',             key: 'phone',              width: 16 },
    { header: 'Keterangan',        key: 'keterangan',         width: 24 },
    { header: 'File Link',         key: 'file_link',          width: 24 },
    { header: 'Rejection Reason',  key: 'rejection_reason',   width: 24 },
    { header: 'Created At',        key: 'created_at',         width: 18 },
    { header: 'Updated At',        key: 'updated_at',         width: 18 },
  ],
  dateKeys: ['start_date', 'end_date', 'created_at', 'updated_at'],
};

export async function preview({ db, fromYMD, toYMD }) {
  const where = [];
  const params = [];

  // filter berdasar start_date (umum untuk rentang perjalanan)
  if (fromYMD) { where.push('DATE(b.start_date) >= ?'); params.push(fromYMD); }
  if (toYMD)   { where.push('DATE(b.start_date) <= ?'); params.push(toYMD); }

  const whereSQL = where.length ? ('WHERE ' + where.join(' AND ')) : '';
  const sql = `
    SELECT
      b.id,
      b.start_date,
      b.end_date,
      b.status_id,
      b.tujuan,
      b.jumlah_orang,
      b.jumlah_kendaraan,
      b.volume_kg,
      b.jumlah_driver,
      b.phone,
      b.keterangan,
      b.file_link,
      b.rejection_reason,
      b.created_at,
      b.updated_at
    FROM bidrive_bookings b
    ${whereSQL}
    ORDER BY b.id ASC
    LIMIT 10000
  `;

  const [raw] = await db.query(sql, params);
  const rows = raw.map(r => ({ ...r, status_name: statusName(r.status_id) }));

  return {
    columns: excel.columns.map(({ header, key }) => ({ header, key })),
    rows,
  };
}
