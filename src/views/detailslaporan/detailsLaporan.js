import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/router';
import styles from './detailsLaporan.module.css';
import {
  FaHome,
  FaClipboardList,
  FaCog,
  FaSignOutAlt,
  FaFilePdf,
  FaArrowLeft,
  FaUsers,
} from 'react-icons/fa';
import SidebarAdmin from '@/components/SidebarAdmin/SidebarAdmin';
import LogoutPopup from '@/components/LogoutPopup/LogoutPopup';
import PersetujuanPopup from '@/components/persetujuanpopup/persetujuanPopup';

// --- Helper Functions ---
const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatDuration = (start, end) => {
  if (!start || !end) return 'N/A';
  const startDate = new Date(start);
  const endDate = new Date(end);
  const diffTime = Math.abs(endDate - startDate);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return `${diffDays} Hari | ${startDate.toLocaleDateString('id-ID')} - ${endDate.toLocaleDateString('id-ID')}`;
};

// --- Konfigurasi Status ---
const STATUS_CONFIG = {
  '1': { text: 'Pending', className: styles.statusPending, dot: styles.dotPending },
  '2': { text: 'Approved', className: styles.statusApproved, dot: styles.dotApproved },
  '3': { text: 'Rejected', className: styles.statusRejected, dot: styles.dotRejected },
};

export default function DetailsLaporan() {
  const router = useRouter();
  const { id } = router.query;

  const handleLogout = () => {
    localStorage.removeItem('admin');
    router.push('/Login/hal-login');
  };

  // --- State Management ---
  const [booking, setBooking] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showLogoutPopup, setShowLogoutPopup] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  const [driversFromDB, setDriversFromDB] = useState([]);

  // Ambil data driver untuk pilihan di popup
  useEffect(() => {
    const fetchDrivers = async () => {
      try {
        const res = await fetch('/api/getDrivers'); // Pastikan endpoint ini ada
        if (!res.ok) throw new Error('Gagal memuat data driver');
        const data = await res.json();
        setDriversFromDB(data);
      } catch (err) {
        console.error('Error fetching drivers:', err);
      }
    };
    fetchDrivers();
  }, []);

  // Ambil data booking detail
  useEffect(() => {
    if (!id) return;
    const fetchBookingDetail = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/bookings-with-vehicle?bookingId=${id}`);
        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || `Gagal memuat data booking.`);
        }
        const data = await res.json();
        setBooking(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    fetchBookingDetail();
  }, [id]);

  // Update status: tolak / setujui (tanpa popup)
  const handleUpdateStatus = async (newStatusId) => {
    setIsUpdating(true);
    try {
      const res = await fetch('/api/booking', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId: id, newStatusId }),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Gagal mengubah status.');
      }
      alert('Status berhasil diperbarui!');
      router.push('/Persetujuan/hal-persetujuan');
    } catch (err) {
      alert(`Error: ${err.message}`);
    } finally {
      setIsUpdating(false);
    }
  };

  // Submit dari popup persetujuan
  const handleSubmitPersetujuan = async ({ driverIds, vehicleTypeIds, keterangan }) => {
    setIsUpdating(true);
    try {
      // Validasi jumlah driver sesuai booking
      if ((driverIds?.length || 0) !== Number(booking.jumlah_driver)) {
        alert(`Jumlah driver yang dipilih harus tepat ${booking.jumlah_driver}.`);
        setIsUpdating(false);
        return;
      }

      // 1) Update status booking -> Approved (2)
      {
        const res = await fetch('/api/booking', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bookingId: id, newStatusId: 2 }),
        });
        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || 'Gagal mengubah status booking.');
        }
      }

      // 2) Update status kendaraan -> Unavailable (2)
      const vehiclesToUpdate =
        Array.isArray(vehicleTypeIds) && vehicleTypeIds.length > 0
          ? vehicleTypeIds
          : (booking.vehicle_types || []).map((v) => v.id);

      for (const vehicleTypeId of vehiclesToUpdate) {
        await fetch('/api/updateVehiclesStatus', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ vehicleTypeId, newStatusId: 2 }),
        });
      }

      // 3) Update status driver -> Digunakan (2)
      for (const driverId of driverIds) {
        await fetch('/api/updateDriversStatus', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ driverId, newStatusId: 2 }),
        });
      }

      alert('Persetujuan berhasil diproses.');
      router.push('/Persetujuan/hal-persetujuan');
    } catch (err) {
      alert(`Error: ${err.message}`);
    } finally {
      setIsUpdating(false);
      setShowPopup(false);
    }
  };

  // UI states
  if (isLoading) return <div className={styles.loadingState}>Memuat detail laporan...</div>;
  if (error) return <div className={styles.errorState}>Error: {error}</div>;
  if (!booking) return <div className={styles.loadingState}>Data booking tidak ditemukan.</div>;

  const statusInfo = STATUS_CONFIG[booking.status_id] || STATUS_CONFIG['1'];

  return (
    <div className={styles.background}>
      <SidebarAdmin onLogoutClick={() => setShowLogoutPopup(true)} />

      <main className={styles.mainContent}>
        <div className={styles.header}>{/* ... header ... */}</div>

        <div className={styles.titleBox}>
          <button className={styles.backBtn} onClick={() => router.back()}>
            <FaArrowLeft style={{ marginRight: 7, fontSize: 18 }} /> Kembali
          </button>
          <div className={styles.title}>DETAIL LAPORAN BOOKING</div>
        </div>

        <div className={styles.detailCard}>
          <div className={styles.topRow}>
            <div className={styles.leftTitle}>
              <div className={styles.bookingTitle}>{`Booking D'MOVE | ${booking.tujuan}`}</div>
              <div className={styles.metaInfo}>
                <span className={styles.metaLabel}>TANGGAL PENGAJUAN</span>
                <span className={styles.metaValue}>{formatDate(booking.created_at)}</span>
                <span className={statusInfo.className}>
                  <span className={statusInfo.dot} /> {statusInfo.text}
                </span>
              </div>
            </div>
          </div>

          <div className={styles.detailRow}>
            <div className={styles.detailColLeft}>
              <div className={styles.detailLabel}>NAMA PENGAJU</div>
              <div className={styles.detailValue}>{booking.user_name}</div>

              <div className={styles.detailLabel}>TUJUAN</div>
              <div className={styles.detailValue}>{booking.tujuan}</div>

              <div className={styles.detailLabel}>KETERANGAN</div>
              <div className={styles.detailValue}>{booking.keterangan || '-'}</div>

              {booking.file_link && (
                <>
                  <div className={styles.detailLabel}>FILE LAMPIRAN</div>
                  <div className={styles.fileBox}>
                    <FaFilePdf className={styles.fileIcon} />
                    <a
                      href={booking.file_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.fileName}
                    >
                      Lihat Lampiran
                    </a>
                  </div>
                </>
              )}
            </div>

            <div className={styles.detailColRight}>
              <div className={styles.detailLabel}>JENIS KENDARAAN</div>
              <div className={styles.detailValue}>
                {booking.vehicle_types?.map((v) => v.name).join(', ') || '-'}
              </div>

              <div className={styles.detailLabel}>DURASI PEMESANAN</div>
              <div className={styles.detailValue}>
                {formatDuration(booking.start_date, booking.end_date)}
              </div>

              <div className={styles.detailLabel}>JUMLAH ORANG</div>
              <div className={styles.detailValue}>{booking.jumlah_orang || 'N/A'}</div>

              <div className={styles.detailLabel}>JUMLAH KENDARAAN</div>
              <div className={styles.detailValue}>
                {booking.vehicle_types && booking.vehicle_types.length > 0 ? (
                  <div>
                    {booking.vehicle_types.map((v, index) => (
                      <div key={index}>
                        {v.name}: {v.quantity}
                      </div>
                    ))}
                  </div>
                ) : (
                  'N/A'
                )}
              </div>

              {/* Tampilkan jumlah driver */}
              <div className={styles.detailLabel}>JUMLAH DRIVER</div>
              <div className={styles.detailValue}>{booking.jumlah_driver ?? 'N/A'}</div>

              <div className={styles.detailLabel}>VOLUME BARANG</div>
              <div className={styles.detailValue}>
                {booking.volume_kg ? `${booking.volume_kg} Kg` : 'N/A'}
              </div>

              <div className={styles.detailLabel}>No HP</div>
              <div className={styles.detailValue}>{booking.phone}</div>
            </div>
          </div>

          {/* Tombol hanya untuk Pending */}
          {booking.status_id === 1 && (
            <div className={styles.actionBtnRow}>
              <button
                className={styles.btnTolak}
                onClick={() => handleUpdateStatus(3)}
                disabled={isUpdating}
              >
                {isUpdating ? 'Memproses...' : 'Tolak'}
              </button>

              <button
                className={styles.btnSetujui}
                onClick={() => setShowPopup(true)}
                disabled={isUpdating}
              >
                {isUpdating ? 'Memproses...' : 'Setujui'}
              </button>
            </div>
          )}
        </div>
      </main>

      <LogoutPopup
        open={showLogoutPopup}
        onCancel={() => setShowLogoutPopup(false)}
        onLogout={handleLogout}
      />

      <PersetujuanPopup
        show={showPopup}
        onClose={() => setShowPopup(false)}
        onSubmit={handleSubmitPersetujuan}
        detail={booking}
        driverList={driversFromDB}
        vehicleList={booking.vehicle_types}
      />
    </div>
  );
}
