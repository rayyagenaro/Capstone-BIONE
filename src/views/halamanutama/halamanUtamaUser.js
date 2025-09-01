// /pages/HalamanUtama/hal-utamaUser.js
import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/router';
import styles from './halamanUtamaUser.module.css';
import SidebarUser from '@/components/SidebarUser/SidebarUser';
import LogoutPopup from '@/components/LogoutPopup/LogoutPopup';
import { getNsFromReq } from '@/lib/ns-server';
import { parseCookieHeader, resolveUser } from '@/lib/resolve';
import { withNs, NS_RE } from '@/lib/ns';

export default function HalamanUtamaUser({ initialName = 'User' }) {
  const router = useRouter();
  const ns = typeof router.query.ns === 'string' && NS_RE.test(router.query.ns) ? router.query.ns : '';
  const [namaUser, setNamaUser] = useState(initialName);
  const [showLogoutPopup, setShowLogoutPopup] = useState(false);
  const [loading, setLoading] = useState(initialName);

  // ✅ Client guard: pastikan sesi untuk ns ini valid
  useEffect(() => {
    let active = true;
    (async () => {
      if (!router.isReady) return;

      if (!ns) {
        router.replace(`/Signin/hal-sign?from=${encodeURIComponent(router.asPath)}`);
        return;
      }

      try {
        const r = await fetch(withNs('/api/me?scope=user', ns), { cache: 'no-store' });
        const d = await r.json();

        if (!active) return;

        const ok = d?.hasToken && d?.payload?.role === 'user';
        if (!ok) {
          router.replace(`/Signin/hal-sign?from=${encodeURIComponent(router.asPath)}`);
          return;
        }

        setNamaUser(d?.payload?.name || initialName);
      } catch {
        router.replace(`/Signin/hal-sign?from=${encodeURIComponent(router.asPath)}`);
      } finally {
        if (active) setLoading(false);   // 🔹 pastikan loading dihentikan di semua jalur
      }
    })();
    return () => { active = false; };
  }, [router.isReady, router.asPath, ns, initialName, router]);


  // ✅ daftar fitur: semua link di-append ?ns=
  const fiturLayanan = [
    {
     
      logo: "/assets/D'MOVE.svg",
      desc: "BI.DRIVE, mendukung pemesanan layanan pengemudi secara terjadwal untuk mendukung pelaksanaan tugas dinas.",
      link: "/User/FiturDmove/hal-dmove"
    },
    {
      
      logo: "/assets/D'CARE.svg",
      desc: "BI.CARE, memfasilitasi pembuatan janji temu dan reservasi layanan klinik Bank Indonesia secara terencana.",
      link: "/User/FiturBIcare/hal-BIcare"
    },
    {
     
      logo: "/assets/D'MEAL.svg",
      desc: "BI.MEAL, memfasilitasi pemesanan konsumsi secara terjadwal untuk mendukung kelancaran rapat dan tugas dinas.",
      link: "/User/FiturBImeal/hal-BImeal"
    },
    {
     
      logo: "/assets/D'ROOM.svg",
      desc: "BI.MEET, menghadirkan kemudahan reservasi ruang rapat dalam penyelenggaraan pertemuan dan kolaborasi antarunit kerja.",
      link: "/User/FiturBimeet/hal-bimeet"
    },
    {
    
      logo: "/assets/D'TRACK.svg",
      desc: "BI.MAIL, menyediakan layanan pelacakan dan penomoran surat dinas secara digital, sehingga administrasi surat-menyurat.",
      link: "/User/FiturBImail/hal-BImail"
    },
    {
     
      logo: "/assets/D'REST.svg",
      desc: "BI.STAY, menyediakan sistem reservasi akomodasi rumah dinas Bank Indonesia selama menjalankan penugasan.",
      link: "/User/FiturBIstay/hal-BIstay"
    },
  ];

  // ✅ Logout per-namespace (tidak menendang tab lain)
  const handleLogout = async () => {
    try {
     const ns = new URLSearchParams(location.search).get('ns');
     await fetch('/api/logout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ area: 'user', ns }), 
    });
    } catch {}
    router.replace('/Signin/hal-sign');
  };

  if (loading) {
    return <div className={styles.loading}>Memuat…</div>;
  }

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
              BI.ONE, memudahkan Anda dalam memilih layanan digital untuk mendukung aktivitas di lingkungan KPw Bank Indonesia .
            </div>
            <div className={styles.cardsGrid}>
              {fiturLayanan.map((fitur, idx) => (
                <div className={styles.card} key={idx}>
                  <Image src={fitur.logo} alt={fitur.title} width={48} height={48} className={styles.cardLogo} priority />
                  <div className={styles.cardTitle}>{fitur.title}</div>
                  <div className={styles.cardDesc}>{fitur.desc}</div>
                  {fitur.link && fitur.link !== "#" ? (
                    <Link href={withNs(fitur.link, ns)} className={styles.bookingBtn}>
                      Booking
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

/* ===================== SSR Guard ===================== */
export async function getServerSideProps(ctx) {
  const ns = getNsFromReq(ctx.req);
  const from = ctx.resolvedUrl || '/User/HalamanUtama/hal-utamauser';

  if (!ns) {
    return {
      redirect: { destination: `/Signin/hal-sign?from=${encodeURIComponent(from)}`, permanent: false },
    };
  }

  const cookies = parseCookieHeader(ctx.req.headers.cookie);
  const u = await resolveUser(ns, cookies);

  // ❌ Tidak ada user_session → redirect langsung
  if (!u?.hasToken || !u?.payload || u.payload.roleNormalized !== 'user') {
    return {
      redirect: { destination: `/Signin/hal-sign?from=${encodeURIComponent(from)}`, permanent: false },
    };
  }

  return {
    props: {
      initialName: u.payload.name || 'User',
      ns,
    },
  };
}