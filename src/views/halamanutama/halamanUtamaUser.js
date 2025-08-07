import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/router'; // Tambahkan import ini!
import styles from './halamanUtamaUser.module.css';
import { FaHome, FaClipboardList, FaCog, FaSignOutAlt } from 'react-icons/fa';

export default function HalamanUtamaUser() {
  // State untuk nama user & popup logout
  const [namaUser, setNamaUser] = useState('');
  const [showLogoutPopup, setShowLogoutPopup] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        setNamaUser(user.name || 'User');
      } catch {
        setNamaUser('User');
      }
    } else {
      setNamaUser('User');
    }
  }, []);

  // Daftar semua fitur (8 fitur)
  const fiturLayanan = [
    {
      logo: "/assets/D'MOVE.svg",   
      desc: "Pilih driver dan jadwal yang sesuai untuk kebutuhan dinas dan rapat anda.",
      link: "/FiturDmove/hal-dmove"
    },
    {
      logo: "/assets/D'REST.svg",
      desc: "Pilih rumah dinas dan jadwal yang sesuai untuk kebutuhan penginapan anda.",
      link: "#"
    },
    {
      logo: "/assets/D'CARE.svg",
      desc: "Pilih dokter dan jadwal yang sesuai untuk kebutuhan kesehatan anda.",
      link: "#"
    },
        {
      logo: "/assets/D'ROOM.svg",
      desc: "Pilih rumah dinas dan jadwal yang sesuai untuk kebutuhan penginapan anda.",
      link: "#"
    },
    {
      logo: "/assets/D'MEAL.png",
      desc: "Pilih makanan dan jadwal yang sesuai untuk kebutuhan rapat anda.",
      link: "#"
    },
    {
      logo: "/assets/D'TRACK.png",
      desc: "Pilih driver dan jadwal yang sesuai untuk kebutuhan dinas dan rapat anda.",
      link: "#"
    },
    {
      logo: "/assets/D'SPORTS.png",
      title: "Digital Sports Reservation System",
      desc: "Pilih dokter dan jadwal yang sesuai untuk kebutuhan kesehatan anda.",
      link: "#"
    },
    {
      logo: "/assets/D'MIND.png",
      title: "Digital Mental Insight System",
      desc: "Pilih makanan dan jadwal yang sesuai untuk kebutuhan rapat anda.",
      link: "#"
    }
  ];

  // Fungsi logout
  const handleLogout = () => {
    localStorage.removeItem('user');
    router.push('/Login/hal-login');
  };

  return (
    <div className={styles.background}>
      {/* SIDEBAR */}
      <aside className={styles.sidebar}>
        <div className={styles.logoSidebar}>
          <Image
            src="/assets/Logo D'ONE.png"
            alt="D'ONE"
            width={160}
            height={160}
            className={styles.logoDone}
            priority
          />
        </div>
        <nav className={styles.navMenu}>
          <ul>
            <li className={styles.active}>
              <FaHome className={styles.menuIcon} />
              <Link href='/HalamanUtama/hal-utamauser'>Beranda</Link>
            </li>
            <li>
              <FaClipboardList className={styles.menuIcon} />
              <Link href='/StatusBooking/hal-statusBooking'>Status Booking</Link>
            </li>
            <li>
              <FaCog className={styles.menuIcon} />
              <Link href='/EditProfile/hal-editprofile'>Pengaturan</Link>
            </li>
          </ul>
        </nav>
        {/* Tombol logout diubah jadi trigger popup */}
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


      {/* MAIN CONTENT */}
      <main className={styles.mainContent}>
        {/* HEADER/NAVBAR ATAS */}
        <div className={styles.header}>
          <div className={styles.logoBIWrapper}>
          </div>
        </div>

        {/* WELCOME BOX */}
        <div className={styles.welcomeBox}>
          <h2 className={styles.greeting}>
            Selamat Datang, {namaUser}
          </h2>
          <div className={styles.servicesBox}>
            <div className={styles.servicesTitle}>Pilih Layanan Sesuai Kebutuhan Anda</div>
            <div className={styles.servicesDesc}>
              Pilih layanan yang Anda butuhkan dan rasakan manfaat nyata dari driver booking, residence booking, clinic appointment & reservation, meal booking, tracking & numbering letter, Digital Reservation Meeting Room, Sports Reservation, dan Mental Insight
            </div>
            <div className={styles.cardsGrid}>
              {fiturLayanan.map((fitur, idx) => (
                <div className={styles.card} key={idx}>
                  <Image
                    src={fitur.logo}
                    alt={fitur.title}
                    width={48}
                    height={48}
                    className={styles.cardLogo}
                    priority
                  />
                  <div className={styles.cardTitle}>{fitur.title}</div>
                  <div className={styles.cardDesc}>{fitur.desc}</div>
                  {fitur.link && fitur.link !== "#" ? (
                    <Link href={fitur.link} passHref legacyBehavior>
                      <button className={styles.bookingBtn}>Booking</button>
                    </Link>
                  ) : (
                    <button className={styles.bookingBtn} disabled>Booking</button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
