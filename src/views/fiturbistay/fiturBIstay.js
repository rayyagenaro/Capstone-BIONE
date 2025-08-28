import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/router';
import styles from './fiturBIstay.module.css';
import { FaArrowLeft } from 'react-icons/fa';
import SidebarUser from '@/components/SidebarUser/SidebarUser';
import LogoutPopup from '@/components/LogoutPopup/LogoutPopup';
import { jwtVerify } from 'jose';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import idLocale from 'date-fns/locale/id';

/* ---------------- Popup Sukses ---------------- */

const SuccessPopup = ({ onClose }) => (
  <div className={styles.popupOverlay} role="dialog" aria-modal="true">
    <div className={styles.popupBox}>
      <button className={styles.popupClose} onClick={onClose} aria-label="Tutup">
        ×
      </button>
      <div className={styles.popupIcon}>
        <svg width="70" height="70" viewBox="0 0 70 70" aria-hidden="true">
          <circle cx="35" cy="35" r="35" fill="#7EDC89" />
          <polyline
            points="23,36 33,46 48,29"
            fill="none"
            stroke="#fff"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <div className={styles.popupMsg}>
        <b>Booking BI.STAY Telah Berhasil!</b>
      </div>
    </div>
  </div>
);

/* ---------------- Popup SOP (selalu muncul saat masuk halaman) ---------------- */

const SOPPopup = ({ onClose, onOpenLink }) => {
  const SOP_URL =
    'https://docs.google.com/document/d/1McbCcASEltz4xX5lb49wRV1jx6hYCkya1a9ay1QAhkM/edit?usp=sharing';

  const handleOpenSOP = () => {
    onOpenLink?.();
    window.open(SOP_URL, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className={styles.sopOverlay} role="dialog" aria-modal="true">
      <div className={styles.sopBox}>
        <button className={styles.sopClose} onClick={onClose} aria-label="Tutup">
          ×
        </button>

        <div className={styles.sopWarnIcon} aria-hidden="true">
          <svg viewBox="0 0 48 48" width="64" height="64">
            <path d="M24 6l18 32H6L24 6z" fill="#fff" stroke="#e14d4d" strokeWidth="2.5" />
            <rect x="22.5" y="18" width="3" height="12" rx="1.2" fill="#e14d4d" />
            <circle cx="24" cy="34" r="1.8" fill="#e14d4d" />
          </svg>
        </div>

        <div className={styles.sopTitle}>
          Harap Membaca dan Mengakses <b>SOP Booking Wisma BI</b> 
        </div>
        <div className={styles.sopSubtitle}>
          Silakan buka tautan di bawah ini. Setelah Anda kembali ke tab ini, form booking akan otomatis
          tersedia.
        </div>

        <button className={styles.sopLinkBtn} onClick={handleOpenSOP}>
          Link SOP Booking Wisma BI
        </button>

        <div className={styles.sopHint}>(Tautan akan Terbuka di Tab Baru)</div>
      </div>
    </div>
  );
};

/* -------------- Helpers waktu tetap -------------- */

const atTime = (date, h, m = 0) => {
  const d = new Date(date);
  d.setHours(h, m, 0, 0);
  return d;
};
const startOfDay = (d) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};
const isSameDay = (a, b) => {
  if (!a || !b) return false;
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
};
const ymd = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

/* ===== util kalender (tanpa spill-over) ===== */
const weekLabels = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];

/**
 * Matriks minggu untuk bulan aktif (mulai Senin), berhenti setelah tanggal terakhir bulan.
 */
function monthMatrix(currentMonthDate) {
  const year = currentMonthDate.getFullYear();
  const month = currentMonthDate.getMonth();
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);

  // Offset Senin
  const jsDowFirst = first.getDay(); // Minggu=0
  const mondayIndex = (jsDowFirst + 6) % 7;
  const gridStart = new Date(first);
  gridStart.setDate(first.getDate() - mondayIndex);

  const weeks = [];
  let cursor = new Date(gridStart);

  while (cursor <= last) {
    const days = [];
    for (let d = 0; d < 7; d++) {
      days.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
    weeks.push(days);
  }
  return weeks;
}

function monthTitle(d) {
  const format = new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' });
  return format.format(d);
}

/* ===================== Page ===================== */

export default function FiturBIstay() {
  const router = useRouter();

  // Guard login (user only)
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const r = await fetch('/api/me?scope=user', { cache: 'no-store' });
        const d = await r.json();
        if (!active) return;
        const ok = d?.hasToken && d?.payload?.role === 'user';
        if (!ok) router.replace('/Signin/hal-sign?from=' + encodeURIComponent(router.asPath));
      } catch {
        router.replace('/Signin/hal-sign?from=' + encodeURIComponent(router.asPath));
      }
    })();
    return () => { active = false; };
  }, [router]);

  /* ---------- SOP gate ---------- */
  const [showSOP, setShowSOP] = useState(true);
  const sopLinkClickedRef = useRef(false);
  useEffect(() => {
    const onFocus = () => {
      if (sopLinkClickedRef.current) {
        setShowSOP(false);
        sopLinkClickedRef.current = false;
      }
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);

  const [showLogoutPopup, setShowLogoutPopup] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const [fields, setFields] = useState({
    nama: '',
    nip: '',
    wa: '',
    status: '',
    asalKPw: '',
    checkIn: null, // 14:00
    checkOut: null, // 12:00
    ket: '',
  });
  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFields((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((p) => ({ ...p, [name]: null }));
  };

  // Date only (jam check-in/out otomatis) — TIDAK ada batasan durasi
  const handleDateChange = (date, key) => {
    if (key === 'checkIn') {
      const ci = atTime(date, 14, 0); // 14:00
      setFields((prev) => ({ ...prev, checkIn: ci }));
      if (errors.checkIn) setErrors((p) => ({ ...p, checkIn: null }));
      if (fields.checkOut && fields.checkOut <= ci) {
        setErrors((p) => ({ ...p, checkOut: 'Check out harus setelah check in.' }));
      }
      return;
    }

    if (key === 'checkOut') {
      const co = atTime(date, 12, 0); // 12:00
      setFields((prev) => ({ ...prev, checkOut: co }));
      if (!fields.checkIn) {
        setErrors((p) => ({ ...p, checkOut: 'Pilih tanggal check-in terlebih dulu.' }));
      } else if (co <= fields.checkIn) {
        setErrors((p) => ({ ...p, checkOut: 'Check out harus setelah check in.' }));
      } else if (errors.checkOut) {
        setErrors((p) => ({ ...p, checkOut: null }));
      }
      return;
    }
  };

  const validate = () => {
    const e = {};
    if (!fields.nama.trim()) e.nama = 'Nama wajib diisi';
    if (!fields.nip.trim()) e.nip = 'NIP wajib diisi';
    if (!fields.wa.trim()) e.wa = 'No WA wajib diisi';
    if (!fields.status) e.status = 'Status wajib dipilih';
    if (!fields.asalKPw.trim()) e.asalKPw = 'Asal KPw wajib diisi';
    if (!fields.checkIn) e.checkIn = 'Tanggal check in wajib diisi';
    if (!fields.checkOut) e.checkOut = 'Tanggal check out wajib diisi';
    if (fields.checkIn && fields.checkOut && fields.checkOut <= fields.checkIn) {
      e.checkOut = 'Check out harus setelah check in.';
    }
    return e;
  };

  /* -------- Custom dropdown: Status Pegawai -------- */
  const statusRef = useRef(null);
  const [statusOpen, setStatusOpen] = useState(false);
  useEffect(() => {
    const onDoc = (ev) => {
      if (!statusRef.current) return;
      if (!statusRef.current.contains(ev.target)) setStatusOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);
  const selectStatus = (val) => {
    setFields((p) => ({ ...p, status: val }));
    if (errors.status) setErrors((p) => ({ ...p, status: null }));
    setStatusOpen(false);
  };

  /* ----------------------- Submit ----------------------- */
  const onSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');

    const v = validate();
    if (Object.keys(v).length) {
      setErrors(v);
      return;
    }
    setErrors({});
    setIsSubmitting(true);

    try {
      const meRes = await fetch('/api/me?scope=user', { cache: 'no-store' });
      const me = await meRes.json().catch(() => ({}));
      const userId = me?.payload?.sub || me?.payload?.user_id || null;

      const payload = {
        user_id: userId ?? null,
        nama_pemesan: fields.nama.trim(),
        nip: fields.nip.trim(),
        no_wa: fields.wa.trim(),
        status: fields.status,
        asal_kpw: fields.asalKPw.trim(),
        check_in: fields.checkIn.toISOString(),
        check_out: fields.checkOut.toISOString(),
        keterangan: fields.ket?.trim() || null,
      };

      const res = await fetch('/api/BIstaybook/bistaybooking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || 'Gagal menyimpan booking.');
      }

      // ⛔️ Tidak ada optimistic update lagi.
      // Kalender hanya berubah jika status booking sudah "approved" (berdasarkan GET availability).

      setShowSuccess(true);
      setFields({
        nama: '', nip: '', wa: '', status: '', asalKPw: '',
        checkIn: null, checkOut: null, ket: '',
      });

      // Refetch untuk menampilkan hasil approved (jika ada yang baru di-approve atau existing).
      fetchAvailability();
    } catch (err) {
      setSubmitError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const closeSuccess = () => setShowSuccess(false);

  const handleLogout = async () => {
    try { await fetch('/api/logout', { method: 'POST' }); } catch {}
    router.replace('/Signin/hal-sign');
  };

  /* ====== STATE & RENDER KALENDER ====== */
  const [calMonth, setCalMonth] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  });

  const weeks = useMemo(() => monthMatrix(calMonth), [calMonth]);
  const monthIndex = calMonth.getMonth();
  const yearIndex = calMonth.getFullYear();
  const today = startOfDay(new Date());

  const gotoPrevMonth = () => {
    const d = new Date(calMonth);
    d.setMonth(d.getMonth() - 1);
    setCalMonth(d);
  };
  const gotoNextMonth = () => {
    const d = new Date(calMonth);
    d.setMonth(d.getMonth() + 1);
    setCalMonth(d);
  };

  /* ======== BOOKED MAP (approved only) ======== */
  // Struktur: { 'YYYY-MM-DD': { in: true/false, out: true/false } }
  const [bookedMap, setBookedMap] = useState({});

  // Endpoint GET availability per bulan (read-only).
  // Respons yang diharapkan (contoh):
  // [{ check_in: ISOString, check_out: ISOString, status: "approved"|"pending"|"rejected" }, ...]
  const AVAIL_URL = `/api/BIstaybook/availability?year=${yearIndex}&month=${String(
    monthIndex + 1
  ).padStart(2, '0')}`;

  const fetchAvailability = useCallback(async () => {
    try {
      const resp = await fetch(AVAIL_URL, { cache: 'no-store' });
      if (!resp.ok) throw new Error('availability not ok');
      const rows = await resp.json();

      const nextMap = {};
      const addFlag = (d, key) => {
        const k = ymd(d);
        if (!nextMap[k]) nextMap[k] = { in: false, out: false };
        nextMap[k][key] = true;
      };

      for (const r of rows || []) {
        // HANYA booking yang sudah approved yang ditandai di kalender
        const st = String(r.status || '').toLowerCase();
        if (st !== 'approved') continue;

        const ci = startOfDay(new Date(r.check_in));
        const co = startOfDay(new Date(r.check_out));

        // Hari check-in
        addFlag(ci, 'in');

        // Hari di tengah
        let mid = new Date(ci);
        mid.setDate(mid.getDate() + 1);
        while (mid < co) {
          addFlag(mid, 'in');
          addFlag(mid, 'out');
          mid.setDate(mid.getDate() + 1);
        }

        // Hari check-out
        addFlag(co, 'out');
      }

      setBookedMap(nextMap);
    } catch {
      // Jika gagal fetch, jangan ubah bookedMap agar UI tetap stabil
    }
  }, [AVAIL_URL]);

  // Ambil data saat bulan berubah
  useEffect(() => {
    fetchAvailability();
  }, [fetchAvailability]);

  const isInBooked = (d) => !!bookedMap[ymd(d)]?.in;
  const isOutBooked = (d) => !!bookedMap[ymd(d)]?.out;

  return (
    <div className={styles.background}>
      <SidebarUser onLogout={() => setShowLogoutPopup(true)} />

      <main className={styles.mainContent}>
        <div className={styles.formBox}>
          {/* Header */}
          <div className={styles.topRow}>
            <button className={styles.backBtn} onClick={() => router.back()} type="button">
              <FaArrowLeft /> Kembali
            </button>

            <div className={styles.logoStayWrapper}>
              <Image src="/assets/D'REST.svg" alt="BI.STAY" width={200} height={80} priority />
            </div>

            <div />
          </div>

          {/* ====== KALENDER BESAR ====== */}
          <section className={styles.calendarCard} aria-label="Kalender Booking BI.STAY">
            <div className={styles.calHeader}>
              <button type="button" className={styles.calNavBtn} onClick={gotoPrevMonth} aria-label="Bulan sebelumnya">‹</button>
              <div className={styles.calTitle}>{monthTitle(calMonth)}</div>
              <button type="button" className={styles.calNavBtn} onClick={gotoNextMonth} aria-label="Bulan berikutnya">›</button>
            </div>

            <div className={styles.weekHeader}>
              {weekLabels.map((w) => (
                <div key={w} className={styles.weekHeaderCell}>{w}</div>
              ))}
            </div>

            <div className={styles.monthGrid}>
              {weeks.map((week, wi) => (
                <div key={wi} className={styles.weekRow}>
                  {week.map((day, di) => {
                    const inThisMonth = day.getMonth() === monthIndex;

                    if (!inThisMonth) {
                      return <div key={di} className={styles.dayCellEmpty}></div>;
                    }

                    const isPast = startOfDay(day) < today;
                    const dateNum = day.getDate();
                    const isCheckInSel = isSameDay(fields.checkIn, day);
                    const isCheckOutSel = isSameDay(fields.checkOut, day);

                    const inBooked = isInBooked(day);
                    const outBooked = isOutBooked(day);

                    return (
                      <div
                        key={di}
                        className={styles.dayCell}
                        aria-disabled={isPast}
                      >
                        <div className={styles.dayNumberWrap}>
                          <span className={styles.dayNumber}>{dateNum}</span>
                        </div>

                        <div className={styles.sessionCol}>
                          {/* 14:00 Check-In */}
                          <button
                            type="button"
                            disabled={isPast || inBooked}
                            className={
                              `${styles.sessionPill} ${inBooked ? styles.pillBooked : styles.pillCheckIn} ${isCheckInSel ? styles.pillSelected : ''}`
                            }
                            onClick={() => handleDateChange(day, 'checkIn')}
                            aria-pressed={isCheckInSel}
                            title={inBooked ? 'Sudah dibooking' : 'Set as Check-In (14:00)'}
                          >
                            {inBooked ? 'Booked' : '14:00 • Check-In'}
                          </button>

                          {/* 12:00 Check-Out */}
                          <button
                            type="button"
                            disabled={isPast || !fields.checkIn || outBooked}
                            className={
                              `${styles.sessionPill} ${outBooked ? styles.pillBooked : styles.pillCheckOut} ${isCheckOutSel ? styles.pillSelected : ''} ${!fields.checkIn && !outBooked ? styles.pillDisabledHint : ''}`
                            }
                            onClick={() => handleDateChange(day, 'checkOut')}
                            aria-pressed={isCheckOutSel}
                            title={
                              outBooked
                                ? 'Sudah dibooking'
                                : (fields.checkIn ? 'Set as Check-Out (12:00)' : 'Pilih Check-In terlebih dulu')
                            }
                          >
                            {outBooked ? 'Booked' : '12:00 • Check-Out'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>

            <div className={styles.calLegend}>
              <span className={`${styles.legendDot} ${styles.legendIn}`}></span>Check-In 14:00
              <span className={`${styles.legendDot} ${styles.legendOut}`}></span>Check-Out 12:00
              <span className={`${styles.legendDot} ${styles.legendSel}`}></span>Terpilih
              <span className={`${styles.legendDot} ${styles.legendBooked}`}></span>Booked
            </div>
          </section>

          {/* ====== FORM (tetap) ====== */}
          <form className={styles.formGrid} onSubmit={onSubmit} autoComplete="off">
            <div className={`${styles.formGroup} ${styles.colFull}`}>
              <label htmlFor="nama">Nama Pemesan</label>
              <input
                id="nama"
                name="nama"
                type="text"
                placeholder="Masukkan Nama Anda"
                value={fields.nama}
                onChange={handleChange}
                className={errors.nama ? styles.errorInput : ''}
              />
              {errors.nama && <span className={styles.errorMsg}>{errors.nama}</span>}
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="nip">NIP</label>
              <input
                id="nip"
                name="nip"
                type="text"
                placeholder="Masukkan NIP Anda"
                value={fields.nip}
                onChange={handleChange}
                className={errors.nip ? styles.errorInput : ''}
              />
              {errors.nip && <span className={styles.errorMsg}>{errors.nip}</span>}
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="wa">No WA</label>
              <input
                id="wa"
                name="wa"
                type="text"
                placeholder="Masukkan No WA Anda"
                value={fields.wa}
                onChange={handleChange}
                className={errors.wa ? styles.errorInput : ''}
              />
              {errors.wa && <span className={styles.errorMsg}>{errors.wa}</span>}
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="status">Status Pegawai</label>
              <div className={styles.customSelectWrap} ref={statusRef}>
                <button
                  type="button"
                  id="status"
                  className={`${styles.customSelect} ${errors.status ? styles.errorInput : ''}`}
                  onClick={() => setStatusOpen((o) => !o)}
                  aria-expanded={statusOpen}
                  aria-haspopup="listbox"
                >
                  <span className={fields.status ? styles.selectedText : styles.placeholder}>
                    {fields.status || 'Pilih Status Pegawai Anda'}
                  </span>
                  <span className={styles.caret} aria-hidden="true">
                    <svg width="18" height="18" viewBox="0 0 24 24">
                      <path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </span>
                </button>

                {statusOpen && (
                  <ul className={styles.customSelectDropdown} role="listbox">
                    <li
                      role="option"
                      aria-selected={fields.status === 'Pegawai'}
                      className={styles.customSelectOption}
                      onClick={() => selectStatus('Pegawai')}
                    >
                      Pegawai
                    </li>
                    <li
                      role="option"
                      aria-selected={fields.status === 'Pensiun'}
                      className={styles.customSelectOption}
                      onClick={() => selectStatus('Pensiun')}
                    >
                      Pensiun
                    </li>
                  </ul>
                )}
              </div>
              {errors.status && <span className={styles.errorMsg}>{errors.status}</span>}
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="asalKPw">Asal KPw</label>
              <input
                id="asalKPw"
                name="asalKPw"
                type="text"
                placeholder="Masukkan Asal KPw Anda"
                value={fields.asalKPw}
                onChange={handleChange}
                className={errors.asalKPw ? styles.errorInput : ''}
              />
              {errors.asalKPw && <span className={styles.errorMsg}>{errors.asalKPw}</span>}
            </div>

            {/* DatePicker tetap untuk konsistensi */}
            <div className={styles.formGroup}>
              <label htmlFor="checkIn">Tanggal Check In (14:00)</label>
              <DatePicker
                id="checkIn"
                selected={fields.checkIn}
                onChange={(d) => handleDateChange(d, 'checkIn')}
                dateFormat="dd MMMM yyyy"
                locale={idLocale}
                placeholderText="Pilih Tanggal"
              />
              {errors.checkIn && <span className={styles.errorMsg}>{errors.checkIn}</span>}
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="checkOut">Tanggal Check Out (12:00)</label>
              <DatePicker
                id="checkOut"
                selected={fields.checkOut}
                onChange={(d) => handleDateChange(d, 'checkOut')}
                dateFormat="dd MMMM yyyy"
                locale={idLocale}
                placeholderText="Pilih Tanggal"
                disabled={!fields.checkIn}
              />
              {errors.checkOut && <span className={styles.errorMsg}>{errors.checkOut}</span>}
            </div>

            <div className={`${styles.formGroup} ${styles.colFull}`}>
              <label htmlFor="ket">Keterangan</label>
              <textarea id="ket" name="ket" rows={2} value={fields.ket} onChange={handleChange} />
            </div>

            <div className={`${styles.buttonWrapper} ${styles.colFull}`}>
              <button type="submit" className={styles.bookingBtn} disabled={isSubmitting}>
                {isSubmitting ? 'Menyimpan...' : 'Booking'}
              </button>
            </div>

            {submitError && (
              <div className={`${styles.colFull} ${styles.submitErrorMsg}`}>{submitError}</div>
            )}
          </form>
        </div>

        {showSuccess && <SuccessPopup onClose={closeSuccess} />}

        {showSOP && (
          <SOPPopup
            onClose={() => setShowSOP(false)}
            onOpenLink={() => { sopLinkClickedRef.current = true; }}
          />
        )}
      </main>

      <LogoutPopup
        open={showLogoutPopup}
        onCancel={() => setShowLogoutPopup(false)}
        onLogout={handleLogout}
      />
    </div>
  );
}

/* -------------- SSR guard (no flicker) -------------- */
export async function getServerSideProps(ctx) {
  const token = ctx.req.cookies?.user_session || null;
  if (!token) {
    return {
      redirect: {
        destination: `/Signin/hal-sign?from=${encodeURIComponent(ctx.resolvedUrl)}`,
        permanent: false,
      },
    };
  }
  try {
    const secret = process.env.JWT_SECRET;
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret), {
      algorithms: ['HS256'],
      clockTolerance: 10,
    });
    if (payload?.role !== 'user') {
      return {
        redirect: {
          destination: `/Signin/hal-sign?from=${encodeURIComponent(ctx.resolvedUrl)}`,
          permanent: false,
        },
      };
    }
    return { props: {} };
  } catch {
    return {
      redirect: {
        destination: `/Signin/hal-sign?from=${encodeURIComponent(ctx.resolvedUrl)}`,
        permanent: false,
      },
    };
  }
}
