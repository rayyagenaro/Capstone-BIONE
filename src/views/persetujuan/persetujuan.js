// /pages/Persetujuan/hal-persetujuan.js
import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/router';
import styles from './persetujuan.module.css';
import SidebarAdmin from '@/components/SidebarAdmin/SidebarAdmin';
import LogoutPopup from '@/components/LogoutPopup/LogoutPopup';
import Pagination from '@/components/Pagination/Pagination';
import { FaArrowLeft } from 'react-icons/fa';

/* ===================== KONFIGURASI STATUS ===================== */
const STATUS_CONFIG = {
  '1': { text: 'Pending',  className: styles.statusPending  },
  '2': { text: 'Approved', className: styles.statusApproved },
  '3': { text: 'Rejected', className: styles.statusRejected },
  '4': { text: 'Finished', className: styles.statusFinished },
};

const TABS = ['All', 'Pending', 'Approved', 'Rejected', 'Finished'];
const TAB_TO_STATUS_ID = { Pending: 1, Approved: 2, Rejected: 3, Finished: 4 };

/* ===================== KONFIGURASI FITUR/LAYANAN ===================== */
/** Standar kunci kanonik (yang kita pakai di FE): 
 *  bidrive | bicare | bimeal | bimeet | bimail | bistay
 *  -> "bimail" = BI.Docs (alias: bidocs/docs/mail)
 */
const FEATURE_OPTIONS = [
  { label: 'All',      value: 'all'     },
  { label: 'BI.Drive', value: 'bidrive' },
  { label: 'BI.Care',  value: 'bicare'  },
  { label: 'BI.Meal',  value: 'bimeal'  },
  { label: 'BI.Meet',  value: 'bimeet'  },
  { label: 'BI.Docs',  value: 'bimail'  }, // <= pakai 'bimail' sbg standar
  { label: 'BI.Stay',  value: 'bistay'  },
];

// logo per layanan (pastikan file ada di /public/assets)
const FEATURE_LOGOS = {
  "bidrive": "/assets/D'MOVE.svg",
  "bicare":  "/assets/BI-CARE.svg",
  "bimeal":  "/assets/D'MEAL.svg",
  "bimeet":  "/assets/D'ROOM.svg",
  "bimail":  "/assets/BI-MAIL.svg",     // <= BI.Docs (kanonik)
  "bidocs":  "/assets/BI-MAIL.svg",     // <= alias lama tetap didukung
  "bistay":  "/assets/D'REST.svg",
};
const logoSrcOf = (booking) => FEATURE_LOGOS[resolveFeatureKey(booking)] || '/assets/BI-One-Blue.png';

// opsional: kalau backend kirim angka untuk service_id → map ke key
const SERVICE_ID_TO_KEY = {
  // 1: 'bidrive',
  // 2: 'bicare',
  // 3: 'bimeal',
  // 4: 'bimeet',
  // 5: 'bimail', // (BI.Docs)
  // 6: 'bistay',
};

const norm = (s) => String(s || '').trim().toLowerCase();
const NS_RE = /^[A-Za-z0-9_-]{3,32}$/;
const withNs = (url, ns) => (ns ? `${url}${url.includes('?') ? '&' : '?'}ns=${encodeURIComponent(ns)}` : url);

const numericIdOf = (id) => {
  const m = String(id ?? '').match(/(\d+)$/);
  return m ? Number(m[1]) : NaN;
};

// helper: cocokkan alias
const isAlias = (k, v) =>
  k === v ||
  (v === 'bidocs' && k === 'bimail') ||
  (v === 'bimail' && k === 'bidocs');

function resolveFeatureKey(booking) {
  // 1) kalau sudah ada
  if (booking?.feature_key) return booking.feature_key;

  // 2) dari ID numerik (opsional)
  const sid = booking?.service_id ?? booking?.layanan_id ?? booking?.feature_id ?? booking?.serviceId;
  if (sid && SERVICE_ID_TO_KEY[sid]) return SERVICE_ID_TO_KEY[sid];

  // 3) dari teks nama layanan/feature
  const candidates = [
    booking?.service, booking?.service_name, booking?.service_code,
    booking?.feature, booking?.layanan, booking?.jenis_layanan, booking?.feature_name,
  ].map(norm).filter(Boolean);

  for (const raw of candidates) {
    const s = raw.replace(/\s+/g, '');
    if (s.includes('bi.drive') || s.includes('bidrive') || s === 'drive') return 'bidrive';
    if (s.includes('bi.care')  || s.includes('bicare')  || s === 'care')  return 'bicare';
    if (s.includes('bi.meal')  || s.includes('bimeal')  || s === 'meal')  return 'bimeal';
    if (s.includes('bi.meet')  || s.includes('bimeet')  || s === 'meet')  return 'bimeet';
    // BI.Docs → pakai kanonik 'bimail', terima alias 'bidocs/docs/mail'
    if (s.includes('bi.docs') || s.includes('bidocs') || s.includes('bimail') || s === 'docs' || s === 'mail') {
      return 'bimail';
    }
    if (s.includes('bi.stay')  || s.includes('bistay')  || s === 'stay')  return 'bistay';
  }
  return 'unknown';
}
function featureLabelOf(booking) {
  switch (resolveFeatureKey(booking)) {
    case 'bidrive': return 'BI.Drive';
    case 'bicare':  return 'BI.Care';
    case 'bimeal':  return 'BI.Meal';
    case 'bimeet':  return 'BI.Meet';
    case 'bimail':  return 'BI.Docs';   // label untuk tampil
    case 'bistay':  return 'BI.Stay';
    default: return null;
  }
}
const formatDate = (dateString) => {
  if (!dateString) return 'Tanggal tidak valid';
  return new Date(dateString).toLocaleDateString('id-ID', {
    day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
};
const getPlate = (v) => v?.plate || v?.plat_nomor || v?.nopol || v?.no_polisi || String(v?.id ?? '-');

/* ===================== NORMALISASI DATA PER-LAYANAN (ADMIN) ===================== */
const mapBICareStatusToId = (status) => {
  const s = String(status || '').toLowerCase();
  if (s === 'booked') return 2;
  if (s === 'finished') return 4;
  if (s === 'rejected' || s === 'cancelled') return 3;
  return 1;
};

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
  const end = new Date(startLocal); end.setMinutes(end.getMinutes() + 30);

  return {
    id: `bicare-${row.id}`,
    feature_key: 'bicare',
    tujuan: `Klinik Dokter #${row.doctor_id}`,
    start_date: startLocal,
    end_date: end.toISOString(),
    status_id: mapBICareStatusToId(row.status),
    rejection_reason: null,
    vehicle_types: [],
    _raw_bicare: row,
  };
}
function normalizeBIMailRow(row) {
  const start = row.tanggal_dokumen || row.created_at || new Date().toISOString();
  return {
    id: `bimail-${row.id}`,       // <= tetap bisa diparse numericIdOf
    feature_key: 'bimail',        // <= kanonik
    tujuan: row.perihal || `Dokumen ${row.nomor_surat || ''}`.trim(),
    start_date: start,
    end_date: start,
    status_id: 1,
    nomor_surat: row.nomor_surat,
    tipe_dokumen: row.tipe_dokumen,
    unit_code: row.unit_code,
    wilayah_code: row.wilayah_code,
    tanggal_dokumen: row.tanggal_dokumen,
    perihal: row.perihal,
    dari: row.dari,
    kepada: row.kepada,
    link_dokumen: row.link_dokumen,
    _raw_bimail: row,
  };
}
function normalizeBIMealRow(row) {
  const startISO = row.waktu_pesanan || row.created_at || new Date().toISOString();
  const items = Array.isArray(row.items) ? row.items : [];
  const totalQty = items.reduce((a, x) => a + (Number(x?.qty) || 0), 0);
  return {
    id: `bimeal-${row.id}`,
    feature_key: 'bimeal',
    tujuan: row.unit_kerja ? `Catering • ${row.unit_kerja}` : 'Catering',
    start_date: startISO,
    end_date: startISO,
    status_id: row.status_id || 1,
    _raw_bimeal: {
      nama_pic: row.nama_pic, nip_pic: row.nip_pic, no_wa_pic: row.no_wa_pic,
      unit_kerja: row.unit_kerja, waktu_pesanan: row.waktu_pesanan,
      items, total_qty: totalQty,
    },
  };
}
function normalizeBIMeetRow(row) {
  return {
    id: `bimeet-${row.id}`,
    feature_key: 'bimeet',
    tujuan: row.title || (row.room_name ? `Meeting @ ${row.room_name}` : 'Meeting'),
    start_date: row.start_datetime,
    end_date: row.end_datetime,
    status_id: Number(row.status_id) || 1,
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
function normalizeBIStayRow(row) {
  return {
    id: `bistay-${row.id}`,
    feature_key: 'bistay',
    tujuan: row.asal_kpw ? `Menginap • ${row.asal_kpw}` : 'Menginap',
    start_date: row.check_in,
    end_date: row.check_out,
    status_id: 1,
    _raw_bistay: {
      nama_pemesan: row.nama_pemesan, nip: row.nip, no_wa: row.no_wa,
      asal_kpw: row.asal_kpw, keterangan: row.keterangan,
      status_pegawai: row.status_pegawai || `#${row.status_pegawai_id}`,
      created_at: row.created_at,
    },
  };
}

/* ===================== SUB-KOMPONEN UI ===================== */
const FeatureDropdown = React.memo(({ value, onChange }) => (
  <div className={styles.filterRow}>
    <label htmlFor="featureFilter" className={styles.label}>Fitur/Layanan:</label>
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

const TabFilter = React.memo(({ currentTab, onTabChange }) => (
  <div className={styles.tabRow} role="tablist" aria-label="Filter status persetujuan">
    {TABS.map((tabName) => (
      <button
        key={tabName}
        type="button"
        role="tab"
        aria-selected={currentTab === tabName}
        className={`${styles.tabBtn} ${currentTab === tabName ? styles.tabActive : ''}`}
        onClick={() => onTabChange(tabName)}
      >
        <span className={styles.tabLabel}>{tabName}</span>
        {tabName !== 'All' && <span className={`${styles.tabDot} ${styles.tabDotIdle}`} aria-hidden="true" />}
      </button>
    ))}
  </div>
));
TabFilter.displayName = 'TabFilter';

const BookingCard = React.memo(({ booking, onClick }) => {
  const statusInfo = STATUS_CONFIG[booking.status_id] || { text: 'Unknown', className: '' };
  const featureKey = resolveFeatureKey(booking);
  const featureLabel = featureLabelOf(booking);

  const renderServiceLine = () => {
    switch (featureKey) {
      case 'bicare': {
        const jam = booking._raw_bicare?.slot_time?.slice(0,5);
        const pasien = booking._raw_bicare?.patient_name;
        const parts = [jam && `Jam: ${jam}`, pasien && `Pasien: ${pasien}`].filter(Boolean);
        return parts.length ? <div className={styles.cardVehicles}>{parts.join(' • ')}</div> : null;
      }
      case 'bimail': {
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
        const parts = [unit && `Unit: ${unit}`, count ? `Item: ${count}` : null, total ? `Total qty: ${total}` : null]
          .filter(Boolean);
        return parts.length ? <div className={styles.cardVehicles}>{parts.join(' • ')}</div> : null;
      }
      case 'bimeet': {
        const rn = booking.room_name;
        const part = booking.participants;
        const uker = booking.unit_kerja;
        const parts = [rn && `Ruangan: ${rn}`, Number.isFinite(part) && `Peserta: ${part}`, uker && `Unit: ${uker}`]
          .filter(Boolean);
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
      className={styles.cardLayanan}
      onClick={onClick}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}
      role="button"
      tabIndex={0}
      aria-label={`Lihat detail booking tujuan ${booking.tujuan}`}
    >
      <Image
        src={logoSrcOf(booking)}
        alt={featureLabel || 'Logo'}
        width={70}
        height={70}
        className={styles.cardLogo}
        priority
      />
      <div className={styles.cardContent}>
        <div className={styles.layananTitle}>
          {featureLabel ? `[${featureLabel}] ` : ''}Booking | {booking.tujuan}
        </div>
        <div className={styles.layananSub}>
          {`${formatDate(booking.start_date)} - ${formatDate(booking.end_date)}`}
        </div>

        {renderServiceLine()}

        <div className={`${styles.layananStatus} ${statusInfo.className}`}>{statusInfo.text}</div>
      </div>
    </div>
  );
});
BookingCard.displayName = 'BookingCard';

const ADMIN_DETAIL_ROUTES = {

  bimeet: (id) => `/Admin/Fitur/bimeet/detail?id=${id}`,
  bicare: (id) => `/Admin/Fitur/bicare/detail?id=${id}`,
  bimeal: (id) => `/Admin/Fitur/bimeal/detail?id=${id}`,
  bistay: (id) => `/Admin/Fitur/bistay/detail?id=${id}`,
  bimail: (id) => `/Admin/Fitur/bimail/detail?id=${id}`,
  bidrive: (id) => `/Admin/DetailsLaporan/hal-detailslaporan?id=${id}`,
};

/* ===================== KOMPONEN UTAMA ===================== */
export default function PersetujuanBooking() {
  const router = useRouter();

  // ambil ns dari query/asPath
  const nsFromQuery = typeof router.query.ns === 'string' ? router.query.ns : '';
  const nsFromAsPath = (() => {
    const q = router.asPath.split('?')[1];
    if (!q) return '';
    const params = new URLSearchParams(q);
    const v = params.get('ns') || '';
    return NS_RE.test(v) ? v : '';
  })();
  const ns = NS_RE.test(nsFromQuery) ? nsFromQuery : nsFromAsPath;

  const [allBookings, setAllBookings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const [activeTab, setActiveTab] = useState('All');
  const [featureValue, setFeatureValue] = useState('all');

  // pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(6);
  const listTopRef = useRef(null);

  // logout popup
  const [showLogoutPopup, setShowLogoutPopup] = useState(false);
  const handleLogout = async () => {
    try {
      await fetch('/api/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ area: 'admin', ns }),
      });
    } catch {}
    finally {
      router.replace('/Signin/hal-signAdmin');
    }
  };

  // Ambil semua booking lintas layanan (ADMIN)
  useEffect(() => {
    if (!router.isReady) return;
    let mounted = true;

    const fetchAll = async () => {
      setIsLoading(true);
      try {
        // 1) BI.Drive (endpoint admin lama yang sudah ada)
        let dataDrive = [];
        {
          const res = await fetch(withNs('/api/booking', ns), { cache: 'no-store' });
          if (res.ok) {
            const rows = await res.json();
            dataDrive = Array.isArray(rows) ? rows.map(normalizeBIDriveRow) : [];
          } else {
            const e = await res.json().catch(() => ({}));
            console.warn('Drive fetch error:', e);
          }
        }

        // 2) BI.Care (ADMIN)
        let dataCare = [];
        try {
          const r = await fetch(withNs('/api/BIcare/book?scope=admin', ns), { cache: 'no-store' });
          if (r.ok) {
            const rows = await r.json();
            dataCare = Array.isArray(rows) ? rows.map(normalizeBICareRow) : [];
          }
        } catch (e) { console.warn('Care fetch error:', e); }

        // 3) BI.Docs (BImail) (ADMIN)
        let dataDocs = [];
        try {
          const r = await fetch(withNs('/api/BImail?scope=admin', ns), { cache: 'no-store' });
          if (r.ok) {
            const payload = await r.json();
            const rows = Array.isArray(payload?.items) ? payload.items : (Array.isArray(payload) ? payload : []);
            dataDocs = rows.map(normalizeBIMailRow);
          }
        } catch (e) { console.warn('Docs fetch error:', e); }

        // 4) BI.Meal (ADMIN)
        let dataMeal = [];
        try {
          const r = await fetch(withNs('/api/bimeal/book?scope=admin', ns), { cache: 'no-store' });
          if (r.ok) {
            const rows = await r.json();
            dataMeal = Array.isArray(rows) ? rows.map(normalizeBIMealRow) : [];
          }
        } catch (e) { console.warn('Meal fetch error:', e); }

        // 5) BI.Meet (ADMIN)
        let dataMeet = [];
        try {
          const r = await fetch(withNs('/api/bimeet/createbooking?scope=admin', ns), { cache: 'no-store' });
          if (r.ok) {
            const payload = await r.json();
            const rows = Array.isArray(payload?.items) ? payload.items : (Array.isArray(payload) ? payload : []);
            dataMeet = rows.map(normalizeBIMeetRow);
          }
        } catch (e) { console.warn('Meet fetch error:', e); }

        // 6) BI.Stay (ADMIN)
        let dataStay = [];
        try {
          const r = await fetch(withNs('/api/BIstaybook/bistaybooking?scope=admin', ns), { cache: 'no-store' });
          if (r.ok) {
            const payload = await r.json();
            const rows = Array.isArray(payload?.data) ? payload.data : (Array.isArray(payload) ? payload : []);
            dataStay = rows.map(normalizeBIStayRow);
          }
        } catch (e) { console.warn('Stay fetch error:', e); }

        const merged = [
          ...(Array.isArray(dataDrive) ? dataDrive : []),
          ...dataCare,
          ...dataDocs,
          ...dataMeal,
          ...dataMeet,
          ...dataStay,
        ];

        if (mounted) setAllBookings(merged);
      } catch (err) {
        if (mounted) setError(err.message);
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    fetchAll();
    return () => { mounted = false; };
  }, [router.isReady, ns]);

  /* ===================== FILTER & PAGINATION ===================== */
  const handleTabChange = useCallback((tabName) => {
    setActiveTab(tabName);
    setCurrentPage(1);
    listTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  const handleFeatureChange = useCallback((value) => {
    setFeatureValue(value);
    setCurrentPage(1);
    listTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  const statusFiltered = useMemo(() => {
    if (activeTab === 'All') return allBookings;
    const statusId = TAB_TO_STATUS_ID[activeTab];
    return allBookings.filter((item) => item.status_id === statusId);
  }, [activeTab, allBookings]);

  const filteredBookings = useMemo(() => {
    if (featureValue === 'all') return statusFiltered;

    // terima alias bidocs <-> bimail biar aman
    return statusFiltered.filter((b) => isAlias(resolveFeatureKey(b), featureValue));
  }, [statusFiltered, featureValue]);

  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil((filteredBookings.length || 0) / itemsPerPage));
  }, [filteredBookings.length, itemsPerPage]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(1);
  }, [totalPages, currentPage]);

  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginated = useMemo(
    () => filteredBookings.slice(startIndex, endIndex),
    [filteredBookings, startIndex, endIndex]
  );

  const onPageChange = useCallback((page) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
    listTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [totalPages]);

  const onChangeItemsPerPage = (e) => {
    const val = Number(e.target.value);
    setItemsPerPage(val);
    setCurrentPage(1);
    listTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const resultsFrom = filteredBookings.length ? startIndex + 1 : 0;
  const resultsTo = Math.min(endIndex, filteredBookings.length);

  // klik kartu → ke detail
  const onCardClick = useCallback((booking) => {
    const fk = resolveFeatureKey(booking);
    const id = numericIdOf(booking.id);
    if (!Number.isFinite(id)) return;

    const makeUrl = ADMIN_DETAIL_ROUTES[fk];
    if (makeUrl) {
      router.push(withNs(makeUrl(id), ns));
    } else {
      alert('Detail untuk layanan ini belum tersedia di halaman admin.');
    }
  }, [router, ns]);

  /* ===================== RENDER ===================== */
  return (
    <div className={styles.background}>
      <SidebarAdmin onLogout={() => setShowLogoutPopup(true)} />
      <main className={styles.mainContent}>
        <div className={styles.boxLayanan}>
          <div className={styles.topRow}>
            <button className={styles.backBtn} onClick={() => router.back()} type="button">
              <FaArrowLeft /> Kembali
            </button>
            <h1 className={styles.title}>PERSETUJUAN BOOKING</h1>
          </div>

          {/* Dropdown Fitur/Layanan */}
          <FeatureDropdown value={featureValue} onChange={handleFeatureChange} />

          {/* Tab Status */}
          <TabFilter currentTab={activeTab} onTabChange={handleTabChange} />

          {/* anchor untuk auto-scroll */}
          <div ref={listTopRef} />

          <div className={styles.cardList}>
            {isLoading ? (
              <p>Memuat data booking...</p>
            ) : error ? (
              <p style={{ color: 'red' }}>Error: {error}</p>
            ) : paginated.length === 0 ? (
              <p className={styles.emptyText}>Tidak ada booking dengan filter ini.</p>
            ) : (
              paginated.map((item) => (
                <BookingCard key={item.id} booking={item} onClick={() => onCardClick(item)} />
              ))
            )}
          </div>

          {/* Controls + Pagination */}
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
                    aria-label="Jumlah item per halaman"
                  >
                    <option value={5}>5</option>
                    <option value={6}>6</option>
                    <option value={10}>10</option>
                    <option value={15}>15</option>
                    <option value={20}>20</option>
                  </select>
                </div>
              </div>

              <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={onPageChange} />
            </div>
          )}
        </div>
      </main>

      <LogoutPopup
        open={showLogoutPopup}
        onCancel={() => setShowLogoutPopup(false)}
        onLogout={handleLogout}
      />
    </div>
  );
}
