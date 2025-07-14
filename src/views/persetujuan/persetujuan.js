import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from "next/router";
import styles from './persetujuan.module.css';
import { FaHome, FaClipboardList, FaCog, FaSignOutAlt, FaArrowLeft } from 'react-icons/fa';

export default function PersetujuanBooking() {
  const router = useRouter();
  // Data dummy persetujuan booking
  const bookings = [
    {
      id: 1,
      logo: "/assets/D'MOVE.png",
      title: "Booking D'MOVE | Malang",
      subtitle: "12 Hari",
      status: "Approved",
    },
    {
      id: 2,
      logo: "/assets/D'MOVE.png",
      title: "Booking D'MOVE | Malang",
      subtitle: "12 Hari",
      status: "Approved",
    },
    {
      id: 3,
      logo: "/assets/D'MOVE.png",
      title: "Booking D'MOVE | Malang",
      subtitle: "12 Hari",
      status: "Rejected",
    },
    {
      id: 4,
      logo: "/assets/D'MOVE.png",
      title: "Booking D'MOVE | Malang",
      subtitle: "12 Hari",
      status: "Rejected",
    },
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
            <li><FaHome className={styles.menuIcon} /><Link href='/HalamanUtama/hal-utamaAdmin'>Beranda</Link></li>
            <li className={styles.active}><FaClipboardList className={styles.menuIcon} /><Link href='/Persetujuan/hal-persetujuan'>Persetujuan Booking</Link></li>
            <li><FaCog className={styles.menuIcon} /><Link href='/Pengaturan/hal-pengaturan'>Pengaturan</Link></li>
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
          <form className={styles.searchBar} onSubmit={e => e.preventDefault()}>
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

        {/* BUTTON KEMBALI DAN TITLE */}
        <div className={styles.topRowPersetujuan}>
          <button className={styles.backBtn} onClick={() => router.back()}>
            <FaArrowLeft style={{ marginRight: 7, fontSize: 18 }} />
            Kembali
          </button>
        </div>

        {/* BOX PERSETUJUAN */}
        <div className={styles.boxLayanan}>
          <div className={styles.titleLayanan}>PERSETUJUAN BOOKING</div>
          <div className={styles.cardList}>
            {bookings.map(item => (
              <div key={item.id} className={styles.cardLayanan}>
                <Image
                  src={item.logo}
                  alt="D'MOVE"
                  width={70}
                  height={70}
                  className={styles.cardLogo}
                  priority
                />
                <div className={styles.cardContent}>
                  <div className={styles.layananTitle}>{item.title}</div>
                  <div className={styles.layananSub}>{item.subtitle}</div>
                  <div className={`${styles.layananStatus} ${
                    item.status === "Approved"
                      ? styles.statusApproved
                      : item.status === "Rejected"
                      ? styles.statusRejected
                      : ""
                  }`}>
                    {item.status}
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