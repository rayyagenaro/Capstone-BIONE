import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import styles from './fiturDmove.module.css';
import { FaHome, FaClipboardList, FaHistory, FaCog, FaSignOutAlt, FaArrowLeft } from 'react-icons/fa';
import { DateRange } from 'react-date-range';
import { addDays, format } from 'date-fns';
import idLocale from 'date-fns/locale/id';
import 'react-date-range/dist/styles.css';
import 'react-date-range/dist/theme/default.css';

export default function FiturDmove() {
  // State field
  const [fields, setFields] = useState({
    jenisKendaraan: '',
    lokasi: 'Malang',
    jumlahOrang: '6 Orang',
    jumlahKendaraan: '1',
    volumeBarang: '5 Kg',
    noHp: '0812345678910',
    keterangan: 'Kebutuhan Dinas di Kota Malang',
    attachment: null,
  });

  // State date range
  const [dateRange, setDateRange] = useState([{
    startDate: new Date(),
    endDate: addDays(new Date(), 2),
    key: 'selection',
  }]);
  const [showCalendar, setShowCalendar] = useState(false);
  const calendarRef = useRef();

  // Error state
  const [errors, setErrors] = useState({});

  // Format tanggal Indonesia
  function formatDateIndo(d) {
    return format(d, "dd MMMM yyyy", { locale: idLocale });
  }

  // Click outside handler
  useEffect(() => {
    function handleClickOutside(e) {
      if (calendarRef.current && !calendarRef.current.contains(e.target)) {
        setShowCalendar(false);
      }
    }
    if (showCalendar) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showCalendar]);

  // Handle field change
  function handleChange(e) {
    const { name, value, files } = e.target;
    setFields({
      ...fields,
      [name]: files ? files[0] : value,
    });
    setErrors({
      ...errors,
      [name]: undefined,
    });
  }

  // Validasi
  function validate() {
    const err = {};
    if (!fields.jenisKendaraan) err.jenisKendaraan = 'Pilih jenis kendaraan';
    if (!fields.lokasi) err.lokasi = 'Isi lokasi atau tujuan';
    if (!fields.jumlahOrang) err.jumlahOrang = 'Isi jumlah orang';
    if (!fields.jumlahKendaraan) err.jumlahKendaraan = 'Isi jumlah kendaraan';
    if (!fields.volumeBarang) err.volumeBarang = 'Isi volume barang';
    if (!dateRange[0].startDate || !dateRange[0].endDate) err.durasi = 'Pilih durasi pemesanan';
    if (!fields.noHp) err.noHp = 'Isi nomor HP';
    if (!fields.keterangan) err.keterangan = 'Isi keterangan booking';
    if (!fields.attachment) err.attachment = 'Lampirkan file';
    return err;
  }

  // Handle submit
  function handleSubmit(e) {
    e.preventDefault();
    const err = validate();
    setErrors(err);
    if (Object.keys(err).length === 0) {
      alert(
        'Booking berhasil!\n' +
        `Durasi: ${formatDateIndo(dateRange[0].startDate)} - ${formatDateIndo(dateRange[0].endDate)}\n` +
        JSON.stringify(fields, null, 2)
      );
      // Kirim ke API di sini...
    }
  }

  return (
    <div className={styles.background}>
      {/* SIDEBAR */}
      <aside className={styles.sidebar}>
        <div className={styles.logoSidebar}>
          <Image
            src="/assets/BI_Logo.png"
            alt="Bank Indonesia"
            width={110}
            height={36}
            className={styles.logoDone}
            priority
          />
        </div>
        <nav className={styles.navMenu}>
          <ul>
           <li className={styles.active}><FaHome className={styles.menuIcon} /><Link href='/HalamanUtama/hal-utamauser'>Beranda</Link></li>
            <li><FaClipboardList className={styles.menuIcon} /><Link href='/StatusBooking/hal-statusBooking'>Status Booking</Link></li>
            <li><FaHistory className={styles.menuIcon} /><Link href='/HalamanUtama/hal-utamauser#'>Riwayat Pesanan</Link></li>
            <li><FaCog className={styles.menuIcon} /><Link href='/EditProfile/hal-editprofile'>Pengaturan</Link></li>
          </ul>
        </nav>
        <div className={styles.logout}>
          <Link href="/Login/hal-login" passHref legacyBehavior>
            <FaSignOutAlt className={styles.logoutIcon} />
          </Link>
          Logout
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className={styles.mainContent}>
        {/* HEADER NAVBAR */}
        <div className={styles.header}>
          <div className={styles.logoBIWrapper}>
            <Image
              src="/assets/D'ONE.png"
              alt="D'ONE"
              width={170}
              height={34}
              className={styles.logoBI}
              priority
            />
          </div>
          <form className={styles.searchBar}>
            <input type="text" placeholder="Search" />
            <button type="submit">
              <svg width="20" height="20" fill="#2F4D8E">
                <circle cx="9" cy="9" r="8" stroke="#2F4D8E" strokeWidth="2" fill="none" />
                <line x1="15" y1="15" x2="19" y2="19" stroke="#2F4D8E" strokeWidth="2" />
              </svg>
            </button>
            <span className={styles.searchLabel}></span>
          </form>
        </div>

        {/* D'MOVE FORM BOX */}
        <div className={styles.formBox}>
          <div className={styles.topRow}>
            <button className={styles.backBtn}><FaArrowLeft /> <Link href="/HalamanUtama/hal-utamauser" passHref legacyBehavior>Kembali</Link></button>
            <div className={styles.logoDmoveWrapper}>
              <Image
                src="/assets/D'MOVE.png"
                alt="D'MOVE"
                width={120}
                height={85}
                className={styles.logoDmove}
                priority
              />
            </div>
          </div>

          <form className={styles.formGrid} autoComplete="off" onSubmit={handleSubmit}>
            {/* Jenis Kendaraan & Lokasi */}
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label htmlFor="jenisKendaraan">Jenis Kendaraan</label>
                <select
                  id="jenisKendaraan"
                  name="jenisKendaraan"
                  value={fields.jenisKendaraan}
                  onChange={handleChange}
                  className={errors.jenisKendaraan ? styles.errorInput : ''}
                >
                  <option value="">Pilih Kendaraan</option>
                  <option value="Mobil SUV">Mobil SUV</option>
                  <option value="Mobil MPV">Mobil MPV</option>
                  <option value="Truck">Truck</option>
                  <option value="Minibus">Minibus</option>
                  <option value="Double Cabin">Double Cabin</option>
                  <option value="Kaskeliling">Kaskeliling</option>
                  <option value="Edukator">Edukator</option>
                </select>
                {errors.jenisKendaraan && <span className={styles.errorMsg}>{errors.jenisKendaraan}</span>}
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="lokasi">Lokasi atau Tujuan</label>
                <input
                  id="lokasi"
                  name="lokasi"
                  type="text"
                  value={fields.lokasi}
                  onChange={handleChange}
                  className={errors.lokasi ? styles.errorInput : ''}
                />
                {errors.lokasi && <span className={styles.errorMsg}>{errors.lokasi}</span>}
              </div>
            </div>
            {/* Jumlah Orang, Jumlah Kendaraan, Volume Barang */}
            <div className={styles.formRow3}>
              <div className={styles.formGroup}>
                <label htmlFor="jumlahOrang">Jumlah Orang</label>
                <input
                  id="jumlahOrang"
                  name="jumlahOrang"
                  type="text"
                  value={fields.jumlahOrang}
                  onChange={handleChange}
                  className={errors.jumlahOrang ? styles.errorInput : ''}
                />
                {errors.jumlahOrang && <span className={styles.errorMsg}>{errors.jumlahOrang}</span>}
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="jumlahKendaraan">Jumlah Kendaraan</label>
                <input
                  id="jumlahKendaraan"
                  name="jumlahKendaraan"
                  type="number"
                  value={fields.jumlahKendaraan}
                  onChange={handleChange}
                  className={errors.jumlahKendaraan ? styles.errorInput : ''}
                />
                {errors.jumlahKendaraan && <span className={styles.errorMsg}>{errors.jumlahKendaraan}</span>}
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="volumeBarang">Volume Barang</label>
                <input
                  id="volumeBarang"
                  name="volumeBarang"
                  type="text"
                  value={fields.volumeBarang}
                  onChange={handleChange}
                  className={errors.volumeBarang ? styles.errorInput : ''}
                />
                {errors.volumeBarang && <span className={styles.errorMsg}>{errors.volumeBarang}</span>}
              </div>
            </div>
            {/* Durasi Pemesanan & No HP */}
            <div className={styles.formRow}>
              <div className={styles.formGroup} style={{ position: 'relative' }}>
                <label htmlFor="durasi">Durasi Pemesanan</label>
                <input
                  id="durasi"
                  name="durasi"
                  type="text"
                  className={errors.durasi ? styles.errorInput : ''}
                  value={
                    dateRange[0].startDate && dateRange[0].endDate
                      ? `${formatDateIndo(dateRange[0].startDate)} - ${formatDateIndo(dateRange[0].endDate)}`
                      : ''
                  }
                  placeholder="Pilih tanggal..."
                  readOnly
                  onClick={() => setShowCalendar(true)}
                  style={{ background: '#fff', cursor: 'pointer' }}
                />
                {errors.durasi && <span className={styles.errorMsg}>{errors.durasi}</span>}

                {showCalendar && (
                  <div
                    ref={calendarRef}
                    style={{
                      position: 'absolute',
                      zIndex: 20,
                      top: 50,
                      left: 0,
                    }}
                  >
                    <DateRange
                      editableDateInputs={true}
                      onChange={item => {
                        setDateRange([item.selection]);
                        setShowCalendar(false);
                      }}
                      moveRangeOnFirstSelection={false}
                      ranges={dateRange}
                      locale={idLocale}
                      minDate={new Date()}
                    />
                  </div>
                )}
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="noHp">No HP</label>
                <input
                  id="noHp"
                  name="noHp"
                  type="text"
                  value={fields.noHp}
                  onChange={handleChange}
                  className={errors.noHp ? styles.errorInput : ''}
                />
                {errors.noHp && <span className={styles.errorMsg}>{errors.noHp}</span>}
              </div>
            </div>
            {/* Keterangan & Attachments */}
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label htmlFor="keterangan">Keterangan Booking</label>
                <textarea
                  id="keterangan"
                  name="keterangan"
                  rows={2}
                  value={fields.keterangan}
                  onChange={handleChange}
                  className={errors.keterangan ? styles.errorInput : ''}
                />
                {errors.keterangan && <span className={styles.errorMsg}>{errors.keterangan}</span>}
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="attachment">Attachments</label>
                <div className={styles.inputFileWrapper}>
                  <input
                    id="attachment"
                    name="attachment"
                    type="file"
                    className={`${styles.inputFile} ${errors.attachment ? styles.errorInput : ''}`}
                    onChange={handleChange}
                  />
                  <span className={styles.fileIcon}>📎</span>
                </div>
                {errors.attachment && <span className={styles.errorMsg}>{errors.attachment}</span>}
              </div>
            </div>
            {/* Tombol Booking */}
            <div className={styles.buttonWrapper}>
              <button type="submit" className={styles.bookingBtn}>Booking</button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}