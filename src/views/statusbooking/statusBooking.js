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

// --- KONFIGURASI & HELPER (STATUS) ---
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

// --- KONFIGURASI & HELPER (FITUR/LAYANAN) ---
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
// Sesuaikan setelah kamu kirim struktur/ID resminya.
const SERVICE_ID_TO_KEY = {
  // 1: 'bidrive',
  // 2: 'bicare',
  // 3: 'bimeal',
  // 4: 'bimeet',
  // 5: 'bidocs',
  // 6: 'bistay',
};

const norm = (s) => String(s || '').trim().toLowerCase();

// coba deteksi key fitur dari berbagai kemungkinan field di objek booking
function resolveFeatureKey(booking) {
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

// === Helper API opsional untuk set AVAILABLE ===
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

// --- SUB-KOMPONEN ---
const BookingCard = React.memo(({ booking, onClick }) => {
  const statusInfo =
    STATUS_CONFIG[booking.status_id] || { text: 'Unknown', className: styles.statusProcess };
  const isRejected = Number(booking.status_id) === 3 && !!booking.rejection_reason;
  const featureLabel = featureLabelOf(booking);

  return (
    <div
      className={styles.bookingCard}
      onClick={onClick}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}
      role="button"
      tabIndex={0}
    >
      <Image src={"/assets/D'MOVE.svg"} alt="logo" width={70} height={70} className={styles.cardLogo} />
      <div className={styles.cardDetail}>
        <div className={styles.cardTitle}>
          {featureLabel ? `[${featureLabel}] ` : ''}Booking | {booking.tujuan || 'Tanpa Tujuan'}
        </div>
        <div className={styles.cardSub}>
          {`${formatDate(booking.start_date)} - ${formatDate(booking.end_date)}`}
        </div>

        {booking.vehicle_types?.length > 0 && (
          <div className={styles.cardVehicles}>
            {booking.vehicle_types.map((vt) => vt.name).join(', ')}
          </div>
        )}

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

// ===== TAB STATUS (tetap pakai tab) =====
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

// ===== DROPDOWN FITUR =====
const FeatureDropdown = React.memo(({ value, onChange }) => (
  <div className={styles.filterRow}>
    <label htmlFor="featureFilter" className={styles.label} style={{ marginRight: 8 }}>
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

  const assignedDrivers = Array.isArray(booking.assigned_drivers) ? booking.assigned_drivers : [];
  const assignedVehicles = Array.isArray(booking.assigned_vehicles) ? booking.assigned_vehicles : [];
  const featureLabel = featureLabelOf(booking);

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
              <a href={booking.file_link} target="_blank" rel="noopener noreferrer">Lihat Lampiran</a>
            </p>
          )}

          {isApprovedOrFinished && (
            <>
              <hr className={styles.modalDivider} />
              <div className={styles.assignedBlock}>
                <p><strong>Driver Ditugaskan:</strong></p>
                {assignedDrivers.length ? (
                  <ul className={styles.assignedList}>
                    {assignedDrivers.map((d) => (
                      <li key={d.id}>{d.name}{d.phone ? ` — ${d.phone}` : ''}</li>
                    ))}
                  </ul>
                ) : (
                  <p className={styles.assignedEmpty}>Belum ada data driver.</p>
                )}
              </div>

              <div className={styles.assignedBlock}>
                <p><strong>Kendaraan Ditugaskan:</strong></p>
                {assignedVehicles.length ? (
                  <ul className={styles.assignedList}>
                    {assignedVehicles.map((v) => (
                      <li key={v.id}>{getPlate(v)}{v.type_name ? ` — ${v.type_name}` : ''}</li>
                    ))}
                  </ul>
                ) : (
                  <p className={styles.assignedEmpty}>Belum ada data kendaraan.</p>
                )}
              </div>
            </>
          )}

          {Number(booking.status_id) === 2 && (
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

// --- KOMPONEN UTAMA ---
export default function StatusBooking() {
  const router = useRouter();
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

  // Load user, seenCounts, dan data booking
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

        const uid = meData.payload.sub;
        setUserId(uid);

        try {
          const raw = localStorage.getItem(seenStorageKey(uid));
          setSeenCounts(raw ? { ...DEFAULT_SEEN, ...JSON.parse(raw) } : DEFAULT_SEEN);
        } catch { setSeenCounts(DEFAULT_SEEN); }

        const res = await fetch(`/api/booking?userId=${uid}`);
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
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

  const handleCardClick = useCallback(async (booking) => {
    try {
      setSelectedBooking(booking);
      const res = await fetch(`/api/bookings-with-vehicle?bookingId=${booking.id}`);
      if (!res.ok) throw new Error('Gagal memuat detail booking.');
      const full = await res.json();
      setSelectedBooking(full);
    } catch (e) {
      console.error('fetch detail error:', e);
    }
  }, []);

  const closeModal = useCallback(() => setSelectedBooking(null), []);

  // Finish Booking → ubah status + bebaskan resource
  const markAsFinished = useCallback(async (booking) => {
    try {
      setFinishing(true);

      let fullBooking = selectedBooking && selectedBooking.id === booking.id ? selectedBooking : null;
      if (!fullBooking?.assigned_drivers || !fullBooking?.assigned_vehicles) {
        try {
          const r = await fetch(`/api/bookings-with-vehicle?bookingId=${booking.id}`);
          if (r.ok) fullBooking = await r.json();
        } catch {}
      }
      const driverIds = (fullBooking?.assigned_drivers || []).map(d => d.id);
      const vehicleIds = (fullBooking?.assigned_vehicles || []).map(v => v.id);

      // update status → 4
      {
        const res = await fetch('/api/booking', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bookingId: booking.id, newStatusId: 4 }),
        });
        if (!res.ok) {
          const e = await res.json().catch(() => ({}));
          throw new Error(e.error || 'Gagal mengubah status menjadi Finished.');
        }
      }

      await setDriversAvailable(driverIds, 1);
      await setVehiclesAvailable(vehicleIds, 1);

      setAllBookings(prev => prev.map(b => (b.id === booking.id ? { ...b, status_id: 4 } : b)));
      try {
        const r2 = await fetch(`/api/bookings-with-vehicle?bookingId=${booking.id}`);
        const full = await r2.json().catch(() => null);
        setSelectedBooking(full || { ...booking, status_id: 4 });
      } catch {
        setSelectedBooking(prev => (prev ? { ...prev, status_id: 4 } : prev));
      }

      setActiveTab('Finished');
      markTabSeen('Finished');
    } catch (e) {
      alert(e.message);
    } finally {
      setFinishing(false);
    }
  }, [selectedBooking]);

  // === Hitung jumlah per status (total saat ini) ===
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

  // === Hitung JUMLAH BARU (untuk badge) = current - lastSeen, minimal 0 ===
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

  // === FILTER & PAGINATION ===
  // 1) filter status
  const statusFiltered = useMemo(() => {
    if (activeTab === 'All') return allBookings;
    const statusId = TAB_TO_STATUS_ID[activeTab];
    return allBookings.filter((item) => item.status_id === statusId);
  }, [activeTab, allBookings]);

  // 2) filter fitur via dropdown
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
