import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import styles from './halamanUtamaUser.module.css';
import { FaHome, FaClipboardList, FaHistory, FaCog, FaSignOutAlt } from 'react-icons/fa';

export default function HalamanUtamaUser() {
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
        {/* HEADER/NAVBAR ATAS: hanya logo BI di kiri */}
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
          <h2 className={styles.greeting}>Selamat Datang, Rafief Chalvani!</h2>
          <div className={styles.servicesBox}>
            <div className={styles.servicesTitle}>Pilih Layanan Sesuai Kebutuhan Anda</div>
            <div className={styles.servicesDesc}>
              Pilih layanan yang anda inginkan mulai dari Driver Booking, Residence Booking, Clinic Appointment & Reservation, Meal Booking, Tracking & Numbering Letter, Digital Reservation Meeting Room, Sports Reservation, dan Mental Insight
            </div>
            <div className={styles.cardsGrid}>
              {/* CARD 1 */}
              <div className={styles.card}>
                <Image
                  src="/assets/D'MOVE.png"
                  alt="DMOVE"
                  width={48}
                  height={48}
                  className={styles.cardLogo}
                  priority
                />
                <div className={styles.cardTitle}>Digital Driver Booking System</div>
                <div className={styles.cardDesc}>
                  Pilih driver dan jadwal yang sesuai untuk kebutuhan dinas dan rapat anda.
                </div>
                <Link href="/FiturDmove/hal-dmove" passHref legacyBehavior>
                  <button className={styles.bookingBtn}>Booking</button>
                </Link>
              </div>
              {/* CARD 2 */}
              <div className={styles.card}>
                <Image
                  src="/assets/D'REST.png"
                  alt="DREST"
                  width={48}
                  height={48}
                  className={styles.cardLogo}
                  priority
                />
                <div className={styles.cardTitle}>Digital Residence Booking System</div>
                <div className={styles.cardDesc}>
                  Pilih rumah dinas dan jadwal yang sesuai untuk kebutuhan penginapan anda.
                </div>
                <button className={styles.bookingBtn}>Booking</button>
              </div>
              {/* CARD 3 */}
              <div className={styles.card}>
                <Image
                  src="/assets/D'CARE.png"
                  alt="DCARE"
                  width={48}
                  height={48}
                  className={styles.cardLogo}
                  priority
                />
                <div className={styles.cardTitle}>Digital Clinic Appointment & Reservation System</div>
                <div className={styles.cardDesc}>
                  Pilih dokter dan jadwal yang sesuai untuk kebutuhan kesehatan anda.
                </div>
                <button className={styles.bookingBtn}>Booking</button>
              </div>
              {/* CARD 4 */}
              <div className={styles.card}>
                <Image
                  src="/assets/D'MEAL.png"
                  alt="DMEAL"
                  width={48}
                  height={48}
                  className={styles.cardLogo}
                  priority
                />
                <div className={styles.cardTitle}>Digital Meal Booking System</div>
                <div className={styles.cardDesc}>
                  Pilih makanan dan jadwal yang sesuai untuk kebutuhan rapat anda.
                </div>
                <button className={styles.bookingBtn}>Booking</button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
