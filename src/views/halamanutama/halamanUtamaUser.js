import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/router';
import styles from './halamanUtamaUser.module.css';
import SidebarUser from '@/components/SidebarUser/SidebarUser';
import LogoutPopup from '@/components/LogoutPopup/LogoutPopup';

export default function HalamanUtamaUser() {
  // State untuk nama user & popup logout
  const [namaUser, setNamaUser] = useState('');
  const [showLogoutPopup, setShowLogoutPopup] = useState(false);
  const router = useRouter();
  
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const r = await fetch('/api/me');
        const d = await r.json();

        if (!active) return;

        // Bukan user? tendang ke halaman login user
        if (!d.hasToken || !['user', 'admin'].includes(d.payload?.role)) {
          router.replace('/Signin/hal-sign?from=' + encodeURIComponent(router.asPath));
          return;
        }

        // Set nama tampilan
        setNamaUser(d.payload?.name || 'User');
      } catch {
        router.replace('/Signin/hal-sign?from=' + encodeURIComponent(router.asPath));
      }
    })();
    return () => { active = false; };
  }, [router]);

  // Daftar semua fitur (6 fitur)
  const fiturLayanan = [
    {
      logo: "/assets/D'MOVE.svg",   
      desc: "BI.DRIVE, mendukung pemesanan layanan pengemudi secara terjadwal untuk mendukung pelaksanaan tugas dinas.",
      link: "/User/FiturDmove/hal-dmove"
    },
    {
      logo: "/assets/D'CARE.svg",
      desc: "BI.CARE, memfasilitasi pembuatan janji temu dan reservasi layanan klinik Bank Indonesia secara terencana.",
      link: "#"
    },
    {
      logo: "/assets/D'MEAL.svg",
      desc: "BI.MEAL, memfasilitasi pemesanan konsumsi secara terjadwal untuk mendukung kelancaran rapat dan tugas dinas.",
      link: "#"
    },
    {
      logo: "/assets/D'TRACK.svg",
      desc: "BI.MAIL, menyediakan layanan pelacakan dan penomoran surat dinas secara digital, sehingga administrasi surat-menyurat.",
      link: "#"
    },
    {
      logo: "/assets/D'ROOM.svg",
      desc: "BI.MEET, menghadirkan kemudahan reservasi ruang rapat dalam penyelenggaraan pertemuan dan kolaborasi antarunit kerja.",
      link: "#"
    },
    {
      logo: "/assets/D'REST.svg",
      desc: "BI.STAY, menyediakan sistem reservasi akomodasi rumah dinas Bank Indonesia selama menjalankan penugasan.",
      link: "#"
    },
  ];

  // Fungsi logout
  const handleLogout = async () => {
    try {
      await fetch('/api/logout', { method: 'POST' }); // hapus cookie `token`
    } catch (e) {
      // optional: log error
    } finally {
      router.replace('/Signin/hal-sign'); // balik ke login user
    }
  };

  return (
    <div className={styles.background}>

      {/* SIDEBAR USER */}
      <SidebarUser onLogout={() => setShowLogoutPopup(true)} />

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
              BI.ONE, memudahkan Anda dalam memilih layanan digital untuk mendukung aktivitas di lingkungan Bank Indonesia.
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
      <LogoutPopup 
      open={showLogoutPopup} 
      onCancel={() => setShowLogoutPopup(false)} 
      onLogout={handleLogout} />
    </div>
  );
}
