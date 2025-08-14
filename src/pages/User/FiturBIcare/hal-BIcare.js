import React, { useEffect, useState, useRef, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { FaArrowLeft } from 'react-icons/fa';
import styles from './hal-BIcare.module.css';
import SidebarUser from '@/components/SidebarUser/SidebarUser';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import idLocale from 'date-fns/locale/id';

// helper dropdown (klik di luar utk tutup)
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
      <div className={styles.popupMsg}><b>Booking Klinik Berhasil!</b></div>
    </div>
  </div>
);

export default function FiturBICare() {
  const router = useRouter();

  const [showSuccess, setShowSuccess] = useState(false);
  const [fields, setFields] = useState({
    namaPemesan: '',
    nip: '',
    wa: '',
    namaPasien: '',
    statusPasien: '',
    jenisKelamin: '',
    tglLahir: null,
    tglPengobatan: null,
    pukulPengobatan: '',
    keluhan: '',
  });
  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFields((p) => ({ ...p, [name]: value }));
  };
  const handleDateChange = (date, key) => {
    setFields((p) => ({ ...p, [key]: date }));
    if (errors[key]) setErrors((p) => ({ ...p, [key]: null }));
  };

  const validate = () => {
    const e = {};
    if (!fields.namaPemesan.trim()) e.namaPemesan = 'Nama pemesan wajib diisi';
    if (!fields.nip.trim()) e.nip = 'NIP wajib diisi';
    if (!fields.wa.trim()) e.wa = 'No WA wajib diisi';
    if (!fields.namaPasien.trim()) e.namaPasien = 'Nama pasien wajib diisi';
    if (!fields.statusPasien) e.statusPasien = 'Status pasien wajib dipilih';
    if (!fields.jenisKelamin) e.jenisKelamin = 'Jenis kelamin wajib dipilih';
    if (!fields.tglLahir) e.tglLahir = 'Tanggal lahir wajib diisi';
    if (!fields.tglPengobatan) e.tglPengobatan = 'Tanggal pengobatan wajib diisi';
    if (!fields.pukulPengobatan) e.pukulPengobatan = 'Pukul pengobatan wajib dipilih';
    return e;
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    const v = validate();
    if (Object.keys(v).length) { setErrors(v); return; }
    setErrors({});
    // TODO: submit ke API kamu di sini
    setShowSuccess(true);
  };

  const closeSuccess = () => setShowSuccess(false);

  // Dropdown dummy “Availability” (biar matching mockup)
  const availability = useDropdown(false);

  return (
    <div className={styles.background}>
      {/* Sidebar kamu sendiri bisa dipasang di sini */}
      <SidebarUser onLogout={() => setShowLogoutPopup(true)} />

      <main className={styles.mainContent}>
        <div className={styles.formBox}>
          {/* Top Row */}
          <div className={styles.topRow}>
              <button className={styles.backBtn} onClick={() => router.back()} type="button">
              <FaArrowLeft /> Kembali
              </button>

            <div className={styles.logoCareWrapper}>
              <Image src="/assets/D'CARE.svg" alt="BI.CARE" width={190} height={86} priority />
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
                        <thead>
                        <tr>
                            <th>Tipe</th>
                            <th>Hari</th>
                            <th>Pukul</th>
                        </tr>
                        </thead>
                        <tbody>
                        <tr>
                            <td>Poli Umum</td>
                            <td>Senin/Jumat</td>
                            <td>12.00 - 13.30 WIB</td>
                        </tr>
                        </tbody>
                    </table>
                    </div>
                )}
              </div>
            </div>
          </div>

          {/* FORM GRID */}
          <form className={styles.formGrid} onSubmit={onSubmit} autoComplete="off">
            {/* Nama Pemesan – full */}
            <div className={`${styles.formGroup} ${styles.colFull}`}>
              <label htmlFor="namaPemesan">Nama Pemesan</label>
              <input
                id="namaPemesan" name="namaPemesan" type="text" placeholder="Masukkan Nama Anda"
                value={fields.namaPemesan} onChange={handleChange}
                className={errors.namaPemesan ? styles.errorInput : ''}
              />
              {errors.namaPemesan && <span className={styles.errorMsg}>{errors.namaPemesan}</span>}
            </div>

            {/* NIP | No WA */}
            <div className={styles.formGroup}>
              <label htmlFor="nip">NIP</label>
              <input
                id="nip" name="nip" type="text" placeholder="Masukkan NIP"
                value={fields.nip} onChange={handleChange}
                className={errors.nip ? styles.errorInput : ''}
              />
              {errors.nip && <span className={styles.errorMsg}>{errors.nip}</span>}
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="wa">No WA</label>
              <input
                id="wa" name="wa" type="text" placeholder="Masukkan No WhatsApp"
                value={fields.wa} onChange={handleChange}
                className={errors.wa ? styles.errorInput : ''}
              />
              {errors.wa && <span className={styles.errorMsg}>{errors.wa}</span>}
            </div>

            {/* Nama Pasien | Status Pasien */}
            <div className={styles.formGroup}>
              <label htmlFor="namaPasien">Nama Pasien</label>
              <input
                id="namaPasien" name="namaPasien" type="text" placeholder="Masukkan Nama Pasien"
                value={fields.namaPasien} onChange={handleChange}
                className={errors.namaPasien ? styles.errorInput : ''}
              />
              {errors.namaPasien && <span className={styles.errorMsg}>{errors.namaPasien}</span>}
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="statusPasien">Status Pasien</label>
              <select
                id="statusPasien" name="statusPasien"
                value={fields.statusPasien} onChange={handleChange}
                className={`${styles.select} ${errors.statusPasien ? styles.errorInput : ''}`}
              >
                <option value="" hidden>Pilih Status</option>
                <option value="Pegawai">Pegawai</option>
                <option value="Pensiun">Pensiun</option>
                <option value="Keluarga">Keluarga</option>
                <option value="Tamu">Tamu</option>
              </select>
              {errors.statusPasien && <span className={styles.errorMsg}>{errors.statusPasien}</span>}
            </div>

            {/* Jenis Kelamin | Tanggal Lahir */}
            <div className={styles.formGroup}>
              <label htmlFor="jenisKelamin">Jenis Kelamin</label>
              <select
                id="jenisKelamin" name="jenisKelamin"
                value={fields.jenisKelamin} onChange={handleChange}
                className={`${styles.select} ${errors.jenisKelamin ? styles.errorInput : ''}`}
              >
                <option value="" hidden>Pilih Jenis Kelamin</option>
                <option value="Laki-laki">Laki-laki</option>
                <option value="Perempuan">Perempuan</option>
              </select>
              {errors.jenisKelamin && <span className={styles.errorMsg}>{errors.jenisKelamin}</span>}
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="tglLahir">Tanggal Lahir</label>
              <DatePicker
                id="tglLahir"
                selected={fields.tglLahir}
                onChange={(d) => handleDateChange(d, 'tglLahir')}
                dateFormat="dd MMMM yyyy"
                maxDate={new Date()}
                placeholderText="Pilih tanggal lahir"
                locale={idLocale}
                className={errors.tglLahir ? styles.errorInput : ''}
              />
              {errors.tglLahir && <span className={styles.errorMsg}>{errors.tglLahir}</span>}
            </div>

            {/* Tanggal Pengobatan | Pukul Pengobatan */}
            <div className={styles.formGroup}>
              <label htmlFor="tglPengobatan">Tanggal Pengobatan</label>
              <DatePicker
                id="tglPengobatan"
                selected={fields.tglPengobatan}
                onChange={(d) => handleDateChange(d, 'tglPengobatan')}
                dateFormat="dd MMMM yyyy"
                minDate={new Date()}
                placeholderText="Pilih tanggal"
                locale={idLocale}
                className={errors.tglPengobatan ? styles.errorInput : ''}
              />
              {errors.tglPengobatan && <span className={styles.errorMsg}>{errors.tglPengobatan}</span>}
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="pukulPengobatan">Pukul Pengobatan</label>
              <select
                id="pukulPengobatan" name="pukulPengobatan"
                value={fields.pukulPengobatan} onChange={handleChange}
                className={`${styles.select} ${errors.pukulPengobatan ? styles.errorInput : ''}`}
              >
                <option value="" hidden>Pilih Pukul</option>
                <option>08:00</option>
                <option>09:00</option>
                <option>10:00</option>
                <option>11:00</option>
                <option>13:00</option>
                <option>14:00</option>
              </select>
              {errors.pukulPengobatan && <span className={styles.errorMsg}>{errors.pukulPengobatan}</span>}
            </div>

            {/* Keluhan – full */}
            <div className={`${styles.formGroup} ${styles.colFull}`}>
              <label htmlFor="keluhan">Deskripsi Keluhan Pasien</label>
              <textarea
                id="keluhan" name="keluhan" rows={2}
                placeholder="Tulis keluhan pasien secara singkat"
                value={fields.keluhan} onChange={handleChange}
              />
            </div>

            <div className={`${styles.buttonWrapper} ${styles.colFull}`}>
              <button type="submit" className={styles.bookingBtn}>Booking</button>
            </div>
          </form>
        </div>

        {showSuccess && <SuccessPopup onClose={closeSuccess} />}
      </main>
    </div>
  );
}
