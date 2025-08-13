import React, { useEffect, useState, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/router';
import styles from './fiturBIstay.module.css';
import SidebarUser from '@/components/SidebarUser/SidebarUser';
import LogoutPopup from '@/components/LogoutPopup/LogoutPopup';
import { jwtVerify } from 'jose';

import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import idLocale from 'date-fns/locale/id';
import { addDays } from 'date-fns';

const SuccessPopup = ({ onClose }) => (
  <div className={styles.popupOverlay} role="dialog" aria-modal="true">
    <div className={styles.popupBox}>
      <button className={styles.popupClose} onClick={onClose} aria-label="Tutup">×</button>
      <div className={styles.popupIcon}>
        <svg width="70" height="70" viewBox="0 0 70 70" aria-hidden="true">
          <circle cx="35" cy="35" r="35" fill="#7EDC89" />
          <polyline points="23,36 33,46 48,29" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
      <div className={styles.popupMsg}><b>Booking BI.STAY Telah Berhasil!</b></div>
    </div>
  </div>
);

// helpers waktu tetap
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
const diffNights = (checkIn, checkOut) => {
  if (!checkIn || !checkOut) return 0;
  const a = startOfDay(checkIn);
  const b = startOfDay(checkOut);
  // jumlah malam = selisih hari kalender
  return Math.round((b - a) / (1000 * 60 * 60 * 24));
};

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
    checkIn: null,   // Date dengan jam 14:00
    checkOut: null,  // Date dengan jam 12:00
    ket: '',
  });
  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFields((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(p => ({ ...p, [name]: null }));
  };

  // === Date only (jam auto) ===
  const handleDateChange = (date, key) => {
    if (key === 'checkIn') {
      const ci = atTime(date, 14, 0); // Check-In jam 14:00
      setFields(prev => {
        const next = { ...prev, checkIn: ci };
        if (prev.checkOut) {
          const nights = diffNights(ci, prev.checkOut);
          if (nights < 1 || nights > 2) {
            next.checkOut = null;
            setErrors(p => ({ ...p, checkOut: 'Pilih ulang. Maksimal 2 malam & minimal 1 malam.' }));
          }
        }
        return next;
      });
      if (errors.checkIn) setErrors(p => ({ ...p, checkIn: null }));
      return;
    }

    if (key === 'checkOut') {
      const co = atTime(date, 12, 0); // Check-Out jam 12:00
      const nights = diffNights(fields.checkIn, co);
      setFields(prev => ({ ...prev, checkOut: co }));
      if (!fields.checkIn) {
        setErrors(p => ({ ...p, checkOut: 'Pilih tanggal check-in terlebih dulu.' }));
      } else if (nights < 1 || nights > 2) {
        setErrors(p => ({ ...p, checkOut: 'Durasi hanya 1–2 malam (maks 3 hari).' }));
      } else if (errors.checkOut) {
        setErrors(p => ({ ...p, checkOut: null }));
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

    if (fields.checkIn && fields.checkOut) {
      const nights = diffNights(fields.checkIn, fields.checkOut);
      if (nights < 1) e.checkOut = 'Minimal 1 malam.';
      else if (nights > 2) e.checkOut = 'Maksimal 2 malam (3 hari).';
    }
    return e;
  };

  // ---- Custom dropdown: Status Pegawai (rounded) ----
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

  // ---- Submit -> call API /api/BIstaybook/bistaybooking ----
  const onSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');

    const v = validate();
    if (Object.keys(v).length) { setErrors(v); return; }
    setErrors({});
    setIsSubmitting(true);

    try {
      const payload = {
        nama_pemesan: fields.nama.trim(),
        nip: fields.nip.trim(),
        no_wa: fields.wa.trim(),
        status: fields.status,                 // 'Pegawai' | 'Pensiun'
        asal_kpw: fields.asalKPw.trim(),
        check_in: fields.checkIn.toISOString(),   // 14:00 lokal -> ISO
        check_out: fields.checkOut.toISOString(), // 12:00 lokal -> ISO
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

      setShowSuccess(true);
      setFields({
        nama: '', nip: '', wa: '', status: '', asalKPw: '',
        checkIn: null, checkOut: null, ket: '',
      });
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

  // batasan tanggal checkout di kalender
  const minCheckoutDate = fields.checkIn ? addDays(fields.checkIn, 1) : null;
  const maxCheckoutDate = fields.checkIn ? addDays(fields.checkIn, 2) : null;

  return (
    <div className={styles.background}>
      <SidebarUser onLogout={() => setShowLogoutPopup(true)} />

      <main className={styles.mainContent}>
        <div className={styles.formBox}>
          {/* Top Row: Back (kiri) • Logo (tengah) */}
          <div className={styles.topRow}>
            <Link href="/User/HalamanUtama/hal-utamauser">
              <button className={styles.backBtn}>
                <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M15 18l-6-6 6-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Kembali
              </button>
            </Link>
            <div className={styles.logoStayWrapper}>
              <Image
                src="/assets/D'REST.svg"
                alt="BI.STAY"
                width={200}
                height={80}
                priority
              />
            </div>
            <div /> {/* spacer kanan agar logo tetap center */}
          </div>

          {/* FORM GRID */}
          <form className={styles.formGrid} onSubmit={onSubmit} autoComplete="off">
            {/* Nama Pemesan – full width */}
            <div className={`${styles.formGroup} ${styles.colFull}`}>
              <label htmlFor="nama">Nama Pemesan</label>
              <input
                id="nama" name="nama" type="text" placeholder="Masukkan Nama Anda"
                value={fields.nama} onChange={handleChange}
                className={errors.nama ? styles.errorInput : ''}
              />
              {errors.nama && <span className={styles.errorMsg}>{errors.nama}</span>}
            </div>

            {/* NIP | No WA */}
            <div className={styles.formGroup}>
              <label htmlFor="nip">NIP</label>
              <input
                id="nip" name="nip" type="text" placeholder="Masukkan NIP Anda"
                value={fields.nip} onChange={handleChange}
                className={errors.nip ? styles.errorInput : ''}
              />
              {errors.nip && <span className={styles.errorMsg}>{errors.nip}</span>}
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="wa">No WA</label>
              <input
                id="wa" name="wa" type="text" placeholder="Masukkan No WA Anda"
                value={fields.wa} onChange={handleChange}
                className={errors.wa ? styles.errorInput : ''}
              />
              {errors.wa && <span className={styles.errorMsg}>{errors.wa}</span>}
            </div>

            {/* Status (custom dropdown rounded) | Asal KPw */}
            <div className={styles.formGroup}>
              <label htmlFor="status">Status Pegawai</label>
              <div className={styles.customSelectWrap} ref={statusRef}>
                <button
                  type="button"
                  id="status"
                  className={`${styles.customSelect} ${errors.status ? styles.errorInput : ''}`}
                  onClick={() => setStatusOpen(o => !o)}
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
                id="asalKPw" name="asalKPw" type="text" placeholder="Masukkan Asal KPw Anda"
                value={fields.asalKPw} onChange={handleChange}
                className={errors.asalKPw ? styles.errorInput : ''}
              />
              {errors.asalKPw && <span className={styles.errorMsg}>{errors.asalKPw}</span>}
            </div>

            {/* Check In | Check Out (date only, jam auto) */}
            <div className={styles.formGroup}>
              <label htmlFor="checkIn">Tanggal Check In (14:00)</label>
              <DatePicker
                id="checkIn"
                selected={fields.checkIn}
                onChange={(d) => handleDateChange(d, 'checkIn')}
                dateFormat="dd MMMM yyyy"
                minDate={new Date()}
                locale={idLocale}
                placeholderText="Pilih tanggal"
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
                minDate={minCheckoutDate || undefined}
                maxDate={maxCheckoutDate || undefined}
                locale={idLocale}
                placeholderText="Pilih tanggal"
                disabled={!fields.checkIn}
              />
              {errors.checkOut && <span className={styles.errorMsg}>{errors.checkOut}</span>}
            </div>

            {/* Keterangan – full width */}
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
              <div className={`${styles.colFull} ${styles.submitErrorMsg}`}>
                {submitError}
              </div>
            )}
          </form>
        </div>

        {showSuccess && <SuccessPopup onClose={closeSuccess} />}
      </main>

      <LogoutPopup
        open={showLogoutPopup}
        onCancel={() => setShowLogoutPopup(false)}
        onLogout={handleLogout}
      />
    </div>
  );
}

// SSR guard (no flicker)
export async function getServerSideProps(ctx) {
  const token = ctx.req.cookies?.user_session || null;
  if (!token) {
    return { redirect: { destination: `/Signin/hal-sign?from=${encodeURIComponent(ctx.resolvedUrl)}`, permanent: false } };
  }
  try {
    const secret = process.env.JWT_SECRET;
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret), {
      algorithms: ['HS256'],
      clockTolerance: 10,
    });
    if (payload?.role !== 'user') {
      return { redirect: { destination: `/Signin/hal-sign?from=${encodeURIComponent(ctx.resolvedUrl)}`, permanent: false } };
    }
    return { props: {} };
  } catch {
    return { redirect: { destination: `/Signin/hal-sign?from=${encodeURIComponent(ctx.resolvedUrl)}`, permanent: false } };
  }
}
