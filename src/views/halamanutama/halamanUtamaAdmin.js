// /src/views/halamanutama/halamanUtamaAdmin.js (atau path kamu)
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import styles from './halamanUtamaAdmin.module.css';
import SidebarAdmin from '@/components/SidebarAdmin/SidebarAdmin';
import LogoutPopup from '@/components/LogoutPopup/LogoutPopup';
import ServicesCards from '@/components/ServiceCards/ServiceCards';

import { jwtVerify } from 'jose';

// ===== Helpers =====
const NS_RE = /^[A-Za-z0-9_-]{3,32}$/;
const withNs = (url, ns) => {
  if (!ns) return url;
  const sep = url.includes('?') ? '&' : '?';
  return `${url}${sep}ns=${encodeURIComponent(ns)}`;
};

export default function HalamanUtamaAdmin({ initialAdminName = 'Admin' }) {
  const router = useRouter();
  const ns = typeof router.query.ns === 'string' && NS_RE.test(router.query.ns) ? router.query.ns : '';

  const [namaAdmin, setNamaAdmin] = useState(initialAdminName);
  const [showLogoutPopup, setShowLogoutPopup] = useState(false);

  // ✅ Client guard
  useEffect(() => {
    let active = true;
    (async () => {
      if (!router.isReady) return;

      if (!ns) {
        router.replace(`/Signin/hal-signAdmin?from=${encodeURIComponent(router.asPath)}`);
        return;
      }

      try {
        const r = await fetch(withNs('/api/me?scope=admin', ns), { cache: 'no-store' });
        const d = await r.json();

        if (!active) return;

        const ok = d?.hasToken && d?.payload?.role === 'admin';
        if (!ok) {
          router.replace(`/Signin/hal-signAdmin?from=${encodeURIComponent(router.asPath)}`);
          return;
        }

        setNamaAdmin(d?.payload?.name || initialAdminName);
      } catch {
        router.replace(`/Signin/hal-signAdmin?from=${encodeURIComponent(router.asPath)}`);
      }
    })();
    return () => { active = false; };
  }, [router.isReady, router.asPath, ns, initialAdminName, router]);

  // ✅ Logout per-namespace
  const handleLogout = async () => {
    try {
      const ns = new URLSearchParams(location.search).get('ns');
      await fetch('/api/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ area: 'admin', ns }),
      });
    } catch {}
    router.replace('/Signin/hal-signAdmin');
  };

  return (
    <div className={styles.background}>
      <SidebarAdmin onLogout={() => setShowLogoutPopup(true)} />

      <main className={styles.mainContent}>
        <div className={styles.welcomeBox}>
          <h2 className={styles.greeting}>Selamat datang, {namaAdmin}</h2>

          <div className={styles.servicesBox}>
            <div className={styles.servicesTitle}>Pilih Layanan untuk Dikelola</div>
            <div className={styles.servicesDesc}>
              Lihat antrian & pesanan per fitur BI.ONE. Semua tautan di bawah akan membawa Anda ke halaman administrasi tiap layanan.
            </div>

            {/* 6 kartu layanan dari DB */}
            <ServicesCards ns={ns} />
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

// ✅ SSR guard
export async function getServerSideProps(ctx) {
  const NS_RE = /^[A-Za-z0-9_-]{3,32}$/;
  const withNs = (url, ns) => {
    if (!ns) return url;
    const sep = url.includes('?') ? '&' : '?';
    return `${url}${sep}ns=${encodeURIComponent(ns)}`;
  };

  const { ns: nsRaw } = ctx.query;
  const ns = Array.isArray(nsRaw) ? nsRaw[0] : nsRaw;
  const nsValid = typeof ns === 'string' && NS_RE.test(ns) ? ns : null;

  const from = ctx.resolvedUrl || '/Admin/HalamanUtama/hal-utamaAdmin';

  if (!nsValid) {
    return {
      redirect: { destination: `/Signin/hal-signAdmin?from=${encodeURIComponent(from)}`, permanent: false },
    };
  }

  const cookieName = `admin_session__${nsValid}`;
  const token = ctx.req.cookies?.[cookieName] || null;

  if (!token) {
    return {
      redirect: { destination: `/Signin/hal-signAdmin?from=${encodeURIComponent(withNs(from, nsValid))}`, permanent: false },
    };
  }

  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error('missing-secret');
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret), {
      algorithms: ['HS256'],
      clockTolerance: 10,
    });

    if (payload?.role !== 'admin') {
      return {
        redirect: { destination: `/Signin/hal-signAdmin?from=${encodeURIComponent(withNs(from, nsValid))}`, permanent: false },
      };
    }

    return { props: { initialAdminName: payload?.name || 'Admin' } };
  } catch {
    return {
      redirect: { destination: `/Signin/hal-signAdmin?from=${encodeURIComponent(withNs(from, nsValid))}`, permanent: false },
    };
  }
}
