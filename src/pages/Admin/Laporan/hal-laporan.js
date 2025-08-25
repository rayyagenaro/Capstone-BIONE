// /src/pages/Admin/Laporan/hal-laporan.js
import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import SidebarAdmin from '@/components/SidebarAdmin/SidebarAdmin';
import styles from './laporan.module.css';

const NS_RE = /^[A-Za-z0-9_-]{3,32}$/;
const MODULES = [
  { value: 'bi-care', label: 'BI.CARE' },
  { value: 'dmove', label: 'D.MOVE' },
];

// append ?ns= ke url
function withNs(url, ns) {
  if (!ns) return url;
  const sep = url.includes('?') ? '&' : '?';
  return `${url}${sep}ns=${encodeURIComponent(ns)}`;
}

// === utils tanggal ===
const pad = (n) => String(n).padStart(2, '0');
function fmtDateTimeLocal(v) {
  if (!v) return '';
  // Jam saja (HH:mm:ss)
  if (/^\d{2}:\d{2}(:\d{2})?$/.test(v)) {
    const [h, m] = v.split(':');
    return `${h}:${m}`;
  }
  // Tanggal saja (yyyy-mm-dd)
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) {
    return v;
  }
  const d = new Date(v);
  if (isNaN(d)) return String(v);
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function looksDateKey(k) {
  return /(date|time|created|updated|birth)/i.test(k);
}

export default function HalLaporan() {
  const router = useRouter();
  // Ambil ns dari query / asPath
  const nsFromQuery = typeof router.query.ns === 'string' ? router.query.ns : '';
  const nsFromAsPath = (() => {
    const q = router.asPath.split('?')[1];
    if (!q) return '';
    const params = new URLSearchParams(q);
    const v = params.get('ns') || '';
    return NS_RE.test(v) ? v : '';
  })();
  const ns = NS_RE.test(nsFromQuery) ? nsFromQuery : nsFromAsPath;

  // state filter
  const today = useMemo(() => new Date(), []);
  const thirtyAgo = useMemo(() => {
    const d = new Date(); d.setDate(d.getDate() - 30); return d;
  }, []);
  const toYMD = (d) => d?.toISOString().slice(0, 10);

  const [moduleKey, setModuleKey] = useState('bi-care');
  const [from, setFrom] = useState(toYMD(thirtyAgo));
  const [to, setTo] = useState(toYMD(today));
  const [loading, setLoading] = useState(false);
  const [errMsg, setErrMsg] = useState('');
  const [preview, setPreview] = useState({ columns: [], rows: [] });
  const [q, setQ] = useState('');

  // auto preview saat pertama
  useEffect(() => {
    // tunggu router siap agar ns terbaca
    if (!router.isReady) return;
    doPreview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.isReady]);

  async function doPreview() {
    setLoading(true);
    setErrMsg('');
    try {
      const url = withNs(
        `/api/admin/laporan/booking?module=${encodeURIComponent(moduleKey)}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
        ns
      );
      const res = await fetch(url, { cache: 'no-store' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Gagal mengambil data');
      // normalisasi rows -> format tanggal
      const rows = Array.isArray(data.rows) ? data.rows.map((r) => {
        const out = { ...r };
        Object.keys(out).forEach((k) => {
          if (out[k] == null) out[k] = '';
          else if (looksDateKey(k)) out[k] = fmtDateTimeLocal(out[k]);
          else if (typeof out[k] === 'string' && out[k].endsWith('.000Z')) out[k] = fmtDateTimeLocal(out[k]);
        });
        return out;
      }) : [];
      setPreview({ columns: data.columns || [], rows });
    } catch (e) {
      setPreview({ columns: [], rows: [] });
      setErrMsg(e?.message || 'Terjadi kesalahan');
    } finally {
      setLoading(false);
    }
  }

  async function doExport() {
    try {
      const url = withNs(
        `/api/export/laporan?module=${encodeURIComponent(moduleKey)}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
        ns
      );
      // open di tab baru biar cepet
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

  // filter client-side
  const filteredRows = useMemo(() => {
    if (!q.trim()) return preview.rows;
    const s = q.toLowerCase();
    return preview.rows.filter((row) => {
      return Object.values(row).some((v) => String(v).toLowerCase().includes(s));
    });
  }, [preview.rows, q]);

  // status pill
  const statusCell = (value) => {
    if (!value) return '';
    const val = String(value).toLowerCase();
    let cls = styles.pillPending, text = value;
    if (/finish|verified|approved/.test(val)) { cls = styles.pillVerified; }
    else if (/reject|cancel/.test(val)) { cls = styles.pillRejected; }
    return <span className={`${styles.statusPill} ${cls}`}>{text}</span>;
  };

  // render table cells dengan format spesifik
  const renderCell = (k, v) => {
    if (k === 'status' || k === 'status_name') return statusCell(v);
    if (looksDateKey(k)) return <span className={styles.dateCell}>{fmtDateTimeLocal(v)}</span>;
    return v || '';
  };

  // quick ranges
  const setRangeDays = (days) => {
    const end = new Date();
    const start = new Date(); start.setDate(start.getDate() - days);
    setFrom(toYMD(start)); setTo(toYMD(end));
  };

  const resultsText = filteredRows.length
    ? `Results: ${filteredRows.length} row${filteredRows.length > 1 ? 's' : ''}`
    : '';

  return (
    <div className={styles.background}>
      <SidebarAdmin />
      <main className={styles.mainContent}>
        <div className={styles.tableBox}>
          <div className={styles.tableTopRow}>
            <div className={styles.tableTitle}>LAPORAN BOOKING</div>
          </div>

          {/* Controls */}
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
              />
            </div>

            <div className={styles.controlGroup}>
              <label className={styles.label}>Sampai</label>
              <input
                type="date"
                className={styles.input}
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
            </div>

            <div className={styles.quickRange}>
              <button className={styles.chip} onClick={() => setRangeDays(7)}>7 Hari</button>
              <button className={styles.chip} onClick={() => setRangeDays(30)}>30 Hari</button>
            </div>

            <div className={styles.actionsRight}>
              <button
                className={styles.previewBtn}
                onClick={doPreview}
                disabled={loading}
                title="Tampilkan preview data"
              >
                {loading ? 'Memuat…' : 'Preview'}
              </button>
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
                {!loading && !errMsg && filteredRows.length === 0 && (
                  <tr>
                    <td className={styles.centerMuted} colSpan={preview.columns.length}>Tidak ada data.</td>
                  </tr>
                )}
                {!loading && !errMsg && filteredRows.map((row, idx) => (
                  <tr key={idx}>
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
        </div>
      </main>
    </div>
  );
}
