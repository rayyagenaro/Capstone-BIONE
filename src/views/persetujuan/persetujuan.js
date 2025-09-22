// /pages/Admin/Persetujuan/hal-persetujuan.js
import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/router';
import styles from './persetujuan.module.css';
import SidebarAdmin from '@/components/SidebarAdmin/SidebarAdmin';
import SidebarFitur from '@/components/SidebarFitur/SidebarFitur';
import LogoutPopup from '@/components/LogoutPopup/LogoutPopup';
import Pagination from '@/components/Pagination/Pagination';
import { FaArrowLeft } from 'react-icons/fa';
import { fetchAllBookings } from '@/lib/fetchBookings';
import { NS_RE, getNsFromReq } from '@/lib/ns-server';
import { withNs } from '@/lib/ns';
import { verifyAuth } from '@/lib/auth';

/* ===================== KONFIGURASI STATUS ===================== */
const STATUS_CONFIG = {
  '1': { text: 'Pending', className: styles.statusPending },
  '2': { text: 'Approved', className: styles.statusApproved },
  '3': { text: 'Rejected', className: styles.statusRejected },
  '4': { text: 'Finished', className: styles.statusFinished },
  '5': { text: 'Cancelled', className: styles.statusCancelled },
};

const TABS = ['All', 'Pending', 'Approved', 'Rejected', 'Finished', 'Cancelled'];
const TAB_TO_STATUS_ID = { Pending: 1, Approved: 2, Rejected: 3, Finished: 4, Cancelled: 5 };
const SEEN_KEYS = { Pending: 'pending', Approved: 'approved', Rejected: 'rejected', Finished: 'finished', Cancelled: 'cancelled' };
const DEFAULT_SEEN = { pending: 0, approved: 0, rejected: 0, finished: 0, cancelled: 0 };
const seenStorageKey = (userId) => `adminPersetujuanSeen:${userId}`;

const FEATURE_OPTIONS = [
  { label: 'All', value: 'all' },
  { label: 'Drive', value: 'bidrive' },
  { label: 'Care', value: 'bicare' },
  { label: 'Meal', value: 'bimeal' },
  { label: 'Meet', value: 'bimeet' },
  { label: 'Docs', value: 'bimail' },
  { label: 'Stay', value: 'bistay' },
];

const FEATURE_LOGOS = {
  bidrive: "/assets/D'MOVE.svg",
  bicare: "/assets/D'CARE.svg",
  bimeal: "/assets/D'MEAL.svg",
  bimeet: "/assets/D'ROOM.svg",
  bimail: "/assets/D'TRACK.svg",
  bidocs: "/assets/D'TRACK.svg",
  bistay: "/assets/D'REST.svg",
};

const SERVICE_ID_MAP = {
  1: 'bidrive',
  2: 'bicare',
  3: 'bimeal',
  4: 'bimeet',
  5: 'bimail',
  6: 'bistay',
};

const norm = (s) => String(s || '').trim().toLowerCase();
const numericIdOf = (id) => {
  const m = String(id ?? '').match(/(\d+)$/);
  return m ? Number(m[1]) : NaN;
};
const isAlias = (k, v) =>
  k === v || (v === 'bidocs' && k === 'bimail') || (v === 'bimail' && k === 'bidocs');

function resolveFeatureKey(booking) {
  if (booking?.feature_key) return booking.feature_key;
  const candidates = [
    booking?.service, booking?.service_name, booking?.service_code,
    booking?.feature, booking?.layanan, booking?.jenis_layanan, booking?.feature_name,
  ].map(norm).filter(Boolean);

  for (const raw of candidates) {
    const s = raw.replace(/\s+/g, '');
    if (s.includes('bidrive') || s === 'drive') return 'bidrive';
    if (s.includes('bicare') || s === 'care') return 'bicare';
    if (s.includes('bimeal') || s === 'meal') return 'bimeal';
    if (s.includes('bimeet') || s === 'meet') return 'bimeet';
    if (s.includes('bidocs') || s.includes('bimail') || s === 'docs' || s === 'mail') return 'bimail';
    if (s.includes('bistay') || s === 'stay') return 'bistay';
  }
  return 'unknown';
}

function featureLabelOf(booking) {
  switch (resolveFeatureKey(booking)) {
    case 'bidrive': return 'BI.Drive';
    case 'bicare': return 'BI.Care';
    case 'bimeal': return 'BI.Meal';
    case 'bimeet': return 'BI.Meet';
    case 'bimail': return 'BI.Docs';
    case 'bistay': return 'BI.Stay';
    default: return null;
  }
}

const formatDate = (dateString) => {
  if (!dateString) return 'Tanggal tidak valid';
  return new Date(dateString).toLocaleDateString('id-ID', {
    day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
};

const logoSrcOf = (booking) => FEATURE_LOGOS[resolveFeatureKey(booking)] || '/assets/BI-One-Blue.png';

/* ===================== DROPDOWN ===================== */
const FeatureDropdown = React.memo(({ value, onChange, allowedOptions }) => (
  <div className={styles.filterRow}>
    <label htmlFor="featureFilter" className={styles.label}>Fitur/Layanan:</label>
    <select
      id="featureFilter"
      className={styles.itemsPerPageDropdown}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      {allowedOptions.map(opt => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  </div>
));
FeatureDropdown.displayName = 'FeatureDropdown';

/* ===================== TAB FILTER BARU ===================== */
const TabFilter = React.memo(({ currentTab, onTabChange, badgeCounts }) => (
  <div className={styles.tabRow} role="tablist" aria-label="Filter status persetujuan">
    {TABS.map((tabName) => {
      const isAll = tabName === 'All';
      const key = SEEN_KEYS[tabName];
      const count = isAll ? 0 : (badgeCounts[key] || 0);
      const showNumber = !isAll && count > 0;

      return (
        <button
          key={tabName}
          type="button"
          role="tab"
          aria-selected={currentTab === tabName}
          className={`${styles.tabBtn} ${currentTab === tabName ? styles.tabActive : ''}`}
          onClick={() => onTabChange(tabName)}
        >
          <span className={styles.tabLabel}>{tabName}</span>
          {showNumber && (
            <span className={`${styles.tabBadge} ${styles.tabBadgeActive}`}>{count}</span>
          )}
        </button>
      );
    })}
  </div>
));


/* ===================== BOOKING CARD ===================== */
const BookingCard = React.memo(({ booking, onClick }) => {
  const featureKey = resolveFeatureKey(booking);
  let statusInfo = STATUS_CONFIG[booking.status_id] || { text: 'Unknown', className: '' };

  if (featureKey === 'bicare') {
    switch (String(booking.status_id)) {
      case '2': statusInfo = { text: 'Booked', className: styles.statusApproved }; break;
      case '4': statusInfo = { text: 'Finished', className: styles.statusFinished }; break;
      default: statusInfo = { text: booking.status || 'Unknown', className: '' };
    }
  }
  const featureLabel = featureLabelOf(booking);

  return (
    <div
      className={styles.cardLayanan}
      onClick={onClick}
      role="button"
      tabIndex={0}
    >
      <Image src={logoSrcOf(booking)} alt={featureLabel || 'Logo'} width={70} height={70} className={styles.cardLogo} />
      <div className={styles.cardContent}>
        <div className={styles.layananTitle}>
          {featureLabel ? `[${featureLabel}] ` : ''}Booking | {booking.tujuan}
        </div>
        <div className={styles.layananSub}>
          {`${formatDate(booking.start_date)} - ${formatDate(booking.end_date)}`}
        </div>
        <div className={`${styles.layananStatus} ${statusInfo.className}`}>{statusInfo.text}</div>
      </div>
    </div>
  );
});
BookingCard.displayName = 'BookingCard';

/* ===================== HALAMAN ===================== */
export default function PersetujuanBooking({ initialRoleId = null, initialServiceIds = null }) {
  const router = useRouter();
  const nsFromQuery = typeof router.query.ns === 'string' ? router.query.ns : '';
  const ns = NS_RE.test(nsFromQuery) ? nsFromQuery : '';

  const [roleId, setRoleId] = useState(initialRoleId);
  const [allowedServiceIds, setAllowedServiceIds] = useState(initialServiceIds);

  const [allBookings, setAllBookings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const [activeTab, setActiveTab] = useState('All');
  const [featureValue, setFeatureValue] = useState('all');

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(6);

  const [showLogoutPopup, setShowLogoutPopup] = useState(false);

  const [seenCounts, setSeenCounts] = useState(DEFAULT_SEEN);
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch('/api/me?scope=admin', { credentials: 'include' });
        const d = await r.json();
        if (d?.payload?.sub) {
          const uid = Number(d.payload.sub);
          setUserId(uid);
          try {
            const raw = localStorage.getItem(seenStorageKey(uid));
            setSeenCounts(raw ? { ...DEFAULT_SEEN, ...JSON.parse(raw) } : DEFAULT_SEEN);
          } catch { setSeenCounts(DEFAULT_SEEN); }
        }
      } catch {}
    })();
  }, []);

    // hitung jumlah per status
  const tabCounts = useMemo(() => {
    const c = { pending: 0, approved: 0, rejected: 0, finished: 0, cancelled: 0 };
    for (const b of allBookings) {
      if (b.status_id === 1) c.pending++;
      else if (b.status_id === 2) c.approved++;
      else if (b.status_id === 3) c.rejected++;
      else if (b.status_id === 4) c.finished++;
      else if (b.status_id === 5) c.cancelled++;
    }
    return c;
  }, [allBookings]);

  const markTabSeen = useCallback((tabName) => {
    if (!userId || tabName === 'All') return;
    const key = SEEN_KEYS[tabName];
    const next = { ...seenCounts, [key]: tabCounts[key] }; // ✅ gunakan tabCounts
    setSeenCounts(next);
    try { localStorage.setItem(seenStorageKey(userId), JSON.stringify(next)); } catch {}
  }, [seenCounts, tabCounts, userId]);


  const badgeCounts = useMemo(() => ({
    pending: Math.max(0, (allBookings.filter(b => b.status_id === 1).length) - (seenCounts.pending || 0)),
    approved: Math.max(0, (allBookings.filter(b => b.status_id === 2).length) - (seenCounts.approved || 0)),
    rejected: Math.max(0, (allBookings.filter(b => b.status_id === 3).length) - (seenCounts.rejected || 0)),
    finished: Math.max(0, (allBookings.filter(b => b.status_id === 4).length) - (seenCounts.finished || 0)),
    cancelled: Math.max(0, (allBookings.filter(b => b.status_id === 5).length) - (seenCounts.cancelled || 0)),
  }), [allBookings, seenCounts]);

  useEffect(() => {
    if (!router.isReady) return;
    setIsLoading(true);
    fetchAllBookings(ns, 'admin')
      .then(setAllBookings)
      .catch(err => setError(err.message))
      .finally(() => setIsLoading(false));
  }, [router.isReady, ns]);

  const roleFiltered = useMemo(() => {
    if (!allowedServiceIds || allowedServiceIds.length === 0) return allBookings;
    return allBookings.filter((b) => allowedServiceIds.includes(resolveFeatureKey(b)));
  }, [allBookings, allowedServiceIds]);

  const statusFiltered = useMemo(() => {
    if (activeTab === 'All') return roleFiltered;
    return roleFiltered.filter((b) => b.status_id === TAB_TO_STATUS_ID[activeTab]);
  }, [activeTab, roleFiltered]);

  const filteredBookings = useMemo(() => {
    if (featureValue === 'all') return statusFiltered;
    return statusFiltered.filter((b) => isAlias(resolveFeatureKey(b), featureValue));
  }, [statusFiltered, featureValue]);


  const totalPages = Math.max(1, Math.ceil(filteredBookings.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginated = filteredBookings.slice(startIndex, endIndex);

  const onPageChange = (page) => { if (page >= 1 && page <= totalPages) setCurrentPage(page); };
  const onChangeItemsPerPage = (e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); };

  const onCardClick = (booking) => {
    const fk = resolveFeatureKey(booking);
    const id = numericIdOf(booking.id);
    if (!Number.isFinite(id)) return;
    router.push(withNs(`/Admin/Fitur/${fk}/detail?id=${id}`, ns));
  };

  const SidebarComp = roleId === 1 ? SidebarAdmin : SidebarFitur;

  return (
    <div className={styles.background}>
      <SidebarComp onLogout={() => setShowLogoutPopup(true)} />
      <main className={styles.mainContent}>
        <div className={styles.boxLayanan}>
          <div className={styles.topRow}>
            <button className={styles.backBtn} onClick={() => router.back()} type="button">
              <FaArrowLeft /> Kembali
            </button>
            <h1 className={styles.title}>Persetujuan Booking</h1>
          </div>

          <FeatureDropdown value={featureValue} onChange={setFeatureValue} allowedOptions={FEATURE_OPTIONS} />
          <TabFilter currentTab={activeTab} onTabChange={(t) => { setActiveTab(t); markTabSeen(t); }} badgeCounts={badgeCounts} />

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

          {!isLoading && !error && filteredBookings.length > 0 && (
            <div className={styles.paginationContainer}>
              <div className={styles.paginationControls}>
                <div className={styles.resultsText}>
                  Menampilkan {startIndex + 1}-{endIndex} dari {filteredBookings.length} data
                </div>
                <div>
                  <label htmlFor="perPage" className={styles.label}>Items per page:</label>
                  <select id="perPage" className={styles.itemsPerPageDropdown} value={itemsPerPage} onChange={onChangeItemsPerPage}>
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

      <LogoutPopup open={showLogoutPopup} onCancel={() => setShowLogoutPopup(false)} onLogout={async () => {
        try { await fetch('/api/logout', { method: 'POST' }); } finally { router.replace('/Signin/hal-signAdmin'); }
      }} />
    </div>
  );
}

/* ===================== SSR GUARD ===================== */
export async function getServerSideProps(ctx) {
  const from = ctx.resolvedUrl || '/Admin/Persetujuan/hal-persetujuan';
  const ns = getNsFromReq(ctx.req);
  if (!ns || !NS_RE.test(ns)) {
    return { redirect: { destination: `/Signin/hal-signAdmin?from=${encodeURIComponent(from)}`, permanent: false } };
  }
  const auth = await verifyAuth(ctx.req, ['super_admin', 'admin_fitur'], 'admin');
  if (!auth.ok) {
    return { redirect: { destination: `/Signin/hal-signAdmin?from=${encodeURIComponent(from)}`, permanent: false } };
  }
  const rId = Number(auth.payload?.role_id ?? 0);
  const rStr = String(auth.payload?.role || '').toLowerCase();
  const isSuper = rId === 1 || ['super_admin','superadmin','super-admin'].includes(rStr);
  const serviceIds = isSuper ? null : (Array.isArray(auth.payload?.service_ids) ? auth.payload.service_ids.map(x => SERVICE_ID_MAP[x] || null).filter(Boolean) : []);
  return { props: { initialRoleId: isSuper ? 1 : 2, initialServiceIds: serviceIds } };
}
