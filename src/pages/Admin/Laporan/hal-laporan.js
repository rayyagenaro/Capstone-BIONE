// /src/pages/Admin/Laporan/hal-laporan.js
import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import SidebarAdmin from '@/components/SidebarAdmin/SidebarAdmin';
import Pagination from '@/components/Pagination/Pagination';
import styles from './laporan.module.css';

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

export default function HalLaporan() {
  const router = useRouter();

  // ns dari query
  const nsFromQuery = typeof router.query.ns === 'string' ? router.query.ns : '';
  const nsFromAsPath = (() => {
    const q = router.asPath.split('?')[1];
    if (!q) return '';
    const params = new URLSearchParams(q);
    const v = params.get('ns') || '';
    return NS_RE.test(v) ? v : '';
  })();
  const ns = NS_RE.test(nsFromQuery) ? nsFromQuery : nsFromAsPath;

  // state
  const [moduleKey, setModuleKey] = useState('bi-meet');
  const [from, setFrom] = useState(''); // kosong = semua
  const [to, setTo] = useState('');
  const [loading, setLoading] = useState(false);
  const [errMsg, setErrMsg] = useState('');
  const [preview, setPreview] = useState({ columns: [], rows: [] });
  const [q, setQ] = useState('');

  // pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // === AUTO LOAD: fetch setiap module/from/to berubah ===
  useEffect(() => {
    if (!router.isReady) return;

    const ac = new AbortController(); // cancel request lama
    setLoading(true);
    setErrMsg('');
    setCurrentPage(1); // reset ke halaman 1 setiap filter berubah

    (async () => {
      try {
        const query = qs({
          module: moduleKey,
          from: from || undefined,
          to:   to   || undefined,
        });
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

        // default sort ID ASC
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

  // export SEMUA baris (bukan hanya halaman aktif)
  async function doExport() {
    try {
      const query = qs({
        module: moduleKey,
        from: from || undefined,
        to:   to   || undefined,
      });
      const url = withNs(`/api/export/laporan${query}`, ns);
      const a = document.createElement('a');
      a.href = url;
      a.target = '_blank';
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (e) {
      alert(e?.message || 'Gagal mengekspor');
    }
  }

  // filter client-side (search box)
  const filteredRows = useMemo(() => {
    if (!q.trim()) return preview.rows;
    const s = q.toLowerCase();
    return preview.rows.filter((row) =>
      Object.values(row).some((v) => String(v ?? '').toLowerCase().includes(s))
    );
  }, [preview.rows, q]);

  // paging
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

  // kalau ganti items/page, balik ke page-1
  useEffect(() => { setCurrentPage(1); }, [itemsPerPage, moduleKey]);

  return (
    <div className={styles.background}>
      <SidebarAdmin />
      <main className={styles.mainContent}>
        <div className={styles.tableBox}>
          <div className={styles.tableTopRow}>
            <div className={styles.tableTitle}>LAPORAN BOOKING</div>
          </div>

          {/* Controls (tanpa tombol Preview) */}
          <div className={styles.controlsRow}>
            <div className={styles.controlGroup}>
              <label className={styles.label}>Modul</label>
              <select
                className={styles.input}
                value={moduleKey}
                onChange={(e) => setModuleKey(e.target.value)}
              >
                {MODULES.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>

            <div className={styles.controlGroup}>
              <label className={styles.label}>Dari</label>
              <input
                type="date"
                className={styles.input}
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                placeholder="Semua"
              />
            </div>

            <div className={styles.controlGroup}>
              <label className={styles.label}>Sampai</label>
              <input
                type="date"
                className={styles.input}
                value={to}
                onChange={(e) => setTo(e.target.value)}
                placeholder="Semua"
              />
            </div>

            <div className={styles.actionsRight}>
              <button
                className={styles.exportBtn}
                onClick={doExport}
                disabled={loading || !preview.rows.length}
                title="Ekspor ke Excel"
              >
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
