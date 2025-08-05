import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/router';
import styles from './statusBooking.module.css';
import { FaHome, FaClipboardList, FaCog, FaSignOutAlt, FaUsers, FaArrowLeft } from 'react-icons/fa';

// Helper function untuk format tanggal
const formatDate = (dateString) => {
  if (!dateString) return '';
  const options = { day: 'numeric', month: 'long', year: 'numeric' };
  return new Date(dateString).toLocaleDateString('id-ID', options);
};

// Sentralisasi informasi status untuk filter dan tampilan
const STATUS_CONFIG = {
  Pending: { id: 1, text: 'Pending', className: styles.statusProcess },
  Approved: { id: 2, text: 'Approved', className: styles.statusApproved },
  Rejected: { id: 3, text: 'Rejected', className: styles.statusRejected },
};

export default function StatusBooking() {
  const router = useRouter();

  const [allBookings, setAllBookings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState("All");

  useEffect(() => {
  
    const userDataStr = localStorage.getItem('user'); 
    if (userDataStr) {
      const user = JSON.parse(userDataStr);
      
      const fetchBookings = async () => {
        try {
          const res = await fetch(`/api/booking?userId=${user.id}`);
          if (!res.ok) throw new Error('Gagal memuat data booking');
          
          const data = await res.json();
          setAllBookings(data);
        } catch (err) {
          setError(err.message);
        } finally {
          setIsLoading(false);
        }
      };
      fetchBookings();
    } else {
      setIsLoading(false);
      setError("Silakan login terlebih dahulu untuk melihat status booking.");
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('user');
    router.push('/Login/hal-login');
  };

  // --- PERUBAHAN 2: Logika Filter yang Diperbarui ---
  // Filter berdasarkan status_id dari API menggunakan objek konfigurasi
  const filteredBookings = tab === "All"
    ? allBookings
    : allBookings.filter(item => item.status_id === STATUS_CONFIG[tab]?.id);

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
              <FaCog className={styles.menuIcon} />
              <Link href='/EditProfile/hal-editprofile'>Pengaturan</Link>
            </li>
          </ul>
        </nav>
        <div className={styles.logout}>
          <Link href="/" passHref legacyBehavior>
            <FaSignOutAlt className={styles.logoutIcon}/>
          </Link>
          <Link href="/" passHref legacyBehavior>
            Logout
          </Link>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className={styles.mainContent}>
        {/* HEADER (tetap sama) */}
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
             <button className={styles.backBtn} onClick={() => router.back()}><FaArrowLeft /> Kembali</button>
             <div className={styles.title}>STATUS BOOKING</div>
          </div>

          {/* TAB FILTER */}
          <div className={styles.tabRow}>
             <button className={`${styles.tabBtn} ${tab === "All" ? styles.tabActive : ""}`} onClick={() => setTab("All")}>All</button>
             <button className={`${styles.tabBtn} ${tab === "Pending" ? styles.tabActive : ""}`} onClick={() => setTab("Pending")}>Pending</button>
             <button className={`${styles.tabBtn} ${tab === "Approved" ? styles.tabActive : ""}`} onClick={() => setTab("Approved")}>Approved</button>
             <button className={`${styles.tabBtn} ${tab === "Rejected" ? styles.tabActive : ""}`} onClick={() => setTab("Rejected")}>Rejected</button>
          </div>

          {/* LIST */}
          <div className={styles.listArea}>
            {isLoading ? (
              <div className={styles.emptyState}>Memuat booking...</div>
            ) : error ? (
              <div className={styles.emptyState} style={{color: 'red'}}>{error}</div>
            ) : filteredBookings.length === 0 ? (
              <div className={styles.emptyState}>Tidak ada booking dengan status ini.</div>
            ) : (
              filteredBookings.map(item => {
                // Cari konfigurasi status yang cocok berdasarkan status_id
                const statusInfo = Object.values(STATUS_CONFIG).find(s => s.id === item.status_id) || { text: 'Unknown', className: styles.statusProcess };

                return (
                  <div className={styles.bookingCard}>
                    <Image
                      src={"/assets/D'MOVE.png"} // Gunakan logo default untuk sementara
                      alt="logo"
                      width={60}
                      height={60}
                      className={styles.cardLogo}
                    />
                    <div className={styles.cardDetail}>
                      <div className={styles.cardTitle}>{`Booking | ${item.tujuan}`}</div>
                      <div className={styles.cardSub}>{`${formatDate(item.start_date)} - ${formatDate(item.end_date)}`}</div>
                      <div className={statusInfo.className}>
                        {statusInfo.text}
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </main>
    </div>
  );
}