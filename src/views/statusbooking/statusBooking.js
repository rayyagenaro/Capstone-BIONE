// src/pages/StatusBooking/hal-statusBooking.js
import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/router';
import styles from './statusBooking.module.css';
import SidebarUser from '@/components/SidebarUser/SidebarUser';
import LogoutPopup from '@/components/LogoutPopup/LogoutPopup';
import Pagination from '@/components/Pagination/Pagination';
import { FaArrowLeft, FaTimes } from 'react-icons/fa';
import RejectionBox from '@/components/RejectionBox/RejectionBox';
import { getNs } from '@/lib/ns';
import { fetchAllBookings } from '@/lib/fetchBookings';

/* ===================== KONFIGURASI & HELPER (STATUS) ===================== */
const STATUS_CONFIG = {
  '1': { text: 'Pending',  className: styles.statusProcess },
  '2': { text: 'Approved', className: styles.statusApproved },
  '3': { text: 'Rejected', className: styles.statusRejected },
  '4': { text: 'Finished', className: styles.statusFinished },
};

const TABS = ['All', 'Pending', 'Approved', 'Rejected', 'Finished'];
const TAB_TO_STATUS_ID = { Pending: 1, Approved: 2, Rejected: 3, Finished: 4 };

const SEEN_KEYS = { Pending: 'pending', Approved: 'approved', Rejected: 'rejected', Finished: 'finished' };
const DEFAULT_SEEN = { pending: 0, approved: 0, rejected: 0, finished: 0 };
const seenStorageKey = (userId) => `statusTabSeen:${userId}`;

/* ===================== KONFIGURASI & HELPER (FITUR/LAYANAN) ===================== */
const FEATURE_OPTIONS = [
  { label: 'All', value: 'all' },
  { label: 'Drive', value: 'bidrive' },
  { label: 'Care',  value: 'bicare' },
  { label: 'Meal',  value: 'bimeal' },
  { label: 'Meet',  value: 'bimeet' },
  { label: 'Docs',  value: 'bimail' },
  { label: 'Stay',  value: 'bistay' },
];

const SERVICE_ID_TO_KEY = {};

const norm = (s) => String(s || '').trim().toLowerCase();

const FEATURE_LOGOS = {
  bidrive: "/assets/D'MOVE.svg",
  bicare:  "/assets/BI-CARE.svg",
  bimeal:  "/assets/D'MEAL.svg",
  bimeet:  "/assets/D'ROOM.svg",
  bimail:  "/assets/D'TRACK.svg",
  bistay:  "/assets/D'REST.svg",
};
const logoSrcOf = (booking) => {
  const key = resolveFeatureKey(booking);
  return FEATURE_LOGOS[key] || '/assets/BI-One-Blue.png';
};

const numericIdOf = (id) => {
  const m = String(id ?? '').match(/(\d+)$/);
  return m ? Number(m[1]) : NaN;
};

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
    if (s.includes('bi.docs')  || s.includes('bimail')  || s === 'docs')  return 'bimail';
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
    case 'bimail':  return 'BI.Docs';
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

/* ===================== Helper umum: update status booking ===================== */
async function updateServiceStatus(featureKey, bookingId, newStatusId = 4, ns) {
  // BI.Care dikecualikan → langsung return
  if (featureKey === 'bicare') {
    console.warn('Update status BI.Care dilewati karena otomatis oleh sistem.');
    return { ok: false, skipped: true };
  }

  const idNum = numericIdOf(bookingId);
  if (!Number.isFinite(idNum)) throw new Error('ID booking tidak valid');

  const endpoint = {
    bidrive: '/api/booking',
    bimeet:  '/api/bimeet/createbooking',
    bimeal:  '/api/bimeal/book',
    bistay:  '/api/BIstaybook/bistaybooking',
  }[featureKey];

  if (!endpoint) throw new Error(`Finish tidak didukung untuk layanan ${featureKey}.`);

  const payload = { bookingId: idNum, newStatusId, ...(ns ? { ns } : {}) };

  const res = await fetch(endpoint, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
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
  try { return await res.json(); } catch { return { ok: true }; }
}


/* ===================== SUB-KOMPONEN ===================== */
// (BookingCard, TabFilter, FeatureDropdown, BookingDetailModal) — tetap sama persis dengan kode kamu
// --- dipotong demi singkat jawaban, tidak ada perubahan di bagian ini ---

/* ===================== KOMPONEN UTAMA ===================== */
export default function StatusBooking() {
  const router = useRouter();
  const ns = getNs(router);
  const [userId, setUserId] = useState(null);
  const [allBookings, setAllBookings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('All');
  const [featureValue, setFeatureValue] = useState('all');
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [showLogoutPopup, setShowLogoutPopup] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const autoFinishTried = useRef(new Set());
  const [seenCounts, setSeenCounts] = useState(DEFAULT_SEEN);

  useEffect(() => {
    let active = true;
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const meRes = await fetch('/api/me?scope=user', { cache: 'no-store', credentials:'include' });
        const meData = await meRes.json();
        if (!active) return;
        if (!meData.hasToken || meData.payload?.role !== 'user') {
          setError('Silakan login untuk melihat status booking.');
          setIsLoading(false);
          return;
        }
        const uid = Number(meData.payload.sub);
        setUserId(uid);
        try {
          const raw = localStorage.getItem(seenStorageKey(uid));
          setSeenCounts(raw ? { ...DEFAULT_SEEN, ...JSON.parse(raw) } : DEFAULT_SEEN);
        } catch { setSeenCounts(DEFAULT_SEEN); }

        // gunakan helper fetchAllBookings
        const bookings = await fetchAllBookings(ns, "user");
        if (active) setAllBookings(bookings);
      } catch (err) {
        setError(err.message);
      } finally {
        if (active) setIsLoading(false);
      }
    };
    fetchData();
    return () => { active = false; };
  }, [ns]);
    // ===== AUTO FINISH BI.Care =====
  useEffect(() => {
    if (!allBookings.length) return;

    let cancelled = false;
    const runCheck = async () => {
      const now = Date.now();
      for (const b of allBookings) {
        if (resolveFeatureKey(b) !== 'bicare') continue;
        if (Number(b.status_id) !== 2) continue;
        const endMs = new Date(b.end_date).getTime();
        if (!Number.isFinite(endMs)) continue;
        if (now > endMs && !autoFinishTried.current.has(b.id)) {
          autoFinishTried.current.add(b.id);
          try {
            await updateServiceStatus('bicare', numericIdOf(b.id), 4, ns);
            if (cancelled) return;
            setAllBookings((prev) =>
              prev.map((x) => (x.id === b.id ? { ...x, status_id: 4 } : x))
            );
            setSelectedBooking((prev) =>
              prev && prev.id === b.id ? { ...prev, status_id: 4 } : prev
            );
          } catch (e) {
            autoFinishTried.current.delete(b.id);
            console.warn('Auto-finish BI.Care gagal:', e);
          }
        }
      }
    };
    runCheck();
    const timer = setInterval(runCheck, 60_000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [allBookings, ns]);

  // ===== SEEN COUNTS =====
  useEffect(() => {
    if (selectedBooking) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [selectedBooking]);

  const handleLogout = async () => {
    try { await fetch('/api/logout', { method: 'POST' }); } catch {}
    finally { router.replace('/Signin/hal-sign'); }
  };
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
        case 'bimail': {
          const nomor = booking.nomor_surat;
          const perihal = booking.perihal;
          const route = (booking.dari && booking.kepada) ? `Dari: ${booking.dari} → ${booking.kepada}` : '';
          const parts = [nomor && `Nomor: ${nomor}`, perihal && `Perihal: ${perihal}`, route].filter(Boolean);
          return parts.length ? <div className={styles.cardVehicles}>{parts.join(' • ')}</div> : null;
        }

        case 'bimeal': {
          const unit   = booking.unit_kerja || booking._raw_bimeal?.unit_kerja;
          const count  = booking.items?.length || booking._raw_bimeal?.items?.length || 0;
          const total  = (booking.items || booking._raw_bimeal?.items || [])
                          .reduce((sum, it) => sum + (it.qty || 0), 0) || 0;
          const ket    = booking.keterangan || booking._raw_bimeal?.keterangan;
          const lokasi = booking.lokasi_pengiriman || booking._raw_bimeal?.lokasi_pengiriman;

          const parts = [
            unit && `Unit: ${unit}`,
            count ? `Item: ${count}` : null,
            total ? `Total qty: ${total}` : null,
            ket && `Keterangan: ${ket}`,
            lokasi && `Lokasi Antar: ${lokasi}`,
          ].filter(Boolean);

          return parts.length ? (
            <div className={styles.cardVehicles}>{parts.join(' • ')}</div>
          ) : null;
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
            {featureKey === 'bimail' && (
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
                <p><strong>Nama Pemesan:</strong> {booking._raw_bimeal.nama_pic}</p>
                <p><strong>Nama PIC Tagihan:</strong> {booking._raw_bimeal.nama_pic_tagihan}</p>
                <p><strong>No. WA PIC:</strong> {booking._raw_bimeal.no_wa_pic}</p>
                <p><strong>Unit Kerja:</strong> {booking._raw_bimeal.unit_kerja || '-'}</p>
                <p><strong>Waktu Antar:</strong> {formatDate(booking._raw_bimeal.waktu_pesanan || booking.start_date)}</p>
                <p><strong>Lokasi Antar:</strong> {booking._raw_bimeal.lokasi_pengiriman || '-'}</p>
                <p><strong>Keterangan:</strong> {booking._raw_bimeal.keterangan || '-'}</p>
                <p><strong>Pesanan:</strong></p>
                {Array.isArray(booking._raw_bimeal.items) && booking._raw_bimeal.items.length ? (
                  <ul className={styles.assignedList}>
                    {booking._raw_bimeal.items.map((it, idx) => (
                      <li key={idx}>{it.item} — {it.qty} {it.unit}</li>
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
                {Number.isFinite(booking.room_capacity ?? booking.capacity) && (
                  <p><strong>Kapasitas Ruangan:</strong> {(booking.room_capacity ?? booking.capacity)} org</p>
                )}
                <p><strong>Unit Kerja:</strong> {booking.unit_kerja || '-'}</p>
                {Number.isFinite(booking.participants) && (
                  <p><strong>Jumlah Peserta:</strong> {booking.participants} org</p>
                )}
                <p><strong>PIC:</strong> {booking.pic_name || '-'}</p>
                <p><strong>Kontak:</strong> {booking.contact_phone || '-'}</p>
                <p><strong>Judul:</strong> {booking.title || '-'}</p>
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

            {/* BI.Drive assignments */}
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

            {/* Tombol Finish */}
            {featureKey !== 'bicare' && featureKey !== 'bimail' && Number(booking.status_id) === 2 && (
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

  const handleCardClick = useCallback(async (booking) => {
    try {
      const featureKey = resolveFeatureKey(booking);
      const bid = numericIdOf(booking.id);
      if (!Number.isFinite(bid)) throw new Error('ID booking tidak valid');

      if (featureKey === 'bidrive') {
        const res = await fetch(`/api/bookings-with-vehicle?bookingId=${bid}`);
        if (!res.ok) throw new Error('Gagal memuat detail booking.');
        const full = await res.json();
        console.log("Detail bidrive:", full);
        setSelectedBooking({ ...full, feature_key: 'bidrive' });

      } else if (featureKey === 'bimeet') {
        const res = await fetch(`/api/bimeet/createbooking?bookingId=${bid}&ns=${ns}`, {
          credentials: 'include'
        });
        if (!res.ok) throw new Error('Gagal memuat detail BI.Meet.');
        const full = await res.json();
        console.log("Detail bimeet:", full);

        if (!full.item) throw new Error('Data booking tidak ditemukan.');

        setSelectedBooking({
          ...full.item,
          feature_key: 'bimeet'
        });
      } else {
        // fallback: langsung pakai data list
        setSelectedBooking(booking);
      }
    } catch (e) {
      console.error('fetch detail error:', e);
    }
  }, []);



  const closeModal = useCallback(() => setSelectedBooking(null), []);
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


  const markAsFinished = useCallback(async (booking) => {
    const featureKey = resolveFeatureKey(booking);
    if (featureKey === 'bicare' || featureKey === 'bimail') {
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
        await updateServiceStatus('bidrive', bid, 4, ns);
        await setDriversAvailable(driverIds, 1);
        await setVehiclesAvailable(vehicleIds, 1);
      } else {
        await updateServiceStatus(featureKey, bid, 4, ns);
      }
      setAllBookings(prev =>
        prev.map(b => (numericIdOf(b.id) === bid ? { ...b, status_id: 4 } : b))
      );
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

  // ===== FILTER & PAGINATION =====
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
    setFeatureValue(value);
    setCurrentPage(1);
  }, []);

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

  // ===== RENDER =====
  return (
    <div className={styles.background}>
      <SidebarUser onLogout={() => setShowLogoutPopup(true)} />
      <main className={styles.mainContent}>
        <div className={styles.bookingBox}>
          <div className={styles.topRow}>
            <button className={styles.backBtn} onClick={() => router.back()} type="button">
              <FaArrowLeft /> Kembali
            </button>
            <div className={styles.title}>Status Booking</div>
          </div>

          <FeatureDropdown value={featureValue} onChange={handleFeatureChange} />
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


