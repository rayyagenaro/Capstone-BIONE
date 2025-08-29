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
import { jwtVerify } from 'jose';

/* ===================== KONFIGURASI STATUS ===================== */
const STATUS_CONFIG = {
  '1': { text: 'Pending',  className: styles.statusPending  },
  '2': { text: 'Approved', className: styles.statusApproved },
  '3': { text: 'Rejected', className: styles.statusRejected },
  '4': { text: 'Finished', className: styles.statusFinished },
};

const TABS = ['All', 'Pending', 'Approved', 'Rejected', 'Finished'];
const TAB_TO_STATUS_ID = { Pending: 1, Approved: 2, Rejected: 3, Finished: 4 };

const FEATURE_OPTIONS = [
  { label: 'All',      value: 'all'     },
  { label: 'Drive', value: 'bidrive' },
  { label: 'Care',  value: 'bicare'  },
  { label: 'Meal',  value: 'bimeal'  },
  { label: 'Meet',  value: 'bimeet'  },
  { label: 'Docs',  value: 'bimail'  },
  { label: 'Stay',  value: 'bistay'  },
];

const FEATURE_LOGOS = {
  bidrive: "/assets/D'MOVE.svg",
  bicare:  "/assets/D'CARE.svg",
  bimeal:  "/assets/D'MEAL.svg",
  bimeet:  "/assets/D'ROOM.svg",
  bimail:  "/assets/D'TRACK.svg",
  bidocs:  "/assets/D'TRACK.svg",
  bistay:  "/assets/D'REST.svg",
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
const NS_RE = /^[A-Za-z0-9_-]{3,32}$/;
const withNs = (url, ns) => (ns ? `${url}${url.includes('?') ? '&' : '?'}ns=${encodeURIComponent(ns)}` : url);

const numericIdOf = (id) => {
  const m = String(id ?? '').match(/(\d+)$/);
  return m ? Number(m[1]) : NaN;
};
const isAlias = (k, v) =>
  k === v ||
  (v === 'bidocs' && k === 'bimail') ||
  (v === 'bimail' && k === 'bidocs');

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
    case 'bicare':  return 'BI.Care';
    case 'bimeal':  return 'BI.Meal';
    case 'bimeet':  return 'BI.Meet';
    case 'bimail':  return 'BI.Docs';
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

const logoSrcOf = (booking) => FEATURE_LOGOS[resolveFeatureKey(booking)] || '/assets/BI-One-Blue.png';

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
  const featureLabel = featureLabelOf(booking);

  return (
    <div
      className={styles.cardLayanan}
      onClick={onClick}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}
      role="button"
      tabIndex={0}
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

export default function PersetujuanBooking({ initialRoleId = null, initialServiceIds = null }) {
  const router = useRouter();

  const nsFromQuery = typeof router.query.ns === 'string' ? router.query.ns : '';
  const nsFromAsPath = (() => {
    const q = router.asPath.split('?')[1];
    if (!q) return '';
    const params = new URLSearchParams(q);
    const v = params.get('ns') || '';
    return NS_RE.test(v) ? v : '';
  })();
  const ns = NS_RE.test(nsFromQuery) ? nsFromQuery : nsFromAsPath;

  const [roleId, setRoleId] = useState(initialRoleId);
  const [allowedServiceIds, setAllowedServiceIds] = useState(initialServiceIds);
  const [sbLoading, setSbLoading] = useState(initialRoleId == null);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!router.isReady || initialRoleId != null) { setSbLoading(false); return; }
      const nsParam = new URLSearchParams(location.search).get('ns') || '';
      try {
        const url = nsParam ? `/api/me?scope=admin&ns=${encodeURIComponent(nsParam)}` : `/api/me?scope=admin`;
        const r = await fetch(url, { cache: 'no-store' });
        const d = await r.json();
        if (!alive) return;

        const rl = Number(d?.payload?.role_id_num ?? d?.payload?.role_id ?? 0);
        const rs = String(d?.payload?.role || d?.payload?.roleNormalized || '').toLowerCase();
        const isSuper = rl === 1 || ['super_admin','superadmin','super-admin'].includes(rs);

        if (isSuper) {
          setRoleId(1);
          setAllowedServiceIds(null);
        } else {
          setRoleId(2);
          const ids = Array.isArray(d?.payload?.service_ids) ? d.payload.service_ids.map(x => SERVICE_ID_MAP[x] || null).filter(Boolean) : [];
          setAllowedServiceIds(ids);
        }
      } catch {
        setRoleId(2);
        setAllowedServiceIds([]);
      } finally {
        if (alive) setSbLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [router.isReady, initialRoleId]);

  const [allBookings, setAllBookings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const [activeTab, setActiveTab] = useState('All');
  const [featureValue, setFeatureValue] = useState('all');

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(6);
  const listTopRef = useRef(null);

  const [showLogoutPopup, setShowLogoutPopup] = useState(false);
  const handleLogout = async () => {
    try {
      await fetch('/api/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ area: 'admin', ns }),
      });
    } catch {} finally {
      router.replace('/Signin/hal-signAdmin');
    }
  };

  useEffect(() => {
    if (!router.isReady) return;
    const abortCtrl = new AbortController();
    setIsLoading(true);

    fetchAllBookings(ns, 'admin', abortCtrl.signal)
      .then((merged) => setAllBookings(merged))
      .catch((err) => setError(err.message))
      .finally(() => setIsLoading(false));

    return () => abortCtrl.abort();
  }, [router.isReady, ns]);

  // ===== FILTER & PAGINATION =====
  const roleFiltered = useMemo(() => {
    if (!allowedServiceIds || allowedServiceIds.length === 0) return allBookings;
    return allBookings.filter((b) => {
      const key = resolveFeatureKey(b);
      return allowedServiceIds.includes(key);
    });
  }, [allBookings, allowedServiceIds]);

  const allowedFeatureOptions = useMemo(() => {
    if (!allowedServiceIds || allowedServiceIds.length === 0) {
      // Super admin → semua fitur + All
      return FEATURE_OPTIONS;
    }
    // Admin fitur → hanya tampilkan All + fitur yg ada di allowedServiceIds
    return FEATURE_OPTIONS.filter(opt =>
      opt.value === 'all' || allowedServiceIds.includes(opt.value)
    );
  }, [allowedServiceIds]);

  const statusFiltered = useMemo(() => {
    if (activeTab === 'All') return roleFiltered;
    const statusId = TAB_TO_STATUS_ID[activeTab];
    return roleFiltered.filter((item) => item.status_id === statusId);
  }, [activeTab, roleFiltered]);

  const filteredBookings = useMemo(() => {
    if (featureValue === 'all') return statusFiltered;
    return statusFiltered.filter((b) => isAlias(resolveFeatureKey(b), featureValue));
  }, [statusFiltered, featureValue]);

  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil((filteredBookings.length || 0) / itemsPerPage));
  }, [filteredBookings.length, itemsPerPage]);

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

  const onCardClick = useCallback((booking) => {
    const fk = resolveFeatureKey(booking);
    const id = numericIdOf(booking.id);
    if (!Number.isFinite(id)) return;
    const makeUrl = ADMIN_DETAIL_ROUTES[fk];
    if (makeUrl) router.push(withNs(makeUrl(id), ns));
    else alert('Detail untuk layanan ini belum tersedia di halaman admin.');
  }, [router, ns]);

  const SidebarComp = roleId === 1 ? SidebarAdmin : SidebarFitur;

  return (
    <div className={styles.background}>
      {!sbLoading && <SidebarComp onLogout={() => setShowLogoutPopup(true)} />}
      <main className={styles.mainContent}>
        <div className={styles.boxLayanan}>
          <div className={styles.topRow}>
            <button className={styles.backBtn} onClick={() => router.back()} type="button">
              <FaArrowLeft /> Kembali
            </button>
            <h1 className={styles.title}>Persetujuan Booking</h1>
          </div>

          <FeatureDropdown value={featureValue} onChange={setFeatureValue} allowedOptions={allowedFeatureOptions} />
          <TabFilter currentTab={activeTab} onTabChange={setActiveTab} />

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

/* ===================== SSR GUARD: role 1 & 2 ===================== */
export async function getServerSideProps(ctx) {
  const { ns: raw } = ctx.query;
  const ns = Array.isArray(raw) ? raw[0] : raw;
  const nsValid = typeof ns === 'string' && NS_RE.test(ns) ? ns : null;
  const from = ctx.resolvedUrl || '/Admin/Persetujuan/hal-persetujuan';

  if (!nsValid) {
    return { redirect: { destination: `/Signin/hal-signAdmin?from=${encodeURIComponent(from)}`, permanent: false } };
  }

  const cookieName = `admin_session__${nsValid}`;
  const token = ctx.req.cookies?.[cookieName] || null;
  if (!token) {
    return { redirect: { destination: `/Signin/hal-signAdmin?from=${encodeURIComponent(from)}`, permanent: false } };
  }

  try {
    const secret = process.env.JWT_SECRET;
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret), { algorithms: ['HS256'], clockTolerance: 10 });

    const rId = Number(payload?.role_id ?? 0);
    const rStr = String(payload?.role || '').toLowerCase();
    const isSuper = rId === 1 || ['super_admin','superadmin','super-admin'].includes(rStr);
    const isFitur = rId === 2 || ['admin_fitur','admin-fitur','admin'].includes(rStr);

    if (!isSuper && !isFitur) {
      return { redirect: { destination: `/Signin/hal-signAdmin?from=${encodeURIComponent(from)}`, permanent: false } };
    }

    const serviceIds = isSuper ? null : (Array.isArray(payload?.service_ids) ? payload.service_ids.map(x => SERVICE_ID_MAP[x] || null).filter(Boolean) : []);

    return { props: { initialRoleId: isSuper ? 1 : 2, initialServiceIds: serviceIds } };
  } catch {
    return { redirect: { destination: `/Signin/hal-signAdmin?from=${encodeURIComponent(from)}`, permanent: false } };
  }
}
