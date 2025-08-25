// /src/views/halamanutama/halamanUtamaAdmin.js
import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import styles from './halamanUtamaAdmin.module.css';

// Sidebars
import SidebarAdmin from '@/components/SidebarAdmin/SidebarAdmin';
import SidebarFitur from '@/components/SidebarFitur/SidebarFitur';

import LogoutPopup from '@/components/LogoutPopup/LogoutPopup';
import ServicesCards from '@/components/ServiceCards/ServiceCards';
import { jwtVerify } from 'jose';

/* ===================== Helpers ===================== */
const NS_RE = /^[A-Za-z0-9_-]{3,32}$/;
const withNs = (url, ns) => {
  if (!ns) return url;
  const sep = url.includes('?') ? '&' : '?';
  return `${url}${sep}ns=${encodeURIComponent(ns)}`;
};

/* ===================== Page ===================== */
export default function HalamanUtamaAdmin({
  initialAdminName = 'Admin',
  initialRoleId = null, // 1 super admin, 2 admin fitur
}) {
  const router = useRouter();

  // Ambil ns yang valid dari query
  const ns =
    typeof router.query.ns === 'string' && NS_RE.test(router.query.ns)
      ? router.query.ns
      : '';

  // Nama admin di header
  const [namaAdmin, setNamaAdmin] = useState(initialAdminName);

  // Logout popup
  const [showLogoutPopup, setShowLogoutPopup] = useState(false);

  // Role gating
  const [roleId, setRoleId] = useState(
    typeof initialRoleId === 'number' ? initialRoleId : null
  ); // 1 / 2
  const [allowedServiceIds, setAllowedServiceIds] = useState(
    initialRoleId === 1 ? null : initialRoleId === 2 ? [] : null
  ); // null = semua (super admin); [] = belum tahu utk admin fitur
  const [loading, setLoading] = useState(initialRoleId == null);

  // Pilih sidebar dari role
  const Sidebar = useMemo(() => {
    if (roleId === 1) return SidebarAdmin; // super admin
    if (roleId === 2) return SidebarFitur; // admin fitur
    return null;
  }, [roleId]);

  /* ---------- Client guard + enrich allowed services ---------- */
  useEffect(() => {
    let alive = true;

    (async () => {
      if (!router.isReady) return;

      // Jika ns kosong, paksa login
      if (!ns) {
        router.replace(
          `/Signin/hal-signAdmin?from=${encodeURIComponent(router.asPath)}`
        );
        return;
      }

      try {
        const r = await fetch(withNs('/api/me?scope=admin', ns), {
          cache: 'no-store',
        });
        const d = await r.json();
        if (!alive) return;

        if (!d?.hasToken || !d?.payload) {
          router.replace(
            `/Signin/hal-signAdmin?from=${encodeURIComponent(router.asPath)}`
          );
          return;
        }

        // Nama untuk salam
        setNamaAdmin(d.payload.name || initialAdminName);

        // Normalisasi role
        const rl = Number(d.payload.role_id_num ?? d.payload.role_id ?? 0);
        const roleStr = String(
          d.payload.role || d.payload.roleNormalized || ''
        ).toLowerCase();

        const isSuper =
          rl === 1 ||
          roleStr === 'super_admin' ||
          roleStr === 'superadmin' ||
          roleStr === 'super-admin';

        const isAdminFitur =
          rl === 2 ||
          roleStr === 'admin_fitur' ||
          roleStr === 'admin-fitur' ||
          roleStr === 'admin';

        if (!isSuper && !isAdminFitur) {
          router.replace(
            `/Signin/hal-signAdmin?from=${encodeURIComponent(router.asPath)}`
          );
          return;
        }

        if (isSuper) {
          setRoleId(1);
          setAllowedServiceIds(null); // semua
        } else {
          setRoleId(2);
          const ids = Array.isArray(d.payload.service_ids)
            ? d.payload.service_ids.map(Number)
            : [];
          setAllowedServiceIds(ids);
        }

        setLoading(false);
      } catch {
        router.replace(
          `/Signin/hal-signAdmin?from=${encodeURIComponent(router.asPath)}`
        );
      }
    })();

    return () => {
      alive = false;
    };
  }, [router.isReady, router.asPath, ns, initialAdminName]);

  /* ---------- Logout per-namespace ---------- */
  const handleLogout = async () => {
    try {
      const nsQS = new URLSearchParams(location.search).get('ns');
      await fetch('/api/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ area: 'admin', ns: nsQS }),
      });
    } catch {}
    router.replace('/Signin/hal-signAdmin');
  };

  if (loading || !Sidebar) {
    return <div className={styles.loading}>Memuat…</div>;
  }

  return (
    <div className={styles.background}>
      {/* === Sidebar sesuai role === */}
      <Sidebar onLogout={() => setShowLogoutPopup(true)} />

      <main className={styles.mainContent}>
        <div className={styles.welcomeBox}>
          <h2 className={styles.greeting}>Selamat datang, {namaAdmin}</h2>

          <div className={styles.roleBadge}>
            {roleId === 1 ? 'Super Admin' : 'Admin Fitur'}
          </div>

          <div className={styles.servicesBox}>
            <div className={styles.servicesTitle}>Pilih Layanan untuk Dikelola</div>
            <div className={styles.servicesDesc}>
              Lihat antrian &amp; pesanan per fitur BI.ONE. Semua tautan di bawah
              akan membawa Anda ke halaman administrasi tiap layanan.
            </div>

            {/* Kartu layanan dibatasi allowedServiceIds (null=semua) */}
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

/* ===================== SSR Guard ===================== */
/**
 * - Validasi token admin (bukan membatasi super admin saja).
 * - Kirim initialRoleId supaya sidebar benar sejak first paint.
 */
export async function getServerSideProps(ctx) {
  const { ns: nsRaw } = ctx.query;
  const ns = Array.isArray(nsRaw) ? nsRaw[0] : nsRaw;
  const nsValid = typeof ns === 'string' && NS_RE.test(ns) ? ns : null;

  const from = ctx.resolvedUrl || '/Admin/HalamanUtama/hal-utamaAdmin';

  // Wajib ada ns yang valid
  if (!nsValid) {
    return {
      redirect: {
        destination: `/Signin/hal-signAdmin?from=${encodeURIComponent(from)}`,
        permanent: false,
      },
    };
  }

  const cookieName = `admin_session__${nsValid}`;
  const token = ctx.req.cookies?.[cookieName] || null;

  if (!token) {
    return {
      redirect: {
        destination: `/Signin/hal-signAdmin?from=${encodeURIComponent(
          withNs(from, nsValid)
        )}`,
        permanent: false,
      },
    };
  }

  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error('missing-secret');

    const { payload } = await jwtVerify(
      token,
      new TextEncoder().encode(secret),
      {
        algorithms: ['HS256'],
        clockTolerance: 10,
      }
    );

    const roleStr = String(payload?.role || '').toLowerCase();
    const roleIdNum = Number(payload?.role_id ?? 0);

    const isSuper =
      roleIdNum === 1 ||
      roleStr === 'super_admin' ||
      roleStr === 'superadmin' ||
      roleStr === 'super-admin';

    const isAdminFitur =
      roleIdNum === 2 ||
      roleStr === 'admin_fitur' ||
      roleStr === 'admin-fitur' ||
      roleStr === 'admin';

    if (!isSuper && !isAdminFitur) {
      return {
        redirect: {
          destination: `/Signin/hal-signAdmin?from=${encodeURIComponent(
            withNs(from, nsValid)
          )}`,
          permanent: false,
        },
      };
    }

    return {
      props: {
        initialAdminName: payload?.name || 'Admin',
        initialRoleId: isSuper ? 1 : 2,
      },
    };
  } catch {
    return {
      redirect: {
        destination: `/Signin/hal-signAdmin?from=${encodeURIComponent(
          withNs(from, nsValid)
        )}`,
        permanent: false,
      },
    };
  }
}
