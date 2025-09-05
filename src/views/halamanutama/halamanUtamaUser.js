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
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [router.isReady, router.asPath, ns, initialName, router]);

  const fiturLayanan = [
    {
      logo: "/assets/D'MOVE.svg",
      title: 'Digital Driver Booking System',
      desc: "BI.DRIVE, mendukung pemesanan layanan pengemudi secara terjadwal untuk mendukung pelaksanaan tugas dinas.",
      bookingLink: "/User/FiturDmove/hal-dmove",
      ongoingLink: "/User/FiturDmove/ongoing",
    },
    {
      logo: "/assets/D'CARE.svg",
      title: 'Clinic Booking System',
      desc: "BI.CARE, memfasilitasi pembuatan janji temu dan reservasi layanan klinik Bank Indonesia secara terencana.",
      bookingLink: "/User/FiturBIcare/hal-BIcare",
      ongoingLink: "/User/FiturBIcare/ongoing",
    },
    {
      logo: "/assets/D'MEAL.svg",
      title: 'Meal Booking System',
      desc: "BI.MEAL, memfasilitasi pemesanan konsumsi secara terjadwal untuk mendukung kelancaran rapat dan tugas dinas.",
      bookingLink: "/User/FiturBImeal/hal-BImeal",
      ongoingLink: "/User/FiturBImeal/ongoing",
    },
    {
      logo: "/assets/D'ROOM.svg",
      title: 'Room Booking System',
      desc: "BI.MEET, menghadirkan kemudahan reservasi ruang rapat dalam penyelenggaraan pertemuan dan kolaborasi antarunit kerja.",
      bookingLink: "/User/FiturBimeet/hal-bimeet",
      ongoingLink: "/User/FiturBimeet/ongoing",
    },
    {
      logo: "/assets/D'TRACK.svg",
      title: 'Docs Numbering System',
      desc: "BI.MAIL, menyediakan layanan pelacakan dan penomoran surat dinas secara digital, sehingga administrasi surat-menyurat.",
      bookingLink: "/User/FiturBImail/hal-BImail",
      ongoingLink: "/User/FiturBImail/ongoing",
    },
    {
      logo: "/assets/D'REST.svg",
      title: 'Wisma Booking System',
      desc: "BI.STAY, menyediakan sistem reservasi akomodasi rumah dinas Bank Indonesia selama menjalankan penugasan.",
      bookingLink: "/User/FiturBIstay/hal-BIstay",
      ongoingLink: "/User/FiturBIstay/ongoing",
    },
  ];

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
                  <Image
                    src={fitur.logo}
                    alt={fitur.title}
                    width={500}
                    height={100}
                    className={styles.cardLogo}
                    priority
                  />
                  <div className={styles.cardTitle}>{fitur.title}</div>
                  <div className={styles.cardDesc}>{fitur.desc}</div>

                  {/* 🔹 Dua tombol sejajar */}
                  <div className={styles.actionsRow}>
                    {fitur.ongoingLink ? (
                      <Link
                        href={withNs(fitur.ongoingLink, ns)}
                        className={`${styles.btn} ${styles.btnSecondary}`}
                      >
                        On Going
                      </Link>
                    ) : (
                      <button className={`${styles.btn} ${styles.btnSecondary}`} disabled>On Going</button>
                    )}

                    {fitur.bookingLink ? (
                      <Link
                        href={withNs(fitur.bookingLink, ns)}
                        className={`${styles.btn} ${styles.btnPrimary}`}
                      >
                        Booking
                      </Link>
                    ) : (
                      <button className={`${styles.btn} ${styles.btnPrimary}`} disabled>Booking</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      <LogoutPopup
        open={showLogoutPopup}
        onCancel={() => setShowLogoutPopup(false)}
        onLogout={handleLogout}
      />
    </div>
  );
}

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
