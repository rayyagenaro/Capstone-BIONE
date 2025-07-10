import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import styles from './editProfile.module.css';
import { FaHome, FaClipboardList, FaHistory, FaCog, FaSignOutAlt, FaArrowLeft } from 'react-icons/fa';

export default function EditProfile() {
  // Example initial profile (bisa diganti dengan fetch user profile)
  const [profile, setProfile] = useState({
    email: 'rafief.chalvani08@gmail.com',
    nama: 'Rafief Chalvani',
    hp: '0812345678910',
  });
  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);

  function handleChange(e) {
    setProfile({ ...profile, [e.target.name]: e.target.value });
    setErrors({ ...errors, [e.target.name]: undefined });
  }

  function validate() {
    const err = {};
    if (!profile.nama) err.nama = 'Nama wajib diisi';
    if (!profile.hp) err.hp = 'No Handphone wajib diisi';
    return err;
  }

  function handleSubmit(e) {
    e.preventDefault();
    const err = validate();
    setErrors(err);
    setSubmitted(true);
    if (Object.keys(err).length === 0) {
      alert('Profile berhasil disimpan!\n' + JSON.stringify(profile, null, 2));
      // Submit ke backend...
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
            <li><FaHome className={styles.menuIcon} /><Link href='/HalamanUtama/hal-utamauser'>Beranda</Link></li>
            <li><FaClipboardList className={styles.menuIcon} /><Link href='/StatusBooking/hal-statusBooking'>Status Booking</Link></li>
            <li><FaHistory className={styles.menuIcon} /><Link href='/RiwayatPesanan/hal-riwayatPesanan'>Riwayat Pesanan</Link></li>
            <li className={styles.active}><FaCog className={styles.menuIcon} /><Link href='/EditProfile/hal-editprofile'>Pengaturan</Link></li>
          </ul>
        </nav>
        <div className={styles.logout}>
          <Link href="/Login/hal-login" passHref legacyBehavior>
            <FaSignOutAlt className={styles.logoutIcon} />
          </Link>
          Logout
        </div>
      </aside>

      {/* NAVBAR */}
      <main className={styles.mainContent}>
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

        <div className={styles.formBox}>
          <div className={styles.topRow}>
            <button className={styles.backBtn}><FaArrowLeft /><Link href="/HalamanUtama/hal-utamauser" passHref legacyBehavior>Kembali</Link></button>
            <div className={styles.title}>EDIT PROFILE</div>
          </div>

          <form className={styles.profileForm} autoComplete="off" onSubmit={handleSubmit}>
            <div className={styles.formGroup}>
              <label htmlFor="email">EMAIL</label>
              <input
                className={styles.input}
                type="text"
                name="email"
                id="email"
                value={profile.email}
                disabled
                readOnly
                style={{ background: '#f5f5f5', color: '#888' }}
              />
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="nama">Nama Lengkap</label>
              <input
                className={styles.input}
                type="text"
                name="nama"
                id="nama"
                value={profile.nama}
                onChange={handleChange}
              />
              {submitted && errors.nama && <span className={styles.errorMsg}>{errors.nama}</span>}
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="hp">No Handphone</label>
              <input
                className={styles.input}
                type="text"
                name="hp"
                id="hp"
                value={profile.hp}
                onChange={handleChange}
              />
              {submitted && errors.hp && <span className={styles.errorMsg}>{errors.hp}</span>}
            </div>
            <div className={styles.buttonWrapper}>
              <button type="submit" className={styles.saveBtn}>Simpan</button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
