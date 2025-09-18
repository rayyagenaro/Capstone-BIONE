import React, { useEffect, useState, useRef, useCallback } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/router';
import styles from './fiturBImeal.module.css';
import SidebarUser from '@/components/SidebarUser/SidebarUser';
import LogoutPopup from '@/components/LogoutPopup/LogoutPopup';
import { FaArrowLeft } from 'react-icons/fa';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import idLocale from 'date-fns/locale/id';
import { FaTrash } from 'react-icons/fa';
import { NS_RE } from '@/lib/ns-server';
import { getNsFromReq } from '@/lib/ns-server';
// import { withNs } from '@/lib/ns';

// ================= helper ns =================
const withNs = (url, ns) => {
  if (!ns) return url;
  const sep = url.includes('?') ? '&' : '?';
  return `${url}${sep}ns=${encodeURIComponent(ns)}`;
};

// ==== helper konversi pesanan ke bentuk objek {item, qty} ====
const toObjList = (list) => {
  if (!Array.isArray(list)) return [{ item: '', qty: 1, unit: 'pcs' }];
  return list.map((x) =>
    typeof x === 'string'
      ? { item: x, qty: 1, unit: 'pcs' }
      : { 
          item: x?.item ?? '', 
          qty: Number(x?.qty) > 0 ? Number(x.qty) : 1,
          unit: x?.unit || 'pcs'
        }
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
  const ns = typeof router.query.ns === 'string' && NS_RE.test(router.query.ns) ? router.query.ns : '';

  // guard
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const r = await fetch('/api/me?scope=user', { cache: 'no-store' });
        const d = await r.json();
        if (!active) return;
        const ok = d?.hasToken && d?.payload?.role === 'user';
        if (!ok) {
          router.replace(withNs('/Signin/hal-sign?from=' + encodeURIComponent(router.asPath), ns));
        }
      } catch {
        router.replace(withNs('/Signin/hal-sign?from=' + encodeURIComponent(router.asPath), ns));
      }
    })();
    return () => { active = false; };
  }, [router, ns]);

  const [showLogoutPopup, setShowLogoutPopup] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [serverMsg, setServerMsg] = useState('');

  const [fields, setFields] = useState({
    nama_pic: '',
    nama_pic_tagihan: '',
    wa: '',
    uker: '',
    tgl: null,
    ket: '',
    lokasi: '',
    pesanan: [{ item: '', qty: 1, unit:'pcs' }],
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

  // handler unit
  const handleUnitChange = (idx, value) => {
    setFields(prev => {
      const list = toObjList(prev.pesanan);
      list[idx] = { ...list[idx], unit: value };
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

  // validasi sisi-klien
// validasi sisi-klien
  const validate = () => {
    const e = {};
    if (!fields.nama_pic.trim()) e.nama_pic = 'Nama wajib diisi';
    if (!fields.nama_pic_tagihan.trim()) e.nama_pic_tagihan = 'Nama PIC Tagihan wajib diisi';
    if (!fields.wa.trim()) e.wa = 'No WA wajib diisi';
    if (!fields.uker) e.uker = 'Unit Kerja wajib dipilih';
    if (!fields.tgl) e.tgl = 'Tanggal pesanan wajib diisi';
    if (!fields.ket.trim()) e.ket = 'Keterangan wajib diisi';
    if (!fields.lokasi.trim()) e.lokasi = 'Lokasi pengiriman wajib diisi';

    const list = toObjList(fields.pesanan);

    // cek minimal ada pesanan
    if (!list.length) {
      e.pesanan = 'Minimal satu pesanan diisi';
    }

    // cek tiap baris
    list.forEach((p, i) => {
      if (!p.item.trim()) {
        e.pesanan = `Pesanan ${i + 1} belum diisi nama`;
      } else if (!p.qty || p.qty <= 0) {
        e.pesanan = `Pesanan ${i + 1} jumlah harus lebih dari 0`;
      } else if (!p.unit || !['pcs', 'dus', 'kotak'].includes(p.unit)) {
        e.pesanan = `Pesanan ${i + 1} wajib memilih satuan`;
      }
    });

    return e;
  };


  // helper konversi Date JS -> ISO string
  const toISOStringLocal = (d) => (d instanceof Date ? d.toISOString() : null);

  const onSubmit = async (e) => {
    e.preventDefault();
    setServerMsg('');
    const v = validate();
    if (Object.keys(v).length) { setErrors(v); return; }

    setSubmitting(true);
    setErrors({});

    try {
      const payload = {
        ...fields,
        tgl: toISOStringLocal(fields.tgl),
        pesanan: toObjList(fields.pesanan),
      };

      const r = await fetch(withNs('/api/bimeal/book', ns), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        credentials: 'include',
      });

      if (r.status === 401) {
        router.replace(withNs('/Signin/hal-sign?from=' + encodeURIComponent(router.asPath), ns));
        return;
      }

      const data = await r.json();

      if (!r.ok) {
        if (r.status === 422 && data?.details) {
          setErrors(data.details);
        } else {
          setServerMsg(data?.error || 'Terjadi kesalahan. Coba lagi.');
        }
        return;
      }

      setShowSuccess(true);
      setFields({
        nama_pic: '',
        nama_pic_tagihan: '',
        wa: '',
        uker: '',
        tgl: null,
        pesanan: [{ item: '', qty: 1, unit: 'pcs' }],
        ket: '',
        lokasi: '',
      });
    } catch (err) {
      setServerMsg('Gagal mengirim data. Periksa koneksi Anda.');
    } finally {
      setSubmitting(false);
    }
  };

    const closeSuccess = () => {
      setShowSuccess(false);
      router.push(`/User/OngoingBooking/bimeal/hal-orders?ns=${ns}`);
  };

  const handleLogout = async () => {
    try { await fetch('/api/logout', { method: 'POST' }); } catch {}
    router.replace(withNs('/Signin/hal-sign', ns));
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
          <form className={styles.formGrid} onSubmit={onSubmit} autoComplete="off" noValidate>
            <div className={styles.formGroup}>
              <label htmlFor="nama_pic">Nama Pemesan</label>
              <input
                id="nama_pic" name="nama_pic" type="text" placeholder="Masukkan Nama Anda"
                value={fields.nama_pic} onChange={handleChange}
                className={errors.nama_pic ? styles.errorInput : ''}
                aria-invalid={!!errors.nama_pic} aria-describedby={errors.nama_pic ? 'err-nama_pic' : undefined}
              />
              {errors.nama_pic && <span id="err-nama_pic" className={styles.errorMsg}>{errors.nama_pic}</span>}
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="wa">No WA Pemesan</label>
              <input
                id="wa" name="wa" type="text" placeholder="Masukkan No WA Anda"
                value={fields.wa} onChange={handleChange}
                inputMode="tel"
                className={errors.wa ? styles.errorInput : ''}
                aria-invalid={!!errors.wa} aria-describedby={errors.wa ? 'err-wa' : undefined}
              />
              {errors.wa && <span id="err-wa" className={styles.errorMsg}>{errors.wa}</span>}
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="nama_pic_tagihan">Nama PIC Tagihan</label>
              <input
                id="nama_pic_tagihan" name="nama_pic_tagihan" type="text" placeholder="Masukkan Nama PIC Tagihan"
                value={fields.nama_pic_tagihan} onChange={handleChange}
                className={errors.nama_pic_tagihan ? styles.errorInput : ''}
                aria-invalid={!!errors.nama_pic_tagihan} aria-describedby={errors.nama_pic_tagihan ? 'err-nama_pic_tagihan' : undefined}
              />
              {errors.nama_pic_tagihan && <span id="err-nama_pic_tagihan" className={styles.errorMsg}>{errors.nama_pic_tagihan}</span>}
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="tgl">Waktu Antar</label>
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
            <div className={styles.formGroup}>
              <label htmlFor="uker">Atas Beban Anggaran</label>
              <select
                id="uker" name="uker"
                value={fields.uker} onChange={handleChange}
                className={`${styles.select} ${errors.uker ? styles.errorInput : ''}`}
                aria-invalid={!!errors.uker} aria-describedby={errors.uker ? 'err-uker' : undefined}
              >
                <option value="" hidden>Unit Kerja</option>
                <option value="HUMAS">HUMAS</option>
                <option value="SP">SP</option>
                <option value="PUR">PUR</option>
                <option value="FDSEK">FDSEK</option>
                <option value="KPKP">KPKP</option>
                <option value="TMI">TMI</option>
              </select>
              {errors.uker && <span id="err-uker" className={styles.errorMsg}>{errors.uker}</span>}
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="lokasi">Lokasi Pengiriman (Ruangan)</label>
              <input
                id="lokasi" name="lokasi" type="text" placeholder="Ruangan Tujuan Pesanan"
                value={fields.lokasi} onChange={handleChange}
                className={errors.lokasi ? styles.errorInput : ''}
                aria-invalid={!!errors.lokasi} aria-describedby={errors.lokasi ? 'err-lokasi' : undefined}
              />
              {errors.lokasi && <span id="err-lokasi" className={styles.errorMsg}>{errors.lokasi}</span>}
            </div>
            <div className={`${styles.formGroup} ${styles.colBig}`}>
              <label htmlFor="ket">Agenda</label>
              <textarea
                id="ket" name="ket" type="text" placeholder="Agenda"
                value={fields.ket} onChange={handleChange}
                className={errors.ket ? styles.errorInput : ''}
                aria-invalid={!!errors.ket} aria-describedby={errors.ket ? 'err-ket' : undefined}
              />
              {errors.ket && <span id="err-ket" className={styles.errorMsg}>{errors.ket}</span>}
            </div>

            {/* Pesanan + Jumlah + Satuan */}
            <div className={`${styles.formGroup} ${styles.colFull} ${styles.orderGroup}`}>

              <div className={styles.orderList}>
                {toObjList(fields.pesanan).map((row, idx) => (
                  <div className={styles.orderRow} key={idx}>
                    {/* Nama pesanan */}
                    <div className={styles.orderCell}>
                      <label htmlFor={`pesanan-${idx}`}>Pesanan</label>
                      <input
                        type="text"
                        id={`pesanan-${idx}`}
                        name={`pesanan-${idx}`}
                        placeholder={`Pesanan ${idx + 1}`}
                        value={row.item}
                        onChange={(e) => handlePesananChange(idx, e.target.value)}
                        className={errors.pesanan ? styles.errorInput : ''}
                      />
                    </div>

                    {/* Jumlah */}
                    <div className={styles.orderCell}>
                      <label htmlFor={`qty-${idx}`}>Jumlah</label>
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
                    </div>

                    {/* Satuan */}
                    <div className={styles.orderCell}>
                      <label htmlFor={`unit-${idx}`}>Satuan</label>
                      <select
                        id={`unit-${idx}`}
                        name={`unit-${idx}`}
                        value={row.unit || 'pcs'}
                        onChange={(e) => handleUnitChange(idx, e.target.value)}
                        className={styles.unitSelect}
                      >
                        <option value="pcs">pcs</option>
                        <option value="dus">dus</option>
                        <option value="kotak">kotak</option>
                      </select>
                    </div>

                    {/* Hapus baris */}
                    <button
                      type="button"
                      className={styles.removeItemBtn}
                      onClick={() => removePesanan(idx)}
                      aria-label={`Hapus pesanan ${idx + 1}`}
                      title="Hapus"
                    >
                      <FaTrash />
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


            {serverMsg && (
              <div className={`${styles.colFull} ${styles.serverMsg}`}>
                {serverMsg}
              </div>
            )}

            <div className={`${styles.buttonWrapper} ${styles.colFull}`}>
              <button
                type="submit"
                className={styles.bookingBtn}
                disabled={submitting}
                aria-busy={submitting}
              >
                {submitting ? 'Memproses…' : 'Booking'}
              </button>
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
  const ns = getNsFromReq(ctx.req);
  if (!token) {
    return {
      redirect: {
        destination: withNs(`/Signin/hal-sign?from=${encodeURIComponent(ctx.resolvedUrl)}`, ns),
        permanent: false
      }
    };
  }
  try {
    const { jwtVerify } = await import('jose');
    const secret = process.env.JWT_SECRET;
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret), {
      algorithms: ['HS256'],
      clockTolerance: 10,
    });
    if (payload?.role !== 'user') {
      return {
        redirect: {
          destination: withNs(`/Signin/hal-sign?from=${encodeURIComponent(ctx.resolvedUrl)}`, ns),
          permanent: false
        }
      };
    }
    return { props: {} };
  } catch {
    return {
      redirect: {
        destination: withNs(`/Signin/hal-sign?from=${encodeURIComponent(ctx.resolvedUrl)}`, ns),
        permanent: false
      }
    };
  }
}
