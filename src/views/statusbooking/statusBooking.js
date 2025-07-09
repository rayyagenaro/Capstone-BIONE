import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import styles from './statusBooking.module.css';
import { FaHome, FaClipboardList, FaHistory, FaCog, FaSignOutAlt, FaArrowLeft } from 'react-icons/fa';

const bookingData = [
  {
    id: 1,
    logo: "/assets/D'MOVE.png",
    title: "Booking D'MOVE | Malang",
    desc: "12 Hari",
    process: "Process",
    status: "process"
  },
  {
    id: 2,
    logo: "/assets/D'REST.png",
    title: "Booking D'REST | Trawas",
    desc: "3 Hari",
    process: "Process",
    status: "process"
  },
  {
    id: 3,
    logo: "/assets/D'MEAL.png",
    title: "Booking D'MEAL | Ruang Rapat Lt 4",
    desc: "07 July 2025 | 10.00",
    process: "Process",
    status: "process"
  },
  {
    id: 4,
    logo: "/assets/D'CARE.png",
    title: "Booking D'CARE | dr. Rafief Chalvani S.Ked.",
    desc: "08 July 2025 | Sesi 1 (10.00 - 11.00)",
    process: "Process",
    status: "process"
  },
  // Kamu bisa tambahkan data Approved/Rejected di sini
  {
    id: 5,
    logo: "/assets/D'CARE.png",
    title: "Booking D'CARE | dr. Rafief Chalvani S.Ked.",
    desc: "08 July 2025 | Sesi 1 (10.00 - 11.00)",
    process: "Approved",
    status: "approved"
  },
   {
    id: 6,
    logo: "/assets/D'REST.png",
    title: "Booking D'REST | Trawas",
    desc: "3 Hari",
    process: "Rejected",
    status: "rejected"
  },
];

export default function StatusBooking() {
  const [activeTab, setActiveTab] = useState('process');

  // Filter sesuai tab
  const bookings = bookingData.filter(b => b.status === activeTab);

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
            <li className={styles.active}><FaClipboardList className={styles.menuIcon} /><Link href='/StatusBooking/hal-statusBooking'>Status Booking</Link></li>
            <li><FaHistory className={styles.menuIcon} /><Link href='/HalamanUtama/hal-utamauser#'>Riwayat Pesanan</Link></li>
            <li><FaCog className={styles.menuIcon} /><Link href='/HalamanUtama/hal-utamauser#'>Pengaturan</Link></li>
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

        {/* CONTENT BOX */}
        <div className={styles.bookingBox}>
          <div className={styles.topRow}>
            <button className={styles.backBtn}><FaArrowLeft /><Link href="/HalamanUtama/hal-utamauser" passHref legacyBehavior>Kembali</Link></button>
            <span className={styles.pageTitle}>STATUS BOOKING</span>
          </div>
          <div className={styles.tabRow}>
            <button
              className={`${styles.tabBtn} ${activeTab === 'process' ? styles.activeTab : ''}`}
              onClick={() => setActiveTab('process')}
            >
              Process
            </button>
            <button
              className={`${styles.tabBtn} ${activeTab === 'approved' ? styles.activeTab : ''}`}
              onClick={() => setActiveTab('approved')}
            >
              Approved
            </button>
            <button
              className={`${styles.tabBtn} ${activeTab === 'rejected' ? styles.activeTab : ''}`}
              onClick={() => setActiveTab('rejected')}
            >
              Rejected
            </button>
          </div>

          <div className={styles.listArea}>
            {bookings.length === 0 && (
              <div className={styles.emptyMsg}>Tidak ada booking pada tab ini.</div>
            )}
            {bookings.map(b => (
              <div className={styles.bookingCard} key={b.id}>
                <div className={styles.cardLogoWrap}>
                  <Image
                    src={b.logo}
                    alt="Logo"
                    width={54}
                    height={54}
                    className={styles.cardLogo}
                  />
                </div>
                <div className={styles.cardInfo}>
                  <div className={styles.cardTitle}>{b.title}</div>
                  <div className={styles.cardDesc}>{b.desc}</div>
                  <div className={styles.cardProcess}>{b.process}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
