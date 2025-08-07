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

      {/* SIDEBAR USER */}
      <SidebarUser onLogoutClick={() => setShowLogoutPopup(true)} />

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
      <LogoutPopup 
      open={showLogoutPopup} 
      onCancel={() => setShowLogoutPopup(false)} 
      onLogout={handleLogout} />
    </div>
  );
}
