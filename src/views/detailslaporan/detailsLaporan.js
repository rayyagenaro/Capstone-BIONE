// /src/views/detailslaporan/detailsLaporan.js
import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import styles from './detailsLaporan.module.css';
import { FaFilePdf, FaArrowLeft } from 'react-icons/fa';
import SidebarAdmin from '@/components/SidebarAdmin/SidebarAdmin';
import LogoutPopup from '@/components/LogoutPopup/LogoutPopup';
import PersetujuanPopup from '@/components/persetujuanpopup/persetujuanPopup';
import RejectReasonPopup from '@/components/RejectReasonPopup/RejectReasonPopup';
import RejectVerificationPopup from '@/components/rejectVerification/RejectVerification';
import KontakDriverPopup from '@/components/KontakDriverPopup/KontakDriverPopup';
import PopupAdmin from '@/components/PopupAdmin/PopupAdmin';

const ALLOWED_SLUGS = ['dmove', 'bicare', 'bimeet', 'bimail', 'bistay', 'bimeal'];

// ===== NS helpers =====
const NS_RE = /^[A-Za-z0-9_-]{3,32}$/;
const withNs = (url, ns) => (ns ? `${url}${url.includes('?') ? '&' : '?'}ns=${encodeURIComponent(ns)}` : url);


// ===== Helpers (formatting) =====
const formatDateTime = (dateString) => {
  if (!dateString) return '-';
  const d = new Date(dateString);
  if (Number.isNaN(d.valueOf())) return String(dateString);
  return d.toLocaleString('id-ID', {
    day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
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

const toWaNumber = (val) => {
  if (!val) return '';
  let p = String(val).trim().replace(/[^\d]/g, '');
  if (!p) return '';
  if (p.startsWith('62')) return p.replace(/^620+/, '62');
  if (p.startsWith('0'))  return '62' + p.slice(1);
  if (p.startsWith('8'))  return '62' + p;
  return p;
};

// ===== Status styles =====
const STATUS_CONFIG = {
  '1': { text: 'Pending',   className: styles.statusPending,  dot: styles.dotPending  },
  '2': { text: 'Approved',  className: styles.statusApproved, dot: styles.dotApproved },
  '3': { text: 'Rejected',  className: styles.statusRejected, dot: styles.dotRejected },
  '4': { text: 'Finished',  className: styles.statusFinished, dot: styles.dotFinished },
};

// ===== Meta judul =====
const META = {
  dmove:  { title: 'BI-DRIVE' },
  bicare: { title: 'BI-CARE'  },
  bimeet: { title: 'BI-MEET'  },
  bimail: { title: 'BI-DOCS'  },
  bistay: { title: 'BI-STAY'  },
  bimeal: { title: 'BI-MEAL'  },
};

// ===== Util =====
const getPlate = (v) => v?.plate || v?.plat_nomor || v?.nopol || v?.no_polisi || String(v?.id ?? '-');

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

const isPendingGeneric = (slug, d) => {
  if (!d) return false;
  const s = String(slug || '').toLowerCase();

  const numish = (v) => {
    const n = Number(v);
    return Number.isNaN(n) ? null : n;
  };
  const byText = () => {
    const txt =
      [d.status, d.status_name, d.approval_status, d.booking_status, d.state]
        .map((v) => String(v ?? '').toLowerCase())
        .find((t) => t);
    return !!(
      txt &&
      (txt.includes('pend') ||
        txt.includes('menunggu') ||
        txt.includes('await') ||
        txt.includes('diajukan') ||
        txt.includes('submit'))
    );
  };

  if (s === 'bimeal') {
    const n = numish(d.status_id);
    return n === 1 || n === 0;
  }
  if (s === 'bimeet') {
    if (d.status_id == null) return true;
    const n = numish(d.status_id);
    return n === 1 || n === 0;
  }
  if (s === 'bistay') {
    const n = numish(d.status_id ?? d.booking_status_id ?? d.state);
    if (n != null) return n === 1 || n === 0;
    return byText();
  }
  const n = numish(d.status_id ?? d.booking_status_id ?? d.state);
  if (n != null) return n === 1 || n === 0;
  return byText();
};

// ===== Penerima WA per fitur =====
const pickPersonForWA = (slug, booking, detail) => {
  switch (slug) {
    case 'dmove':  return { name: booking?.user_name,  phone: booking?.phone };
    case 'bicare': return { name: detail?.booker_name || detail?.patient_name, phone: detail?.wa };
    case 'bimeet': return { name: detail?.pic_name,    phone: detail?.contact_phone };
    case 'bistay': return { name: detail?.nama_pemesan, phone: detail?.no_wa };
    case 'bimeal': return { name: detail?.nama_pic,     phone: detail?.no_wa_pic };
    default:       return { name: '', phone: '' };
  }
};

// ===== Builder pesan WA default =====
const buildRejectPreview = (slug, person, reason, id) => {
  const service = META[slug]?.title || slug.toUpperCase();
  return `Halo ${person?.name || ''},

Pengajuan ${service} Anda *DITOLAK* ❌

Alasan:
${reason}

Silakan lakukan perbaikan/pengajuan ulang. Terima kasih.`;
};

// ============================== COMPONENT ==============================
export default function DetailsLaporan() {
  const router = useRouter();
  const { id, slug: qslug } = router.query || {};
  const nsFromQuery = typeof router.query?.ns === 'string' ? router.query.ns : '';
  const nsFromAsPath = (() => {
    const q = (router.asPath || '').split('?')[1];
    if (!q) return '';
    const p = new URLSearchParams(q);
    const v = p.get('ns') || '';
    return NS_RE.test(v) ? v : '';
  })();
  const ns = NS_RE.test(nsFromQuery) ? nsFromQuery : nsFromAsPath;
  const raw = (typeof qslug === 'string' ? qslug : '').toLowerCase();
  const slug = ALLOWED_SLUGS.includes(raw) ? raw : 'dmove';

  // D'MOVE
  const [booking, setBooking] = useState(null);
  // Layanan lain
  const [detail, setDetail] = useState(null);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isUpdatingGeneric, setIsUpdatingGeneric] = useState(false);

  const [showLogoutPopup, setShowLogoutPopup] = useState(false);
  const [showPopup, setShowPopup] = useState(false);

  const [availableDrivers, setAvailableDrivers] = useState([]);
  const [availableVehicles, setAvailableVehicles] = useState([]);

  const [showKontakPopup, setShowKontakPopup] = useState(false);
  const [exporting, setExporting] = useState(false);

  const detailRef = useRef(null);

  // 🔴 POPUP REJECT BARU (2 langkah)
  const [showRejectReason, setShowRejectReason] = useState(false);
  const [showRejectSend, setShowRejectSend] = useState(false);
  const [pendingRejectReason, setPendingRejectReason] = useState('');
  const [rejectLoading, setRejectLoading] = useState(false);

  // ✅ Notifikasi (PopupAdmin) — pengganti alert()
  const [showNotif, setShowNotif] = useState(false);
  const [notif, setNotif] = useState({ message: '', type: 'success' });
  const openNotif = (message, type = 'success') => {
    setNotif({ message, type });
    setShowNotif(true);
  };

  // ===== FETCH utama
  useEffect(() => {
    if (!router.isReady || !id) return;
    (async () => {
      setIsLoading(true);
      setError(null);
      try {
        if (slug === 'dmove') {
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
  }, [router.isReady, id, slug]);

  // ========= Aksi BI-DRIVE =========
  const handleSubmitPersetujuan = async ({ driverIds, vehicleIds, keterangan }) => {
    if (slug !== 'dmove' || !booking) return;
    setIsUpdating(true);
    try {
      if ((driverIds?.length || 0) !== Number(booking.jumlah_driver)) {
        openNotif(`Jumlah driver yang dipilih harus tepat ${booking.jumlah_driver}.`, 'error');
        setIsUpdating(false);
        return;
      }
      if (!vehicleIds?.length) {
        openNotif('Pilih kendaraan dulu ya.', 'error');
        setIsUpdating(false);
        return;
      }
      const resAssign = await fetch('/api/booking?action=assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'assign', bookingId: Number(id), driverIds, vehicleIds, keterangan, updateStatusTo: 2 }),
      });
      const assignJson = await resAssign.json().catch(() => ({}));
      if (!resAssign.ok || assignJson?.error) throw new Error(assignJson?.error || 'Gagal menyimpan penugasan.');
      await Promise.all(
        vehicleIds.map(async (vehId) => {
          const r = await fetch('/api/updateVehiclesStatus', {
            method: 'PUT', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ vehicleId: Number(vehId), newStatusId: 2 }),
          });
          if (!r.ok) throw new Error(`Gagal update vehicle ${vehId}`);
        })
      );
      await Promise.all(
        driverIds.map(async (driverId) => {
          const r = await fetch('/api/updateDriversStatus', {
            method: 'PUT', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ driverId: Number(driverId), newStatusId: 2 }),
          });
          if (!r.ok) throw new Error(`Gagal update driver ${driverId}`);
        })
      );
      openNotif('Persetujuan berhasil diproses.', 'success');
      setTimeout(() => {
        router.push(`/Admin/HalamanUtama/hal-utamaAdmin?ns=${encodeURIComponent(ns)}`);
      }, 1200);

    } catch (err) {
      openNotif(`Error: ${err.message || err}`, 'error');
    } finally {
      setIsUpdating(false);
      setShowPopup(false);
    }
  };

  // ========= REJECT (2 langkah) =========
  const handleRejectStep1Done = (reasonText) => {
    setPendingRejectReason(reasonText);
    setShowRejectReason(false);
    setShowRejectSend(true);
  };

  const handleRejectStep2Submit = async (reasonText, openWhatsApp, messageText) => {
    const reason = (reasonText || '').trim();
    if (!reason) { openNotif('Alasan kosong.', 'error'); return; }

    setRejectLoading(true);
    try {
      const res = await fetch(`/api/admin/reject/${slug}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: Number(id), reason })
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || j?.error) throw new Error(j?.error || 'Gagal menolak.');

      if (slug === 'dmove') {
        const r = await fetch(`/api/bookings-with-vehicle?bookingId=${id}`);
        setBooking(await r.json());
      } else {
        const r = await fetch(`/api/admin/detail/${slug}?id=${id}`);
        const d = await r.json(); setDetail(d.item || null);
      }

      if (openWhatsApp) {
        const person = pickPersonForWA(slug, booking, detail);
        const target = toWaNumber(person?.phone);
        const msg = (messageText || buildRejectPreview(slug, person, reason, id)).trim();
        if (target) window.open(`https://wa.me/${target}?text=${encodeURIComponent(msg)}`, '_blank');
      }

      openNotif('Permohonan berhasil ditolak.', 'success');
      setTimeout(() => {
        router.push(`/Admin/HalamanUtama/hal-utamaAdmin?ns=${encodeURIComponent(ns)}`);
      }, 1200);
      setShowRejectSend(false);
      setPendingRejectReason('');
    } catch (e) {
      openNotif(`Error: ${e.message || e}`, 'error');
    } finally {
      setRejectLoading(false);
    }
  };

  // ===== Approve generic (selain BI.DOCS) =====
  const handleApproveGeneric = async () => {
    if (slug === 'bimail') return;
    setIsUpdatingGeneric(true);
    try {
      const res = await fetch(`/api/admin/approve/${slug}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: Number(id) }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || j?.error) throw new Error(j?.error || 'Gagal menyetujui.');

      const svc = META[slug]?.title || slug.toUpperCase();
      // ✅ format pesan sesuai desain: "Pengajuan {SERVICE} Berhasil!"
      openNotif(`Pengajuan ${svc} Berhasil!`, 'success');
      setTimeout(() => {
        router.push(`/Admin/HalamanUtama/hal-utamaAdmin?ns=${encodeURIComponent(ns)}`);
      }, 1200);

      const r = await fetch(`/api/admin/detail/${slug}?id=${id}`);
      const d = await r.json();
      setDetail(d.item || null);
    } catch (err) {
      openNotif(`Error: ${err.message || err}`, 'error');
    } finally {
      setIsUpdatingGeneric(false);
    }
  };

  // ===== Export PDF =====
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
      openNotif('Gagal mengekspor PDF. ' + e.message, 'error');
    } finally {
      setExporting(false);
    }
  };

  // ===== UI guard & derived =====
  if (isLoading) return <div className={styles.loadingState}>Memuat detail laporan...</div>;
  if (error)     return <div className={styles.errorState}>Error: {error}</div>;

  const titleService = META[slug]?.title || slug.toUpperCase();
  const nonMoveStatus = slug !== 'dmove' ? mapStatus(detail) : null;

  const handleLogout = () => {
    localStorage.removeItem('admin');
    router.push('/Login/hal-login');
  };

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
          // ========================== D'MOVE ==========================
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
              <div className={styles.detailRow} style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                <button className={styles.btnTolak} onClick={() => setShowRejectReason(true)} disabled={isUpdating}>
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
          // ========================== LAYANAN LAIN ==========================
          <div className={styles.detailCard} ref={detailRef}>
            <div className={styles.topRow}>
              <div className={styles.leftTitle}>
                <div className={styles.bookingTitle}>{titleService} • Detail #{id}</div>
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
                {/* ===================== GRID KIRI ===================== */}
                <div className={styles.detailRow}>
                  <div className={styles.detailColLeft}>
                    {/* ===== BI.CARE ===== */}
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

                    {/* ===== BI.MEET ===== */}
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

                    {/* ===== BI.STAY ===== */}
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

                    {/* ===== BI.MAIL (LEFT) ===== */}
                    {slug === 'bimail' && (
                      <>
                        <div className={styles.detailLabel}>ID</div>
                        <div className={styles.detailValue}>{detail.id}</div>

                        <div className={styles.detailLabel}>Nomor Surat</div>
                        <div className={styles.detailValue}>{detail.mail_number || detail.no_surat || '-'}</div>

                        <div className={styles.detailLabel}>Jenis</div>
                        <div className={styles.detailValue}>
                          {detail.jenis ?? detail.jenis_id ?? '-'}
                        </div>

                        <div className={styles.detailLabel}>Tipe Dokumen</div>
                        <div className={styles.detailValue}>
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

                    {/* ===== BI.MEAL (LEFT) ===== */}
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

                  {/* ===================== GRID KANAN ===================== */}
                  <div className={styles.detailColRight}>
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

                {/* ===== Action row untuk layanan selain BI.DOCS ===== */}
                {slug !== 'bimail' && isPendingGeneric(slug, detail) && (
                  <div className={styles.actionBtnRow} style={{ marginTop: 16 }}>
                    <button
                      className={styles.btnTolak}
                      onClick={() => setShowRejectReason(true)}
                      disabled={isUpdatingGeneric}
                    >
                      {isUpdatingGeneric ? 'Memproses...' : 'Tolak'}
                    </button>
                    <button
                      className={styles.btnSetujui}
                      onClick={handleApproveGeneric}
                      disabled={isUpdatingGeneric}
                    >
                      {isUpdatingGeneric ? 'Memproses...' : 'Setujui'}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </main>

      {/* Popups */}
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

      {/* Step 1: input alasan */}
      <RejectReasonPopup
        show={showRejectReason}
        onClose={() => setShowRejectReason(false)}
        onNext={handleRejectStep1Done}
        title={`Alasan Penolakan ${META[slug]?.title || ''}`}
      />

      {/* Step 2: kirim WA + simpan */}
      <RejectVerificationPopup
        show={showRejectSend}
        onClose={() => setShowRejectSend(false)}
        onSubmit={handleRejectStep2Submit}
        loading={rejectLoading}
        person={pickPersonForWA(slug, booking, detail)}
        titleText={`Kirimkan Pesan Penolakan ${META[slug]?.title || ''}`}
        infoText="Periksa / ubah pesan yang akan dikirim via WhatsApp. Klik 'Tolak & Kirim' untuk menyimpan dan (opsional) mengirim."
        previewBuilder={(person, r) => buildRejectPreview(slug, person, r, id)}
        initialReason={pendingRejectReason}
      />

      {/* ✅ Notifikasi Global */}
      {showNotif && (
        <PopupAdmin
          message={notif.message}
          type={notif.type}
          onClose={() => setShowNotif(false)}
        />
      )}
    </div>
  );
}
