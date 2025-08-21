// src/lib/fetchBookings.js
import { withNs } from "./ns";

const opts = (signal) => ({
  cache: "no-store",
  credentials: "include",
  signal,
});

/* ===================== Normalisasi Data ===================== */
const mapBICareStatusToId = (status) => {
  const s = String(status || "").toLowerCase();
  if (s === "booked") return 2;
  if (s === "finished") return 4;
  if (s === "rejected" || s === "cancelled") return 3;
  return 1; // Pending default
};

function normalizeBIDriveRow(row) {
  return {
    id: Number(row.id) || 0,
    feature_key: "bidrive",
    tujuan: row.tujuan || row.destination || "Perjalanan",
    start_date: row.start_date || row.start_datetime || row.created_at,
    end_date: row.end_date || row.end_datetime || row.start_date,
    status_id: row.status_id || 1,
    vehicle_types: row.vehicle_types || [],
    _raw_bidrive: row,
  };
}

function normalizeBICareRow(row) {
  const dateOnly = row?.booking_date
    ? (typeof row.booking_date === "string"
        ? row.booking_date.slice(0, 10)
        : new Date(row.booking_date).toISOString().slice(0, 10))
    : new Date().toISOString().slice(0, 10);

  const slot = (() => {
    const raw = String(row.slot_time || "00:00:00").slice(0, 8);
    return /^\d{2}:\d{2}(:\d{2})?$/.test(raw)
      ? raw.includes(":") && raw.split(":").length === 2
        ? `${raw}:00`
        : raw
      : "00:00:00";
  })();

  const startLocal = `${dateOnly}T${slot}`;
  const end = new Date(startLocal);
  end.setMinutes(end.getMinutes() + 30);

  return {
    id: `bicare-${row.id}`,
    feature_key: "bicare",
    tujuan: `Klinik Dokter #${row.doctor_id}`,
    start_date: startLocal,
    end_date: end.toISOString(),
    status_id: mapBICareStatusToId(row.status),
    _raw_bicare: row,
  };
}

function normalizeBIMailRow(row) {
  const start = row.tanggal_dokumen || row.created_at || new Date().toISOString();
  
  return {
    id: `bimail-${row.id}`,
    feature_key: "bimail",
    tujuan: row.perihal || `Dokumen ${row.nomor_surat || ""}`.trim(),
    start_date: start,
    end_date: start,
    status_id: 4,

    // === kolom sesuai tabel ===
    nomor_surat: row.nomor_surat,
    tipe_dokumen: row.tipe_dokumen,
    unit_code: row.unit_code,
    wilayah_code: row.wilayah_code,
    tanggal_dokumen: row.tanggal_dokumen,
    perihal: row.perihal,
    dari: row.dari,
    kepada: row.kepada,
    link_dokumen: row.link_dokumen,

    // untuk debugging tetap simpan raw
    _raw_bimail: row,
  };
}


function normalizeBIMealRow(row) {
  const startISO =
    row.waktu_pesanan || row.created_at || new Date().toISOString();
  const items = Array.isArray(row.items) ? row.items : [];
  const totalQty = items.reduce((a, x) => a + (Number(x?.qty) || 0), 0);

  return {
    id: `bimeal-${row.id}`,
    feature_key: "bimeal",
    tujuan: row.unit_kerja ? `Catering • ${row.unit_kerja}` : "Catering",
    start_date: startISO,
    end_date: startISO,
    status_id: row.status_id || 1,
    _raw_bimeal: { ...row, items, total_qty: totalQty },
  };
}

function normalizeBIMeetRow(row) {
  return {
    id: `bimeet-${row.id}`,
    feature_key: "bimeet",
    tujuan: row.title || `Meeting Room • ${row.room_name || row.room_id}`,
    start_date: row.start_date, // langsung dari SQL alias
    end_date: row.end_date,
    status_id: row.status_id || 1,
    _raw_bimeet: row,
  };
}


function normalizeBIStayRow(row) {
  return {
    id: `bistay-${row.id}`,
    feature_key: "bistay",
    tujuan: row.asal_kpw ? `Menginap • ${row.asal_kpw}` : "Menginap",
    start_date: row.check_in,
    end_date: row.check_out,
    status_id: Number(row.status_id) || 1,
    _raw_bistay: row,
  };
}

/* ===================== Fetch All Services ===================== */
export async function fetchAllBookings(ns, scope = "user", abortSignal) {
  if (!ns) {
    console.warn("[fetchAllBookings] ns kosong → return []");
    return [];
  }

  const endpoints = [
    { service: "bidrive", url: "/api/booking", normalize: normalizeBIDriveRow },
    {
      service: "bicare",
      url: `/api/BIcare/booked?scope=${scope}`,
      normalize: normalizeBICareRow,
      arrKey: "bookings",
    },
    {
      service: "bimail",
      url: `/api/BImail?scope=${scope}`,
      normalize: normalizeBIMailRow,
      arrKey: "items",
    },
    {
      service: "bimeal",
      url: `/api/bimeal/book?scope=${scope}`,
      normalize: normalizeBIMealRow,
    },
    {
      service: "bimeet",
      url: `/api/bimeet/createbooking?scope=${scope}`,
      normalize: normalizeBIMeetRow,
      arrKey: "items",
    },
    {
      service: "bistay",
      url: `/api/BIstaybook/bistaybooking?scope=${scope}`,
      normalize: normalizeBIStayRow,
      arrKey: "data",
    },
  ];

  const parseArray = (payload, key) => {
    if (key && Array.isArray(payload?.[key])) return payload[key];
    if (Array.isArray(payload)) return payload;
    return [];
  };

  const results = await Promise.all(
    endpoints.map(async ({ service, url, normalize, arrKey }) => {
      try {
        const res = await fetch(withNs(url, ns), opts(abortSignal));
        const j = await res.json().catch(() => ({}));

        if (!res.ok)
          throw new Error(j?.reason || j?.error || `HTTP ${res.status}`);

        const rows = parseArray(j, arrKey);
        return rows.map(normalize);
      } catch (e) {
        console.warn(`${service} fetch error:`, e.message || e);
        return [];
      }
    })
  );

  return results
    .flat()
    .sort((a, b) => new Date(b.start_date) - new Date(a.start_date));
}
