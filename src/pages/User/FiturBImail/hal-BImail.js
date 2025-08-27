// src/pages/BImail/hal-BImail.js
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/router';
import styles from './hal-BImail.module.css';
import { FaArrowLeft } from 'react-icons/fa';
import DatePicker from 'react-datepicker';
import idLocale from 'date-fns/locale/id';
import 'react-datepicker/dist/react-datepicker.css';

import SidebarUser from '@/components/SidebarUser/SidebarUser';
import LogoutPopup from '@/components/LogoutPopup/LogoutPopup';

const SuccessPopup = ({ onClose, message = "Data BI.MAIL berhasil disimpan!" }) => (
  <div className={styles.popupOverlay}>
    <div className={styles.popupBox}>
      <button className={styles.popupClose} onClick={onClose}>&times;</button>
      <div className={styles.popupIcon}>
        <svg width="70" height="70" viewBox="0 0 70 70">
          <circle cx="35" cy="35" r="35" fill="#7EDC89" />
          <polyline points="23,36 33,46 48,29" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
      <div className={styles.popupMsg}><b>{message}</b></div>
    </div>
  </div>
);

export default function HalBIMail() {
  const router = useRouter();
  const [showLogoutPopup, setShowLogoutPopup] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [errors, setErrors] = useState({});
  const [spinning, setSpinning] = useState(false);
  const spinTimerRef = useRef(null);

  const startSpinOnce = useCallback(() => {
    if (spinTimerRef.current) {
      clearTimeout(spinTimerRef.current);
      spinTimerRef.current = null;
    }
    setSpinning(false);
    requestAnimationFrame(() => {
      setSpinning(true);
      spinTimerRef.current = setTimeout(() => {
        setSpinning(false);
        spinTimerRef.current = null;
      }, 2000);
    });
  }, []);

  /* =======================
     Sumber data dinamis
     ======================= */

  // Fallback statis (dipakai kalau fetch gagal/kosong)
  const FALLBACK_JENIS = [
    { label: 'Lembar Disposisi Pejabat', code: 'LDP' },
    { label: 'Memorandum 01', code: 'M.01' },
    { label: 'Memorandum Koordinasi Kerjasama', code: 'M.01-KK' },
    { label: 'Memorandum 02', code: 'M.02' },
    { label: 'Lembar Pendapat', code: 'LP' },
    { label: 'Faksimili', code: 'FAKS' },
    { label: 'Surat', code: 'SRT' },
    { label: 'Pengumuman', code: 'PENG' },
    { label: 'Berita Acara', code: 'BA' },
    { label: 'Risalah Rapat', code: 'RSL' },
    { label: 'Surat Kuasa', code: 'SRT.K' },
    { label: 'Perjanjian', code: 'P' },
    { label: 'Sertifikat', code: 'SERTIF' },
    { label: 'Keputusan Kepala Perwakilan', code: 'KEP.KKPW' },
    { label: 'Dokumen Lain', code: 'DL' },
    { label: 'Nota Dinas', code: 'ND' },
  ];

  const FALLBACK_UNITS = [
    { label: '— Tanpa Unit —', code: '' },
    { label: 'KP',              code: 'KP' },
    { label: 'GPIK-KEKDAW',     code: 'GPIK-KEKDAW' },
    { label: 'KPKW',            code: 'KPKW' },
    { label: 'DIK-HUM (Humas)', code: 'DIK-HUM' },
    { label: 'DIK-FPPU',        code: 'DIK-FPPU' },
    { label: 'DIK-FDSEK',       code: 'DIK-FDSEK' },
    { label: 'SB-TMI',          code: 'SB-TMI' },
    { label: 'SPPUR-FIKSP',     code: 'SPPUR-FIKSP' },
    { label: 'SPPUR-FIPSP',     code: 'SPPUR-FIPSP' },
    { label: 'PUR',             code: 'PUR' },
  ];

  // Hasil fetch dari DB (raw)
  const [jenisList, setJenisList] = useState([]); // [{id,kode,nama}]
  const [unitList,  setUnitList]  = useState([]); // [{id,code,name}]

  // Opsi final yang dipakai UI (map/merge fallback)
  const jenisOptions = useMemo(() => {
    if (jenisList?.length) {
      return jenisList.map(j => ({ label: j.nama, code: j.kode }));
    }
    return FALLBACK_JENIS;
  }, [jenisList]);

  const unitOptions = useMemo(() => {
    if (unitList?.length) {
      const dbUnits = unitList.map(u => ({ label: u.name, code: u.code }));
      return [{ label: '— Tanpa Unit —', code: '' }, ...dbUnits];
    }
    return FALLBACK_UNITS;
  }, [unitList]);

  // Fetch referensi dari API admin (read-only untuk user)
  const fetchRefData = useCallback(async () => {
    try {
      const [jenisRes, unitRes] = await Promise.all([
        fetch('/api/ketersediaanAdmin?type=bimail_jenis', { cache: 'no-store' }),
        fetch('/api/ketersediaanAdmin?type=bimail_units', { cache: 'no-store' }),
      ]);
      const [jenisJson, unitJson] = await Promise.all([
        jenisRes.json().catch(() => ({})),
        unitRes.json().catch(() => ({})),
      ]);
      if (jenisJson?.success) setJenisList(jenisJson.data || []);
      if (unitJson?.success)  setUnitList(unitJson.data || []);
    } catch {
      // diamkan, fallback akan dipakai
    }
  }, []);

  useEffect(() => {
    fetchRefData();
  }, [fetchRefData]);

  /* =======================
     Form state & helpers
     ======================= */

  const [fields, setFields] = useState({
    tanggalDokumen: new Date(),
    jenisDokumen: '',
    tipeDokumen: '',
    unitKerja: '— Tanpa Unit —',
    perihal: '',
    dari: '',
    kepada: '',
    linkDokumen: '',
  });

  // Estimasi nomor
  const [nextNumber, setNextNumber] = useState(null);
  const [loadingNext, setLoadingNext] = useState(false);
  const isFetchingRef = useRef(false);
  const intervalRef = useRef(null);

  // Ambil code dari label yang dipilih
  const getJenisCode = useCallback(() => {
    const f = jenisOptions.find(x => x.label === fields.jenisDokumen);
    return f?.code || '';
  }, [fields.jenisDokumen, jenisOptions]);

  const getUnitCode = useCallback(() => {
    const u = unitOptions.find(x => x.label === fields.unitKerja);
    return (u?.code || '').trim();
  }, [fields.unitKerja, unitOptions]);

  useEffect(() => {
    return () => {
      if (spinTimerRef.current) clearTimeout(spinTimerRef.current);
    };
  }, []);

  const fetchEstimasi = useCallback(async () => {
    if (!fields.jenisDokumen || !fields.tanggalDokumen) return;
    const jenisCode = getJenisCode();
    const year = fields.tanggalDokumen.getFullYear();
    if (!jenisCode) return;
    if (isFetchingRef.current) return;

    startSpinOnce();

    isFetchingRef.current = true;
    setLoadingNext(true);
    const ac = new AbortController();
    try {
      const res = await fetch(
        `/api/BImail/nextNumber?kategoriCode=${encodeURIComponent(jenisCode)}&tahun=${year}`,
        { cache: 'no-store', signal: ac.signal }
      );
      if (!res.ok) throw new Error('gagal');
      const data = await res.json();
      setNextNumber(data?.next_number ?? null);
    } catch {
      // ignore
    } finally {
      setLoadingNext(false);
      isFetchingRef.current = false;
    }
    return () => ac.abort();
  }, [fields.jenisDokumen, fields.tanggalDokumen, getJenisCode, startSpinOnce]);

  useEffect(() => {
    setNextNumber(null);
    fetchEstimasi();
  }, [fetchEstimasi]);

  useEffect(() => {
    if (!fields.jenisDokumen || !fields.tanggalDokumen) return;
    intervalRef.current = setInterval(() => {
      fetchEstimasi();
    }, 7000);
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [fields.jenisDokumen, fields.tanggalDokumen, fetchEstimasi]);

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === 'visible') fetchEstimasi();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [fetchEstimasi]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFields(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: null }));
  };

  const handleDateChange = (date) => {
    setFields(prev => ({ ...prev, tanggalDokumen: date }));
    if (errors.tanggalDokumen) setErrors(prev => ({ ...prev, tanggalDokumen: null }));
  };

  // ===== Validasi wajib untuk 4 field: perihal, dari, kepada, linkDokumen =====
  const REQUIRED_LABEL = {
    perihal: 'Perihal',
    dari: 'Dari',
    kepada: 'Kepada',
    linkDokumen: 'Link Dokumen',
  };

  const handleBlurRequired = useCallback((e) => {
    const { name, value } = e.target;
    let msg = null;

    if (name === 'linkDokumen') {
      const v = String(value || '').trim();
      if (!v) msg = 'Link Dokumen wajib diisi';
    } else if (REQUIRED_LABEL[name]) {
      if (!String(value || '').trim()) msg = `${REQUIRED_LABEL[name]} wajib diisi`;
    }
    setErrors((prev) => ({ ...prev, [name]: msg }));
  }, []);

  const requiredOk = useMemo(() => {
    const p = fields.perihal?.trim();
    const d = fields.dari?.trim();
    const k = fields.kepada?.trim();
    const l = fields.linkDokumen?.trim();
    return Boolean(p && d && k && l);
  }, [fields.perihal, fields.dari, fields.kepada, fields.linkDokumen]);

  const validate = () => {
    const err = {};
    if (!fields.tanggalDokumen) err.tanggalDokumen = 'Tanggal Dokumen wajib diisi';
    if (!fields.jenisDokumen)  err.jenisDokumen  = 'Pilih jenis dokumen';
    if (!fields.tipeDokumen)   err.tipeDokumen   = 'Pilih tipe dokumen';
    if (!fields.perihal.trim())    err.perihal     = 'Perihal wajib diisi';
    if (!fields.dari.trim())       err.dari        = 'Dari wajib diisi';
    if (!fields.kepada.trim())     err.kepada      = 'Kepada wajib diisi';
    if (!fields.linkDokumen.trim()) err.linkDokumen = 'Link Dokumen wajib diisi';
    return err;
  };

  const nomorSuratPreview = () => {
    const tahun = fields.tanggalDokumen?.getFullYear?.() || null;
    const yyPlus2 = tahun ? String((tahun + 2) % 100).padStart(2, '0') : '--';
    const urut = (nextNumber != null) ? nextNumber : (loadingNext ? '...' : '---');
    const wilayah = 'Sb';
    const unit = getUnitCode();
    const wilayahUnit = unit ? `${wilayah}-${unit}` : wilayah;
    const jenis = getJenisCode() || '--';
    const tipe  = fields.tipeDokumen || '--';
    return `No.${yyPlus2}/${urut}/${wilayahUnit}/${jenis}/${tipe}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');
    const v = validate();
    if (Object.keys(v).length) {
      setErrors(v);
      return;
    }
    setIsSubmitting(true);

    try {
      const meRes = await fetch('/api/me?scope=user', { cache: 'no-store' });
      const meData = await meRes.json().catch(() => ({}));
      const userId = meData?.payload?.sub || null;

      const payload = {
        user_id: userId,
        tanggal_dokumen: fields.tanggalDokumen?.toISOString(),
        kategori_code: getJenisCode(),
        unit_code: getUnitCode(),
        tipe_dokumen: fields.tipeDokumen,
        perihal: fields.perihal,
        dari: fields.dari,
        kepada: fields.kepada,
        link_dokumen: fields.linkDokumen,
      };

      const res = await fetch('/api/BImail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Gagal menyimpan BI.MAIL');
      }

      const data = await res.json();
      setShowSuccess(true);
      console.log('Nomor final:', data.nomor_surat);
    } catch (err) {
      setSubmitError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.background}>
      <SidebarUser onLogout={() => setShowLogoutPopup(true)} />

      <main className={styles.mainContent}>
        <div className={styles.formBox}>
          <div className={styles.topRow}>
            <button className={styles.backBtn} onClick={() => router.back()} type="button">
              <FaArrowLeft /> Kembali
            </button>

            <div className={styles.logoDmoveWrapper}>
              <Image
                src="/assets/D'TRACK.svg"
                alt="BI-MAIL"
                width={180}
                height={85}
                priority
                style={{ height: 'auto' }}
              />
            </div>

            <div style={{ minWidth: 180 }} />
          </div>

          <form className={styles.formGrid} autoComplete="off" onSubmit={handleSubmit}>
            {/* Row 1 */}
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label htmlFor="tanggalDokumen">Tanggal Dokumen</label>
                <DatePicker
                  id="tanggalDokumen"
                  selected={fields.tanggalDokumen}
                  onChange={handleDateChange}
                  dateFormat="dd MMMM yyyy"
                  locale={idLocale}
                  className={errors.tanggalDokumen ? styles.errorInput : ''}
                />
                {errors.tanggalDokumen && <span className={styles.errorMsg}>{errors.tanggalDokumen}</span>}
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="jenisDokumen">Jenis Dokumen</label>
                <select
                  id="jenisDokumen"
                  name="jenisDokumen"
                  value={fields.jenisDokumen}
                  onChange={handleChange}
                  className={errors.jenisDokumen ? styles.errorInput : ''}
                >
                  <option value="">-- Pilih Jenis Dokumen --</option>
                  {jenisOptions.map(j => (
                    <option key={j.code} value={j.label}>{j.label} ({j.code})</option>
                  ))}
                </select>
                {errors.jenisDokumen && <span className={styles.errorMsg}>{errors.jenisDokumen}</span>}
              </div>
            </div>

            {/* Row 2 */}
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label htmlFor="tipeDokumen">Tipe Dokumen</label>
                <select
                  id="tipeDokumen"
                  name="tipeDokumen"
                  value={fields.tipeDokumen}
                  onChange={handleChange}
                  className={errors.tipeDokumen ? styles.errorInput : ''}
                >
                  <option value="">-- Pilih Tipe Dokumen --</option>
                  <option value="B">Dokumen Biasa (B)</option>
                  <option value="RHS">Dokumen Rahasia (RHS)</option>
                </select>
                {errors.tipeDokumen && <span className={styles.errorMsg}>{errors.tipeDokumen}</span>}
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="unitKerja">Unit Kerja (opsional)</label>
                <select
                  id="unitKerja"
                  name="unitKerja"
                  value={fields.unitKerja}
                  onChange={handleChange}
                  className={errors.unitKerja ? styles.errorInput : ''}
                >
                  {unitOptions.map(u => (
                    <option key={u.code || 'none'} value={u.label}>{u.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* PREVIEW NOMOR (Estimasi) + Refresh */}
            <div
              className={styles.previewNomor}
              style={{
                gridColumn: '1 / -1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                flexWrap: 'wrap'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <div>
                  <b>Preview Nomor (Estimasi):</b> {nomorSuratPreview()}
                </div>

                <button
                  type="button"
                  onClick={fetchEstimasi}
                  className={styles.refreshBtn}
                  disabled={loadingNext}
                  title="Muat ulang estimasi nomor"
                >
                  {loadingNext ? 'Merefresh...' : 'Refresh estimasi'}
                </button>
              </div>

              <div
                className={`${styles.refreshIconWrap} ${spinning ? styles.spinOnce : ''}`}
                role="img"
                aria-label={loadingNext ? 'Menyegarkan estimasi...' : 'Ikon refresh'}
                title={loadingNext ? 'Menyegarkan estimasi...' : 'Refresh'}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className={styles.refreshIcon}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99"
                  />
                </svg>
              </div>
            </div>

            {/* Info kecil */}
            <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#4b5563', marginTop: -30 }}>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: 14, height: 14 }}>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021
                    M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0
                    Zm-9-3.75h.008v.008H12V8.25Z"
                />
              </svg>
              <span>Refresh otomatis terjadi setiap 7 detik</span>
            </div>

            {/* Perihal (required) */}
            <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
              <label htmlFor="perihal">
                Perihal <span style={{ color: '#ef4444', marginLeft: 4 }}>*</span>
              </label>
              <textarea
                id="perihal"
                name="perihal"
                rows={2}
                value={fields.perihal}
                onChange={handleChange}
                onBlur={handleBlurRequired}
                required
                aria-required="true"
                className={errors.perihal ? styles.errorInput : ''}
                placeholder="Tuliskan perihal dokumen"
              />
              {errors.perihal && <span className={styles.errorMsg}>{errors.perihal}</span>}
            </div>

            {/* Dari (required) */}
            <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
              <label htmlFor="dari">
                Dari <span style={{ color: '#ef4444', marginLeft: 4 }}>*</span>
              </label>
              <textarea
                id="dari"
                name="dari"
                rows={2}
                value={fields.dari}
                onChange={handleChange}
                onBlur={handleBlurRequired}
                required
                aria-required="true"
                className={errors.dari ? styles.errorInput : ''}
                placeholder="Pihak pengirim"
              />
              {errors.dari && <span className={styles.errorMsg}>{errors.dari}</span>}
            </div>

            {/* Kepada (required) */}
            <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
              <label htmlFor="kepada">
                Kepada <span style={{ color: '#ef4444', marginLeft: 4 }}>*</span>
              </label>
              <textarea
                id="kepada"
                name="kepada"
                rows={2}
                value={fields.kepada}
                onChange={handleChange}
                onBlur={handleBlurRequired}
                required
                aria-required="true"
                className={errors.kepada ? styles.errorInput : ''}
                placeholder="Pihak penerima"
              />
              {errors.kepada && <span className={styles.errorMsg}>{errors.kepada}</span>}
            </div>

            {/* Link Dokumen (required, bebas format) */}
            <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <label htmlFor="linkDokumen">
                  Link Dokumen (SharePoint) <span style={{ color: '#ef4444', marginLeft: 4 }}>*</span>
                </label>
                <a
                  href="https://www.office.com/launch/sharepoint"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "#2667c7", fontWeight: 500, fontSize: 15 }}
                >
                  Buka SharePoint
                </a>
              </div>
              <input
                id="linkDokumen"
                name="linkDokumen"
                type="text"
                value={fields.linkDokumen}
                onChange={handleChange}
                onBlur={handleBlurRequired}
                required
                aria-required="true"
                className={errors.linkDokumen ? styles.errorInput : ''}
                placeholder="https://tenant.sharepoint.com/sites/.../Dokumen"
              />
              {errors.linkDokumen && <span className={styles.errorMsg}>{errors.linkDokumen}</span>}
            </div>

            <div className={styles.buttonWrapper}>
              <button
                type="submit"
                className={styles.bookingBtn}
                disabled={isSubmitting || !requiredOk}
                title={!requiredOk ? 'Lengkapi Perihal, Dari, Kepada, dan Link Dokumen' : undefined}
              >
                {isSubmitting ? 'Menyimpan...' : 'Simpan Nomor Surat'}
              </button>
            </div>
            {submitError && <div className={styles.submitErrorMsg}>{submitError}</div>}
          </form>
        </div>

        {showSuccess && (
          <SuccessPopup onClose={() => { setShowSuccess(false); router.push(`/User/StatusBooking/hal-statusBooking?ns=${ns}`); }} />
        )}
      </main>

      <LogoutPopup
        open={showLogoutPopup}
        onCancel={() => setShowLogoutPopup(false)}
        onLogout={async () => {
          try { await fetch('/api/logout', { method: 'POST' }); }
          finally { router.replace('/Signin/hal-sign'); }
        }}
      />
    </div>
  );
}
