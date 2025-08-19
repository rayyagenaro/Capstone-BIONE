// /src/views/detailslaporan/detailsLaporan.js
import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import styles from './detailsLaporan.module.css';
import { FaFilePdf, FaArrowLeft } from 'react-icons/fa';
import SidebarAdmin from '@/components/SidebarAdmin/SidebarAdmin';
import LogoutPopup from '@/components/LogoutPopup/LogoutPopup';
import PersetujuanPopup from '@/components/persetujuanpopup/persetujuanPopup';
import PenolakanPopup from '@/components/penolakanpopup/PenolakanPopup';
import KontakDriverPopup from '@/components/KontakDriverPopup/KontakDriverPopup';

// ===== Helpers (formatting)
const formatDateTime = (dateString) => {
  if (!dateString) return '-';
  const d = new Date(dateString);
  if (Number.isNaN(d.valueOf())) return String(dateString); // kalau sudah string normal
  return d.toLocaleString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};
const formatDateOnly = (d) => {
  if (!d) return '-';
  const x = new Date(d);
  if (Number.isNaN(x.valueOf())) return String(d);
  return x.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
};
const formatDuration = (start, end) => {
  if (!start || !end) return '-';
  const diff = Math.ceil(Math.abs(new Date(end) - new Date(start)) / (1000 * 60 * 60 * 24));
  return `${diff || 1} Hari | ${formatDateOnly(start)} - ${formatDateOnly(end)}`;
};

// ===== Status styles (dipakai D'MOVE & header non-move)
const STATUS_CONFIG = {
  '1': { text: 'Pending',   className: styles.statusPending,  dot: styles.dotPending  },
  '2': { text: 'Approved',  className: styles.statusApproved, dot: styles.dotApproved },
  '3': { text: 'Rejected',  className: styles.statusRejected, dot: styles.dotRejected },
  '4': { text: 'Finished',  className: styles.statusFinished, dot: styles.dotFinished },
};

// Meta judul
const META = {
  dmove:  { title: 'BI-DRIVE' },
  bicare: { title: 'BI-CARE'  },
  bimeet: { title: 'BI-MEET'  },
  bimail: { title: 'BI-DOCS'  },
  bistay: { title: 'BI-STAY'  },
  bimeal: { title: 'BI-MEAL'  },
};

// fallback nopol
const getPlate = (v) => v?.plate || v?.plat_nomor || v?.nopol || v?.no_polisi || String(v?.id ?? '-');

// Map status string -> id (untuk badge di header non-D’MOVE)
function mapStatus(detail) {
  if (!detail) return null;
  let id = detail.status_id;
  const s = (detail.status || detail.status_name || '').toString().toLowerCase();
  if (!id) {
    if (s.includes('pend')) id = 1;
    else if (s.includes('appr') || s.includes('book')) id = 2;
    else if (s.includes('reject') || s.includes('decline') || s.includes('cancel')) id = 3;
    else if (s.includes('finish') || s.includes('done') || s.includes('selesai')) id = 4;
  }
  const info = STATUS_CONFIG[String(id || '1')];
  return info || null;
}

export default function DetailsLaporan() {
  const router = useRouter();
  const { id, slug: qslug } = router.query;
  const slug = String(qslug || '').toLowerCase() || 'dmove';

  // D'MOVE
  const [booking, setBooking] = useState(null);

  // Layanan lain (bicare/bimeet/bistay/bimail/bimeal)
  const [detail, setDetail] = useState(null);

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

  const detailRef = useRef(null);

  // ===== FETCH utama
  useEffect(() => {
    if (!id) return;
    (async () => {
      setIsLoading(true);
      setError(null);
      try {
        if (slug === 'dmove') {
          // === D'MOVE (punyamu) ===
          const r = await fetch(`/api/bookings-with-vehicle?bookingId=${id}`);
          if (!r.ok) throw new Error('Gagal memuat data booking');
          const d = await r.json();
          setBooking(d);

          const r2 = await fetch(`/api/bookingsAssigned?bookingId=${id}`);
          if (r2.ok) {
            const d2 = await r2.json();
            setBooking(prev => prev ? { ...prev, assigned_drivers: d2.drivers, assigned_vehicles: d2.vehicles } : prev);
          }

          const r3 = await fetch('/api/drivers?status=available');
          if (r3.ok) {
            const d3 = await r3.json();
            setAvailableDrivers(Array.isArray(d3) ? d3 : []);
          }

          const typeIds = (d?.vehicle_types || []).map(v => v.id).filter(Boolean);
          const qs = typeIds.length ? `&type_id=${typeIds.join(',')}` : '';
          const r4 = await fetch(`/api/vehicles?status=available${qs}`);
          if (r4.ok) {
            const d4 = await r4.json();
            setAvailableVehicles(Array.isArray(d4) ? d4 : []);
          }
        } else {
          // === Layanan lain (ambil semua kolom dari API serbaguna) ===
          const r = await fetch(`/api/admin/detail/${slug}?id=${id}`);
          const j = await r.json().catch(() => ({}));
          if (!r.ok) throw new Error(j?.error || 'Gagal memuat detail');
          setDetail(j.item || null);
        }
      } catch (e) {
        setError(e.message || 'Terjadi kesalahan');
      } finally {
        setIsLoading(false);
      }
    })();
  }, [id, slug]);

  // ========= Aksi D'MOVE (biarin sesuai punyamu) =========
  const handleSubmitPersetujuan = async ({ driverIds, vehicleIds, keterangan }) => {
    if (slug !== 'dmove' || !booking) return;
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
          if (!r.ok) throw new Error(`Gagal update vehicle ${vehId}`);
        })
      );
      await Promise.all(
        driverIds.map(async (driverId) => {
          const r = await fetch('/api/updateDriversStatus', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ driverId: Number(driverId), newStatusId: 2 }),
          });
          if (!r.ok) throw new Error(`Gagal update driver ${driverId}`);
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
    if (slug !== 'dmove') return;
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
      const r2 = await fetch(`/api/bookings-with-vehicle?bookingId=${id}`);
      const d2 = await r2.json();
      setBooking(d2);
    } catch (err) {
      alert(`Error: ${err.message || err}`);
    } finally {
      setRejectLoading(false);
    }
  };

  const handleExportPDF = async () => {
    try {
      const el = detailRef.current;
      if (!el) return;
      setExporting(true);
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
      pdf.save(`detail-${slug}-${id}.pdf`);
    } catch (e) {
      alert('Gagal mengekspor PDF. ' + e.message);
    } finally {
      setExporting(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('admin');
    router.push('/Login/hal-login');
  };

  // ====== UI guard
  if (isLoading) return <div className={styles.loadingState}>Memuat detail laporan...</div>;
  if (error)     return <div className={styles.errorState}>Error: {error}</div>;

  const titleService = META[slug]?.title || slug.toUpperCase();
  const nonMoveStatus = slug !== 'dmove' ? mapStatus(detail) : null;

  return (
    <div className={styles.background}>
      <SidebarAdmin onLogoutClick={() => setShowLogoutPopup(true)} />

      <main className={styles.mainContent}>
        <div className={styles.header} />

        <div className={styles.titleBox}>
          <button className={styles.backBtn} onClick={() => router.back()}>
            <FaArrowLeft style={{ marginRight: 7, fontSize: 18 }} /> Kembali
          </button>
          <div className={styles.title}>DETAIL LAPORAN • {titleService}</div>
        </div>

        {slug === 'dmove' ? (
          // ========================== D'MOVE (biarkan sesuai punyamu) ==========================
          <div className={styles.detailCard} ref={detailRef}>
            <div className={styles.topRow}>
              <div className={styles.leftTitle}>
                <div className={styles.bookingTitle}>{`Booking BI-DRIVE | ${booking?.tujuan}`}</div>
                <div className={styles.headerMetaWrap}>
                  <div className={styles.headerDates}>
                    <div className={styles.metaRow}>
                      <span className={styles.metaLabel}>TANGGAL PENGAJUAN</span>
                      <span className={styles.metaValue}>{formatDateTime(booking?.created_at)}</span>
                    </div>
                    {Number(booking?.status_id) === 4 && (
                      <div className={styles.metaRow}>
                        <span className={styles.metaLabel}>TANGGAL SELESAI</span>
                        <span className={styles.metaValue}>
                          {formatDateTime(booking?.finished_at || booking?.end_date || booking?.updated_at)}
                        </span>
                      </div>
                    )}
                  </div>
                  {(() => {
                    const info = STATUS_CONFIG[String(booking?.status_id || '1')];
                    return (
                      <span className={`${info.className} ${styles.headerStatus}`}>
                        <span className={info.dot} /> {info.text}
                      </span>
                    );
                  })()}
                </div>
              </div>
            </div>

            <div className={styles.detailRow}>
              <div className={styles.detailColLeft}>
                <div className={styles.detailLabel}>NAMA PENGAJU</div>
                <div className={styles.detailValue}>{booking?.user_name}</div>

                <div className={styles.detailLabel}>TUJUAN</div>
                <div className={styles.detailValue}>{booking?.tujuan}</div>

                <div className={styles.detailLabel}>KETERANGAN</div>
                <div className={styles.detailValue}>{booking?.keterangan || '-'}</div>

                {booking?.file_link && (
                  <>
                    <div className={styles.detailLabel}>FILE LAMPIRAN</div>
                    <div className={styles.fileBox}>
                      <FaFilePdf className={styles.fileIcon} />
                      <a href={booking.file_link} target="_blank" rel="noopener noreferrer" className={styles.fileName}>
                        Lihat Lampiran
                      </a>
                    </div>
                  </>
                )}

                {Number(booking?.status_id) === 3 && booking?.rejection_reason && (
                  <div className={styles.rejectBox}>
                    <div className={styles.rejectTitle}>Alasan Penolakan</div>
                    <div className={styles.rejectText}>{booking.rejection_reason}</div>
                  </div>
                )}
              </div>

              <div className={styles.detailColRight}>
                <div className={styles.detailLabel}>JENIS KENDARAAN</div>
                <div className={styles.detailValue}>
                  {booking?.vehicle_types?.map((v) => v.name).join(', ') || '-'}
                </div>

                <div className={styles.detailLabel}>DURASI PEMESANAN</div>
                <div className={styles.detailValue}>{formatDuration(booking?.start_date, booking?.end_date)}</div>

                {Number(booking?.status_id) === 4 && (
                  <>
                    <div className={styles.detailLabel}>TANGGAL SELESAI</div>
                    <div className={styles.detailValue}>{formatDateTime(booking?.finished_at || booking?.updated_at)}</div>
                  </>
                )}

                <div className={styles.detailLabel}>JUMLAH ORANG</div>
                <div className={styles.detailValue}>{booking?.jumlah_orang ?? '-'}</div>

                <div className={styles.detailLabel}>JUMLAH KENDARAAN</div>
                <div className={styles.detailValue}>
                  {booking?.vehicle_types?.length ? (
                    <div>
                      {booking.vehicle_types.map((v, i) => (
                        <div key={i}>{v.name}: {v.quantity}</div>
                      ))}
                    </div>
                  ) : '-'}
                </div>

                <div className={styles.detailLabel}>JUMLAH DRIVER</div>
                <div className={styles.detailValue}>{booking?.jumlah_driver ?? '-'}</div>

                <div className={styles.detailLabel}>VOLUME BARANG</div>
                <div className={styles.detailValue}>{booking?.volume_kg ? `${booking.volume_kg} Kg` : '-'}</div>

                <div className={styles.detailLabel}>No HP</div>
                <div className={styles.detailValue}>{booking?.phone}</div>
              </div>
            </div>

            {[2, 4].includes(Number(booking?.status_id)) && (
              <div className={styles.detailRow} style={{ marginTop: 16 }}>
                <div className={styles.detailColLeft}>
                  <div className={styles.detailLabel}>DRIVER DITUGASKAN</div>
                  <div className={styles.detailValue}>
                    {Array.isArray(booking?.assigned_drivers) && booking.assigned_drivers.length ? (
                      <ul style={{ paddingLeft: 16, margin: 0 }}>
                        {booking.assigned_drivers.map((d) => (
                          <li key={d.id}>
                            {d.name || d.driver_name || '-'}{d.phone ? ` — ${d.phone}` : ''}
                          </li>
                        ))}
                      </ul>
                    ) : 'Belum ada data.'}
                  </div>
                </div>
                <div className={styles.detailColRight}>
                  <div className={styles.detailLabel}>KENDARAAN DITUGASKAN</div>
                  <div className={styles.detailValue}>
                    {Array.isArray(booking?.assigned_vehicles) && booking.assigned_vehicles.length ? (
                      <ul style={{ paddingLeft: 16, margin: 0 }}>
                        {booking.assigned_vehicles.map((v) => (
                          <li key={v.id}>{getPlate(v)}{v.type_name ? ` — ${v.type_name}` : ''}</li>
                        ))}
                      </ul>
                    ) : 'Belum ada data.'}
                  </div>
                </div>
              </div>
            )}

            {booking?.status_id === 1 && (
              <div className={styles.actionBtnRow}>
                <button className={styles.btnTolak} onClick={() => setShowReject(true)} disabled={isUpdating}>
                  {isUpdating ? 'Memproses...' : 'Tolak'}
                </button>
                <button className={styles.btnSetujui} onClick={() => setShowPopup(true)} disabled={isUpdating}>
                  {isUpdating ? 'Memproses...' : 'Setujui'}
                </button>
              </div>
            )}

            {booking?.status_id === 2 && (
              <div className={styles.actionBtnRow}>
                <div className={styles.kirimPesanWrapper}>
                  <button className={styles.btnKirimPesan} onClick={() => setShowKontakPopup(true)}>
                    Kirim Pesan
                  </button>
                  <p className={styles.kirimPesanNote}>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
                         strokeWidth="1.5" stroke="currentColor" className={styles.iconInfo} fill="none">
                      <path strokeLinecap="round" strokeLinejoin="round"
                            d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
                    </svg>
                    Kirim pesan otomatis kepada driver untuk konfirmasi.
                  </p>
                </div>
              </div>
            )}

            {Number(booking?.status_id) === 4 && (
              <div className={styles.actionBtnRow}>
                <button type="button" className={styles.btnSetujui}
                        onClick={handleExportPDF} disabled={exporting}
                        style={exporting ? { visibility: 'hidden' } : undefined}
                        data-html2canvas-ignore="true">
                  {exporting ? 'Menyiapkan PDF…' : 'Export to PDF'}
                </button>
              </div>
            )}
          </div>
        ) : (
          // ========================== LAYANAN LAIN (TAMPILKAN SEMUA KOLOM) ==========================
          <div className={styles.detailCard} ref={detailRef}>
            <div className={styles.topRow}>
              <div className={styles.leftTitle}>
                <div className={styles.bookingTitle}>
                  {titleService} • Detail #{id}
                </div>
                {nonMoveStatus && (
                  <span className={`${nonMoveStatus.className} ${styles.headerStatus}`}>
                    <span className={nonMoveStatus.dot} /> {nonMoveStatus.text}
                  </span>
                )}
              </div>
            </div>

            {!detail ? (
              <div className={styles.emptyText}>Data belum tersedia.</div>
            ) : (
              <>
                {/* Grid kiri/kanan — field dibagi biar rapi */}
                <div className={styles.detailRow}>
                  <div className={styles.detailColLeft}>
                    {/* ===================== BI.CARE ===================== */}
                    {slug === 'bicare' && (
                      <>
                        <div className={styles.detailLabel}>ID</div>
                        <div className={styles.detailValue}>{detail.id}</div>

                        <div className={styles.detailLabel}>Dokter</div>
                        <div className={styles.detailValue}>
                          {detail.doctor_name || `ID ${detail.doctor_id || '-'}`}
                        </div>

                        <div className={styles.detailLabel}>Nama Pemesan</div>
                        <div className={styles.detailValue}>{detail.booker_name || '-'}</div>

                        <div className={styles.detailLabel}>NIP</div>
                        <div className={styles.detailValue}>{detail.nip || '-'}</div>

                        <div className={styles.detailLabel}>No WA</div>
                        <div className={styles.detailValue}>{detail.wa || '-'}</div>

                        <div className={styles.detailLabel}>Nama Pasien</div>
                        <div className={styles.detailValue}>{detail.patient_name || '-'}</div>

                        <div className={styles.detailLabel}>Status Pasien</div>
                        <div className={styles.detailValue}>{detail.patient_status || '-'}</div>

                        <div className={styles.detailLabel}>Jenis Kelamin</div>
                        <div className={styles.detailValue}>{detail.gender || '-'}</div>

                        <div className={styles.detailLabel}>Tanggal Lahir</div>
                        <div className={styles.detailValue}>{formatDateOnly(detail.birth_date)}</div>

                        <div className={styles.detailLabel}>Keluhan</div>
                        <div className={styles.detailValue}>{detail.complaint || '-'}</div>
                      </>
                    )}

                    {/* ===================== BI.MEET ===================== */}
                    {slug === 'bimeet' && (
                      <>
                        <div className={styles.detailLabel}>ID</div>
                        <div className={styles.detailValue}>{detail.id}</div>

                        <div className={styles.detailLabel}>Ruang</div>
                        <div className={styles.detailValue}>
                          {detail.room_name || '-'}{detail.room_floor != null ? ` (Lantai ${detail.room_floor})` : ''}
                        </div>

                        <div className={styles.detailLabel}>Unit Kerja</div>
                        <div className={styles.detailValue}>{detail.unit_kerja || '-'}</div>

                        <div className={styles.detailLabel}>Judul/Agenda</div>
                        <div className={styles.detailValue}>{detail.title || '-'}</div>

                        <div className={styles.detailLabel}>Deskripsi</div>
                        <div className={styles.detailValue}>{detail.description || '-'}</div>

                        <div className={styles.detailLabel}>PIC</div>
                        <div className={styles.detailValue}>{detail.pic_name || '-'}</div>

                        <div className={styles.detailLabel}>No Kontak</div>
                        <div className={styles.detailValue}>{detail.contact_phone || '-'}</div>
                      </>
                    )}

                    {/* ===================== BI.STAY ===================== */}
                    {slug === 'bistay' && (
                      <>
                        <div className={styles.detailLabel}>ID</div>
                        <div className={styles.detailValue}>{detail.id}</div>

                        <div className={styles.detailLabel}>Nama Pemesan</div>
                        <div className={styles.detailValue}>{detail.nama_pemesan || '-'}</div>

                        <div className={styles.detailLabel}>NIP</div>
                        <div className={styles.detailValue}>{detail.nip || '-'}</div>

                        <div className={styles.detailLabel}>No WA</div>
                        <div className={styles.detailValue}>{detail.no_wa || '-'}</div>

                        <div className={styles.detailLabel}>Status Pegawai (ID)</div>
                        <div className={styles.detailValue}>{detail.status_pegawai_id ?? '-'}</div>

                        <div className={styles.detailLabel}>Asal KPw</div>
                        <div className={styles.detailValue}>{detail.asal_kpw || '-'}</div>

                        <div className={styles.detailLabel}>Keterangan</div>
                        <div className={styles.detailValue}>{detail.keterangan || '-'}</div>
                      </>
                    )}

                    {/* ===================== BI.MAIL (LEFT) ===================== */}
                    {slug === 'bimail' && (
                      <>
                        <div className={styles.detailLabel}>ID</div>
                        <div className={styles.detailValue}>{detail.id}</div>

                        <div className={styles.detailLabel}>Nomor Surat</div>
                        <div className={styles.detailValue}>{detail.mail_number || detail.no_surat || '-'}</div>

                        <div className={styles.detailLabel}>Jenis</div>
                        <div className={styles.detailValue}>
                          {/* pakai nama yang ada di payload kamu; fallback ke jenis_id */}
                          {detail.jenis ?? detail.jenis_id ?? '-'}
                        </div>

                        <div className={styles.detailLabel}>Tipe Dokumen</div>
                        <div className={styles.detailValue}>
                          {/* tampilkan kode apa adanya (A/B/…) atau alias mail_type */}
                          {detail.mail_type || detail.tipe_dokumen || '-'}
                        </div>

                        <div className={styles.detailLabel}>Unit Kode</div>
                        <div className={styles.detailValue}>{detail.unit_code ?? detail.unit_kode ?? '-'}</div>

                        <div className={styles.detailLabel}>Wilayah Kode</div>
                        <div className={styles.detailValue}>{detail.wilayah_code ?? detail.wilayah_kode ?? '-'}</div>

                        <div className={styles.detailLabel}>Pengirim</div>
                        <div className={styles.detailValue}>
                          {detail.from_name || detail.sender_name || detail.sender_email || '-'}
                        </div>

                        <div className={styles.detailLabel}>Penerima</div>
                        <div className={styles.detailValue}>
                          {detail.to_name || detail.recipient_name || detail.recipient_email || '-'}
                        </div>

                        <div className={styles.detailLabel}>Perihal</div>
                        <div className={styles.detailValue}>{detail.subject || detail.perihal || '-'}</div>
                      </>
                    )}

                    {/* ===================== BI.MEAL (LEFT) ===================== */}
                    
                    {slug === 'bimeal' && (
                      <>
                        <div className={styles.detailLabel}>ID</div>
                        <div className={styles.detailValue}>{detail.id}</div>

                        <div className={styles.detailLabel}>Nama PIC</div>
                        <div className={styles.detailValue}>{detail.nama_pic || '-'}</div>

                        <div className={styles.detailLabel}>NIP PIC</div>
                        <div className={styles.detailValue}>{detail.nip_pic || '-'}</div>

                        <div className={styles.detailLabel}>No. WA PIC</div>
                        <div className={styles.detailValue}>{detail.no_wa_pic || '-'}</div>

                        <div className={styles.detailLabel}>Unit Kerja</div>
                        <div className={styles.detailValue}>{detail.unit_kerja || '-'}</div>
                      </>
                    )}
                  </div>

                  <div className={styles.detailColRight}>
                    {/* ===================== BI.CARE ===================== */}
                    {slug === 'bicare' && (
                      <>
                        <div className={styles.detailLabel}>Tanggal Booking</div>
                        <div className={styles.detailValue}>
                          {formatDateOnly(detail.booking_date)} • {String(detail.slot_time || '').slice(0,5)}
                        </div>

                        <div className={styles.detailLabel}>Status</div>
                        <div className={styles.detailValue}>{detail.status || '-'}</div>

                        <div className={styles.detailLabel}>Created At</div>
                        <div className={styles.detailValue}>{formatDateTime(detail.created_at)}</div>
                      </>
                    )}

                    {/* ===================== BI.MEET ===================== */}
                    {slug === 'bimeet' && (
                      <>
                        <div className={styles.detailLabel}>Waktu</div>
                        <div className={styles.detailValue}>
                          {formatDateTime(detail.start_datetime)} → {formatDateTime(detail.end_datetime)}
                        </div>

                        <div className={styles.detailLabel}>Peserta</div>
                        <div className={styles.detailValue}>{detail.participants ?? '-'}</div>

                        <div className={styles.detailLabel}>Status ID</div>
                        <div className={styles.detailValue}>{detail.status_id ?? '-'}</div>

                        {detail.reject_reason && (
                          <>
                            <div className={styles.detailLabel}>Alasan Penolakan</div>
                            <div className={styles.detailValue}>{detail.reject_reason}</div>
                          </>
                        )}

                        <div className={styles.detailLabel}>Created At</div>
                        <div className={styles.detailValue}>{formatDateTime(detail.created_at)}</div>

                        <div className={styles.detailLabel}>Updated At</div>
                        <div className={styles.detailValue}>{formatDateTime(detail.updated_at)}</div>
                      </>
                    )}

                    {/* ===================== BI.STAY ===================== */}
                    {slug === 'bistay' && (
                      <>
                        <div className={styles.detailLabel}>Jadwal</div>
                        <div className={styles.detailValue}>
                          {formatDateTime(detail.check_in)} → {formatDateTime(detail.check_out)}
                        </div>

                        <div className={styles.detailLabel}>Created At</div>
                        <div className={styles.detailValue}>{formatDateTime(detail.created_at)}</div>

                        <div className={styles.detailLabel}>Updated At</div>
                        <div className={styles.detailValue}>{formatDateTime(detail.updated_at)}</div>
                      </>
                    )}

                    {/* ===================== BI.MAIL (RIGHT) ===================== */}
                    {slug === 'bimail' && (
                      <>
                        <div className={styles.detailLabel}>Tanggal Surat</div>
                        <div className={styles.detailValue}>
                          {detail.mail_date ? formatDateOnly(detail.mail_date)
                            : detail.sent_at ? formatDateTime(detail.sent_at)
                            : '-'}
                        </div>

                        <div className={styles.detailLabel}>Link Dokumen (SharePoint)</div>
                        <div className={styles.detailValue}>
                          {Array.isArray(detail.attachments) && detail.attachments.length ? (
                            <ul style={{ margin: 0, paddingLeft: 16 }}>
                              {detail.attachments.map((att, i) => (
                                <li key={i}>
                                  {att?.url ? (
                                    <a
                                      href={att.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      style={{ color: '#2563eb', textDecoration: 'underline', fontWeight: 500 }}
                                      title={att.url}
                                    >
                                      {att.name || 'Buka di SharePoint'}
                                    </a>
                                  ) : (
                                    (att?.name || '-') 
                                  )}
                                </li>
                              ))}
                            </ul>
                          ) : detail.link_dokumen ? (
                            <a
                              href={detail.link_dokumen}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ color: '#2563eb', textDecoration: 'underline', fontWeight: 500 }}
                              title={detail.link_dokumen}
                            >
                              Buka di SharePoint
                            </a>
                          ) : ('-')}

                        </div>

                        <div className={styles.detailLabel}>Created At</div>
                        <div className={styles.detailValue}>
                          {detail.created_at ? formatDateTime(detail.created_at) : '-'}
                        </div>
                      </>
                    )}
                    {/* ===================== BI.MEAL (RIGHT) ===================== */}
                    {slug === 'bimeal' && (
                      <>
                        <div className={styles.detailLabel}>Waktu Pesanan</div>
                        <div className={styles.detailValue}>
                          {formatDateTime(detail.waktu_pesanan)}
                        </div>

                        <div className={styles.detailLabel}>Status</div>
                        <div className={styles.detailValue}>
                          {detail.status_name || (detail.status_id === 1 ? 'Pending' : detail.status_id ?? '-')}
                        </div>
                      </>
                    )}
                    {/* ===================== BI.MEAL (ITEMS LIST) ===================== */}
                    {slug === 'bimeal' && (
                      <div className={styles.detailRow}>
                        <div className={styles.detailColLeft}>
                          <div className={styles.detailLabel}>Pesanan</div>
                          <div className={styles.detailValue}>
                            {Array.isArray(detail.items) && detail.items.length ? (
                              <ul style={{ margin: 0}}>
                                {detail.items.map((it) => (
                                  <li key={it.id}>
                                    {it.nama_pesanan} ({it.jumlah})
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              '-' 
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </main>

      {/* Popups (dipakai D’MOVE) */}
      <KontakDriverPopup
        show={showKontakPopup}
        onClose={() => setShowKontakPopup(false)}
        drivers={booking?.assigned_drivers || []}
        booking={booking || {}}
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
        detail={booking || {}}
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
