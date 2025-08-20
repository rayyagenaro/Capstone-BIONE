// src/pages/StatusBooking/hal-statusBooking.js
import React, { useEffect, useState, useMemo, useCallback } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/router';
import styles from './statusBooking.module.css';
import SidebarUser from '@/components/SidebarUser/SidebarUser';
import LogoutPopup from '@/components/LogoutPopup/LogoutPopup';
import Pagination from '@/components/Pagination/Pagination';
import { FaArrowLeft, FaTimes } from 'react-icons/fa';
import RejectionBox from '@/components/RejectionBox/RejectionBox';

/* ===================== KONFIGURASI & HELPER (STATUS) ===================== */
const STATUS_CONFIG = {
  '1': { text: 'Pending',  className: styles.statusProcess },
  '2': { text: 'Approved', className: styles.statusApproved },
  '3': { text: 'Rejected', className: styles.statusRejected },
  '4': { text: 'Finished', className: styles.statusFinished },
};

const TABS = ['All', 'Pending', 'Approved', 'Rejected', 'Finished'];
const TAB_TO_STATUS_ID = { Pending: 1, Approved: 2, Rejected: 3, Finished: 4 };

// mapping untuk localStorage (per tab)
const SEEN_KEYS = { Pending: 'pending', Approved: 'approved', Rejected: 'rejected', Finished: 'finished' };
const DEFAULT_SEEN = { pending: 0, approved: 0, rejected: 0, finished: 0 };
const seenStorageKey = (userId) => `statusTabSeen:${userId}`;

/* ===================== KONFIGURASI & HELPER (FITUR/LAYANAN) ===================== */
const FEATURE_OPTIONS = [
  { label: 'All', value: 'all' },
  { label: 'BI.Drive', value: 'bidrive' },
  { label: 'BI.Care',  value: 'bicare' },
  { label: 'BI.Meal',  value: 'bimeal' },
  { label: 'BI.Meet',  value: 'bimeet' },
  { label: 'BI.Docs',  value: 'bidocs' },
  { label: 'BI.Stay',  value: 'bistay' },
];

// (Opsional) Mapping ID → key kalau backend kirim angka
const SERVICE_ID_TO_KEY = {
  // 1: 'bidrive',
  // 2: 'bicare',
  // 3: 'bimeal',
  // 4: 'bimeet',
  // 5: 'bidocs',
  // 6: 'bistay',
};

const norm = (s) => String(s || '').trim().toLowerCase();

// === LOGO PER LAYANAN (pastikan file ada di /public/assets) ===
const FEATURE_LOGOS = {
  bidrive: "/assets/D'MOVE.svg",
  bicare:  "/assets/BI-CARE.svg",
  bimeal:  "/assets/D'MEAL.svg",
  bimeet:  "/assets/D'ROOM.svg",
  bidocs:  "/assets/BI-MAIL.svg",
  bistay:  "/assets/D'REST.svg",
};
const logoSrcOf = (booking) => {
  const key = resolveFeatureKey(booking);
  return FEATURE_LOGOS[key] || '/assets/BI-One-Blue.png';
};

// === helper untuk ambil ID numerik dari string seperti "bidrive-32"
const numericIdOf = (id) => {
  const m = String(id ?? '').match(/(\d+)$/);
  return m ? Number(m[1]) : NaN;
};

/** Deteksi key fitur dari objek booking */
function resolveFeatureKey(booking) {
  if (booking?.feature_key) return booking.feature_key;

  const sid = booking?.service_id ?? booking?.layanan_id ?? booking?.feature_id ?? booking?.serviceId;
  if (sid && SERVICE_ID_TO_KEY[sid]) return SERVICE_ID_TO_KEY[sid];

  const candidates = [
    booking?.service,
    booking?.service_name,
    booking?.service_code,
    booking?.feature,
    booking?.layanan,
    booking?.jenis_layanan,
    booking?.feature_name,
  ].map(norm).filter(Boolean);

  for (const raw of candidates) {
    const s = raw.replace(/\s+/g, '');
    if (s.includes('bi.drive') || s.includes('bidrive') || s === 'drive') return 'bidrive';
    if (s.includes('bi.care')  || s.includes('bicare')  || s === 'care')  return 'bicare';
    if (s.includes('bi.meal')  || s.includes('bimeal')  || s === 'meal')  return 'bimeal';
    if (s.includes('bi.meet')  || s.includes('bimeet')  || s === 'meet')  return 'bimeet';
    if (s.includes('bi.docs')  || s.includes('bidocs')  || s === 'docs')  return 'bidocs';
    if (s.includes('bi.stay')  || s.includes('bistay')  || s === 'stay')  return 'bistay';
  }
  return 'unknown';
}

function featureLabelOf(booking) {
  const key = resolveFeatureKey(booking);
  switch (key) {
    case 'bidrive': return 'BI.Drive';
    case 'bicare':  return 'BI.Care';
    case 'bimeal':  return 'BI.Meal';
    case 'bimeet':  return 'BI.Meet';
    case 'bidocs':  return 'BI.Docs';
    case 'bistay':  return 'BI.Stay';
    default:        return null;
  }
}

const formatDate = (dateString) => {
  if (!dateString) return 'Tanggal tidak valid';
  return new Date(dateString).toLocaleDateString('id-ID', {
    day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
};

const getPlate = (v) =>
  v?.plate || v?.plat_nomor || v?.nopol || v?.no_polisi || String(v?.id ?? '-');

/* ===================== Helper API opsional untuk set AVAILABLE ===================== */
async function setDriversAvailable(driverIds, availableStatusId = 1) {
  if (!Array.isArray(driverIds) || driverIds.length === 0) return { ok: true, affected: 0 };
  const calls = driverIds.map((id) =>
    fetch('/api/updateDriversStatus', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ driverId: id, newStatusId: availableStatusId }),
    }).then(async (r) => {
      if (!r.ok) {
        const e = await r.json().catch(() => ({}));
        throw new Error(e.error || `Gagal update driver ${id}`);
      }
      return true;
    })
  );
  const results = await Promise.allSettled(calls);
  const failed = results.filter(r => r.status === 'rejected');
  if (failed.length) throw new Error(failed[0].reason?.message || 'Gagal update sebagian driver');
  return { ok: true, affected: results.length };
}
async function setVehiclesAvailable(vehicleIds, availableStatusId = 1) {
  if (!Array.isArray(vehicleIds) || vehicleIds.length === 0) return { ok: true, affected: 0 };
  const calls = vehicleIds.map((id) =>
    fetch('/api/updateVehiclesStatus', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ vehicleId: id, newStatusId: availableStatusId }),
    }).then(async (r) => {
      if (!r.ok) {
        const e = await r.json().catch(() => ({}));
        throw new Error(e.error || `Gagal update vehicle ${id}`);
      }
      return true;
    })
  );
  const results = await Promise.allSettled(calls);
  const failed = results.filter(r => r.status === 'rejected');
  if (failed.length) throw new Error(failed[0].reason?.message || 'Gagal update sebagian kendaraan');
  return { ok: true, affected: results.length };
}

/* ===================== Helper umum: update status booking per layanan ===================== */
async function updateServiceStatus(featureKey, bookingId, newStatusId = 4, ns) {
  // normalisasi ID
  const idNum = numericIdOf(bookingId);
  if (!Number.isFinite(idNum)) {
    throw new Error('ID booking tidak valid');
  }

  // mapping endpoint PUT status untuk tiap layanan
  const endpoint = {
    bidrive: '/api/booking',                 // PUT { bookingId, newStatusId, ns? }
    bimeet:  '/api/bimeet/createbooking',    // PUT { bookingId, newStatusId, ns? } (sudah kamu buat)
    bimeal:  '/api/bimeal/book',          // siapkan di backend
    bistay:  '/api/BIstaybook/bistaybooking',          // siapkan di backend
  }[featureKey];

  if (!endpoint) {
    throw new Error(`Finish tidak didukung untuk layanan ${featureKey}.`);
  }

  const res = await fetch(endpoint, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ bookingId: idNum, newStatusId, ...(ns ? { ns } : {}) }),
    credentials: 'include',
  });

  if (!res.ok) {
    let msg = `Gagal update status booking (${featureKey}).`;
    try {
      const err = await res.json();
      if (err?.error) msg = err.error;
      if (err?.message) msg += ` — ${err.message}`;
    } catch {}
    throw new Error(msg);
  }

  try {
    return await res.json();
  } catch {
    return { ok: true };
  }
}

/* ===================== Normalisasi BI.Care → kartu generik ===================== */
const mapBICareStatusToId = (status) => {
  const s = String(status || '').toLowerCase();
  if (s === 'booked') return 2;              // setara Approved
  if (s === 'finished') return 4;
  if (s === 'rejected' || s === 'cancelled') return 3;
  return 1; // Pending (default)
};

/* ===================== Normalisasi BI.Drive → kartu generik ===================== */
function normalizeBIDriveRow(row) {
  return {
    id: Number(row.id) || 0,
    feature_key: 'bidrive',
    tujuan: row.tujuan || row.destination || 'Perjalanan',
    start_date: row.start_date || row.start_datetime || row.created_at,
    end_date: row.end_date || row.end_datetime || row.start_date,
    status_id: row.status_id || 1,
    rejection_reason: row.rejection_reason || null,
    vehicle_types: row.vehicle_types || [],
    _raw_bidrive: row,
  };
}

function normalizeBICareRow(row) {
  const dateOnly = row?.booking_date
    ? (typeof row.booking_date === 'string'
        ? row.booking_date.slice(0, 10)
        : new Date(row.booking_date).toISOString().slice(0, 10))
    : null;

  const slot =
    /^\d{2}:\d{2}$/.test(String(row.slot_time || ''))
      ? `${row.slot_time}:00`
      : String(row.slot_time || '00:00:00').slice(0, 8);

  const startLocal = dateOnly ? `${dateOnly}T${slot}` : new Date().toISOString();
  const end = new Date(startLocal);
  end.setMinutes(end.getMinutes() + 30);

  return {
    id: `bicare-${row.id}`,
    feature_key: 'bicare',
    tujuan: `Klinik Dokter #${row.doctor_id}`, // ganti ke doctor_name kalau sudah JOIN
    start_date: startLocal,
    end_date: end.toISOString(),
    status_id: mapBICareStatusToId(row.status),
    rejection_reason: null,
    vehicle_types: [],
    _raw_bicare: row,
  };
}

/* ===================== Normalisasi BI.Docs (BImail) ===================== */
function normalizeBIMailRow(row) {
  const start = row.tanggal_dokumen || row.created_at || new Date().toISOString();
  return {
    id: `bidocs-${row.id}`,
    feature_key: 'bidocs',
    tujuan: row.perihal || `Dokumen ${row.nomor_surat || ''}`.trim(),
    start_date: start,
    end_date: start,
    status_id: 4, // tabel tidak punya status → anggap Pending
    // field khusus untuk modal/kartu
    nomor_surat: row.nomor_surat,
    tipe_dokumen: row.tipe_dokumen,   // 'B' | 'RHS'
    unit_code: row.unit_code,
    wilayah_code: row.wilayah_code,
    tanggal_dokumen: row.tanggal_dokumen,
    perihal: row.perihal,
    dari: row.dari,
    kepada: row.kepada,
    link_dokumen: row.link_dokumen,
    _raw_bidocs: row,
  };
}

/* ===================== Normalisasi BI.Meal ===================== */
function normalizeBIMealRow(row) {
  const startISO = row.waktu_pesanan || row.created_at || new Date().toISOString();
  // ringkasan pesanan
  const items = Array.isArray(row.items) ? row.items : [];
  const totalQty = items.reduce((a, x) => a + (Number(x?.qty) || 0), 0);

  return {
    id: `bimeal-${row.id}`,
    feature_key: 'bimeal',
    tujuan: row.unit_kerja ? `Catering • ${row.unit_kerja}` : 'Catering',
    start_date: startISO,
    end_date: startISO,
    status_id: row.status_id || 1,
    // field khusus untuk kartu/modal:
    _raw_bimeal: {
      nama_pic: row.nama_pic,
      nip_pic: row.nip_pic,
      no_wa_pic: row.no_wa_pic,
      unit_kerja: row.unit_kerja,
      waktu_pesanan: row.waktu_pesanan,
      items,
      total_qty: totalQty,
    },
  };
}
 
/* ===================== Normalisasi BI.Meet ===================== */
function normalizeBIMeetRow(row) {
  // status_id backend sudah 1..4, langsung dipakai
  return {
    id: `bimeet-${row.id}`,
    feature_key: 'bimeet',
    tujuan: row.title || (row.room_name ? `Meeting @ ${row.room_name}` : 'Meeting'),
    start_date: row.start_datetime,      // ISO/string dari DB; Date() di UI akan handle
    end_date: row.end_datetime,
    status_id: Number(row.status_id) || 1,
    // field khusus untuk kartu & modal:
    room_name: row.room_name || null,
    room_capacity: row.capacity ?? null,
    unit_kerja: row.unit_kerja || null,
    participants: row.participants ?? null,
    contact_phone: row.contact_phone || null,
    pic_name: row.pic_name || null,
    description: row.description || null,
    _raw_bimeet: row,
  };
}
/* ===================== Normalisasi BI.Stay ===================== */
function normalizeBIStayRow(row) {
  // API GET mengembalikan: id, nama_pemesan, nip, no_wa, asal_kpw, check_in, check_out, keterangan, status_pegawai (info jenis pegawai, bukan approval)
  // status approval belum ada di tabel → tampilkan sebagai Pending (1) agar konsisten dengan tampilan
  return {
    id: `bistay-${row.id}`,
    feature_key: 'bistay',
    tujuan: row.asal_kpw ? `Menginap • ${row.asal_kpw}` : 'Menginap',
    start_date: row.check_in,
    end_date: row.check_out,
    status_id: Number(row.status_id) || 1,
    _raw_bistay: {
      nama_pemesan: row.nama_pemesan,
      nip: row.nip,
      no_wa: row.no_wa,
      asal_kpw: row.asal_kpw,
      keterangan: row.keterangan,
      status_pegawai: row.status_pegawai || `#${row.status_pegawai_id}`,
      created_at: row.created_at,
    },
  };
}


/* ===================== SUB-KOMPONEN ===================== */
const BookingCard = React.memo(({ booking, onClick }) => {
  const statusInfo =
    STATUS_CONFIG[booking.status_id] || { text: 'Unknown', className: styles.statusProcess };
  const isRejected = Number(booking.status_id) === 3 && !!booking.rejection_reason;
  const featureLabel = featureLabelOf(booking);
  const featureKey = resolveFeatureKey(booking);

  // Baris info ringkas per layanan
  const renderServiceLine = () => {
    switch (featureKey) {
      case 'bicare': {
        const jam = booking._raw_bicare?.slot_time?.slice(0,5);
        const pasien = booking._raw_bicare?.patient_name;
        return (
          <div className={styles.cardVehicles}>
            {jam ? `Jam: ${jam}` : ''}{jam && pasien ? ' • ' : ''}{pasien ? `Pasien: ${pasien}` : ''}
          </div>
        );
      }
      case 'bidocs': {
        const nomor = booking.nomor_surat;
        const perihal = booking.perihal;
        const route = (booking.dari && booking.kepada) ? `Dari: ${booking.dari} → ${booking.kepada}` : '';
        const parts = [nomor && `Nomor: ${nomor}`, perihal && `Perihal: ${perihal}`, route].filter(Boolean);
        return parts.length ? <div className={styles.cardVehicles}>{parts.join(' • ')}</div> : null;
      }
      case 'bimeal': {
        const unit = booking._raw_bimeal?.unit_kerja;
        const count = booking._raw_bimeal?.items?.length || 0;
        const total = booking._raw_bimeal?.total_qty || 0;
        const parts = [
          unit && `Unit: ${unit}`,
          count ? `Item: ${count}` : null,
          total ? `Total qty: ${total}` : null,
        ].filter(Boolean);
        return parts.length ? <div className={styles.cardVehicles}>{parts.join(' • ')}</div> : null;
      }
      case 'bimeet': {
        const rn = booking.room_name;
        const part = booking.participants;
        const uker = booking.unit_kerja;
        const parts = [
          rn && `Ruangan: ${rn}`,
          Number.isFinite(part) && `Peserta: ${part}`,
          uker && `Unit: ${uker}`,
        ].filter(Boolean);
        return parts.length ? <div className={styles.cardVehicles}>{parts.join(' • ')}</div> : null;
      }
      case 'bistay': {
        const s = booking._raw_bistay;
        const parts = [
          s?.nama_pemesan && `Pemesan: ${s.nama_pemesan}`,
          s?.asal_kpw && `Asal KPW: ${s.asal_kpw}`,
          s?.status_pegawai && `Status: ${s.status_pegawai}`,
        ].filter(Boolean);
        return parts.length ? <div className={styles.cardVehicles}>{parts.join(' • ')}</div> : null;
      }

      default: {
        if (featureKey === 'bidrive' && booking.vehicle_types?.length > 0) {
          return <div className={styles.cardVehicles}>{booking.vehicle_types.map((vt) => vt.name).join(', ')}</div>;
        }
        return null;
      }
    }
  };

  return (
    <div
      className={styles.bookingCard}
      onClick={onClick}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}
      role="button"
      tabIndex={0}
    >
      {/* Logo dinamis per layanan */}
      <Image
        src={logoSrcOf(booking)}
        alt={featureLabel || 'logo'}
        width={70}
        height={70}
        className={styles.cardLogo}
      />
      <div className={styles.cardDetail}>
        <div className={styles.cardTitle}>
          {featureLabel ? `[${featureLabel}] ` : ''}Booking | {booking.tujuan || 'Tanpa Tujuan'}
        </div>
        <div className={styles.cardSub}>
          {`${formatDate(booking.start_date)} - ${formatDate(booking.end_date)}`}
        </div>

        {renderServiceLine()}

        <div className={statusInfo.className}>{statusInfo.text}</div>

        {isRejected && (
          <div style={{ marginTop: 8 }}>
            <RejectionBox reason={booking.rejection_reason} compact />
          </div>
        )}
      </div>
    </div>
  );
});
BookingCard.displayName = 'BookingCard';

/* ===== TAB STATUS ===== */
const TabFilter = React.memo(({ currentTab, onTabChange, badgeCounts }) => (
  <div className={styles.tabRow}>
    {TABS.map((tabName) => {
      const isAll = tabName === 'All';
      const key = SEEN_KEYS[tabName];
      const count = isAll ? 0 : (badgeCounts[key] || 0);
      const showNumber = !isAll && count > 0;

      return (
        <button
          key={tabName}
          className={`${styles.tabBtn} ${currentTab === tabName ? styles.tabActive : ''}`}
          onClick={() => onTabChange(tabName)}
          type="button"
        >
          <span className={styles.tabLabel}>{tabName}</span>
          {!isAll && (
            showNumber ? (
              <span className={`${styles.tabBadge} ${styles.tabBadgeActive}`}>{count}</span>
            ) : (
              <span className={`${styles.tabDot} ${styles.tabDotIdle}`} aria-hidden="true" />
            )
          )}
        </button>
      );
    })}
  </div>
));
TabFilter.displayName = 'TabFilter';

/* ===== DROPDOWN FITUR ===== */
const FeatureDropdown = React.memo(({ value, onChange }) => (
  <div className={styles.filterRow}>
    <label htmlFor="featureFilter" className={styles.label}>
      Fitur/Layanan:
    </label>
    <select
      id="featureFilter"
      className={styles.itemsPerPageDropdown}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      {FEATURE_OPTIONS.map(opt => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  </div>
));
FeatureDropdown.displayName = 'FeatureDropdown';

/* ===== MODAL DETAIL ===== */
const BookingDetailModal = ({ booking, onClose, onFinish, finishing }) => {
  useEffect(() => {
    if (!booking) return;
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [booking, onClose]);

  if (!booking) return null;
  const statusInfo =
    STATUS_CONFIG[booking.status_id] || { text: 'Unknown', className: styles.statusProcess };
  const isApprovedOrFinished = Number(booking.status_id) === 2 || Number(booking.status_id) === 4;
  const isRejected = Number(booking.status_id) === 3 && !!booking.rejection_reason;

  const featureKey = resolveFeatureKey(booking);
  const featureLabel = featureLabelOf(booking);

  // hanya tampilkan assignment driver/kendaraan utk BI.Drive
  const shouldShowAssignments =
    featureKey === 'bidrive' &&
    (Array.isArray(booking.assigned_drivers) || Array.isArray(booking.assigned_vehicles));

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <button className={styles.modalCloseBtn} onClick={onClose} type="button">
          <FaTimes />
        </button>
        <h3 className={styles.modalTitle}>Detail Booking {featureLabel ? `— ${featureLabel}` : ''}</h3>
        <div className={styles.modalBody}>
          <p><strong>Tujuan:</strong> {booking.tujuan}</p>
          <p><strong>Mulai:</strong> {formatDate(booking.start_date)}</p>
          <p><strong>Selesai:</strong> {formatDate(booking.end_date)}</p>
          <p>
            <strong>Status:</strong>{' '}
            <span className={`${styles.modalStatus} ${statusInfo.className}`}>{statusInfo.text}</span>
          </p>

          {isRejected && (
            <>
              <hr className={styles.modalDivider} />
              <RejectionBox reason={booking.rejection_reason} title="Alasan Penolakan" />
            </>
          )}

          <hr className={styles.modalDivider} />
          <p><strong>Fitur/Layanan:</strong> {featureLabel || 'Tidak diketahui'}</p>

          {/* BI.Docs detail */}
          {featureKey === 'bidocs' && (
            <>
              <p><strong>Nomor Surat:</strong> {booking.nomor_surat || '-'}</p>
              <p><strong>Tanggal Dokumen:</strong> {formatDate(booking.tanggal_dokumen || booking.start_date)}</p>
              <p><strong>Tipe Dokumen:</strong> {booking.tipe_dokumen || '-'}</p>
              <p><strong>Unit Code:</strong> {booking.unit_code || '-'}</p>
              <p><strong>Wilayah:</strong> {booking.wilayah_code || '-'}</p>
              <p><strong>Perihal:</strong> {booking.perihal || '-'}</p>
              <p><strong>Dari:</strong> {booking.dari || '-'}</p>
              <p><strong>Kepada:</strong> {booking.kepada || '-'}</p>
              {booking.link_dokumen && (
                <p>
                  <strong>Link Dokumen:</strong>{' '}
                  <a href={booking.link_dokumen} target="_blank" rel="noopener noreferrer">Buka</a>
                </p>
              )}
            </>
          )}

          {/* BI.Care detail */}
          {featureKey === 'bicare' && booking._raw_bicare && (
            <>
              <p><strong>Nama Pemesan:</strong> {booking._raw_bicare.booker_name}</p>
              <p><strong>NIP:</strong> {booking._raw_bicare.nip}</p>
              <p><strong>No. WA:</strong> {booking._raw_bicare.wa}</p>
              <p><strong>Pasien:</strong> {booking._raw_bicare.patient_name} ({booking._raw_bicare.patient_status})</p>
              <p><strong>Gender:</strong> {booking._raw_bicare.gender}</p>
              <p><strong>Tanggal Lahir:</strong> {booking._raw_bicare.birth_date}</p>
              <p><strong>Slot Waktu:</strong> {String(booking._raw_bicare.slot_time || '').slice(0,5)}</p>
            </>
          )}
          {/* BI.Meal detail */}
          {featureKey === 'bimeal' && booking._raw_bimeal && (
            <>
              <p><strong>Nama PIC:</strong> {booking._raw_bimeal.nama_pic}</p>
              <p><strong>NIP PIC:</strong> {booking._raw_bimeal.nip_pic}</p>
              <p><strong>No. WA PIC:</strong> {booking._raw_bimeal.no_wa_pic}</p>
              <p><strong>Unit Kerja:</strong> {booking._raw_bimeal.unit_kerja || '-'}</p>
              <p><strong>Waktu Pesanan:</strong> {formatDate(booking._raw_bimeal.waktu_pesanan || booking.start_date)}</p>
              <p><strong>Pesanan:</strong></p>
              {Array.isArray(booking._raw_bimeal.items) && booking._raw_bimeal.items.length ? (
                <ul className={styles.assignedList}>
                  {booking._raw_bimeal.items.map((it, idx) => (
                    <li key={idx}>{it.item} — {it.qty}</li>
                  ))}
                </ul>
              ) : (
                <p className={styles.assignedEmpty}>Tidak ada item.</p>
              )}
            </>
          )}

          {/* BI.Meet detail */}
          {featureKey === 'bimeet' && (
            <>
              <p><strong>Ruangan:</strong> {booking.room_name || '-'}</p>
              {Number.isFinite(booking.room_capacity) && (
                <p><strong>Kapasitas Ruangan:</strong> {booking.room_capacity} org</p>
              )}
              <p><strong>Unit Kerja:</strong> {booking.unit_kerja || '-'}</p>
              {Number.isFinite(booking.participants) && (
                <p><strong>Jumlah Peserta:</strong> {booking.participants} org</p>
              )}
              <p><strong>PIC:</strong> {booking.pic_name || '-'}</p>
              <p><strong>Kontak:</strong> {booking.contact_phone || '-'}</p>
              {booking.description && (
                <p><strong>Deskripsi:</strong> {booking.description}</p>
              )}
            </>
          )}
          {/* BI.Stay detail */}
          {featureKey === 'bistay' && booking._raw_bistay && (
            <>
              <p><strong>Nama Pemesan:</strong> {booking._raw_bistay.nama_pemesan || '-'}</p>
              <p><strong>NIP:</strong> {booking._raw_bistay.nip || '-'}</p>
              <p><strong>No. WA:</strong> {booking._raw_bistay.no_wa || '-'}</p>
              <p><strong>Asal KPW:</strong> {booking._raw_bistay.asal_kpw || '-'}</p>
              <p><strong>Status Pegawai:</strong> {booking._raw_bistay.status_pegawai || '-'}</p>
              {booking._raw_bistay.keterangan && (
                <p><strong>Keterangan:</strong> {booking._raw_bistay.keterangan}</p>
              )}
            </>
          )}

          {/* Hanya BI.Drive yang menampilkan assignment */}
          {shouldShowAssignments && isApprovedOrFinished && (
            <>
              <hr className={styles.modalDivider} />
              <div className={styles.assignedBlock}>
                <p><strong>Driver Ditugaskan:</strong></p>
                {Array.isArray(booking.assigned_drivers) && booking.assigned_drivers.length ? (
                  <ul className={styles.assignedList}>
                    {booking.assigned_drivers.map((d) => (
                      <li key={d.id}>{d.name}{d.phone ? ` — ${d.phone}` : ''}</li>
                    ))}
                  </ul>
                ) : (
                  <p className={styles.assignedEmpty}>Belum ada data driver.</p>
                )}
              </div>

              <div className={styles.assignedBlock}>
                <p><strong>Kendaraan Ditugaskan:</strong></p>
                {Array.isArray(booking.assigned_vehicles) && booking.assigned_vehicles.length ? (
                  <ul className={styles.assignedList}>
                    {booking.assigned_vehicles.map((v) => (
                      <li key={v.id}>{getPlate(v)}{v.type_name ? ` — ${v.type_name}` : ''}</li>
                    ))}
                  </ul>
                ) : (
                  <p className={styles.assignedEmpty}>Belum ada data kendaraan.</p>
                )}
              </div>
            </>
          )}

          {/* Tombol Finish: untuk semua layanan KECUALI BI.Care & BI.Docs, ketika status Approved */}
          {featureKey !== 'bicare' && featureKey !== 'bidocs' && Number(booking.status_id) === 2 && (
            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.finishButton}
                onClick={() => onFinish(booking)}
                disabled={finishing}
                title="Tandai booking ini sudah selesai"
              >
                {finishing ? 'Memproses...' : 'Finish Booking'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/* ===================== KOMPONEN UTAMA ===================== */
export default function StatusBooking() {
  const router = useRouter();
  const ns = router.query?.ns; // untuk cookie namespaced bila ada
  const [userId, setUserId] = useState(null);

  const [allBookings, setAllBookings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // filter status
  const [activeTab, setActiveTab] = useState('All');

  // filter fitur/layanan (dropdown)
  const [featureValue, setFeatureValue] = useState('all'); // 'all' | 'bidrive' | 'bicare' | ...

  const [selectedBooking, setSelectedBooking] = useState(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);

  // Logout
  const [showLogoutPopup, setShowLogoutPopup] = useState(false);

  // proses “Finished”
  const [finishing, setFinishing] = useState(false);

  // ====== LAST SEEN COUNTS (localStorage) ======
  const [seenCounts, setSeenCounts] = useState(DEFAULT_SEEN);

  useEffect(() => {
    if (selectedBooking) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [selectedBooking]);

  const handleLogout = async () => {
    try { await fetch('/api/logout', { method: 'POST' }); } catch {}
    finally { router.replace('/Signin/hal-sign'); }
  };

  // Load user, seenCounts, dan data booking (Drive + BI.Care + BI.Docs + dll)
  useEffect(() => {
    let active = true;

    const fetchBookings = async () => {
      setIsLoading(true);
      try {
        const meRes = await fetch('/api/me?scope=user', { cache: 'no-store' });
        const meData = await meRes.json();
        if (!active) return;

        if (!meData.hasToken || meData.payload?.role !== 'user') {
          setError('Silakan login untuk melihat status booking.');
          setIsLoading(false);
          return;
        }

        const uid = Number(meData.payload.sub);
        setUserId(uid);

        // load last-seen untuk user ini
        try {
          const raw = localStorage.getItem(seenStorageKey(uid));
          setSeenCounts(raw ? { ...DEFAULT_SEEN, ...JSON.parse(raw) } : DEFAULT_SEEN);
        } catch { setSeenCounts(DEFAULT_SEEN); }

        // 1) Booking BI.Drive/umum
        let dataMain = [];
        const resMain = await fetch(`/api/booking?userId=${uid}`, { cache: 'no-store' });
        if (resMain.ok) {
          const rows = await resMain.json();
          dataMain = Array.isArray(rows) ? rows.map(normalizeBIDriveRow) : [];
        } else {
          const errorData = await resMain.json().catch(() => ({}));
          throw new Error(errorData.error || 'Gagal memuat data booking');
        }

        // 2) BI.Care milik user
        let dataBICare = [];
        try {
          const rCare = await fetch(`/api/BIcare/book?userId=${uid}`, { cache: 'no-store' });
          if (rCare.ok) {
            const rows = await rCare.json();
            dataBICare = Array.isArray(rows) ? rows.map(normalizeBICareRow) : [];
          }
        } catch (e) {
          console.warn('Gagal load BI.Care:', e);
        }

        // 3) BI.Docs (BImail) milik user
        let dataBIDocs = [];
        try {
          const rDocs = await fetch(`/api/BImail?userId=${uid}`, { cache: 'no-store' });
          if (rDocs.ok) {
            const payload = await rDocs.json();
            const rows = Array.isArray(payload?.items) ? payload.items : (Array.isArray(payload) ? payload : []);
            dataBIDocs = rows.map(normalizeBIMailRow);
          }
        } catch (e) {
          console.warn('Gagal load BI.Docs:', e);
        }

        // 4) BI.Meal
        let dataBIMeal = [];
        try {
          const rMeal = await fetch(`/api/bimeal/book?userId=${uid}`, { cache: 'no-store' });
          if (rMeal.ok) {
            const rows = await rMeal.json();
            dataBIMeal = Array.isArray(rows) ? rows.map(normalizeBIMealRow) : [];
          }
        } catch (e) {
          console.warn('Gagal load BI.Meal:', e);
        }

        // 5) BI.Meet (meeting rooms)
        let dataBIMeet = [];
        try {
          const rMeet = await fetch(`/api/bimeet/createbooking?userId=${uid}`, { cache: 'no-store' });
          if (rMeet.ok) {
            const payload = await rMeet.json();
            const rows = Array.isArray(payload?.items) ? payload.items : (Array.isArray(payload) ? payload : []);
            dataBIMeet = rows.map(normalizeBIMeetRow);
          }
        } catch (e) {
          console.warn('Gagal load BI.Meet:', e);
        }

        // 6) BI.Stay
        let dataBIStay = [];
        try {
          const rStay = await fetch(`/api/BIstaybook/bistaybooking?userID=${uid}`, { cache: 'no-store', credentials: 'include' });
          if (rStay.ok) {
            const payload = await rStay.json();
            const rows = Array.isArray(payload?.data) ? payload.data : (Array.isArray(payload) ? payload : []);
            dataBIStay = rows.map(normalizeBIStayRow);
          }
        } catch (e) {
          console.warn('Gagal load BI.Stay:', e);
        }

        // Gabungkan
        const merged = [
          ...(Array.isArray(dataMain) ? dataMain : []),
          ...dataBICare,
          ...dataBIDocs,
          ...dataBIMeal,
          ...dataBIMeet,
          ...dataBIStay,
        ];
        setAllBookings(merged);
      } catch (err) {
        setError(err.message);
      } finally {
        if (active) setIsLoading(false);
      }
    };

    fetchBookings();
    return () => { active = false; };
  }, []);

  const handleCardClick = useCallback(async (booking) => {
    try {
      setSelectedBooking(booking);

      const featureKey = resolveFeatureKey(booking);

      // Hanya fetch detail kendaraan/driver untuk BI.Drive
      if (featureKey === 'bidrive') {
        const bid = numericIdOf(booking.id);
        if (!Number.isFinite(bid)) throw new Error('ID booking tidak valid');
        const res = await fetch(`/api/bookings-with-vehicle?bookingId=${bid}`);
        if (!res.ok) throw new Error('Gagal memuat detail booking.');
        const full = await res.json();
        setSelectedBooking({ ...full, feature_key: 'bidrive' });
      }
      // BI.Care & BI.Docs: data yang ada sudah cukup
    } catch (e) {
      console.error('fetch detail error:', e);
    }
  }, []);

  const closeModal = useCallback(() => setSelectedBooking(null), []);

  // Finish Booking → untuk semua layanan kecuali BI.Care & BI.Docs
  const markAsFinished = useCallback(async (booking) => {
    const featureKey = resolveFeatureKey(booking);
    if (featureKey === 'bicare' || featureKey === 'bidocs') {
      alert('Fitur ini tidak mendukung Finish dari UI.');
      return;
    }

    const bid = numericIdOf(booking.id);
    if (!Number.isFinite(bid)) {
      alert('ID booking tidak valid.');
      return;
    }

    try {
      setFinishing(true);

      if (featureKey === 'bidrive') {
        // pastikan sudah punya data assignment
        let fullBooking =
          selectedBooking && numericIdOf(selectedBooking.id) === bid ? selectedBooking : null;

        if (!fullBooking?.assigned_drivers || !fullBooking?.assigned_vehicles) {
          try {
            const r = await fetch(`/api/bookings-with-vehicle?bookingId=${bid}`);
            if (r.ok) fullBooking = await r.json();
          } catch {}
        }

        const driverIds = (fullBooking?.assigned_drivers || []).map(d => d.id);
        const vehicleIds = (fullBooking?.assigned_vehicles || []).map(v => v.id);

        // 1) Update status ke Finished (4) — kirim ns bila ada
        await updateServiceStatus('bidrive', bid, 4, ns);

        // 2) Set available
        await setDriversAvailable(driverIds, 1);
        await setVehiclesAvailable(vehicleIds, 1);
      } else {
        // layanan lain: cukup update status saja (tidak ada assignment driver/vehicle)
        await updateServiceStatus(featureKey, bid, 4, ns);
      }

      // 3) Refresh state lokal
      setAllBookings(prev =>
        prev.map(b => (numericIdOf(b.id) === bid ? { ...b, status_id: 4 } : b))
      );

      // Perbarui selectedBooking (khusus bidrive coba ambil ulang detail)
      if (featureKey === 'bidrive') {
        try {
          const r2 = await fetch(`/api/bookings-with-vehicle?bookingId=${bid}`);
          const full = await r2.json().catch(() => null);
          setSelectedBooking(
            full ? { ...full, feature_key: 'bidrive' }
                : { ...booking, status_id: 4 }
          );
        } catch {
          setSelectedBooking(prev => (prev ? { ...prev, status_id: 4 } : prev));
        }
      } else {
        setSelectedBooking(prev => (prev ? { ...prev, status_id: 4 } : prev));
      }

      setActiveTab('Finished');
      markTabSeen('Finished');
    } catch (e) {
      alert(e.message);
    } finally {
      setFinishing(false);
    }
  }, [selectedBooking, ns]);

  /* ===================== Hitung count & badge ===================== */
  const tabCounts = useMemo(() => {
    const c = { pending: 0, approved: 0, rejected: 0, finished: 0 };
    for (const b of allBookings) {
      if (b.status_id === 1) c.pending++;
      else if (b.status_id === 2) c.approved++;
      else if (b.status_id === 3) c.rejected++;
      else if (b.status_id === 4) c.finished++;
    }
    return c;
  }, [allBookings]);

  const badgeCounts = useMemo(() => ({
    pending:  Math.max(0, tabCounts.pending  - (seenCounts.pending  || 0)),
    approved: Math.max(0, tabCounts.approved - (seenCounts.approved || 0)),
    rejected: Math.max(0, tabCounts.rejected - (seenCounts.rejected || 0)),
    finished: Math.max(0, tabCounts.finished - (seenCounts.finished || 0)),
  }), [tabCounts, seenCounts]);

  // tandai tab sebagai sudah dilihat
  const markTabSeen = useCallback((tabName) => {
    if (!userId || tabName === 'All') return;
    const key = SEEN_KEYS[tabName];
    const next = { ...seenCounts, [key]: tabCounts[key] };
    setSeenCounts(next);
    try { localStorage.setItem(seenStorageKey(userId), JSON.stringify(next)); } catch {}
  }, [seenCounts, tabCounts, userId]);

  const handleTabChange = useCallback((tabName) => {
    setActiveTab(tabName);
    setCurrentPage(1);
    markTabSeen(tabName);
  }, [markTabSeen]);

  const handleFeatureChange = useCallback((value) => {
    setFeatureValue(value); // 'all' | 'bidrive' | ...
    setCurrentPage(1);
  }, []);

  /* ===================== FILTER & PAGINATION ===================== */
  const statusFiltered = useMemo(() => {
    if (activeTab === 'All') return allBookings;
    const statusId = TAB_TO_STATUS_ID[activeTab];
    return allBookings.filter((item) => item.status_id === statusId);
  }, [activeTab, allBookings]);

  const filteredBookings = useMemo(() => {
    if (featureValue === 'all') return statusFiltered;
    return statusFiltered.filter((b) => resolveFeatureKey(b) === featureValue);
  }, [statusFiltered, featureValue]);

  const totalPages = useMemo(() => {
    if (!filteredBookings.length) return 1;
    return Math.ceil(filteredBookings.length / itemsPerPage);
  }, [filteredBookings.length, itemsPerPage]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(1);
  }, [totalPages, currentPage]);

  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;

  const paginatedBookings = useMemo(
    () => filteredBookings.slice(startIndex, endIndex),
    [filteredBookings, startIndex, endIndex]
  );

  const onPageChange = useCallback((page) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
  }, [totalPages]);

  const onChangeItemsPerPage = (e) => {
    const val = Number(e.target.value);
    setItemsPerPage(val);
    setCurrentPage(1);
  };

  const resultsFrom = filteredBookings.length ? startIndex + 1 : 0;
  const resultsTo = Math.min(endIndex, filteredBookings.length);

  /* ===================== RENDER ===================== */
  return (
    <div className={styles.background}>
      <SidebarUser onLogout={() => setShowLogoutPopup(true)} />
      <main className={styles.mainContent}>
        <div className={styles.bookingBox}>
          <div className={styles.topRow}>
            <button className={styles.backBtn} onClick={() => router.back()} type="button">
              <FaArrowLeft /> Kembali
            </button>
            <div className={styles.title}>STATUS BOOKING</div>
          </div>

          {/* FILTER FITUR DROPDOWN */}
          <FeatureDropdown value={featureValue} onChange={handleFeatureChange} />

          {/* FILTER STATUS (tab) */}
          <TabFilter currentTab={activeTab} onTabChange={handleTabChange} badgeCounts={badgeCounts} />

          <div className={styles.listArea}>
            {isLoading && <div className={styles.emptyState}>Memuat booking...</div>}
            {error && <div className={styles.emptyState} style={{ color: 'red' }}>{error}</div>}

            {!isLoading && !error && paginatedBookings.length === 0 && (
              <div className={styles.emptyState}>Tidak ada booking dengan filter ini.</div>
            )}

            {!isLoading && !error && paginatedBookings.map((item) => (
              <BookingCard key={item.id} booking={item} onClick={() => handleCardClick(item)} />
            ))}
          </div>

          {!isLoading && !error && filteredBookings.length > 0 && (
            <div className={styles.paginationContainer}>
              <div className={styles.paginationControls}>
                <div className={styles.resultsText}>
                  Menampilkan {resultsFrom}-{resultsTo} dari {filteredBookings.length} data
                </div>
                <div>
                  <label htmlFor="perPage" className={styles.label}>Items per page:</label>
                  <select
                    id="perPage"
                    className={styles.itemsPerPageDropdown}
                    value={itemsPerPage}
                    onChange={onChangeItemsPerPage}
                  >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={15}>15</option>
                    <option value={20}>20</option>
                  </select>
                </div>
              </div>

              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={onPageChange}
              />
            </div>
          )}
        </div>
      </main>

      <BookingDetailModal
        booking={selectedBooking}
        onClose={closeModal}
        onFinish={markAsFinished}
        finishing={finishing}
      />

      <LogoutPopup
        open={showLogoutPopup}
        onCancel={() => setShowLogoutPopup(false)}
        onLogout={handleLogout}
      />
    </div>
  );
}
