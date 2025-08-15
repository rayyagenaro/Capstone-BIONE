// /src/views/halamanutama/halamanUtamaAdmin.js
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

  // 🔒 Gating state
  const [roleId, setRoleId] = useState(null);                 // 1 = super admin, 2 = admin fitur
  const [allowedServiceIds, setAllowedServiceIds] = useState(null); // null = semua (super admin)
  const [loading, setLoading] = useState(true);

  // ✅ Client guard + ambil allowed services
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

        // Pastikan ada token
        if (!d?.hasToken || !d?.payload) {
          router.replace(`/Signin/hal-signAdmin?from=${encodeURIComponent(router.asPath)}`);
          return;
        }

        // Ambil role_id numerik yang sudah diperkaya oleh /api/me
        const rl = Number(d.payload.role_id_num ?? d.payload.role_id ?? 0);
        // Fallback: jika tidak ada role_id di JWT, gunakan role (string)
        const roleStr = String(d.payload.role || d.payload.roleNormalized || '').toLowerCase();
        const isSuper =
          rl === 1 ||
          roleStr === 'super_admin' || roleStr === 'superadmin' || roleStr === 'super-admin';
        const isAdminFitur =
          rl === 2 ||
          roleStr === 'admin_fitur' || roleStr === 'admin-fitur' || roleStr === 'admin';

        if (!isSuper && !isAdminFitur) {
          // bukan admin → tendang ke login admin
          router.replace(`/Signin/hal-signAdmin?from=${encodeURIComponent(router.asPath)}`);
          return;
        }

        setNamaAdmin(d.payload.name || initialAdminName);

        if (isSuper) {
          setRoleId(1);
          setAllowedServiceIds(null); // semua layanan
        } else {
          setRoleId(2);
          const ids = (d.payload.service_ids || []).map(Number);
          setAllowedServiceIds(ids);
        }

        setLoading(false);
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

  if (loading) {
    return <div className={styles.loading}>Memuat…</div>;
  }

  return (
    <div className={styles.background}>
      <SidebarAdmin onLogout={() => setShowLogoutPopup(true)} />

      <main className={styles.mainContent}>
        <div className={styles.welcomeBox}>
          <h2 className={styles.greeting}>
            Selamat datang, {namaAdmin}
          </h2>
          <div className={styles.roleBadge}>
            {roleId === 1 ? 'Super Admin' : 'Admin Fitur'}
          </div>

          <div className={styles.servicesBox}>
            <div className={styles.servicesTitle}>Pilih Layanan untuk Dikelola</div>
            <div className={styles.servicesDesc}>
              Lihat antrian & pesanan per fitur BI.ONE. Semua tautan di bawah akan membawa Anda ke halaman administrasi tiap layanan.
            </div>

            {/* Kartu layanan dari DB, dibatasi oleh allowedServiceIds */}
            <ServicesCards ns={ns} allowedServiceIds={allowedServiceIds} />
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

// ✅ SSR guard (validasi dasar token + role)
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

    const roleStr = String(payload?.role || '').toLowerCase();
    const roleIdNum = Number(payload?.role_id ?? 0);

    const isSuper =
      roleIdNum === 1 ||
      roleStr === 'super_admin' || roleStr === 'superadmin' || roleStr === 'super-admin';
    const isAdminFitur =
      roleIdNum === 2 ||
      roleStr === 'admin_fitur' || roleStr === 'admin-fitur' || roleStr === 'admin';

    if (!isSuper && !isAdminFitur) {
      return {
        redirect: { destination: `/Signin/hal-signAdmin?from=${encodeURIComponent(withNs(from, nsValid))}`, permanent: false },
      };
    }

    return {
      props: {
        initialAdminName: payload?.name || 'Admin',
      },
    };
  } catch {
    return {
      redirect: { destination: `/Signin/hal-signAdmin?from=${encodeURIComponent(withNs(from, nsValid))}`, permanent: false },
    };
  }
}
