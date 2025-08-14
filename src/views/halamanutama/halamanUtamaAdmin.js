// /pages/HalamanUtama/hal-utamaAdmin.js
import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/router';
import styles from './halamanUtamaAdmin.module.css';
import SidebarAdmin from '@/components/SidebarAdmin/SidebarAdmin';
import LogoutPopup from '@/components/LogoutPopup/LogoutPopup';
import Pagination from '@/components/Pagination/Pagination';
import { jwtVerify } from 'jose';

// Helper kecil
const NS_RE = /^[A-Za-z0-9_-]{3,32}$/;
const withNs = (url, ns) => {
  if (!ns) return url;
  const sep = url.includes('?') ? '&' : '?';
  return `${url}${sep}ns=${encodeURIComponent(ns)}`;
};
const calculateDuration = (start, end) => {
  if (!start || !end) return 'N/A';
  const d = Math.ceil(Math.abs(new Date(end) - new Date(start)) / (1000 * 60 * 60 * 24));
  return `${d || 1} Hari`;
};

const STATUS_CONFIG = {
  '1': { text: 'Pending', className: styles.layananStatusProcess },
};

export default function HalamanUtamaAdmin({ initialAdminName = 'Admin' }) {
  const router = useRouter();
  const ns = typeof router.query.ns === 'string' && NS_RE.test(router.query.ns) ? router.query.ns : '';

  const [namaAdmin, setNamaAdmin] = useState(initialAdminName);
  const [incomingBookings, setIncomingBookings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showLogoutPopup, setShowLogoutPopup] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(6);
  const listTopRef = useRef(null);

  // ✅ CLIENT-SIDE GUARD: cek sesi admin untuk ns ini
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

        // Setelah lolos, load data (opsional: ikutkan ns agar konsisten di server jika perlu)
        setIsLoading(true);
        setError(null);
        const res = await fetch(withNs('/api/booking?status=pending', ns), { cache: 'no-store' });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData?.error || 'Gagal memuat data booking');
        }
        const data = await res.json();
        setIncomingBookings(data);
      } catch (e) {
        setError(e.message || 'Terjadi kesalahan');
      } finally {
        if (active) setIsLoading(false);
      }
    })();
    return () => { active = false; };
  }, [router.isReady, router.asPath, ns, initialAdminName, router]);

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

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil((incomingBookings.length || 0) / itemsPerPage)),
    [incomingBookings.length, itemsPerPage]
  );

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(1);
  }, [totalPages, currentPage]);

  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;

  const paginated = useMemo(
    () => incomingBookings.slice(startIndex, endIndex),
    [incomingBookings, startIndex, endIndex]
  );

  const onPageChange = useCallback((page) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
    listTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [totalPages]);

  const onChangeItemsPerPage = (e) => {
    const val = Number(e.target.value);
    setItemsPerPage(val);
    setCurrentPage(1);
    listTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const resultsFrom = incomingBookings.length ? startIndex + 1 : 0;
  const resultsTo = Math.min(endIndex, incomingBookings.length);

  return (
    <div className={styles.background}>
      <SidebarAdmin onLogout={() => setShowLogoutPopup(true)} />
      <main className={styles.mainContent}>
        <div className={styles.greeting}>
          Selamat datang, {namaAdmin}
          <div className={styles.adminText}>Admin</div>
        </div>

        <div className={styles.boxLayanan}>
          <div className={styles.titleLayanan}>LAYANAN MASUK</div>
          <div ref={listTopRef} />

          <div className={styles.cardList}>
            {isLoading ? (
              <p className={styles.loadingText}>Memuat layanan...</p>
            ) : error ? (
              <p className={styles.errorText}>Error: {error}</p>
            ) : paginated.length === 0 ? (
              <p className={styles.emptyText}>Belum ada permintaan booking baru.</p>
            ) : (
              paginated.map((booking) => {
                const statusInfo = STATUS_CONFIG[booking.status_id];
                const to = withNs(`/Admin/DetailsLaporan/hal-detailslaporan?id=${booking.id}`, ns);
                return (
                  <div
                    key={booking.id}
                    className={styles.cardLayanan}
                    onClick={() => router.push(to)}
                    onKeyDown={(e) => e.key === 'Enter' && router.push(to)}
                    role="button"
                    tabIndex={0}
                    aria-label={`Lihat detail booking ${booking.tujuan}`}
                  >
                    <Image
                      src={"/assets/D'MOVE.svg"}
                      alt="D'MOVE"
                      width={70}
                      height={70}
                      className={styles.cardLogo}
                      priority
                    />
                    <div className={styles.cardContent}>
                      <div className={styles.layananTitle}>{`Booking D'MOVE | ${booking.tujuan}`}</div>
                      <div className={styles.layananSub}>{calculateDuration(booking.start_date, booking.end_date)}</div>
                      {statusInfo && (
                        <div className={`${styles.layananStatus} ${statusInfo.className}`}>
                          {statusInfo.text}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {!isLoading && !error && incomingBookings.length > 0 && (
            <div className={styles.paginationContainer}>
              <div className={styles.paginationControls}>
                <div className={styles.resultsText}>
                  Menampilkan {resultsFrom}-{resultsTo} dari {incomingBookings.length} data
                </div>
                <div>
                  <label htmlFor="perPage" className={styles.label}>Jumlah item per halaman</label>
                  <select
                    id="perPage"
                    className={styles.itemsPerPageDropdown}
                    value={itemsPerPage}
                    onChange={onChangeItemsPerPage}
                    aria-label="Jumlah item per halaman"
                  >
                    <option value={5}>5</option>
                    <option value={6}>6</option>
                    <option value={8}>8</option>
                    <option value={10}>10</option>
                    <option value={15}>15</option>
                  </select>
                </div>
              </div>

              <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={onPageChange} />
            </div>
          )}
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

// ✅ SSR GUARD: cek cookie namespaced admin_session__{ns}
export async function getServerSideProps(ctx) {
  const { ns: nsRaw } = ctx.query;
  const ns = Array.isArray(nsRaw) ? nsRaw[0] : nsRaw;
  const nsValid = typeof ns === 'string' && NS_RE.test(ns) ? ns : null;

  const from = ctx.resolvedUrl || '/Admin/HalamanUtama/hal-utamaAdmin';

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
        destination: `/Signin/hal-signAdmin?from=${encodeURIComponent(withNs(from, nsValid))}`,
        permanent: false,
      },
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
        redirect: {
          destination: `/Signin/hal-signAdmin?from=${encodeURIComponent(withNs(from, nsValid))}`,
          permanent: false,
        },
      };
    }

    return {
      props: {
        initialAdminName: payload?.name || 'Admin',
      },
    };
  } catch {
    return {
      redirect: {
        destination: `/Signin/hal-signAdmin?from=${encodeURIComponent(withNs(from, nsValid))}`,
        permanent: false,
      },
    };
  }
}
