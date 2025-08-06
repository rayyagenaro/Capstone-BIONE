import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/router';
import styles from './editProfile.module.css';
import { FaHome, FaClipboardList, FaCog, FaSignOutAlt, FaArrowLeft } from 'react-icons/fa';

export default function EditProfile() {
  const [showSuccess, setShowSuccess] = useState(false);
  const [showLogoutPopup, setShowLogoutPopup] = useState(false);
  const router = useRouter();

  const [profile, setProfile] = useState({
    email: '',
    name: '',
    hp: ''
  });

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      const user = JSON.parse(storedUser);
      setProfile({
        email: user.email ?? '',
        name: user.name ?? '',
        hp: user.phone ?? '',
      });
    }
  }, []);

  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);

  function handleChange(e) {
    setProfile({ ...profile, [e.target.name]: e.target.value });
    setErrors({ ...errors, [e.target.name]: undefined });
  }

  function closeSuccess() {
    setShowSuccess(false);
    router.push("/HalamanUtama/hal-utamauser");
  }

  function validate() {
    const err = {};
    if (!profile.name) err.name = 'Nama wajib diisi';
    if (!profile.hp) err.hp = 'No Handphone wajib diisi';
    return err;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();

    const err = validate();
    setErrors(err);
    setSubmitted(true);
    if (Object.keys(err).length > 0) return;

    try {
      const response = await fetch('/api/updateProfile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      });

      if (response.ok) {
        setShowSuccess(true);
        const updatedUser = { ...JSON.parse(localStorage.getItem('user')), name: profile.name, phone: profile.hp };
        localStorage.setItem('user', JSON.stringify(updatedUser));
      } else {
        alert('Gagal memperbarui profil');
      }
    } catch (error) {
      console.error('Gagal mengirim data ke API:', error);
      alert('Terjadi kesalahan saat mengupdate profil');
    }
  };

  // Fungsi Logout
  const handleLogout = () => {
    localStorage.removeItem('user');
    setShowLogoutPopup(false);
    router.push('/Login/hal-login');
  };

  return (
    <div className={styles.background}>
      {/* SIDEBAR */}
      <aside className={styles.sidebar}>
        <div className={styles.logoSidebar}>
          <Image
            src="/assets/Logo D'ONE.png"
            alt="Logo D'ONE"
            width={160}
            height={160}
            className={styles.logoDone}
            priority
          />
        </div>
        <nav className={styles.navMenu}>
          <ul>
            <li><FaHome className={styles.menuIcon} /><Link href='/HalamanUtama/hal-utamauser'>Beranda</Link></li>
            <li><FaClipboardList className={styles.menuIcon} /><Link href='/StatusBooking/hal-statusBooking'>Status Booking</Link></li>
            <li className={styles.active}><FaCog className={styles.menuIcon} /><Link href='/EditProfile/hal-editprofile'>Pengaturan</Link></li>
          </ul>
        </nav>
        {/* Trigger popup logout */}
        <div
          className={styles.logout}
          onClick={() => setShowLogoutPopup(true)}
          style={{ cursor: 'pointer' }}
        >
          <FaSignOutAlt className={styles.logoutIcon} />
          Logout
        </div>
      </aside>

      {/* POPUP LOGOUT */}
      {showLogoutPopup && (
        <div className={styles.popupOverlay} onClick={() => setShowLogoutPopup(false)}>
          <div className={styles.popupBox} onClick={e => e.stopPropagation()}>
            <div className={styles.popupIcon}>
              <svg width="54" height="54" viewBox="0 0 54 54">
                <defs>
                  <radialGradient id="logograd" cx="50%" cy="50%" r="60%">
                    <stop offset="0%" stopColor="#ffe77a" />
                    <stop offset="100%" stopColor="#ffd23f" />
                  </radialGradient>
                </defs>
                <circle cx="27" cy="27" r="25" fill="url(#logograd)"/>
                <path d="M32 27H16m0 0l5-5m-5 5l5 5" stroke="#253e70" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                <rect x="29" y="19" width="9" height="16" rx="3.2" stroke="#253e70" strokeWidth="2" fill="none"/>
              </svg>
            </div>
            <div className={styles.popupMsg}>Apakah Anda yakin ingin logout?</div>
            <div className={styles.popupButtonRow}>
              <button className={styles.cancelButton} onClick={() => setShowLogoutPopup(false)}>Batal</button>
              <button className={styles.logoutButton} onClick={handleLogout}>Ya, Logout</button>
            </div>
          </div>
        </div>
      )}

      {/* NAVBAR */}
      <main className={styles.mainContent}>

        <div className={styles.formBox}>
          <div className={styles.topRow}>
            <button className={styles.backBtn}>
              <FaArrowLeft />
              <Link href="/HalamanUtama/hal-utamauser" passHref legacyBehavior>Kembali</Link>
            </button>
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
              <label htmlFor="name">Nama Lengkap</label>
              <input
                className={styles.input}
                type="text"
                name="name"
                id="name"
                value={profile.name}
                onChange={handleChange}
              />
              {submitted && errors.name && <span className={styles.errorMsg}>{errors.name}</span>}
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
              <button type="submit" className={styles.saveBtn}>Update</button>
            </div>
            {showSuccess && (
              <div className={styles.popupOverlay}>
                <div className={styles.popupBox}>
                  <button className={styles.popupClose} onClick={closeSuccess} title="Tutup">&times;</button>
                  <div className={styles.popupIcon}>
                    <svg width="70" height="70" viewBox="0 0 70 70">
                      <circle cx="35" cy="35" r="35" fill="#7EDC89" />
                      <polyline points="23,36 33,46 48,29" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <div className={styles.popupMsg}><b>Data berhasil diupdate!</b></div>
                </div>
              </div>
            )}
          </form>
        </div>
      </main>
    </div>
  );
}
