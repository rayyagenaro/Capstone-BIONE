// 'use client'
import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { FaArrowLeft } from 'react-icons/fa';
import styles from './hal-BIcare.module.css';
import SidebarUser from '@/components/SidebarUser/SidebarUser';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import idLocale from 'date-fns/locale/id';

/* ===================== hooks & helpers ===================== */
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

/* kalender util */
const SESSIONS = ['12:00', '12:30', '13:00'];
const ymd = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};
const getMonthMatrix = (year, monthIndex0) => {
  const firstOfMonth = new Date(year, monthIndex0, 1);
  const lastOfMonth = new Date(year, monthIndex0 + 1, 0);
  const firstDayIdxSun0 = firstOfMonth.getDay();
  const firstDayIdxMon0 = (firstDayIdxSun0 + 6) % 7;
  const daysInMonth = lastOfMonth.getDate();

  const cells = [];
  for (let i = 0; i < firstDayIdxMon0; i++) {
    const d = new Date(year, monthIndex0, 1 - (firstDayIdxMon0 - i));
    cells.push(d);
  }
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, monthIndex0, d));
  while (cells.length < 42) {
    const last = cells[cells.length - 1];
    cells.push(new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1));
  }
  const weeks = [];
  for (let i = 0; i < 42; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
};

/* ===================== dropdown custom (styled) ===================== */
function CustomSelect({
  id,
  name,
  placeholder = 'Pilih',
  value,
  onChange,
  options = [],
  error = false,
}) {
  const dd = useDropdown(false);

  const selectedLabel =
    options.find((o) => String(o.value) === String(value))?.label || '';

  const handlePick = (val) => {
    onChange({ target: { name, value: val } });
    dd.setOpen(false);
  };

  return (
    <div className={styles.selectWrap} ref={dd.ref}>
      <button
        id={id}
        type="button"
        className={`${styles.selectBtn} ${error ? styles.errorInput : ''}`}
        onClick={() => dd.setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={dd.open}
      >
        <span className={selectedLabel ? styles.selectText : styles.selectPlaceholder}>
          {selectedLabel || placeholder}
        </span>
        <span className={styles.selectCaret} aria-hidden="true">▾</span>
      </button>

      {dd.open && (
        <ul className={styles.selectPopover} role="listbox" aria-labelledby={id}>
          {options.map((opt) => {
            const active = String(opt.value) === String(value);
            return (
              <li
                key={opt.value}
                role="option"
                aria-selected={active}
                className={`${styles.selectOption} ${active ? styles.selectOptionActive : ''}`}
                onClick={() => handlePick(opt.value)}
              >
                {opt.label}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/* ===================== kalender dokter ===================== */
function DoctorCalendar({ bookedMap, onPick, minDate = new Date(), onMonthChange }) {
  const today = new Date();
  const [cursor, setCursor] = useState(new Date(today.getFullYear(), today.getMonth(), 1));

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const matrix = useMemo(() => getMonthMatrix(year, month), [year, month]);
  const monthName = cursor.toLocaleString('id-ID', { month: 'long', year: 'numeric' });

  const isSameMonth = (d) => d.getMonth() === month && d.getFullYear() === year;
  const isBeforeMin = (d) => ymd(d) < ymd(minDate);
  const isDoctorDay = (d) => {
    const dow = d.getDay(); // 1=Sen, 5=Jum
    return dow === 1 || dow === 5;
  };

  const bookedSetByDate = useMemo(() => {
    const m = new Map();
    for (const [k, arr] of Object.entries(bookedMap || {})) {
      m.set(k, new Set((arr || []).map((t) => String(t).slice(0, 5))));
    }
    return m;
  }, [bookedMap]);

  const isBooked = (dateStr, time) => bookedSetByDate.get(dateStr)?.has(time) ?? false;

  const lastYmRef = useRef(null);
  useEffect(() => {
    const ym = `${year}-${String(month + 1).padStart(2, '0')}`;
    if (lastYmRef.current !== ym) {
      lastYmRef.current = ym;
      onMonthChange && onMonthChange(ym);
    }
  }, [year, month, onMonthChange]);

  return (
    <div className={styles.calWrap}>
      <div className={styles.calHeader}>
        <button
          type="button"
          className={styles.calNavBtn}
          onClick={() => setCursor(new Date(year, month - 1, 1))}
          aria-label="Bulan sebelumnya"
        >
          ‹
        </button>
        <div className={styles.calTitle}>{monthName}</div>
        <button
          type="button"
          className={styles.calNavBtn}
          onClick={() => setCursor(new Date(year, month + 1, 1))}
          aria-label="Bulan berikutnya"
        >
          ›
        </button>
      </div>

      <div className={styles.calDayNames}>
        {['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'].map((d) => (
          <div key={d} className={styles.calDayName}>
            {d}
          </div>
        ))}
      </div>

      <div className={styles.calGrid}>
        {matrix.map((week, wi) => (
          <React.Fragment key={wi}>
            {week.map((d, di) => {
              const inMonth = isSameMonth(d);
              const dateStr = ymd(d);
              const doctorOpen = inMonth && !isBeforeMin(d) && isDoctorDay(d);

              return (
                <div key={`${wi}-${di}`} className={`${styles.calCell} ${inMonth ? '' : styles.calCellMuted}`}>
                  <div className={styles.calCellHeader}>
                    <span className={styles.calDateNum}>{d.getDate()}</span>
                    {inMonth && isDoctorDay(d) && <span className={styles.calBadgeOpen}>Buka</span>}
                  </div>

                  {doctorOpen ? (
                    <div className={styles.sessionList}>
                      {SESSIONS.map((time) => {
                        const booked = isBooked(dateStr, time);
                        return (
                          <button
                            key={time}
                            type="button"
                            className={`${styles.sessionBtn} ${booked ? styles.sessionBooked : styles.sessionAvail}`}
                            disabled={booked}
                            onClick={() => onPick(d, time)}
                            aria-label={`Sesi ${time} pada ${d.toLocaleDateString('id-ID')}`}
                          >
                            {time} {booked ? '• Booked' : '• Available'}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className={styles.sessionListOff}>{inMonth ? (isDoctorDay(d) ? '—' : 'Tutup') : ''}</div>
                  )}
                </div>
              );
            })}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

/* ===================== halaman utama ===================== */
export default function FiturBICare() {
  const router = useRouter();
  const [showSuccess, setShowSuccess] = useState(false);
  const [bookedMap, setBookedMap] = useState({});

  const handleMonthChange = useCallback(async (ym) => {
    try {
      const res = await fetch(`/api/BIcare/booked?doctorId=1&month=${ym}&t=${Date.now()}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' },
      });
      if (!res.ok) throw new Error('Failed to fetch booked map');
      const data = await res.json();
      const map = data.bookedMap || {};

      // normalisasi kunci & jam
      const normalized = {};
      for (const [rawKey, arr] of Object.entries(map)) {
        const d = new Date(rawKey);
        const key = Number.isNaN(d.getTime()) ? String(rawKey) : ymd(d);
        normalized[key] = (arr || []).map((t) => String(t).slice(0, 5));
      }
      setBookedMap(normalized);
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    const now = new Date();
    handleMonthChange(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
  }, [handleMonthChange]);

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
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: null }));
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

    const payload = {
      doctorId: 1,
      bookingDate: ymd(fields.tglPengobatan),
      slotTime: fields.pukulPengobatan,
      booker_name: fields.namaPemesan,
      nip: fields.nip,
      wa: fields.wa,
      patient_name: fields.namaPasien,
      patient_status: fields.statusPasien,
      gender: fields.jenisKelamin,
      birth_date: fields.tglLahir ? fields.tglLahir.toISOString().slice(0, 10) : null,
      complaint: fields.keluhan || null,
    };

    const res = await fetch('/api/BIcare/book', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (res.status === 201) {
      setShowSuccess(true);
      const ymKey = `${payload.bookingDate.slice(0, 4)}-${payload.bookingDate.slice(5, 7)}`;
      handleMonthChange(ymKey);
    } else {
      const err = await res.json().catch(() => ({}));
      alert(err?.error || 'Gagal booking');
    }
  };

  const closeSuccess = () => setShowSuccess(false);

  const handlePickSession = (date, time) => {
    setFields((p) => ({ ...p, tglPengobatan: date, pukulPengobatan: time }));
    document.getElementById('tglPengobatan')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const prettyDate = fields.tglPengobatan
    ? fields.tglPengobatan.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })
    : '';

  return (
    <div className={styles.background}>
      <SidebarUser />
      <main className={styles.mainContent}>
        <div className={styles.formBox}>
          {/* Header (tanpa dropdown ketersediaan) */}
          <div className={styles.topRow}>
            <button className={styles.backBtn} onClick={() => router.back()} type="button">
              <FaArrowLeft /> Kembali
            </button>

            <div className={styles.logoCareWrapper}>
              <Image src="/assets/BI-CARE.svg" alt="BI.CARE" width={190} height={86} priority />
            </div>

            <div /> {/* spacer kanan agar logo tetap center */}
          </div>

          {/* Kalender */}
          <div className={styles.calendarBlockLarge}>
            <h3 className={styles.calendarTitle}>Pilih Tanggal & Sesi (Sen & Jum, 12.00–13.30)</h3>
            <DoctorCalendar
              bookedMap={bookedMap}
              onPick={handlePickSession}
              minDate={new Date()}
              onMonthChange={handleMonthChange}
            />
            <p className={styles.calendarHint}>Tanggal & jam hanya dapat diubah dari kalender ini.</p>
          </div>

          {/* Form */}
          <form className={styles.formGrid} onSubmit={onSubmit} autoComplete="off">
            <div className={`${styles.formGroup} ${styles.colFull}`}>
              <label htmlFor="namaPemesan">Nama Pemesan</label>
              <input
                id="namaPemesan" name="namaPemesan" type="text" placeholder="Masukkan Nama Anda"
                value={fields.namaPemesan} onChange={handleChange}
                className={errors.namaPemesan ? styles.errorInput : ''}
              />
              {errors.namaPemesan && <span className={styles.errorMsg}>{errors.namaPemesan}</span>}
            </div>

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

            <div className={styles.formGroup}>
              <label htmlFor="namaPasien">Nama Pasien</label>
              <input
                id="namaPasien" name="namaPasien" type="text" placeholder="Masukkan Nama Pasien"
                value={fields.namaPasien} onChange={handleChange}
                className={errors.namaPasien ? styles.errorInput : ''}
              />
              {errors.namaPasien && <span className={styles.errorMsg}>{errors.namaPasien}</span>}
            </div>

            {/* Status Pasien */}
            <div className={styles.formGroup}>
              <label htmlFor="statusPasien">Status Pasien</label>
              <CustomSelect
                id="statusPasien"
                name="statusPasien"
                placeholder="Pilih Status"
                value={fields.statusPasien}
                onChange={handleChange}
                error={!!errors.statusPasien}
                options={[
                  { value: 'Pegawai', label: 'Pegawai' },
                  { value: 'Pensiun', label: 'Pensiun' },
                  { value: 'Keluarga', label: 'Keluarga' },
                  { value: 'Tamu', label: 'Tamu' },
                ]}
              />
              {errors.statusPasien && <span className={styles.errorMsg}>{errors.statusPasien}</span>}
            </div>

            {/* Jenis Kelamin */}
            <div className={styles.formGroup}>
              <label htmlFor="jenisKelamin">Jenis Kelamin</label>
              <CustomSelect
                id="jenisKelamin"
                name="jenisKelamin"
                placeholder="Pilih Jenis Kelamin"
                value={fields.jenisKelamin}
                onChange={handleChange}
                error={!!errors.jenisKelamin}
                options={[
                  { value: 'Laki-laki', label: 'Laki-laki' },
                  { value: 'Perempuan', label: 'Perempuan' },
                ]}
              />
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

            <div className={styles.formGroup}>
              <label htmlFor="tglPengobatan">Tanggal Pengobatan</label>
              <input
                id="tglPengobatan"
                type="text"
                value={prettyDate}
                className={`${styles.readonlyField} ${errors.tglPengobatan ? styles.errorInput : ''}`}
                placeholder="Pilih dari kalender di atas"
                readOnly
                title="Ubah tanggal lewat kalender di atas"
              />
              {errors.tglPengobatan && <span className={styles.errorMsg}>{errors.tglPengobatan}</span>}
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="pukulPengobatan">Pukul Pengobatan</label>
              <input
                id="pukulPengobatan"
                type="text"
                value={fields.pukulPengobatan}
                className={`${styles.readonlyField} ${errors.pukulPengobatan ? styles.errorInput : ''}`}
                placeholder="Pilih dari kalender di atas"
                readOnly
                title="Ubah jam lewat kalender di atas"
              />
              {errors.pukulPengobatan && <span className={styles.errorMsg}>{errors.pukulPengobatan}</span>}
            </div>

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
