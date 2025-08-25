// /src/pages/api/admin/laporan/booking.js
import db from '@/lib/db';
import { jwtVerify } from 'jose';

const NS_RE = /^[A-Za-z0-9_-]{3,32}$/;
const MAX_ROWS = 10000;

// ===== Auth via cookie namespaced admin_session__{ns} =====
async function requireAdminFromNsCookie(req) {
  const cookies = req.cookies || {};
  const qsNs = typeof req.query.ns === 'string' && NS_RE.test(req.query.ns) ? req.query.ns : null;

  let token = qsNs ? cookies[`admin_session__${qsNs}`] : null;
  if (!token) {
    const entry = Object.entries(cookies).find(([k]) => k.startsWith('admin_session__'));
    if (entry) token = entry[1];
  }
  if (!token) return { ok: false, status: 401, error: 'Unauthorized (no session)' };

  const secret = process.env.JWT_SECRET;
  if (!secret) return { ok: false, status: 500, error: 'Missing JWT secret' };

  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret), {
      algorithms: ['HS256'],
      clockTolerance: 10,
    });
    const role = String(payload?.role || '').toLowerCase();
    const allowed = ['admin', 'superadmin', 'administrator'];
    if (!allowed.includes(role)) {
      return { ok: false, status: 403, error: 'Forbidden', got_roles: [role] };
    }
    return { ok: true, user: { id: payload?.sub, name: payload?.name, role } };
  } catch {
    return { ok: false, status: 401, error: 'Unauthorized (bad token)' };
  }
}

function safeDate(v){ const d = v ? new Date(v) : null; return d && !isNaN(d) ? d : null; }
const toYMD = (d) => (d ? d.toISOString().slice(0,10) : null);

// ===== Helpers autodetect tabel opsional (vehicles/drivers bisa beda nama) =====
async function tableExists(table) {
  const [rows] = await db.query(
    `SELECT 1 FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ? LIMIT 1`,
    [table]
  );
  return rows.length > 0;
}
async function resolveBiDriveRefs() {
  const vehicles = (await tableExists('bidrive_vehicles')) ? 'bidrive_vehicles'
                   : (await tableExists('vehicles')) ? 'vehicles' : null;
  const drivers  = (await tableExists('bidrive_drivers')) ? 'bidrive_drivers'
                   : (await tableExists('drivers')) ? 'drivers' : null;
  return { vehicles, drivers };
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }

  const auth = await requireAdminFromNsCookie(req);
  if (!auth.ok) return res.status(auth.status).json({ error: auth.error, got_roles: auth.got_roles });

  const moduleKey = String(req.query.module || 'bi-care');
  const from = safeDate(req.query.from);
  const to   = safeDate(req.query.to);

  try {
    await db.query('SET SESSION group_concat_max_len = 100000');

    // ================= BI.CARE =================
    if (moduleKey === 'bi-care') {
      const hasTable = await tableExists('bicare_bookings');
      if (!hasTable) {
        return res.status(400).json({ error: 'Modul BI.CARE belum tersedia (tabel bicare_bookings tidak ditemukan).' });
      }

      const params = [];
      const where  = [];
      if (from) { where.push('DATE(t.booking_date) >= ?'); params.push(toYMD(from)); }
      if (to)   { where.push('DATE(t.booking_date) <= ?'); params.push(toYMD(to)); }

      const sql = `
        SELECT
          t.id,
          t.booking_date,        -- DATE
          t.slot_time,           -- TIME
          t.status,              -- string: Booked/Finished/...
          t.booker_name,
          t.nip,
          t.wa,
          t.patient_name,
          t.patient_status,
          t.gender,
          t.birth_date,
          t.complaint,
          t.created_at
        FROM bicare_bookings t
        ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
        ORDER BY t.booking_date DESC, t.slot_time DESC
        LIMIT ${MAX_ROWS}
      `;

      const columns = [
        { header: 'ID',             key: 'id' },
        { header: 'Tanggal',        key: 'booking_date' },
        { header: 'Jam',            key: 'slot_time' },
        { header: 'Status',         key: 'status' },
        { header: 'Pemesan',        key: 'booker_name' },
        { header: 'NIP',            key: 'nip' },
        { header: 'WA',             key: 'wa' },
        { header: 'Nama Pasien',    key: 'patient_name' },
        { header: 'Status Pasien',  key: 'patient_status' },
        { header: 'Gender',         key: 'gender' },
        { header: 'Tgl Lahir',      key: 'birth_date' },
        { header: 'Keluhan',        key: 'complaint' },
        { header: 'Dibuat',         key: 'created_at' },
      ];

      const [rows] = await db.query(sql, params);
      return res.status(200).json({ columns, rows });
    }

    // ================= D.MOVE (biDrive) =================
    if (moduleKey === 'dmove') {
      const hasCore = await tableExists('bidrive_bookings');
      if (!hasCore) {
        return res.status(400).json({ error: 'Modul D.MOVE (biDrive) belum tersedia (tabel bidrive_bookings tidak ditemukan).' });
      }

      const refs = await resolveBiDriveRefs();

      const params = [];
      const where  = [];
      if (from) { where.push('DATE(t.start_date) >= ?'); params.push(toYMD(from)); }
      if (to)   { where.push('DATE(t.start_date) <= ?'); params.push(toYMD(to)); }

      const selectAssignedVehicles = refs.vehicles
        ? `GROUP_CONCAT(DISTINCT v.name ORDER BY v.name SEPARATOR '; ')  AS assigned_vehicles`
        : `NULL AS assigned_vehicles`;
      const selectAssignedDrivers  = refs.drivers
        ? `GROUP_CONCAT(DISTINCT dr.name ORDER BY dr.name SEPARATOR '; ') AS assigned_drivers`
        : `NULL AS assigned_drivers`;

      const joinVehicles = refs.vehicles ? `LEFT JOIN ${refs.vehicles} v ON v.id = ba.vehicle_id` : '';
      const joinDrivers  = refs.drivers  ? `LEFT JOIN ${refs.drivers}  dr ON dr.id = ba.driver_id`  : '';

      const sql = `
        SELECT
          t.id,
          t.created_at,
          t.start_date,
          t.end_date,
          t.tujuan,
          t.jumlah_orang,
          t.jumlah_kendaraan,
          t.volume_kg,
          t.jumlah_driver,
          t.phone,
          t.keterangan,
          t.file_link,
          t.status_id,
          CASE t.status_id
            WHEN 1 THEN 'Pending'
            WHEN 2 THEN 'Approved'
            WHEN 3 THEN 'Rejected'
            WHEN 4 THEN 'Finished'
            ELSE CONCAT('Status-', t.status_id)
          END AS status_name,
          u.name AS user_name,
          GROUP_CONCAT(DISTINCT CONCAT(vt.name, ' x', COALESCE(bv.quantity,0)) SEPARATOR '; ') AS vehicle_types,
          ${selectAssignedVehicles},
          ${selectAssignedDrivers}
        FROM bidrive_bookings t
        LEFT JOIN users u ON u.id = t.user_id
        LEFT JOIN bidrive_booking_vehicle_types bv ON bv.booking_id = t.id
        LEFT JOIN bidrive_vehicle_types vt ON vt.id = bv.vehicle_type_id
        LEFT JOIN bidrive_booking_assignments ba ON ba.booking_id = t.id
        ${joinVehicles}
        ${joinDrivers}
        ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
        GROUP BY t.id
        ORDER BY t.start_date DESC, t.created_at DESC
        LIMIT ${MAX_ROWS}
      `;

      const columns = [
        { header: 'ID',               key: 'id' },
        { header: 'Dibuat',           key: 'created_at' },
        { header: 'Mulai',            key: 'start_date' },
        { header: 'Selesai',          key: 'end_date' },
        { header: 'Pemesan',          key: 'user_name' },
        { header: 'Tujuan',           key: 'tujuan' },
        { header: 'Jml Orang',        key: 'jumlah_orang' },
        { header: 'Jml Kendaraan',    key: 'jumlah_kendaraan' },
        { header: 'Volume (kg)',      key: 'volume_kg' },
        { header: 'Jml Driver',       key: 'jumlah_driver' },
        { header: 'Telepon',          key: 'phone' },
        { header: 'Status',           key: 'status_name' },
        { header: 'Jenis Diminta',    key: 'vehicle_types' },
        { header: 'Kendaraan Tugas',  key: 'assigned_vehicles' },
        { header: 'Driver Tugas',     key: 'assigned_drivers' },
        { header: 'Keterangan',       key: 'keterangan' },
        { header: 'File',             key: 'file_link' },
      ];

      const [rows] = await db.query(sql, params);
      return res.status(200).json({ columns, rows });
    }

    return res.status(400).json({ error: 'module tidak dikenali' });
  } catch (e) {
    console.error('Preview error:', e);
    const payload = { error: 'internal error' };
    if (e?.code) payload.code = e.code;
    if (e?.sqlMessage) payload.sqlMessage = e.sqlMessage;
    return res.status(500).json(payload);
  }
}
