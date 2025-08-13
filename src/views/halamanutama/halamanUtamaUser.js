// /pages/HalamanUtama/hal-utamaUser.js
import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/router';
import styles from './halamanUtamaUser.module.css';
import SidebarUser from '@/components/SidebarUser/SidebarUser';
import LogoutPopup from '@/components/LogoutPopup/LogoutPopup';
import { jwtVerify } from 'jose';

export default function HalamanUtamaUser({ initialName = 'User' }) {
  const [namaUser, setNamaUser] = useState(initialName);
  const [showLogoutPopup, setShowLogoutPopup] = useState(false);
  const router = useRouter();

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        // ✅ panggil scope=user biar bentuk responsnya {hasToken, payload}
        const r = await fetch('/api/me?scope=user', { cache: 'no-store' });
        const d = await r.json();
        if (!active) return;

        // izinkan user biasa; (kalau admin juga boleh masuk sini, tambahkan cek admin di bawah)
        const ok = d?.hasToken && d?.payload?.role === 'user';
        if (!ok) {
          // kalau mau admin juga boleh pakai halaman ini, gunakan:
          // if (!(d?.hasToken && ['user','admin'].includes(d?.payload?.role))) ...
          router.replace('/Signin/hal-sign?from=' + encodeURIComponent(router.asPath));
          return;
        }

        setNamaUser(d?.payload?.name || initialName);
      } catch {
        router.replace('/Signin/hal-sign?from=' + encodeURIComponent(router.asPath));
      }
    })();
    return () => { active = false; };
  }, [router, initialName]);

  // ✅ daftar fitur: tambahkan "title"
  const fiturLayanan = [
    {
      title: "BI.DRIVE",
      logo: "/assets/D'MOVE.svg",
      desc: "BI.DRIVE, mendukung pemesanan layanan pengemudi secara terjadwal untuk mendukung pelaksanaan tugas dinas.",
      link: "/User/FiturDmove/hal-dmove"
    },
    { title: "BI.CARE",  
      logo: "/assets/D'CARE.svg",  
      desc: "BI.CARE, memfasilitasi pembuatan janji temu dan reservasi layanan klinik Bank Indonesia secara terencana.", 
      link: "#" 
    },
    { title: "BI.MEAL",  
      logo: "/assets/D'MEAL.svg",  
      desc: "BI.MEAL, memfasilitasi pemesanan konsumsi secara terjadwal untuk mendukung kelancaran rapat dan tugas dinas.", 
      link: "/User/FiturBImeal/hal-BImeal" 
    },
    { title: "BI.MEET",  
      logo: "/assets/D'ROOM.svg",  
      desc: "BI.MEET, menghadirkan kemudahan reservasi ruang rapat dalam penyelenggaraan pertemuan dan kolaborasi antarunit kerja.", 
      link: "/User/Meet/hal-bimeet" 
    },
    { title: "BI.MAIL",  
      logo: "/assets/D'TRACK.svg", 
      desc: "BI.MAIL, menyediakan layanan pelacakan dan penomoran surat dinas secara digital, sehingga administrasi surat-menyurat.", 
      link: "/User/FiturBImail/hal-BImail" 
    },
    { title: "BI.STAY",  
      logo: "/assets/D'REST.svg",
      desc: "BI.STAY, menyediakan sistem reservasi akomodasi rumah dinas Bank Indonesia selama menjalankan penugasan.",
      link: "/User/FiturBIstay/hal-BIstay"
    },
  ];

  const handleLogout = async () => {
    try { await fetch('/api/logout', { method: 'POST' }); } catch {}
    router.replace('/Signin/hal-sign');
  };

  return (
    <div className={styles.background}>
      <SidebarUser onLogout={() => setShowLogoutPopup(true)} />
      <main className={styles.mainContent}>
        <div className={styles.header} />
        <div className={styles.welcomeBox}>
          <h2 className={styles.greeting}>Selamat Datang, {namaUser}</h2>
          <div className={styles.servicesBox}>
            <div className={styles.servicesTitle}>Pilih Layanan Sesuai Kebutuhan Anda</div>
            <div className={styles.servicesDesc}>
              BI.ONE, memudahkan Anda dalam memilih layanan digital untuk mendukung aktivitas di lingkungan Bank Indonesia.
            </div>
            <div className={styles.cardsGrid}>
              {fiturLayanan.map((fitur, idx) => (
                <div className={styles.card} key={idx}>
                  <Image src={fitur.logo} alt={fitur.title} width={48} height={48} className={styles.cardLogo} priority />
                  <div className={styles.cardTitle}>{fitur.title}</div>
                  <div className={styles.cardDesc}>{fitur.desc}</div>
                  {fitur.link && fitur.link !== "#" ? (
                    <Link href={fitur.link} legacyBehavior>
                      <a className={styles.bookingBtn}>Booking</a>
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
      <LogoutPopup open={showLogoutPopup} onCancel={() => setShowLogoutPopup(false)} onLogout={handleLogout} />
    </div>
  );
}

// ✅ SSR guard (no flicker). Izinkan user (atau admin jika memang diinginkan).
export async function getServerSideProps(ctx) {
  const token = ctx.req.cookies?.user_session || null;
  if (!token) {
    return { redirect: { destination: `/Signin/hal-sign?from=${encodeURIComponent(ctx.resolvedUrl)}`, permanent: false } };
  }
  try {
    const secret = process.env.JWT_SECRET;
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret), {
      algorithms: ['HS256'],
      clockTolerance: 10,
    });
    // kalau admin juga boleh, ubah kondisinya jadi: if (!['user','admin'].includes(payload?.role))
    if (payload?.role !== 'user') {
      return { redirect: { destination: `/Signin/hal-sign?from=${encodeURIComponent(ctx.resolvedUrl)}`, permanent: false } };
    }
    return { props: { initialName: payload?.name || 'User' } };
  } catch {
    return { redirect: { destination: `/Signin/hal-sign?from=${encodeURIComponent(ctx.resolvedUrl)}`, permanent: false } };
  }
}
