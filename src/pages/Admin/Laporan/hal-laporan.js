// /src/pages/Admin/Laporan/hal-laporan.js
import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import SidebarAdmin from '@/components/SidebarAdmin/SidebarAdmin';
import SidebarFitur from '@/components/SidebarFitur/SidebarFitur';
import Pagination from '@/components/Pagination/Pagination';
import styles from './laporan.module.css';
import { jwtVerify } from 'jose';

const NS_RE = /^[A-Za-z0-9_-]{3,32}$/;

const MODULES = [
  { value: 'bi-care',  label: 'BI.CARE' },
  { value: 'bi-drive', label: 'BI.DRIVE' },
  { value: 'bi-meal',  label: 'BI.MEAL' },
  { value: 'bi-meet',  label: 'BI.MEET' },
  { value: 'bi-stay',  label: 'BI.STAY' },
  { value: 'bi-docs',  label: 'BI.DOCS' },
];

function withNs(url, ns) {
  if (!ns) return url;
  const sep = url.includes('?') ? '&' : '?';
  return `${url}${sep}ns=${encodeURIComponent(ns)}`;
}
function qs(params) {
  const sp = new URLSearchParams();
  Object.entries(params || {}).forEach(([k, v]) => {
    if (v === undefined || v === null) return;
    const sv = String(v).trim();
    if (sv === '') return;
    sp.append(k, sv);
  });
  const s = sp.toString();
  return s ? `?${s}` : '';
}

// === utils tanggal ===
const pad = (n) => String(n).padStart(2, '0');
function fmtDateTimeLocal(v) {
  if (!v) return '';
  if (/^\d{2}:\d{2}(:\d{2})?$/.test(v)) {
    const [h, m] = v.split(':');
    return `${h}:${m}`;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  const d = new Date(v);
  if (isNaN(d)) return String(v);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function looksDateKey(k) {
  return /(date|time|datetime|created|updated|birth|tanggal)/i.test(k);
}

export default function HalLaporan({ initialRoleId = null }) {
  const router = useRouter();

  // ==== NS dari query/asPath ====
  const nsFromQuery = typeof router.query.ns === 'string' ? router.query.ns : '';
  const nsFromAsPath = (() => {
    const q = router.asPath.split('?')[1];
    if (!q) return '';
    const params = new URLSearchParams(q);
    const v = params.get('ns') || '';
    return NS_RE.test(v) ? v : '';
  })();
  const ns = NS_RE.test(nsFromQuery) ? nsFromQuery : nsFromAsPath;

  // ==== Role → pilih sidebar ====
  const [roleId, setRoleId] = useState(initialRoleId); // 1=super admin, 2=admin fitur
  const [sbLoading, setSbLoading] = useState(initialRoleId == null);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!router.isReady || initialRoleId != null) { setSbLoading(false); return; }
      try {
        const url = ns ? `/api/me?scope=admin&ns=${encodeURIComponent(ns)}` : '/api/me?scope=admin';
        const r = await fetch(url, { cache: 'no-store' });
        const d = await r.json();
        if (!alive) return;
        const rl = Number(d?.payload?.role_id_num ?? d?.payload?.role_id ?? 0);
        const rs = String(d?.payload?.role || d?.payload?.roleNormalized || '').toLowerCase();
        const isSuper = rl === 1 || ['super_admin','superadmin','super-admin'].includes(rs);
        setRoleId(isSuper ? 1 : 2);
      } catch {
        setRoleId(2); // default aman: sidebar fitur
      } finally {
        if (alive) setSbLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [router.isReady, ns, initialRoleId]);

  // ==== State data laporan ====
  const [moduleKey, setModuleKey] = useState('bi-meet');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [loading, setLoading] = useState(false);
  const [errMsg, setErrMsg] = useState('');
  const [preview, setPreview] = useState({ columns: [], rows: [] });
  const [q, setQ] = useState('');

  // pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // auto load saat filter berubah
  useEffect(() => {
    if (!router.isReady) return;
    const ac = new AbortController();
    setLoading(true);
    setErrMsg('');
    setCurrentPage(1);

    (async () => {
      try {
        const query = qs({ module: moduleKey, from: from || undefined, to: to || undefined });
        const url = withNs(`/api/admin/laporan/booking${query}`, ns);
        const res = await fetch(url, { cache: 'no-store', signal: ac.signal });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error || 'Gagal mengambil data');

        const rows = Array.isArray(data.rows)
          ? data.rows.map((r) => {
              const out = { ...r };
              Object.keys(out).forEach((k) => {
                if (out[k] == null) out[k] = '';
                else if (looksDateKey(k)) out[k] = fmtDateTimeLocal(out[k]);
                else if (typeof out[k] === 'string' && out[k].endsWith('.000Z')) out[k] = fmtDateTimeLocal(out[k]);
              });
              return out;
            })
          : [];

        rows.sort((a, b) => (Number(a?.id) || 0) - (Number(b?.id) || 0));
        setPreview({ columns: data.columns || [], rows });
      } catch (e) {
        if (e.name !== 'AbortError') {
          setPreview({ columns: [], rows: [] });
          setErrMsg(e?.message || 'Terjadi kesalahan');
        }
      } finally {
        if (!ac.signal.aborted) setLoading(false);
      }
    })();

    return () => ac.abort();
  }, [router.isReady, moduleKey, from, to, ns]);

  // export excel
  async function doExport() {
    try {
      const query = qs({ module: moduleKey, from: from || undefined, to: to || undefined });
      const url = withNs(`/api/export/laporan${query}`, ns);
      const a = document.createElement('a');
      a.href = url; a.target = '_blank';
      document.body.appendChild(a); a.click(); a.remove();
    } catch (e) {
      alert(e?.message || 'Gagal mengekspor');
    }
  }

  // filter + paging
  const filteredRows = useMemo(() => {
    if (!q.trim()) return preview.rows;
    const s = q.toLowerCase();
    return preview.rows.filter((row) => Object.values(row).some((v) => String(v ?? '').toLowerCase().includes(s)));
  }, [preview.rows, q]);

  const totalItems = filteredRows.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const clampedPage = Math.min(currentPage, totalPages);
  const startIdx = (clampedPage - 1) * itemsPerPage;
  const endIdx = Math.min(startIdx + itemsPerPage, totalItems);
  const pageRows = filteredRows.slice(startIdx, endIdx);

  const statusCell = (value) => {
    if (!value) return '';
    const val = String(value).toLowerCase();
    let cls = styles.pillPending;
    if (/finish|verified|approved/.test(val)) cls = styles.pillVerified;
    else if (/reject|cancel/.test(val)) cls = styles.pillRejected;
    return <span className={`${styles.statusPill} ${cls}`}>{value}</span>;
  };
  const renderCell = (k, v) => {
    if (k === 'status' || k === 'status_name') return statusCell(v);
    if (looksDateKey(k)) return <span className={styles.dateCell}>{fmtDateTimeLocal(v)}</span>;
    return v || '';
  };

  const resultsText = totalItems ? `Results: ${startIdx + 1} - ${endIdx} of ${totalItems}` : '';
  useEffect(() => { setCurrentPage(1); }, [itemsPerPage, moduleKey]);

  const SidebarComp = roleId === 1 ? SidebarAdmin : SidebarFitur;

  return (
    <div className={styles.background}>
      {!sbLoading && <SidebarComp />}
      <main className={styles.mainContent}>
        <div className={styles.tableBox}>
          <div className={styles.tableTopRow}>
            <div className={styles.tableTitle}>LAPORAN BOOKING</div>
          </div>

          {/* Controls */}
          <div className={styles.controlsRow}>
            <div className={styles.controlGroup}>
              <label className={styles.label}>Layanan</label>
              <select className={styles.input} value={moduleKey} onChange={(e) => setModuleKey(e.target.value)}>
                {MODULES.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>

            <div className={styles.controlGroup}>
              <label className={styles.label}>Dari</label>
              <input type="date" className={styles.input} value={from} onChange={(e) => setFrom(e.target.value)} placeholder="Semua" />
            </div>

            <div className={styles.controlGroup}>
              <label className={styles.label}>Sampai</label>
              <input type="date" className={styles.input} value={to} onChange={(e) => setTo(e.target.value)} placeholder="Semua" />
            </div>

            <div className={styles.actionsRight}>
              <button className={styles.exportBtn} onClick={doExport} disabled={loading || !preview.rows.length} title="Ekspor ke Excel">
                Ekspor Excel
              </button>
            </div>
          </div>

          {/* Search */}
          <div className={styles.searchRow}>
            <input
              type="text"
              placeholder="Cari cepat di hasil…"
              className={styles.searchInput}
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <div className={styles.resultsText}>{resultsText}</div>
          </div>

          {/* Table */}
          <div className={styles.tableWrapper}>
            <table className={styles.dataTable}>
              <thead>
                <tr>
                  {preview.columns.map((c) => (
                    <th key={c.key}>{c.header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td className={styles.centerMuted} colSpan={preview.columns.length}>Memuat data…</td>
                  </tr>
                )}
                {!loading && errMsg && (
                  <tr>
                    <td className={styles.centerError} colSpan={preview.columns.length}>{errMsg}</td>
                  </tr>
                )}
                {!loading && !errMsg && pageRows.length === 0 && (
                  <tr>
                    <td className={styles.centerMuted} colSpan={preview.columns.length}>Tidak ada data.</td>
                  </tr>
                )}
                {!loading && !errMsg && pageRows.map((row, idx) => (
                  <tr key={`${row.id}-${idx}`}>
                    {preview.columns.map((c) => (
                      <td key={c.key}>
                        {renderCell(c.key, row[c.key])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalItems > 0 && (
            <>
              <div className={styles.paginationControls}>
                <span className={styles.resultsText}>{resultsText}</span>
                <div>
                  <label htmlFor="itemsPerPage" className={styles.label}>Items per page:</label>
                  <select
                    id="itemsPerPage"
                    value={itemsPerPage}
                    onChange={(e) => setItemsPerPage(Number(e.target.value))}
                    className={styles.itemsPerPageDropdown}
                    aria-label="Items per page"
                  >
                    <option value="10">10</option>
                    <option value="25">25</option>
                    <option value="50">50</option>
                    <option value="100">100</option>
                  </select>
                </div>
              </div>

              <Pagination
                currentPage={Math.min(currentPage, totalPages)}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            </>
          )}
        </div>
      </main>
    </div>
  );
}

// ====== SSR: validasi token + role → pass initialRoleId ======
export async function getServerSideProps(ctx) {
  const { ns: raw } = ctx.query;
  const ns = Array.isArray(raw) ? raw[0] : raw;
  const nsValid = typeof ns === 'string' && NS_RE.test(ns) ? ns : null;
  const fromUrl = ctx.resolvedUrl || '/Admin/Laporan/hal-laporan';

  if (!nsValid) {
    return { redirect: { destination: `/Signin/hal-signAdmin?from=${encodeURIComponent(fromUrl)}`, permanent: false } };
  }

  const cookieName = `admin_session__${nsValid}`;
  const token = ctx.req.cookies?.[cookieName] || null;
  if (!token) {
    return { redirect: { destination: `/Signin/hal-signAdmin?from=${encodeURIComponent(fromUrl)}`, permanent: false } };
  }

  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error('missing-secret');

    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret), {
      algorithms: ['HS256'],
      clockTolerance: 10,
    });

    const roleIdNum = Number(payload?.role_id ?? 0);
    const roleStr   = String(payload?.role || '').toLowerCase();
    const isSuper = roleIdNum === 1 || ['super_admin','superadmin','super-admin'].includes(roleStr);
    const isFitur = roleIdNum === 2 || ['admin_fitur','admin-fitur','admin'].includes(roleStr);

    if (!isSuper && !isFitur) {
      return { redirect: { destination: `/Signin/hal-signAdmin?from=${encodeURIComponent(fromUrl)}`, permanent: false } };
    }

    return { props: { initialRoleId: isSuper ? 1 : 2 } };
  } catch {
    return { redirect: { destination: `/Signin/hal-signAdmin?from=${encodeURIComponent(fromUrl)}`, permanent: false } };
  }
}
