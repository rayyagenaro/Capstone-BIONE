import React, { useEffect, useState, useRef, useCallback } from 'react';
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

// dropdown helper
const useDropdown = (initial = false) => {
  const [open, setOpen] = useState(initial);
  const ref = useRef(null);
  const onDocClick = useCallback((e) => {
    if (ref.current && !ref.current.contains(e.target)) setOpen(false);
  }, []);
  useEffect(() => {
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [onDocClick]);
  return { open, setOpen, ref };
};

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

export default function FiturBIstay() {
  const router = useRouter();

  // guard
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

  const [fields, setFields] = useState({
    nama: '',
    nip: '',
    wa: '',
    status: '',
    asalKPw: '',
    checkIn: null,
    checkOut: null,
    ket: '',
  });
  const [errors, setErrors] = useState({});

  const availability = useDropdown(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFields((prev) => ({ ...prev, [name]: value }));
  };
  const handleDateChange = (date, key) => {
    setFields((prev) => ({ ...prev, [key]: date }));
    if (errors[key]) setErrors((p) => ({ ...p, [key]: null }));
  };

  const validate = () => {
    const e = {};
    if (!fields.nama.trim()) e.nama = 'Nama wajib diisi';
    if (!fields.nip.trim()) e.nip = 'NIP wajib diisi';
    if (!fields.wa.trim()) e.wa = 'No WA wajib diisi';
    if (!fields.status) e.status = 'Status wajib dipilih';
    if (!fields.checkIn) e.checkIn = 'Tanggal check in wajib diisi';
    if (!fields.checkOut) e.checkOut = 'Tanggal check out wajib diisi';
    if (fields.checkIn && fields.checkOut && fields.checkOut <= fields.checkIn) {
      e.checkOut = 'Check out harus setelah check in';
    }
    return e;
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    const v = validate();
    if (Object.keys(v).length) { setErrors(v); return; }
    setErrors({});
    setShowSuccess(true);
  };

  const closeSuccess = () => setShowSuccess(false);

  const handleLogout = async () => {
    try { await fetch('/api/logout', { method: 'POST' }); } catch {}
    router.replace('/Signin/hal-sign');
  };

  return (
    <div className={styles.background}>
      <SidebarUser onLogout={() => setShowLogoutPopup(true)} />

      <main className={styles.mainContent}>
        <div className={styles.formBox}>
          {/* Top Row */}
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
              <Image src="/assets/D'REST.svg" alt="BI.STAY" width={180} height={85} priority />
            </div>

            <div className={styles.availabilitySection}>
              <div className={styles.availabilityLabel}>Availability</div>
              <div className={styles.availabilityDropdownWrap} ref={availability.ref}>
                <button
                  type="button"
                  className={styles.availabilityDropdownBtn}
                  onClick={() => availability.setOpen(v => !v)}
                >
                  Lihat Ketersediaan <span className={styles.availChevron}>▼</span>
                </button>
                {availability.open && (
                  <div className={styles.availabilityDropdown}>
                    <table>
                      <thead><tr><th>Tipe</th><th>Jumlah</th></tr></thead>
                      <tbody>
                        <tr><td>Rumah Dinas Pusat</td><td>3</td></tr>
                        <tr><td>Rumah Dinas Daerah</td><td>5</td></tr>
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* FORM GRID – posisi sesuai mockup kedua */}
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

            {/* Status | Asal KPw */}
            <div className={styles.formGroup}>
              <label htmlFor="status">Status Pegawai</label>
              <select
                id="status" name="status"
                value={fields.status} onChange={handleChange}
                className={`${styles.select} ${errors.status ? styles.errorInput : ''}`}
              >
                <option value="" hidden>Pilih Status Pegawai Anda</option>
                <option value="Pegawai">Pegawai</option>
                <option value="Pensiun">Pensiun</option>
              </select>
              {errors.status && <span className={styles.errorMsg}>{errors.status}</span>}
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="asalKPw">Asal KPw</label>
              <input
                id="asalKPw" name="asalKPw" type="text" placeholder="Masukkan Asal KPw Anda"
                value={fields.asalKPw} onChange={handleChange}
              />
            </div>

            {/* Check In | Check Out */}
            <div className={styles.formGroup}>
              <label htmlFor="checkIn">Tanggal Check In</label>
              <DatePicker
                id="checkIn"
                selected={fields.checkIn}
                onChange={(d) => handleDateChange(d, 'checkIn')}
                showTimeSelect timeFormat="HH:mm" timeIntervals={15}
                dateFormat="dd MMMM yyyy HH:mm" timeCaption="Jam"
                minDate={new Date()} locale={idLocale}
                placeholderText="Pilih tanggal & jam"
                className={errors.checkIn ? styles.errorInput : ''}
              />
              {errors.checkIn && <span className={styles.errorMsg}>{errors.checkIn}</span>}
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="checkOut">Tanggal Check Out</label>
              <DatePicker
                id="checkOut"
                selected={fields.checkOut}
                onChange={(d) => handleDateChange(d, 'checkOut')}
                showTimeSelect timeFormat="HH:mm" timeIntervals={15}
                dateFormat="dd MMMM yyyy HH:mm" timeCaption="Jam"
                minDate={fields.checkIn || new Date()} locale={idLocale}
                placeholderText="Pilih tanggal & jam"
                className={errors.checkOut ? styles.errorInput : ''}
              />
              {errors.checkOut && <span className={styles.errorMsg}>{errors.checkOut}</span>}
            </div>

            {/* Keterangan – full width */}
            <div className={`${styles.formGroup} ${styles.colFull}`}>
              <label htmlFor="ket">Keterangan</label>
              <textarea id="ket" name="ket" rows={2} value={fields.ket} onChange={handleChange} />
            </div>

            <div className={`${styles.buttonWrapper} ${styles.colFull}`}>
              <button type="submit" className={styles.bookingBtn}>Booking</button>
            </div>
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
