// src/pages/BIMail/hal-bimail.js
import React, { useState, useEffect, useCallback } from 'react';
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

  // ===== Dropdowns (disesuaikan dengan catatan barumu) =====
  const JENIS_DOKUMEN = [
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
  const TIPE_DOKUMEN = [
    { label: 'Tipe Biasa', value: 'B' },
    { label: 'Tipe Rahasia', value: 'RHS' },
  ];
  // Unit kerja opsional setelah 'Sb-'
  const UNIT_KERJA = [
    { label: '— Tanpa Unit —', code: '' },   // opsional
    { label: 'TMI', code: 'TMI' },
    { label: 'KP', code: 'KP' },
    { label: 'HUMAS', code: 'HUMAS' },
    { label: 'KPKW', code: 'KPKW' },
    { label: 'FDSEK', code: 'FDSEK' },
    { label: 'SPPUR', code: 'SPPUR' },
    { label: 'FIKSP', code: 'FIKSP' },
    { label: 'FIPSP', code: 'FIPSP' },
  ];

  const [fields, setFields] = useState({
    tanggalDokumen: new Date(),
    jenisDokumen: '',
    tipeDokumen: '',
    unitKerja: '— Tanpa Unit —',  // default opsional
    perihal: '',
    dari: '',
    kepada: '',
    linkDokumen: '',
  });

  const [nextNumber, setNextNumber] = useState(null);
  const [loadingNext, setLoadingNext] = useState(false);

  const getJenisCode = useCallback(() => {
    const f = JENIS_DOKUMEN.find(x => x.label === fields.jenisDokumen);
    return f?.code || '';
  }, [fields.jenisDokumen]);

  const getUnitCode = useCallback(() => {
    const u = UNIT_KERJA.find(x => x.label === fields.unitKerja);
    return (u?.code || '').trim();
  }, [fields.unitKerja]);

  // Live preview: ambil next-number saat jenis/tahun berubah
  useEffect(() => {
    const run = async () => {
      setNextNumber(null);
      if (!fields.jenisDokumen || !fields.tanggalDokumen) return;
      const jenisCode = getJenisCode();
      const year = fields.tanggalDokumen.getFullYear();
      if (!jenisCode) return;

      try {
        setLoadingNext(true);
        const res = await fetch(`/api/BImail/nextNumber?kategoriCode=${encodeURIComponent(jenisCode)}&tahun=${year}`, { cache: 'no-store' });
        if (!res.ok) throw new Error('gagal');
        const data = await res.json();
        setNextNumber(data?.next_number ?? null);
      } catch {
        setNextNumber(null);
      } finally {
        setLoadingNext(false);
      }
    };
    run();
  }, [fields.jenisDokumen, fields.tanggalDokumen, getJenisCode]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFields(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: null }));
  };

  const handleDateChange = (date) => {
    setFields(prev => ({ ...prev, tanggalDokumen: date }));
    if (errors.tanggalDokumen) setErrors(prev => ({ ...prev, tanggalDokumen: null }));
  };

  // === VALIDASI (unit kerja TIDAK wajib) ===
  const validate = () => {
    const err = {};
    if (!fields.tanggalDokumen) err.tanggalDokumen = 'Tanggal Dokumen wajib diisi';
    if (!fields.jenisDokumen)  err.jenisDokumen  = 'Pilih jenis dokumen';
    if (!fields.tipeDokumen)   err.tipeDokumen   = 'Pilih tipe dokumen';
    // unitKerja opsional → tidak divalidasi wajib
    if (!fields.perihal.trim()) err.perihal = 'Perihal wajib diisi';
    if (!fields.dari.trim())    err.dari    = 'Dari wajib diisi';
    if (!fields.kepada.trim())  err.kepada  = 'Kepada wajib diisi';
    if (!fields.linkDokumen.trim()) err.linkDokumen = 'Link Dokumen wajib diisi';
    else if (!/^https?:\/\//i.test(fields.linkDokumen.trim())) {
      err.linkDokumen = 'Link harus diawali http:// atau https://';
    }
    return err;
  };

  const nomorSuratPreview = () => {
    const tahun = fields.tanggalDokumen?.getFullYear?.() || null;
    const yyPlus2 = tahun ? String((tahun + 2) % 100).padStart(2, '0') : '--'; // 2025 -> 27
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
        kategori_code: getJenisCode(),    // kode jenis untuk counter
        unit_code: getUnitCode(),         // opsional; '' akan diperlakukan NULL di backend
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
      setShowSuccess(true);
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
            <Link href="/User/HalamanUtama/hal-utamauser">
              <button className={styles.backBtn} type="button">
                <FaArrowLeft /> Kembali
              </button>
            </Link>

            <div className={styles.logoDmoveWrapper}>
              <Image src="/assets/BI-MAIL.svg" alt="BI-MAIL" width={180} height={85} priority />
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
                  {JENIS_DOKUMEN.map(j => (
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
                  <option value="">-- Pilih Tipe --</option>
                  {TIPE_DOKUMEN.map(t => (
                    <option key={t.value} value={t.value}>{t.label} ({t.value})</option>
                  ))}
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
                  {UNIT_KERJA.map(u => (
                    <option key={u.code || 'none'} value={u.label}>{u.label}</option>
                  ))}
                </select>
                {/* tidak ada error karena opsional */}
              </div>
            </div>

            {/* Perihal */}
            <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
              <label htmlFor="perihal">Perihal</label>
              <textarea
                id="perihal"
                name="perihal"
                rows={2}
                value={fields.perihal}
                onChange={handleChange}
                className={errors.perihal ? styles.errorInput : ''}
                placeholder="Tuliskan perihal dokumen"
              />
              {errors.perihal && <span className={styles.errorMsg}>{errors.perihal}</span>}
            </div>

            {/* Dari */}
            <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
              <label htmlFor="dari">Dari</label>
              <textarea
                id="dari"
                name="dari"
                rows={2}
                value={fields.dari}
                onChange={handleChange}
                className={errors.dari ? styles.errorInput : ''}
                placeholder="Pihak pengirim"
              />
              {errors.dari && <span className={styles.errorMsg}>{errors.dari}</span>}
            </div>

            {/* Kepada */}
            <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
              <label htmlFor="kepada">Kepada</label>
              <textarea
                id="kepada"
                name="kepada"
                rows={2}
                value={fields.kepada}
                onChange={handleChange}
                className={errors.kepada ? styles.errorInput : ''}
                placeholder="Pihak penerima"
              />
              {errors.kepada && <span className={styles.errorMsg}>{errors.kepada}</span>}
            </div>

            {/* PREVIEW NOMOR */}
            <div className={styles.previewNomor} style={{ gridColumn: '1 / -1' }}>
              <b>Preview Nomor Surat:</b> {nomorSuratPreview()}
            </div>

            {/* Link Dokumen */}
            <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <label htmlFor="linkDokumen">Link Dokumen (SharePoint)</label>
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
                className={errors.linkDokumen ? styles.errorInput : ''}
                placeholder="https://tenant.sharepoint.com/sites/.../Dokumen"
              />
              {errors.linkDokumen && <span className={styles.errorMsg}>{errors.linkDokumen}</span>}
            </div>

            <div className={styles.buttonWrapper}>
              <button type="submit" className={styles.bookingBtn} disabled={isSubmitting}>
                {isSubmitting ? 'Menyimpan...' : 'Simpan Nomor Surat'}
              </button>
            </div>
            {submitError && <div className={styles.submitErrorMsg}>{submitError}</div>}
          </form>
        </div>

        {showSuccess && (
          <SuccessPopup onClose={() => { setShowSuccess(false); router.push('/User/HalamanUtama/hal-utamauser'); }} />
        )}
      </main>

      <LogoutPopup
        open={true === showLogoutPopup}
        onCancel={() => setShowLogoutPopup(false)}
        onLogout={async () => {
          try { await fetch('/api/logout', { method: 'POST' }); }
          finally { router.replace('/Signin/hal-sign'); }
        }}
      />
    </div>
  );
}
