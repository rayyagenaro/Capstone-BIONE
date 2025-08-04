import React, { useEffect, useState } from 'react'; // Tambahkan useEffect dan useState
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/router';
import styles from './halamanUtamaAdmin.module.css';
import { FaHome, FaClipboardList, FaCog, FaSignOutAlt, FaUsers } from 'react-icons/fa';

export default function HalamanUtamaAdmin() {
  const router = useRouter();
  const [namaAdmin, setNamaAdmin] = useState(''); // State untuk nama admin

  // useEffect untuk mengambil data saat komponen dimuat
  useEffect(() => {
    const adminStr = localStorage.getItem('admin');
    if (adminStr) {
      try {
        const admin = JSON.parse(adminStr);
        setNamaAdmin(admin.nama || '');
      } catch {
        setNamaAdmin('');
      }
    } else {
      setNamaAdmin('');
    }
  }, []);

  // Fungsi untuk logout
  const handleLogout = () => {
    localStorage.removeItem('admin'); // Hapus data admin dari localStorage
    router.push('/Login/hal-login'); // Arahkan ke halaman login
  };

  // Dummy data (bisa diganti dengan data dari API nanti)
  const layananMasuk = [
    { id: 1, logo: "/assets/D'MOVE.png", title: "Booking D'MOVE | Malang", subtitle: "12 Hari", status: "Process" },
    { id: 2, logo: "/assets/D'MOVE.png", title: "Booking D'MOVE | Malang", subtitle: "12 Hari", status: "Process" },
    { id: 3, logo: "/assets/D'MOVE.png", title: "Booking D'MOVE | Malang", subtitle: "12 Hari", status: "Process" },
    { id: 4, logo: "/assets/D'MOVE.png", title: "Booking D'MOVE | Malang", subtitle: "12 Hari", status: "Process" }
  ];

  return (
    <div className={styles.background}>
      {/* SIDEBAR */}
      <aside className={styles.sidebar}>
        <div className={styles.logoSidebar}>
          <Image src="/assets/BI_Logo.png" alt="Bank Indonesia" width={110} height={36} className={styles.logoDone} priority />
        </div>
        <nav className={styles.navMenu}>
          <ul>
            <li className={styles.active}><FaHome className={styles.menuIcon} /><Link href='/HalamanUtama/hal-utamaAdmin'>Beranda</Link></li>
            <li><FaClipboardList className={styles.menuIcon} /><Link href='/Persetujuan/hal-persetujuan'>Persetujuan Booking</Link></li>
            <li><FaUsers className={styles.menuIcon} /><Link href='/Ketersediaan/hal-ketersediaan'>Ketersediaan</Link></li>
            <li><FaCog className={styles.menuIcon} /><Link href='/Pengaturan/hal-pengaturan'>Pengaturan</Link></li>
          </ul>
        </nav>
        {/* --- PERUBAHAN LOGOUT --- */}
        <div className={styles.logout} onClick={handleLogout} style={{cursor: 'pointer'}}>
          <FaSignOutAlt className={styles.logoutIcon} />
          Logout
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className={styles.mainContent}>
        {/* HEADER NAVBAR */}
        <div className={styles.header}>
          <div className={styles.logoBIWrapper}>
            <Image src="/assets/D'ONE.png" alt="D'ONE" width={170} height={34} className={styles.logoBI} priority/>
          </div>
          <form className={styles.searchBar} onSubmit={e => e.preventDefault()}>
            <input type="text" placeholder="Search" />
            <button type="submit">
              <svg width="20" height="20" fill="#2F4D8E"><circle cx="9" cy="9" r="8" stroke="#2F4D8E" strokeWidth="2" fill="none" /><line x1="15" y1="15" x2="19" y2="19" stroke="#2F4D8E" strokeWidth="2" /></svg>
            </button>
            <span className={styles.searchLabel}></span>
          </form>
        </div>

        {/* --- PERUBAHAN NAMA ADMIN --- */}
        <div className={styles.greeting}>
          Selamat datang, {namaAdmin}
          <div className={styles.adminText}>Admin</div>
        </div>

        {/* BOX LAYANAN MASUK */}
        <div className={styles.boxLayanan}>
          <div className={styles.titleLayanan}>LAYANAN MASUK</div>
          <div className={styles.cardList}>
            {layananMasuk.map(item => (
              <div
                key={item.id}
                className={styles.cardLayanan}
                onClick={() => router.push(`/DetailsLaporan/detailsLaporan?id=${item.id}`)}
                style={{ cursor: 'pointer' }}
              >
                <Image src={item.logo} alt="D'MOVE" width={70} height={70} className={styles.cardLogo} priority />
                <div className={styles.cardContent}>
                  <div className={styles.layananTitle}>{item.title}</div>
                  <div className={styles.layananSub}>{item.subtitle}</div>
                  <div className={styles.layananStatus}>{item.status}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}