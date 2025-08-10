// /pages/HalamanUtama/hal-utamaAdmin.js
import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/router';
import styles from './halamanUtamaAdmin.module.css';
import SidebarAdmin from '@/components/SidebarAdmin/SidebarAdmin';
import LogoutPopup from '@/components/LogoutPopup/LogoutPopup';
import Pagination from '@/components/Pagination/Pagination';

// Helper: durasi hari
const calculateDuration = (start, end) => {
  if (!start || !end) return 'N/A';
  const d = Math.ceil(Math.abs(new Date(end) - new Date(start)) / (1000 * 60 * 60 * 24));
  return `${d || 1} Hari`;
};

const STATUS_CONFIG = {
  '1': { text: 'Pending', className: styles.layananStatusProcess },
};

export default function HalamanUtamaAdmin() {
  const router = useRouter();
  const [namaAdmin, setNamaAdmin] = useState('');
  const [incomingBookings, setIncomingBookings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showLogoutPopup, setShowLogoutPopup] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(6);
  const listTopRef = useRef(null);

  // ✅ GANTI guard: cek token & role dari server, BUKAN localStorage
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const r = await fetch('/api/me');
        const d = await r.json();

        if (!active) return;

        // Jika tidak ada token atau bukan admin → ke halaman login admin
        if (!d.hasToken || d.payload?.role !== 'admin') {
          router.replace('/Signin/hal-signAdmin?from=' + encodeURIComponent(router.asPath));
          return;
        }

        // Set nama admin dari payload JWT (fallback "Admin")
        setNamaAdmin(d.payload?.name || 'Admin');

        // Setelah lolos, load data
        setIsLoading(true);
        setError(null);
        const res = await fetch('/api/booking?status=pending');
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData?.error || 'Gagal memuat data booking');
        }
        const data = await res.json();
        setIncomingBookings(data);
      } catch (e) {
        setError(e.message || 'Terjadi kesalahan');
      } finally {
        if (active) setIsLoading(false);
      }
    })();
    return () => { active = false; };
  }, [router]);

  // ✅ Logout via API agar cookie token terhapus
  const handleLogout = async () => {
    try {
      await fetch('/api/logout', { method: 'POST' }); // hapus cookie `token`
    } catch (e) {
      // optional: log error
    } finally {
      router.replace('/Signin/hal-signAdmin'); // balik ke login admin
    }
  };

  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil((incomingBookings.length || 0) / itemsPerPage));
  }, [incomingBookings.length, itemsPerPage]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(1);
  }, [totalPages, currentPage]);

  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;

  const paginated = useMemo(
    () => incomingBookings.slice(startIndex, endIndex),
    [incomingBookings, startIndex, endIndex]
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

  const resultsFrom = incomingBookings.length ? startIndex + 1 : 0;
  const resultsTo = Math.min(endIndex, incomingBookings.length);

  return (
    <div className={styles.background}>
      <SidebarAdmin onLogout={() => setShowLogoutPopup(true)} />
      <main className={styles.mainContent}>
        <div className={styles.greeting}>
          Selamat datang, {namaAdmin}
          <div className={styles.adminText}>Admin</div>
        </div>

        <div className={styles.boxLayanan}>
          <div className={styles.titleLayanan}>LAYANAN MASUK</div>
          <div ref={listTopRef} />

          <div className={styles.cardList}>
            {isLoading ? (
              <p className={styles.loadingText}>Memuat layanan...</p>
            ) : error ? (
              <p className={styles.errorText}>Error: {error}</p>
            ) : paginated.length === 0 ? (
              <p className={styles.emptyText}>Belum ada permintaan booking baru.</p>
            ) : (
              paginated.map((booking) => {
                const statusInfo = STATUS_CONFIG[booking.status_id];
                return (
                  <div
                    key={booking.id}
                    className={styles.cardLayanan}
                    onClick={() => router.push(`/Admin/DetailsLaporan/hal-detailslaporan?id=${booking.id}`)}
                    onKeyDown={(e) => e.key === 'Enter' && router.push(`/Admin/DetailsLaporan/hal-detailslaporan?id=${booking.id}`)}
                    role="button"
                    tabIndex={0}
                    aria-label={`Lihat detail booking ${booking.tujuan}`}
                  >
                    <Image
                      src={"/assets/D'MOVE.png"}
                      alt="D'MOVE"
                      width={70}
                      height={70}
                      className={styles.cardLogo}
                      priority
                    />
                    <div className={styles.cardContent}>
                      <div className={styles.layananTitle}>{`Booking D'MOVE | ${booking.tujuan}`}</div>
                      <div className={styles.layananSub}>{calculateDuration(booking.start_date, booking.end_date)}</div>
                      {statusInfo && (
                        <div className={`${styles.layananStatus} ${statusInfo.className}`}>
                          {statusInfo.text}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {!isLoading && !error && incomingBookings.length > 0 && (
            <div className={styles.paginationContainer}>
              <div className={styles.paginationControls}>
                <div className={styles.resultsText}>
                  Menampilkan {resultsFrom}-{resultsTo} dari {incomingBookings.length} data
                </div>
                <div>
                  <label htmlFor="perPage" style={{ marginRight: 8 }}>Items per page:</label>
                  <select
                    id="perPage"
                    className={styles.itemsPerPageDropdown}
                    value={itemsPerPage}
                    onChange={onChangeItemsPerPage}
                    aria-label="Jumlah item per halaman"
                  >
                    <option value={5}>5</option>
                    <option value={6}>6</option>
                    <option value={8}>8</option>
                    <option value={10}>10</option>
                    <option value={15}>15</option>
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
