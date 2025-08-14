// /pages/Persetujuan/hal-persetujuan.js
import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/router';
import Link from 'next/link';
import styles from './persetujuan.module.css';
import SidebarAdmin from '@/components/SidebarAdmin/SidebarAdmin';
import LogoutPopup from '@/components/LogoutPopup/LogoutPopup';
import Pagination from '@/components/Pagination/Pagination';
import { FaArrowLeft } from 'react-icons/fa';

// --- KONFIGURASI & HELPER ---
const STATUS_CONFIG = {
  '1': { text: 'Pending', className: styles.statusPending },
  '2': { text: 'Approved', className: styles.statusApproved },
  '3': { text: 'Rejected', className: styles.statusRejected },
  '4': { text: 'Finished', className: styles.statusFinished },
};
const TABS = ['All', 'Pending', 'Approved', 'Rejected', 'Finished'];
const TAB_TO_STATUS_ID = { Pending: 1, Approved: 2, Rejected: 3, Finished: 4 };

const calculateDuration = (start, end) => {
  if (!start || !end) return 'N/A';
  const diffTime = Math.abs(new Date(end) - new Date(start));
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return `${diffDays} Hari`;
};

// 🔧 CHANGED: helper ns
const NS_RE = /^[A-Za-z0-9_-]{3,32}$/;
const withNs = (url, ns) => (ns ? `${url}${url.includes('?') ? '&' : '?'}ns=${encodeURIComponent(ns)}` : url);

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
        {tabName}
      </button>
    ))}
  </div>
));
TabFilter.displayName = 'TabFilter';

// 🔧 CHANGED: terima ns dan gunakan withNs saat navigate ke detail
const BookingCard = React.memo(({ booking, ns }) => {
  const router = useRouter();
  const statusInfo = STATUS_CONFIG[booking.status_id] || { text: 'Unknown', className: '' };

  const goDetail = () =>
    router.push(withNs(`/Admin/DetailsLaporan/hal-detailslaporan?id=${booking.id}`, ns));

  return (
    <div
      className={styles.cardLayanan}
      onClick={goDetail}
      onKeyDown={(e) => e.key === 'Enter' && goDetail()}
      role="button"
      tabIndex={0}
      aria-label={`Lihat detail booking tujuan ${booking.tujuan}`}
    >
      <Image src="/assets/D'MOVE.svg" alt="D'MOVE" width={70} height={70} className={styles.cardLogo} priority />
      <div className={styles.cardContent}>
        <div className={styles.layananTitle}>{`Booking BI-DRIVE | ${booking.tujuan}`}</div>
        <div className={styles.layananSub}>{calculateDuration(booking.start_date, booking.end_date)}</div>
        <div className={`${styles.layananStatus} ${statusInfo.className}`}>{statusInfo.text}</div>
      </div>
    </div>
  );
});
BookingCard.displayName = 'BookingCard';

// --- KOMPONEN UTAMA ---
export default function PersetujuanBooking() {
  const router = useRouter();

  // 🔧 CHANGED: ambil ns dari query/asPath
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

  // pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(6);
  const listTopRef = useRef(null);

  // logout popup
  const [showLogoutPopup, setShowLogoutPopup] = useState(false);
  const handleLogout = async () => {
    try {
      // 🔧 CHANGED: logout per-NS
      await fetch('/api/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ area: 'admin', ns }),
      });
    } catch (e) {
      // optional: log error
    } finally {
      router.replace('/Signin/hal-signAdmin'); // balik ke login admin
    }
  };

  useEffect(() => {
    if (!router.isReady) return; // 🔧 CHANGED: tunggu router siap
    const fetchAllBookings = async () => {
      setIsLoading(true);
      try {
        // 🔧 CHANGED: bawa ns ke API
        const res = await fetch(withNs('/api/booking', ns), { cache: 'no-store' });
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(errorData.error || 'Gagal memuat data booking');
        }
        const data = await res.json();
        setAllBookings(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    fetchAllBookings();
  }, [router.isReady, ns]); // 🔧 CHANGED: depend ns

  const handleTabChange = useCallback((tabName) => {
    setActiveTab(tabName);
    setCurrentPage(1);
    listTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  const filteredBookings = useMemo(() => {
    if (activeTab === 'All') return allBookings;
    const statusId = TAB_TO_STATUS_ID[activeTab];
    return allBookings.filter((item) => item.status_id === statusId);
  }, [activeTab, allBookings]);

  // total halaman & slice data
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

  // handlers pagination
  const onPageChange = useCallback(
    (page) => {
      if (page < 1 || page > totalPages) return;
      setCurrentPage(page);
      listTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    },
    [totalPages]
  );

  const onChangeItemsPerPage = (e) => {
    const val = Number(e.target.value);
    setItemsPerPage(val);
    setCurrentPage(1);
    listTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const resultsFrom = filteredBookings.length ? startIndex + 1 : 0;
  const resultsTo = Math.min(endIndex, filteredBookings.length);

  const pathnameOnly = router.asPath.split('?')[0]; // 🔧 CHANGED: active state tanpa query

  return (
    <div className={styles.background}>
      <SidebarAdmin onLogout={() => setShowLogoutPopup(true)} />
      <main className={styles.mainContent}>
        <div className={styles.boxLayanan}>
          {/* Back + Title */}
          <div className="topRowPersetujuan">
            <button className={styles.backBtn} onClick={() => router.back()} type="button">
              <FaArrowLeft /> Kembali
            </button>
          </div>

          <div className={styles.titleLayanan}>PERSETUJUAN BOOKING</div>

          <TabFilter currentTab={activeTab} onTabChange={handleTabChange} />

          {/* anchor untuk auto-scroll */}
          <div ref={listTopRef} />

          <div className={styles.cardList}>
            {isLoading ? (
              <p>Memuat data booking...</p>
            ) : error ? (
              <p style={{ color: 'red' }}>Error: {error}</p>
            ) : paginated.length === 0 ? (
              <p className={styles.emptyText}>Tidak ada booking dengan status ini.</p>
            ) : (
              // 🔧 CHANGED: lempar ns ke BookingCard
              paginated.map((item) => <BookingCard key={item.id} booking={item} ns={ns} />)
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
                  <label htmlFor="perPage" className={styles.label}>
                    Items per page:
                  </label>
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
