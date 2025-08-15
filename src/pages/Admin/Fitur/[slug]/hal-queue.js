// /src/pages/Admin/Fitur/[slug]/hal-queue.js
import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/router';
import styles from './hal-queue.module.css';
import SidebarAdmin from '@/components/SidebarAdmin/SidebarAdmin';
import LogoutPopup from '@/components/LogoutPopup/LogoutPopup';
import Pagination from '@/components/Pagination/Pagination';
import { jwtVerify } from 'jose';

// ===== Helpers =====
const NS_RE = /^[A-Za-z0-9_-]{3,32}$/;
const withNs = (url, ns) => {
  if (!ns) return url;
  const sep = url.includes('?') ? '&' : '?';
  return `${url}${sep}ns=${encodeURIComponent(ns)}`;
};

const calculateDays = (start, end) => {
  if (!start || !end) return '';
  const d = Math.ceil(Math.abs(new Date(end) - new Date(start)) / (1000 * 60 * 60 * 24));
  return `${d || 1} Hari`;
};

// Logo & title per layanan (pakai aset yang sama seperti beranda)
const META = {
  dmove:  { title: "BI.DRIVE", logo: "/assets/D'MOVE.svg"  },
  bicare: { title: "BI.CARE",  logo: "/assets/D'CARE.svg"  },
  bimeal: { title: "BI.MEAL",  logo: "/assets/D'MEAL.svg"  },
  bimeet: { title: "BI.MEET",  logo: "/assets/D'ROOM.svg"  },
  bimail: { title: "BI.DOCS",  logo: "/assets/D%27TRACK.svg" },
  bistay: { title: "BI.STAY",  logo: "/assets/D'REST.svg"  },
};

// Render isi card per layanan (judul, subjudul, status)
function renderCardText(slug, row) {
  switch (slug) {
    case 'dmove':
      return {
        title: `Booking D'MOVE | ${row.tujuan || '-'}`,
        sub: calculateDays(row.start_date, row.end_date),
        status: row.status_name || (row.status_id === 1 ? 'Pending' : row.status_id ?? ''),
      };
    case 'bicare':
      return {
        title: `BI.CARE | ${row.booker_name || '-'}${row.patient_name ? ' → ' + row.patient_name : ''}`,
        sub: `${row.booking_date || '-'} • ${row.slot_time || '-'}`,
        status: row.status || '',
      };
    case 'bimeet':
      return {
        title: `BI.MEET | ${row.title || '-'}`,
        sub: `${row.start_datetime || '-'} → ${row.end_datetime || '-'}`,
        status: row.status_name || (row.status_id === 1 ? 'Pending' : row.status_id ?? ''),
      };
    case 'bimail':
      return {
        title: `BI.DOCS | ${row.nomor_surat || '-'}`,
        sub: `${row.tanggal_dokumen || '-'}${row.perihal ? ' • ' + row.perihal : ''}`,
        status: '',
      };
    case 'bistay':
      return {
        title: `BI.STAY | ${row.nama_pemesan || '-'}`,
        sub: `${row.check_in || '-'} → ${row.check_out || '-'}`,
        status: '',
      };
    case 'bimeal':
      return { title: 'BI.MEAL', sub: 'Belum ada data', status: '' };
    default:
      return { title: '', sub: '', status: '' };
  }
}

export default function HalQueue({ initialAdminName = 'Admin' }) {
  const router = useRouter();
  const slug = String(router.query.slug || '').toLowerCase();
  const ns = typeof router.query.ns === 'string' && NS_RE.test(router.query.ns) ? router.query.ns : '';

  const [namaAdmin, setNamaAdmin] = useState(initialAdminName);
  const [showLogoutPopup, setShowLogoutPopup] = useState(false);

  // data list
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  // pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(6);
  const listTopRef = useRef(null);

  // ===== Guard sesi admin (per-namespace)
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

        if (!(d?.hasToken && d?.payload?.role === 'admin')) {
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

  // ===== Load data queue per layanan =====
  useEffect(() => {
    let active = true;
    (async () => {
      if (!slug) return;
      try {
        setLoading(true); setErr('');
        const r = await fetch(`/api/admin/queue/${slug}?status=pending&page=1&perPage=200`, { cache: 'no-store' });
        if (!r.ok) throw new Error('Gagal memuat antrian');
        const d = await r.json();
        if (!active) return;
        setItems(d.items || []);
        setTotal(Number(d.total || 0));
      } catch (e) {
        if (!active) return;
        setErr(e.message || 'Terjadi kesalahan');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [slug]);

  // pagination client-side
  const totalPages = useMemo(
    () => Math.max(1, Math.ceil((items.length || 0) / itemsPerPage)),
    [items.length, itemsPerPage]
  );
  useEffect(() => { if (currentPage > totalPages) setCurrentPage(1); }, [totalPages, currentPage]);

  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginated = useMemo(() => items.slice(startIndex, endIndex), [items, startIndex, endIndex]);

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

  const resultsFrom = items.length ? startIndex + 1 : 0;
  const resultsTo = Math.min(endIndex, items.length);

  const meta = META[slug] || { title: slug.toUpperCase(), logo: '/assets/placeholder-service.svg' };

  const handleLogout = async () => {
    try {
      const nsQ = new URLSearchParams(location.search).get('ns');
      await fetch('/api/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ area: 'admin', ns: nsQ }),
      });
    } catch {}
    router.replace('/Signin/hal-signAdmin');
  };

  const goBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
    } else {
      router.push(withNs('/Admin/Fitur/hal-utamaadmin', ns));
    }
  };

  const buildDetailUrl = (row) => {
    if (slug === 'dmove') {
      return withNs(`/Admin/DetailsLaporan/hal-detailslaporan?id=${row.id}`, ns);
    }
    return withNs(`/Admin/Fitur/${slug}/detail?id=${row.id}`, ns);
  };

  return (
    <div className={styles.background}>
      <SidebarAdmin onLogout={() => setShowLogoutPopup(true)} />

      <main className={styles.mainContent}>
        <div className={styles.greeting}>
          Selamat datang, {namaAdmin}
          <div className={styles.adminText}>Admin</div>
        </div>

        <div className={styles.boxLayanan}>
          {/* ====== Header box: tombol kembali + title di tengah ====== */}
          <div className={styles.headerRow}>
            <button
              type="button"
              className={styles.backBtn}
              onClick={goBack}
              aria-label="Kembali"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M15 18l-6-6 6-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Kembali
            </button>

            <div className={styles.titleLayanan}>
              LAYANAN MASUK • {meta.title}
            </div>

            <div aria-hidden="true" /> {/* spacer kanan agar title tetap center */}
          </div>

          <div ref={listTopRef} />

          <div className={styles.cardList}>
            {loading ? (
              <p className={styles.loadingText}>Memuat layanan...</p>
            ) : err ? (
              <p className={styles.errorText}>Error: {err}</p>
            ) : paginated.length === 0 ? (
              <p className={styles.emptyText}>Belum ada permintaan booking baru.</p>
            ) : (
              paginated.map((row) => {
                const t = renderCardText(slug, row);
                const to = buildDetailUrl(row);
                return (
                  <div
                    key={row.id}
                    className={styles.cardLayanan}
                    onClick={() => router.push(to)}
                    onKeyDown={(e) => e.key === 'Enter' && router.push(to)}
                    role="button"
                    tabIndex={0}
                    aria-label={`Lihat detail pesanan ${meta.title} #${row.id}`}
                  >
                    <Image
                      src={meta.logo}
                      alt={meta.title}
                      width={70}
                      height={70}
                      className={styles.cardLogo}
                      priority
                    />
                    <div className={styles.cardContent}>
                      <div className={styles.layananTitle}>{t.title}</div>
                      {t.sub && <div className={styles.layananSub}>{t.sub}</div>}
                      {t.status && (
                        <div className={`${styles.layananStatus} ${t.status === 'Pending' ? styles.layananStatusProcess : ''}`}>
                          {t.status}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {!loading && !err && items.length > 0 && (
            <div className={styles.paginationContainer}>
              <div className={styles.paginationControls}>
                <div className={styles.resultsText}>
                  Menampilkan {resultsFrom}-{resultsTo} dari {items.length} data
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

// ===== SSR guard: cek cookie namespaced admin_session__{ns}
export async function getServerSideProps(ctx) {
  const { ns: nsRaw } = ctx.query;
  const ns = Array.isArray(nsRaw) ? nsRaw[0] : nsRaw;
  const nsValid = typeof ns === 'string' && NS_RE.test(ns) ? ns : null;

  const from = ctx.resolvedUrl || '/Admin/Fitur/[slug]/hal-queue';

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

    return { props: { initialAdminName: payload?.name || 'Admin' } };
  } catch {
    return {
      redirect: {
        destination: `/Signin/hal-signAdmin?from=${encodeURIComponent(withNs(from, nsValid))}`,
        permanent: false,
      },
    };
  }
}
