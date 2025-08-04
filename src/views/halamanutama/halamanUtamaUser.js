import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import styles from './halamanUtamaUser.module.css';
import { FaHome, FaClipboardList, FaHistory, FaCog, FaSignOutAlt } from 'react-icons/fa';

export default function HalamanUtamaUser() {
  // Tambahkan state untuk nama user
  const [namaUser, setNamaUser] = useState('');

  useEffect(() => {
    // Ambil user dari localStorage saat halaman load
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
      logo: "/assets/D'MOVE.png",
      title: "Digital Driver Booking System",
      desc: "Pilih driver dan jadwal yang sesuai untuk kebutuhan dinas dan rapat anda.",
      link: "/FiturDmove/hal-dmove"
    },
    {
      logo: "/assets/D'REST.png",
      title: "Digital Residence Booking System",
      desc: "Pilih rumah dinas dan jadwal yang sesuai untuk kebutuhan penginapan anda.",
      link: "#" // ganti jika sudah ada page
    },
    {
      logo: "/assets/D'CARE.png",
      title: "Digital Clinic Appointment & Reservation System",
      desc: "Pilih dokter dan jadwal yang sesuai untuk kebutuhan kesehatan anda.",
      link: "#"
    },
    {
      logo: "/assets/D'MEAL.png",
      title: "Digital Meal Booking System",
      desc: "Pilih makanan dan jadwal yang sesuai untuk kebutuhan rapat anda.",
      link: "#"
    },
    {
      logo: "/assets/D'TRACK.png",
      title: "Digital Tracking & Numbering Letter System",
      desc: "Pilih driver dan jadwal yang sesuai untuk kebutuhan dinas dan rapat anda.",
      link: "#"
    },
    {
      logo: "/assets/D'ROOM.png",
      title: "Digital Reservation Meeting Room System",
      desc: "Pilih rumah dinas dan jadwal yang sesuai untuk kebutuhan penginapan anda.",
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
            <li className={styles.active}>
              <FaHome className={styles.menuIcon} />
              <Link href='/HalamanUtama/hal-utamauser'>Beranda</Link>
            </li>
            <li>
              <FaClipboardList className={styles.menuIcon} />
              <Link href='/StatusBooking/hal-statusBooking'>Status Booking</Link>
            </li>
            <li>
              <FaHistory className={styles.menuIcon} />
              <Link href='/RiwayatPesanan/hal-riwayatPesanan'>Riwayat Pesanan</Link>
            </li>
            <li>
              <FaCog className={styles.menuIcon} />
              <Link href='/EditProfile/hal-editprofile'>Pengaturan</Link>
            </li>
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
        {/* HEADER/NAVBAR ATAS */}
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
