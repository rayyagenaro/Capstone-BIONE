import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import styles from './detailsLaporan.module.css';
import { FaFilePdf, FaArrowLeft } from 'react-icons/fa';
import SidebarAdmin from '@/components/SidebarAdmin/SidebarAdmin';
import LogoutPopup from '@/components/LogoutPopup/LogoutPopup';
import PersetujuanPopup from '@/components/persetujuanpopup/persetujuanPopup';
import PenolakanPopup from '@/components/penolakanpopup/PenolakanPopup';
import KontakDriverPopup from '@/components/KontakDriverPopup/KontakDriverPopup';

// Helpers
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

const STATUS_CONFIG = {
  '1': { text: 'Pending', className: styles.statusPending, dot: styles.dotPending },
  '2': { text: 'Approved', className: styles.statusApproved, dot: styles.dotApproved },
  '3': { text: 'Rejected', className: styles.statusRejected, dot: styles.dotRejected },
  '4': { text: 'Finished', className: styles.statusFinished, dot: styles.dotFinished },
};

// fallback nopol
const getPlate = (v) =>
  v?.plate || v?.plat_nomor || v?.nopol || v?.no_polisi || String(v?.id ?? '-');

export default function DetailsLaporan() {
  const router = useRouter();
  const { id } = router.query;

  const [booking, setBooking] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showLogoutPopup, setShowLogoutPopup] = useState(false);
  const [showPopup, setShowPopup] = useState(false);

  const [showReject, setShowReject] = useState(false);
  const [rejectLoading, setRejectLoading] = useState(false);

  const [availableDrivers, setAvailableDrivers] = useState([]);
  const [availableVehicles, setAvailableVehicles] = useState([]);

  const [showKontakPopup, setShowKontakPopup] = useState(false);

  const [exporting, setExporting] = useState(false);

  // REF ke kartu detail (untuk PDF)
  const detailRef = useRef(null);

  useEffect(() => {
    if (!id) return;
    const run = async () => {
      try {
        const res = await fetch(`/api/bookingsAssigned?bookingId=${id}`);
        if (!res.ok) throw new Error("Gagal ambil penugasan");
        const data = await res.json();
        setBooking(prev => prev ? { ...prev, assigned_drivers: data.drivers, assigned_vehicles: data.vehicles } : prev);
      } catch (e) {
        console.error("fetch booking-assigned error:", e);
      }
    };
    run();
  }, [id]);

  useEffect(() => {
    const fetchDrivers = async () => {
      try {
        const res = await fetch('/api/drivers?status=available');
        if (!res.ok) throw new Error('Gagal memuat data driver');
        const data = await res.json();
        setAvailableDrivers(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Error fetching drivers:', err);
        setAvailableDrivers([]);
      }
    };
    fetchDrivers();
  }, []);

  useEffect(() => {
    if (!id) return;
    const fetchBookingDetail = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/bookings-with-vehicle?bookingId=${id}`);
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || 'Gagal memuat data booking.');
        }
        const data = await res.json();
        setBooking(data);
      } catch (err) {
        setError(err.message || 'Terjadi kesalahan');
      } finally {
        setIsLoading(false);
      }
    };
    fetchBookingDetail();
  }, [id]);

  useEffect(() => {
    if (!booking) return;
    const typeIds = (booking.vehicle_types || []).map(v => v.id).filter(Boolean);
    const qs = typeIds.length ? `&type_id=${typeIds.join(',')}` : '';
    const fetchAvailableVehicles = async () => {
      try {
        const res = await fetch(`/api/vehicles?status=available${qs}`);
        if (!res.ok) throw new Error('Gagal ambil kendaraan available');
        const data = await res.json();
        setAvailableVehicles(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error('fetchAvailableVehicles error:', e);
        setAvailableVehicles([]);
      }
    };
    fetchAvailableVehicles();
  }, [booking]);

  const handleUpdateStatus = async (newStatusId) => {
    setIsUpdating(true);
    try {
      const res = await fetch('/api/booking', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId: id, newStatusId }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Gagal mengubah status.');
      }
      alert('Status berhasil diperbarui!');
      router.push('/Admin/Persetujuan/hal-persetujuan');
    } catch (err) {
      alert(`Error: ${err.message}`);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSubmitPersetujuan = async ({ driverIds, vehicleIds, keterangan }) => {
    setIsUpdating(true);
    try {
      if ((driverIds?.length || 0) !== Number(booking.jumlah_driver)) {
        alert(`Jumlah driver yang dipilih harus tepat ${booking.jumlah_driver}.`);
        setIsUpdating(false);
        return;
      }
      if (!vehicleIds?.length) {
        alert('Pilih kendaraan dulu ya.');
        setIsUpdating(false);
        return;
      }

      const resAssign = await fetch('/api/booking?action=assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'assign',
          bookingId: Number(id),
          driverIds,
          vehicleIds,
          keterangan,
          updateStatusTo: 2,
        }),
      });

      const assignJson = await resAssign.json().catch(() => ({}));
      if (!resAssign.ok || assignJson?.error) {
        throw new Error(assignJson?.error || 'Gagal menyimpan penugasan.');
      }

      await Promise.all(
        vehicleIds.map(async (vehId) => {
          const r = await fetch('/api/updateVehiclesStatus', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ vehicleId: Number(vehId), newStatusId: 2 }),
          });
          if (!r.ok) {
            const txt = await r.text().catch(() => '');
            throw new Error(`Gagal update vehicle ${vehId}: ${txt}`);
          }
        })
      );

      await Promise.all(
        driverIds.map(async (driverId) => {
          const r = await fetch('/api/updateDriversStatus', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ driverId: Number(driverId), newStatusId: 2 }),
          });
          if (!r.ok) {
            const txt = await r.text().catch(() => '');
            throw new Error(`Gagal update driver ${driverId}: ${txt}`);
          }
        })
      );

      alert('Persetujuan berhasil diproses.');
      router.push('/Admin/Persetujuan/hal-persetujuan');
    } catch (err) {
      alert(`Error: ${err.message || err}`);
    } finally {
      setIsUpdating(false);
      setShowPopup(false);
    }
  };

  const handleSubmitPenolakan = async (reason) => {
    setRejectLoading(true);
    try {
      const res = await fetch('/api/reject-booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId: Number(id), reason }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json?.ok === false) {
        throw new Error(json?.message || 'Gagal menolak booking.');
      }
      alert('Booking berhasil ditolak.');
      setShowReject(false);
      setIsLoading(true);
      const r2 = await fetch(`/api/bookings-with-vehicle?bookingId=${id}`);
      const d2 = await r2.json();
      setBooking(d2);
      setIsLoading(false);
    } catch (err) {
      alert(`Error: ${err.message || err}`);
    } finally {
      setRejectLoading(false);
    }
  };

  // === Export PDF (khusus Finished) ===
  const handleExportPDF = async () => {
    try {
      const el = detailRef.current;
      if (!el || !booking) return;

      setExporting(true);
      // tunggu 1 frame supaya "hidden" sudah ter-render sebelum capture
      await new Promise((r) => requestAnimationFrame(r));

      const html2canvas = (await import('html2canvas')).default;
      const { jsPDF } = await import('jspdf');

      const canvas = await html2canvas(el, { scale: 2, useCORS: true, windowWidth: el.scrollWidth });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');

      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const imgW = pageW;
      const imgH = (canvas.height * imgW) / canvas.width;

      let heightLeft = imgH;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgW, imgH);
      heightLeft -= pageH;
      while (heightLeft > 0) {
        position = heightLeft - imgH;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgW, imgH);
        heightLeft -= pageH;
      }

      pdf.save(`booking-${booking.id}-finished.pdf`);
    } catch (e) {
      console.error(e);
      alert('Gagal mengekspor PDF. Detail: ' + e.message);
    } finally {
      setExporting(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('admin');
    router.push('/Login/hal-login');
  };

  // UI states
  if (isLoading) return <div className={styles.loadingState}>Memuat detail laporan...</div>;
  if (error) return <div className={styles.errorState}>Error: {error}</div>;
  if (!booking) return <div className={styles.loadingState}>Data booking tidak ditemukan.</div>;

  const statusInfo = STATUS_CONFIG[booking.status_id] || STATUS_CONFIG['1'];
  const assignedDrivers = Array.isArray(booking.assigned_drivers) ? booking.assigned_drivers : [];
  const assignedVehicles = Array.isArray(booking.assigned_vehicles) ? booking.assigned_vehicles : [];

  return (
    <div className={styles.background}>
      <SidebarAdmin onLogoutClick={() => setShowLogoutPopup(true)} />

      <main className={styles.mainContent}>
        <div className={styles.header} />

        <div className={styles.titleBox}>
          <button className={styles.backBtn} onClick={() => router.back()}>
            <FaArrowLeft style={{ marginRight: 7, fontSize: 18 }} /> Kembali
          </button>
          <div className={styles.title}>DETAIL LAPORAN BOOKING</div>
        </div>

        {/* Tambahkan ref pada card ini */}
        <div className={styles.detailCard} ref={detailRef}>
<div className={styles.topRow}>
  <div className={styles.leftTitle}>
    <div className={styles.bookingTitle}>{`Booking BI-DRIVE | ${booking.tujuan}`}</div>

    <div className={styles.headerMetaWrap}>
          {/* Kiri: grid 2 kolom (label | value) */}
          <div className={styles.headerDates}>
            <div className={styles.metaRow}>
              <span className={styles.metaLabel}>TANGGAL PENGAJUAN</span>
              <span className={styles.metaValue}>{formatDate(booking.created_at)}</span>
            </div>

            {Number(booking.status_id) === 4 && (
              <div className={styles.metaRow}>
                <span className={styles.metaLabel}>TANGGAL SELESAI</span>
                <span className={styles.metaValue}>
                  {formatDate(booking.finished_at || booking.end_date || booking.updated_at)}
                </span>
              </div>
            )}
          </div>

          {/* Kanan: badge status */}
          <span className={`${statusInfo.className} ${styles.headerStatus}`}>
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

              {Number(booking.status_id) === 3 && booking.rejection_reason && (
                <div className={styles.rejectBox}>
                  <div className={styles.rejectTitle}>Alasan Penolakan</div>
                  <div className={styles.rejectText}>{booking.rejection_reason}</div>
                </div>
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

              {Number(booking.status_id) === 4 && (
                <>
                  <div className={styles.detailLabel}>TANGGAL SELESAI</div>
                  <div className={styles.detailValue}>
                    {formatDate(booking.finished_at || booking.updated_at)}
                  </div>
                </>
              )}

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

          {[2, 4].includes(Number(booking.status_id)) && (
            <div className={styles.detailRow} style={{ marginTop: 16 }}>
              <div className={styles.detailColLeft}>
                <div className={styles.detailLabel}>DRIVER DITUGASKAN</div>
                <div className={styles.detailValue}>
                  {assignedDrivers.length ? (
                    <ul style={{ paddingLeft: 16, margin: 0 }}>
                      {assignedDrivers.map((d) => (
                        <li key={d.id}>
                          {d.name || d.driver_name || '-'}
                          {d.phone ? ` — ${d.phone}` : ''}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    'Belum ada data.'
                  )}
                </div>
              </div>

              <div className={styles.detailColRight}>
                <div className={styles.detailLabel}>KENDARAAN DITUGASKAN</div>
                <div className={styles.detailValue}>
                  {assignedVehicles.length ? (
                    <ul style={{ paddingLeft: 16, margin: 0 }}>
                      {assignedVehicles.map((v) => (
                        <li key={v.id}>
                          {getPlate(v)}
                          {v.type_name ? ` — ${v.type_name}` : ''}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    'Belum ada data.'
                  )}
                </div>
              </div>
            </div>
          )}

        {/* Tombol aksi */}
        {booking.status_id === 1 && (
          <div className={styles.actionBtnRow}>
            <button
              className={styles.btnTolak}
              onClick={() => setShowReject(true)}
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

          {booking.status_id === 2 && (
          <div className={styles.actionBtnRow}>
            <div className={styles.kirimPesanWrapper}>
              <button 
                className={styles.btnKirimPesan} 
                onClick={() => setShowKontakPopup(true)}
              >
                Kirim Pesan
              </button>
              <p className={styles.kirimPesanNote}>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" 
                    strokeWidth="1.5" stroke="currentColor" className={styles.iconInfo}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
                </svg>
                Kirim pesan otomatis kepada driver untuk konfirmasi.
              </p>
            </div>
          </div>
        )}

          {/* === TOMBOL EXPORT PDF: hanya saat Finished === */}
          {Number(booking.status_id) === 4 && (
            <div className={styles.actionBtnRow}>
              <button
                type="button"
                className={styles.btnSetujui}
                onClick={handleExportPDF}
                disabled={exporting}
                // hilang saat export & diabaikan oleh html2canvas
                style={exporting ? { visibility: 'hidden' } : undefined}
                data-html2canvas-ignore="true"
              >
                {exporting ? 'Menyiapkan PDF…' : 'Export to PDF'}
              </button>
            </div>
          )}
        </div>
      </main>

      <KontakDriverPopup
        show={showKontakPopup}
        onClose={() => setShowKontakPopup(false)}
        drivers={assignedDrivers /* atau availableDrivers */}
        booking={booking}
      />

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
        driverList={availableDrivers}
        vehicleList={availableVehicles}
      />

      <PenolakanPopup
        show={showReject}
        onClose={() => setShowReject(false)}
        onSubmit={handleSubmitPenolakan}
        loading={rejectLoading}
      />
    </div>
  );
}
