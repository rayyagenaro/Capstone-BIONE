// src/pages/StatusBooking/hal-statusBooking.js
import React, { useEffect, useState, useMemo, useCallback } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/router';
import styles from './statusBooking.module.css';
import SidebarUser from '@/components/SidebarUser/SidebarUser';
import LogoutPopup from '@/components/LogoutPopup/LogoutPopup';
import Pagination from '@/components/Pagination/Pagination';
import { FaArrowLeft, FaTimes } from 'react-icons/fa';

// --- KONFIGURASI & HELPER ---
const STATUS_CONFIG = {
  '1': { text: 'Pending',  className: styles.statusProcess },
  '2': { text: 'Approved', className: styles.statusApproved },
  '3': { text: 'Rejected', className: styles.statusRejected },
  // NEW
  '4': { text: 'Finished', className: styles.statusFinished },
};

// NEW: tambah tab Finished
const TABS = ['All', 'Pending', 'Approved', 'Rejected', 'Finished'];
const TAB_TO_STATUS_ID = { Pending: 1, Approved: 2, Rejected: 3, Finished: 4 };

const formatDate = (dateString) => {
  if (!dateString) return 'Tanggal tidak valid';
  return new Date(dateString).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

// --- SUB-KOMPONEN ---
const BookingCard = React.memo(({ booking, onClick }) => {
  const statusInfo =
    STATUS_CONFIG[booking.status_id] || { text: 'Unknown', className: styles.statusProcess };
  return (
    <div
      className={styles.bookingCard}
      onClick={onClick}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}
      role="button"
      tabIndex={0}
    >
      <Image
        src={"/assets/D'MOVE.svg"}
        alt="logo"
        width={60}
        height={60}
        className={styles.cardLogo}
      />
      <div className={styles.cardDetail}>
        <div className={styles.cardTitle}>{`Booking | ${booking.tujuan || 'Tanpa Tujuan'}`}</div>
        <div className={styles.cardSub}>
          {`${formatDate(booking.start_date)} - ${formatDate(booking.end_date)}`}
        </div>
        {booking.vehicle_types?.length > 0 && (
          <div className={styles.cardVehicles}>
            {booking.vehicle_types.map((vt) => vt.name).join(', ')}
          </div>
        )}
        <div className={statusInfo.className}>{statusInfo.text}</div>
      </div>
    </div>
  );
});
BookingCard.displayName = 'BookingCard';

const TabFilter = React.memo(({ currentTab, onTabChange }) => (
  <div className={styles.tabRow}>
    {TABS.map((tabName) => (
      <button
        key={tabName}
        className={`${styles.tabBtn} ${currentTab === tabName ? styles.tabActive : ''}`}
        onClick={() => onTabChange(tabName)}
        type="button"
      >
        {tabName}
      </button>
    ))}
  </div>
));
TabFilter.displayName = 'TabFilter';

const BookingDetailModal = ({ booking, onClose, onFinish, finishing }) => {
  // Tutup dengan ESC
  useEffect(() => {
    if (!booking) return;
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [booking, onClose]);

  if (!booking) return null;
  const statusInfo =
    STATUS_CONFIG[booking.status_id] || { text: 'Unknown', className: styles.statusProcess };
  const isApproved = Number(booking.status_id) === 2;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <button className={styles.modalCloseBtn} onClick={onClose} type="button">
          <FaTimes />
        </button>
        <h3 className={styles.modalTitle}>Detail Booking</h3>
        <div className={styles.modalBody}>
          <p><strong>Tujuan:</strong> {booking.tujuan}</p>
          <p><strong>Mulai:</strong> {formatDate(booking.start_date)}</p>
          <p><strong>Selesai:</strong> {formatDate(booking.end_date)}</p>
          <p>
            <strong>Status:</strong>{' '}
            <span className={`${styles.modalStatus} ${statusInfo.className}`}>
              {statusInfo.text}
            </span>
          </p>
          <hr className={styles.modalDivider} />
          <p>
            <strong>Jenis Kendaraan:</strong>{' '}
            {booking.vehicle_types?.map((vt) => vt.name).join(', ') || 'Tidak ada'}
          </p>
          <p><strong>Jumlah Kendaraan:</strong> {booking.jumlah_kendaraan || 'N/A'}</p>
          <p><strong>Jumlah Driver:</strong> {booking.jumlah_driver || 'N/A'}</p>
          <p><strong>Jumlah Orang:</strong> {booking.jumlah_orang || 'N/A'}</p>
          <p><strong>Volume Barang:</strong> {booking.volume_kg ? `${booking.volume_kg} Kg` : 'N/A'}</p>
          <p><strong>Keterangan:</strong> {booking.keterangan || 'Tidak ada keterangan.'}</p>
          {booking.file_link && (
            <p>
              <strong>Link File:</strong>{' '}
              <a href={booking.file_link} target="_blank" rel="noopener noreferrer">
                Lihat Lampiran
              </a>
            </p>
          )}

          {/* NEW: tombol “Finished” hanya saat status Approved */}
          {isApproved && (
            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.finishButton}
                onClick={() => onFinish(booking)}
                disabled={finishing}
                title="Tandai booking ini sudah selesai"
              >
                {finishing ? 'Memproses...' : 'Finished'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// --- KOMPONEN UTAMA ---
export default function StatusBooking() {
  const router = useRouter();
  const [allBookings, setAllBookings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('All');
  const [selectedBooking, setSelectedBooking] = useState(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);

  // Popup Logout
  const [showLogoutPopup, setShowLogoutPopup] = useState(false);

  // NEW: state proses “Finished”
  const [finishing, setFinishing] = useState(false);

  // 🔒 Kunci scroll saat modal terbuka
  useEffect(() => {
    if (selectedBooking) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [selectedBooking]);

  const handleLogout = async () => {
    try {
      await fetch('/api/logout', { method: 'POST' });
    } catch {}
    finally {
      router.replace('/Signin/hal-sign');
    }
  };

  useEffect(() => {
    let active = true;

    const fetchBookings = async () => {
      setIsLoading(true);
      try {
        // Ambil identitas user dari token di cookie
        const meRes = await fetch('/api/me?scope=user', { cache: 'no-store' });
        const meData = await meRes.json();

        if (!active) return;

        if (!meData.hasToken || meData.payload?.role !== 'user') {
          setError('Silakan login untuk melihat status booking.');
          setIsLoading(false);
          return;
        }

        const userId = meData.payload.sub;

        // Ambil booking berdasarkan userId
        const res = await fetch(`/api/booking?userId=${userId}`);
        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || 'Gagal memuat data booking');
        }
        const data = await res.json();
        setAllBookings(data);
      } catch (err) {
        setError(err.message);
      } finally {
        if (active) setIsLoading(false);
      }
    };

    fetchBookings();
    return () => { active = false; };
  }, []);

  const handleTabChange = useCallback((tabName) => {
    setActiveTab(tabName);
    setCurrentPage(1);
  }, []);

  const handleCardClick = useCallback((booking) => setSelectedBooking(booking), []);
  const closeModal = useCallback(() => setSelectedBooking(null), []);

  // NEW: tandai sebagai Finished
  const markAsFinished = useCallback(async (booking) => {
    try {
      setFinishing(true);
      const res = await fetch('/api/booking', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId: booking.id, newStatusId: 4 }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error || 'Gagal mengubah status menjadi Finished.');
      }

      // Update data lokal (optimistic update)
      setAllBookings((prev) =>
        prev.map((b) => (b.id === booking.id ? { ...b, status_id: 4 } : b))
      );
      setSelectedBooking((prev) => (prev ? { ...prev, status_id: 4 } : prev));
      // opsional: pindah ke tab Finished
      setActiveTab('Finished');
    } catch (e) {
      alert(e.message);
    } finally {
      setFinishing(false);
    }
  }, []);

  const filteredBookings = useMemo(() => {
    if (activeTab === 'All') return allBookings;
    const statusId = TAB_TO_STATUS_ID[activeTab];
    return allBookings.filter((item) => item.status_id === statusId);
  }, [activeTab, allBookings]);

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

  const onPageChange = useCallback(
    (page) => {
      if (page < 1 || page > totalPages) return;
      setCurrentPage(page);
    },
    [totalPages]
  );

  const onChangeItemsPerPage = (e) => {
    const val = Number(e.target.value);
    setItemsPerPage(val);
    setCurrentPage(1);
  };

  const resultsFrom = filteredBookings.length ? startIndex + 1 : 0;
  const resultsTo = Math.min(endIndex, filteredBookings.length);

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

          <TabFilter currentTab={activeTab} onTabChange={handleTabChange} />

          <div className={styles.listArea}>
            {isLoading && <div className={styles.emptyState}>Memuat booking...</div>}
            {error && <div className={styles.emptyState} style={{ color: 'red' }}>{error}</div>}

            {!isLoading && !error && paginatedBookings.length === 0 && (
              <div className={styles.emptyState}>Tidak ada booking dengan status ini.</div>
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
                   <label htmlFor="perPage" className={styles.label}>
                    Items per page:
                  </label>
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
        onFinish={markAsFinished}        // NEW
        finishing={finishing}            // NEW
      />

      {/* POPUP LOGOUT */}
      <LogoutPopup
        open={showLogoutPopup}
        onCancel={() => setShowLogoutPopup(false)}
        onLogout={handleLogout}
      />
    </div>
  );
}
