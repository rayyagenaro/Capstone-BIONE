// /pages/Persetujuan/hal-persetujuan.js
import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/router';
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
};
const TABS = ['All', 'Pending', 'Approved', 'Rejected'];
const TAB_TO_STATUS_ID = { Pending: 1, Approved: 2, Rejected: 3 };

const calculateDuration = (start, end) => {
  if (!start || !end) return 'N/A';
  const diffTime = Math.abs(new Date(end) - new Date(start));
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return `${diffDays} Hari`;
};

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

const BookingCard = React.memo(({ booking }) => {
  const router = useRouter();
  const statusInfo = STATUS_CONFIG[booking.status_id] || { text: 'Unknown', className: '' };

  return (
    <div
      className={styles.cardLayanan}
      onClick={() => router.push(`/DetailsLaporan/hal-detailslaporan?id=${booking.id}`)}
      onKeyDown={(e) => e.key === 'Enter' && router.push(`/DetailsLaporan/hal-detailslaporan?id=${booking.id}`)}
      role="button"
      tabIndex={0}
      aria-label={`Lihat detail booking tujuan ${booking.tujuan}`}
    >
      <Image src="/assets/D'MOVE.png" alt="D'MOVE" width={70} height={70} className={styles.cardLogo} priority />
      <div className={styles.cardContent}>
        <div className={styles.layananTitle}>{`Booking D'MOVE | ${booking.tujuan}`}</div>
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
  const handleLogout = () => {
    localStorage.removeItem('admin');
    router.push('/Login/hal-login');
  };

  useEffect(() => {
    const fetchAllBookings = async () => {
      setIsLoading(true);
      try {
        const res = await fetch('/api/booking');
        if (!res.ok) {
          const errorData = await res.json();
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
  }, []);

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

  return (
    <div className={styles.background}>
      <SidebarAdmin onLogoutClick={() => setShowLogoutPopup(true)} />
      <main className={styles.mainContent}>
        <div className={styles.boxLayanan}>
          {/* Back + Title (opsional) */}
          <div className="topRowPersetujuan">
            <button type="button" className={styles.backBtn} onClick={() => router.back()} aria-label="Kembali">
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
              paginated.map((item) => <BookingCard key={item.id} booking={item} />)
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
                  <label htmlFor="perPage" style={{ marginRight: 8 }}>
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

      <LogoutPopup open={showLogoutPopup} onCancel={() => setShowLogoutPopup(false)} onLogout={handleLogout} />
    </div>
  );
}
