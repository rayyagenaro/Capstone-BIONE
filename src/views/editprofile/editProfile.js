import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/router';
import styles from './editProfile.module.css';
import SidebarUser from '@/components/SidebarUser/SidebarUser';
import LogoutPopup from '@/components/LogoutPopup/LogoutPopup';
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
    const fetchProfile = async () => {
      try {
        const res = await fetch('/api/me');
        if (!res.ok) throw new Error('Gagal mengambil profil');
        const data = await res.json();

        if (data?.hasToken && data?.payload) {
          setProfile({
            email: data.payload.email ?? '',
            name: data.payload.name ?? '',
            hp: data.payload.phone ?? '',
          });
        }
      } catch (err) {
        console.error('Error memuat profil:', err);
      }
    };

    fetchProfile();
  }, []);


  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);

  function handleChange(e) {
    setProfile({ ...profile, [e.target.name]: e.target.value });
    setErrors({ ...errors, [e.target.name]: undefined });
  }

  function closeSuccess() {
    setShowSuccess(false);
    router.push("/User/HalamanUtama/hal-utamauser");
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
  const handleLogout = async () => {
    try {
      await fetch('/api/logout', { method: 'POST' }); // hapus cookie `token`
    } catch (e) {
      // optional: log error
    } finally {
      router.replace('/Signin/hal-sign'); // balik ke login admin
    }
  };

  return (
    <div className={styles.background}>
      {/* Sidebar */}
      <SidebarUser onLogout={() => setShowLogoutPopup(true)} />
      <main className={styles.mainContent}>
        <div className={styles.formBox}>
          <div className={styles.topRow}>
            <button className={styles.backBtn}>
              <FaArrowLeft />
              <Link href="/HalamanUtama/hal-utamauser" passHref legacyBehavior>Kembali</Link>
            </button>
            <div className={styles.title}>
              EDIT PROFILE
            </div>
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
      {/* Popup Logout */}
      <LogoutPopup
        open={showLogoutPopup}
        onCancel={() => setShowLogoutPopup(false)}
        onLogout={handleLogout}
      />
    </div>
  );
}
