import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import styles from './statusBooking.module.css';
import { FaHome, FaClipboardList, FaHistory, FaCog, FaSignOutAlt, FaArrowLeft } from 'react-icons/fa';

const bookingsData = [
  // PROCESS
  {
    id: 1,
    status: "Process",
    logo: "/assets/D'MOVE.png",
    title: "Booking D'MOVE | Malang",
    sub: "12 Hari",
    desc: "Process"
  },
  {
    id: 2,
    status: "Process",
    logo: "/assets/D'REST.png",
    title: "Booking D'REST | Trawas",
    sub: "3 Hari",
    desc: "Process"
  },
  {
    id: 3,
    status: "Process",
    logo: "/assets/D'MEAL.png",
    title: "Booking D'MEAL | Ruang Rapat Lt 4",
    sub: "07 July 2025 | 10.00",
    desc: "Process"
  },
  {
    id: 4,
    status: "Process",
    logo: "/assets/D'CARE.png",
    title: "Booking D'CARE | dr. Rafief Chalvani S.Ked.",
    sub: "08 July 2025 | Sesi 1 (10.00 - 11.00)",
    desc: "Process"
  },
  // APPROVED
  {
    id: 5,
    status: "Approved",
    logo: "/assets/D'CARE.png",
    title: "Booking D'CARE | dr. Rafief Chalvani S.Ked.",
    sub: "08 July 2025 | Sesi 1 (10.00 - 11.00)",
    desc: "Approved"
  },
  // REJECTED
  {
    id: 6,
    status: "Rejected",
    logo: "/assets/D'REST.png",
    title: "Booking D'REST | Trawas",
    sub: "3 Hari",
    desc: "Rejected"
  },
];

export default function StatusBooking() {
  const [tab, setTab] = useState("Process");

  // Filter bookings by status
  const bookings = bookingsData.filter(item => item.status === tab);

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
        {/* HEADER */}
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

        <div className={styles.bookingBox}>
          <div className={styles.topRow}>
            <button className={styles.backBtn}><FaArrowLeft /><Link href="/HalamanUtama/hal-utamauser" passHref legacyBehavior>Kembali</Link></button>
            <div className={styles.title}>STATUS BOOKING</div>
          </div>

          {/* TAB FILTER */}
          <div className={styles.tabRow}>
            <button
              className={`${styles.tabBtn} ${tab === "Process" ? styles.tabActive : ""}`}
              onClick={() => setTab("Process")}
            >
              Process
            </button>
            <button
              className={`${styles.tabBtn} ${tab === "Approved" ? styles.tabActive : ""}`}
              onClick={() => setTab("Approved")}
            >
              Approved
            </button>
            <button
              className={`${styles.tabBtn} ${tab === "Rejected" ? styles.tabActive : ""}`}
              onClick={() => setTab("Rejected")}
            >
              Rejected
            </button>
          </div>

          {/* LIST */}
          <div className={styles.listArea}>
            {bookings.length === 0 && (
              <div className={styles.emptyState}>Tidak ada booking dengan status ini.</div>
            )}
            {bookings.map(item => (
              <div key={item.id} className={styles.bookingCard}>
                <Image
                  src={item.logo}
                  alt="logo"
                  width={60}
                  height={60}
                  className={styles.cardLogo}
                />
                <div className={styles.cardDetail}>
                  <div className={styles.cardTitle}>{item.title}</div>
                  <div className={styles.cardSub}>{item.sub}</div>
                  <div className={
                    item.status === "Approved"
                      ? styles.statusApproved
                      : item.status === "Rejected"
                      ? styles.statusRejected
                      : styles.statusProcess
                  }>
                    {item.desc}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
