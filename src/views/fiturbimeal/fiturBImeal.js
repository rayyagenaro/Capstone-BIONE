import React, { useEffect, useState, useRef, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/router';
import styles from './fiturBImeal.module.css';
import SidebarUser from '@/components/SidebarUser/SidebarUser';
import LogoutPopup from '@/components/LogoutPopup/LogoutPopup';
import { FaArrowLeft } from 'react-icons/fa';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import idLocale from 'date-fns/locale/id';

// ==== helper konversi pesanan ke bentuk objek {item, qty} ====
const toObjList = (list) => {
  if (!Array.isArray(list)) return [{ item: '', qty: 1 }];
  return list.map((x) =>
    typeof x === 'string'
      ? { item: x, qty: 1 }
      : { item: x?.item ?? '', qty: Number(x?.qty) > 0 ? Number(x.qty) : 1 }
  );
};

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
      <div className={styles.popupMsg}><b>Booking BI.MEAL Telah Berhasil!</b></div>
    </div>
  </div>
);

export default function FiturBImeal() {
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
    uker: '',
    tgl: null,
    // mulai dengan bentuk objek agar aman
    pesanan: [{ item: '', qty: 1 }],
  });
  const [errors, setErrors] = useState({});

  // normalisasi satu kali kalau pernah ada bentuk lama (array string)
  useEffect(() => {
    setFields(prev => ({ ...prev, pesanan: toObjList(prev.pesanan) }));
  }, []);

  const availability = useDropdown(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFields((prev) => ({ ...prev, [name]: value }));
  };
  const handleDateChange = (date, key) => {
    setFields((prev) => ({ ...prev, [key]: date }));
    if (errors[key]) setErrors((p) => ({ ...p, [key]: null }));
  };

  // handler pesanan (nama item)
  const handlePesananChange = (idx, value) => {
    setFields(prev => {
      const list = toObjList(prev.pesanan);
      list[idx] = { ...list[idx], item: value };
      return { ...prev, pesanan: list };
    });
  };

  // handler qty
  const handleQtyChange = (idx, value) => {
    const n = Math.max(1, Math.min(999, parseInt(value || '1', 10)));
    setFields(prev => {
      const list = toObjList(prev.pesanan);
      list[idx] = { ...list[idx], qty: Number.isFinite(n) ? n : 1 };
      return { ...prev, pesanan: list };
    });
  };

  const addPesanan = () => {
    setFields(prev => {
      const list = toObjList(prev.pesanan);
      return { ...prev, pesanan: [...list, { item: '', qty: 1 }] };
    });
  };

  const removePesanan = (idx) => {
    setFields(prev => {
      const list = toObjList(prev.pesanan).filter((_, i) => i !== idx);
      return { ...prev, pesanan: list.length ? list : [{ item: '', qty: 1 }] };
    });
  };

  const validate = () => {
    const e = {};
    if (!fields.nama.trim()) e.nama = 'Nama wajib diisi';
    if (!fields.nip.trim()) e.nip = 'NIP wajib diisi';
    if (!fields.wa.trim()) e.wa = 'No WA wajib diisi';
    if (!fields.uker) e.uker = 'Unit Kerja wajib dipilih';
    if (!fields.tgl) e.tgl = 'Tanggal pesanan wajib diisi';

    const list = toObjList(fields.pesanan);
    if (!list.some(p => String(p.item || '').trim())) {
      e.pesanan = 'Minimal satu pesanan diisi';
    }
    return e;
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    const v = validate();
    if (Object.keys(v).length) { setErrors(v); return; }
    setErrors({});
    setShowSuccess(true);

    // contoh payload ke API:
    // const payload = { ...fields, pesanan: toObjList(fields.pesanan) };
    // await fetch('/api/meal/book', { method: 'POST', body: JSON.stringify(payload) });
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
              <button className={styles.backBtn} onClick={() => router.back()} type="button">
              <FaArrowLeft /> Kembali
              </button>
            <div className={styles.logoStayWrapper}>
              <Image src="/assets/D'MEAL.svg" alt="BI.MEAL" width={180} height={85} priority />
            </div>
          </div>

          {/* FORM GRID */}
          <form className={styles.formGrid} onSubmit={onSubmit} autoComplete="off">
            <div className={styles.formGroup}>
              <label htmlFor="nama">Nama PIC Pesanan</label>
              <input
                id="nama" name="nama" type="text" placeholder="Masukkan Nama Anda"
                value={fields.nama} onChange={handleChange}
                className={errors.nama ? styles.errorInput : ''}
              />
              {errors.nama && <span className={styles.errorMsg}>{errors.nama}</span>}
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="wa">No WA PIC</label>
              <input
                id="wa" name="wa" type="text" placeholder="Masukkan No WA Anda"
                value={fields.wa} onChange={handleChange}
                className={errors.wa ? styles.errorInput : ''}
              />
              {errors.wa && <span className={styles.errorMsg}>{errors.wa}</span>}
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="nip">NIP PIC</label>
              <input
                id="nip" name="nip" type="text" placeholder="Masukkan NIP Anda"
                value={fields.nip} onChange={handleChange}
                className={errors.nip ? styles.errorInput : ''}
              />
              {errors.nip && <span className={styles.errorMsg}>{errors.nip}</span>}
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="uker">Atas Beban Anggaran</label>
              <select
                id="uker" name="uker"
                value={fields.uker} onChange={handleChange}
                className={`${styles.select} ${errors.uker ? styles.errorInput : ''}`}
              >
                <option value="" hidden>Unit Kerja</option>
                <option value="HUMAS">HUMAS</option>
                <option value="SP">SP</option>
                <option value="PUR">PUR</option>
                <option value="FDSEK">FDSEK</option>
                <option value="KPKP">KPKP</option>
                <option value="TMI">TMI</option>
              </select>
              {errors.uker && <span className={styles.errorMsg}>{errors.uker}</span>}
            </div>

            <div className={`${styles.formGroup} ${styles.colFull}`}>
              <label htmlFor="tgl">Waktu Pesanan</label>
              <DatePicker
                id="tgl"
                selected={fields.tgl}
                onChange={(d) => handleDateChange(d, 'tgl')}
                showTimeSelect timeFormat="HH:mm" timeIntervals={15}
                dateFormat="dd MMMM yyyy HH:mm" timeCaption="Jam"
                minDate={new Date()} locale={idLocale}
                placeholderText="Pilih tanggal & jam"
                className={errors.tgl ? styles.errorInput : ''}
              />
              {errors.tgl && <span className={styles.errorMsg}>{errors.tgl}</span>}
            </div>

            {/* Pesanan + Jumlah */}
            <div className={`${styles.formGroup} ${styles.colFull} ${styles.orderGroup}`}>
              <label>Pesanan</label>

              <div className={styles.orderList}>
                {toObjList(fields.pesanan).map((row, idx) => (
                  <div className={styles.orderRow} key={idx}>
                    {/* Nama pesanan */}
                    <input
                      type="text"
                      id={`pesanan-${idx}`}
                      name={`pesanan-${idx}`}
                      placeholder={`Pesanan ${idx + 1}`}
                      value={row.item}
                      onChange={(e) => handlePesananChange(idx, e.target.value)}
                      className={errors.pesanan ? styles.errorInput : ''}
                    />

                    {/* Jumlah kecil */}
                    <input
                      type="number"
                      min={1}
                      step={1}
                      id={`qty-${idx}`}
                      name={`qty-${idx}`}
                      placeholder="Qty"
                      value={row.qty}
                      onChange={(e) => handleQtyChange(idx, e.target.value)}
                      className={`${styles.qtyInput} ${errors.pesanan ? styles.errorInput : ''}`}
                    />

                    {/* Hapus baris */}
                    <button
                      type="button"
                      className={styles.removeItemBtn}
                      onClick={() => removePesanan(idx)}
                      aria-label={`Hapus pesanan ${idx + 1}`}
                      title="Hapus"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>

              <div className={styles.orderActions}>
                <button type="button" className={styles.addItemBtn} onClick={addPesanan}>
                  + Tambah Pesanan
                </button>
              </div>

              {errors.pesanan && <span className={styles.errorMsg}>{errors.pesanan}</span>}
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
    // import di server agar tidak ikut bundle client
    const { jwtVerify } = await import('jose');
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
