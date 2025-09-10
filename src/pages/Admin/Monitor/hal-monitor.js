import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { getNsFromReq } from '@/lib/ns-server';
import { parseCookieHeader, resolveAdmin } from '@/lib/resolve';
import { withNs, NS_RE } from '@/lib/ns';

import SidebarAdmin from '@/components/SidebarAdmin/SidebarAdmin';
import SidebarFitur from '@/components/SidebarFitur/SidebarFitur';

import { BarChart } from '@mui/x-charts/BarChart';
import { ChartsReferenceLine } from '@mui/x-charts/ChartsReferenceLine';
import styles from './monitor.module.css';

/* ====== LAYANAN ====== */
const SERVICE_ID_MAP = { 1: 'bidrive', 2: 'bicare', 3: 'bimeal', 4: 'bimeet', 5: 'bimail', 6: 'bistay' };

const MODULES = [
  { value: 'bi-care',  label: 'CARE',  serviceKey: 'bicare'  },
  { value: 'bi-meal',  label: 'MEAL',  serviceKey: 'bimeal'  },
  { value: 'bi-meet',  label: 'MEET',  serviceKey: 'bimeet'  },
  { value: 'bi-stay',  label: 'STAY',  serviceKey: 'bistay'  },
  { value: 'bi-docs',  label: 'DOCS',  serviceKey: 'bimail'  },
  { value: 'bi-drive', label: 'DRIVE', serviceKey: 'bidrive' },
];

const STATUS_COLORS = {
  pending:  '#FFC107',
  approved: '#2196F3',
  rejected: '#E91E63',
  finished: '#4CAF50',
};

const isAlias = (a, b) => a === b || (a === 'bimail' && b === 'bidocs') || (a === 'bidocs' && b === 'bimail');
const labelOf = (fk) => MODULES.find((m) => m.serviceKey === fk)?.label || fk.toUpperCase();

const qs = (o) => {
  const sp = new URLSearchParams();
  Object.entries(o || {}).forEach(([k, v]) => {
    if (v == null) return;
    const s = String(v).trim();
    if (!s) return;
    sp.append(k, s);
  });
  return sp.toString() ? `?${sp}` : '';
};

/* ====== Normalisasi ====== */
const guessFeatureKey = (row) => {
  if (row?.__featureKey) return row.__featureKey;
  const cands = [
    row?.service, row?.service_name, row?.service_code,
    row?.feature, row?.layanan, row?.jenis_layanan, row?.feature_name,
  ].map((x) => String(x || '').toLowerCase().replace(/\s+/g, ''));
  for (const s of cands) {
    if (!s) continue;
    if (s.includes('bidrive') || s === 'drive') return 'bidrive';
    if (s.includes('bicare') || s === 'care') return 'bicare';
    if (s.includes('bimeal') || s === 'meal') return 'bimeal';
    if (s.includes('bimeet') || s === 'meet') return 'bimeet';
    if (s.includes('bistay') || s === 'stay') return 'bistay';
    if (s.includes('bimail') || s.includes('bidocs') || s === 'docs' || s === 'mail') return 'bimail';
  }
  return 'unknown';
};

const normStatus = (row) => {
  const id = Number(row?.status_id);
  const fk = guessFeatureKey(row);
  const s  = String(row?.status || row?.booking_status || row?.status_name || row?.state || '')
    .toLowerCase().trim();

  if (fk === 'bicare') {
    if (/book/i.test(s)) return 'approved';
    if (/cancel|batal|reject/i.test(s)) return 'rejected';
    if (/done|finish|selesai|complete/i.test(s)) return 'finished';
    if (row?.booking_date) {
      try {
        const now = new Date();
        const d = new Date(row.booking_date);
        return d >= now ? 'approved' : 'finished';
      } catch {}
    }
  }
  if (fk === 'bimail') return 'finished';

  if (id === 1 || /pending|menunggu|baru/i.test(s)) return 'pending';
  if (id === 2 || /approve|approved|verified|verif|accept|confirm|terima/i.test(s)) return 'approved';
  if (id === 3 || /reject|tolak|cancel|batal|void/i.test(s)) return 'rejected';
  if (id === 4 || /finish|selesai|done|complete/i.test(s)) return 'finished';

  return 'approved';
};

/* ====== range waktu ====== */
const pad2 = (n) => String(n).padStart(2, '0');
const fmtYMD = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const rangeFor = (key) => {
  if (key === 'all') return { from: null, to: null };
  const now = new Date();
  const to = fmtYMD(now);
  let from = to;
  if (key === 'today') {
    from = to;
  } else if (key === 'week') {
    const s = new Date(now); s.setDate(now.getDate() - 6); from = fmtYMD(s);
  } else if (key === 'month') {
    const s = new Date(now.getFullYear(), now.getMonth(), 1); from = fmtYMD(s);
  } else if (key === 'year') {
    const s = new Date(now.getFullYear(), 0, 1); from = fmtYMD(s);
  }
  return { from, to };
};

/* ==== util tanggal ==== */
const getRowDate = (r) => {
  const cands = [r?.booking_date, r?.created_at, r?.createdAt, r?.date, r?.request_date, r?.tanggal];
  for (const v of cands) {
    if (!v) continue;
    const d = new Date(v);
    if (!isNaN(d)) return d;
  }
  return null;
};

export default function Monitor({ initialRoleId = null, initialServiceIds = null }) {
  const router = useRouter();

  /* ===== ns ===== */
  const nsFromQuery = typeof router.query.ns === 'string' ? router.query.ns : '';
  const nsFromAsPath = (() => {
    const q = router.asPath.split('?')[1]; if (!q) return '';
    const p = new URLSearchParams(q);
    const v = p.get('ns') || '';
    return NS_RE.test(v) ? v : '';
  })();
  const ns = NS_RE.test(nsFromQuery) ? nsFromQuery : nsFromAsPath;

  /* ===== role ===== */
  const [roleId, setRoleId] = useState(initialRoleId);
  const [allowedServiceIds, setAllowedServiceIds] = useState(initialServiceIds);
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
        if (isSuper) setAllowedServiceIds(null);
        else {
          const ids = Array.isArray(d?.payload?.service_ids)
            ? d.payload.service_ids.map((x) => SERVICE_ID_MAP[x] || null).filter(Boolean)
            : [];
          setAllowedServiceIds(ids);
        }
      } catch {
        setRoleId(2); setAllowedServiceIds([]);
      } finally { if (alive) setSbLoading(false); }
    })();
    return () => { alive = false; };
  }, [router.isReady, ns, initialRoleId]);

  /* ===== modul diizinkan ===== */
  const allowedModules = useMemo(() => {
    if (allowedServiceIds === null) return MODULES;
    if (!Array.isArray(allowedServiceIds) || allowedServiceIds.length === 0) return [];
    const allowedKeys = allowedServiceIds.map((id) => SERVICE_ID_MAP[id] || null).filter(Boolean);
    return MODULES.filter((m) => allowedKeys.some((k) => isAlias(m.serviceKey, k)));
  }, [allowedServiceIds]);

  /* ===== otomatis pilih semua modul yang boleh ===== */
  const [selectedModules, setSelectedModules] = useState([]);
  useEffect(() => {
    if (allowedModules.length && selectedModules.length === 0) {
      setSelectedModules(allowedModules.map((m) => m.value));
    }
  }, [allowedModules, selectedModules.length]);

  /* ===== sort by ===== */
  const [sortBy, setSortBy] = useState('all');

  /* ===== fetch data ===== */
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!router.isReady) return;

    const activeMods = allowedModules.filter((m) => selectedModules.includes(m.value));
    if (!activeMods.length) { setRows([]); return; }

    const { from, to } = rangeFor(sortBy);
    const ac = new AbortController();
    setLoading(true); setErr('');

    (async () => {
      const settled = await Promise.allSettled(
        activeMods.map(async (m) => {
          const query = qs({ module: m.value, from: from || undefined, to: to || undefined });
          const url = withNs(`/api/admin/laporan/booking${query}`, ns);
          const res = await fetch(url, { cache: 'no-store', signal: ac.signal });
          let data = {};
          try { data = await res.json(); } catch {}
          if (!res.ok) throw new Error(data?.error || `Gagal fetch ${m.label}`);
          return Array.isArray(data.rows)
            ? data.rows.map((r) => ({ ...r, __featureKey: m.serviceKey }))
            : [];
        })
      );
      if (ac.signal.aborted) return;
      const okRows  = settled.filter((s) => s.status === 'fulfilled').flatMap((s) => s.value);
      const fails   = settled.filter((s) => s.status === 'rejected').map((s) => s.reason?.message || 'unknown');
      setRows(okRows);
      setErr(fails.length ? `Sebagian modul gagal dimuat: ${fails.join(' | ')}` : '');
      setLoading(false);
    })().catch((e) => {
      if (!ac.signal.aborted) { setErr(e?.message || 'Gagal memuat data'); setLoading(false); }
    });

    return () => ac.abort();
  }, [router.isReady, ns, allowedModules, selectedModules, sortBy]);

  /* ===== agregasi untuk stacked bar ===== */
  const countsByModuleStatus = useMemo(() => {
    const m = new Map();
    rows.forEach((r) => {
      const fk = guessFeatureKey(r);
      const st = normStatus(r);
      if (fk === 'unknown' || !st) return;
      if (!m.has(fk)) m.set(fk, { pending: 0, approved: 0, rejected: 0, finished: 0 });
      m.get(fk)[st] += 1;
    });
    return m;
  }, [rows]);

  const barDataset = useMemo(() => {
    return MODULES
      .filter((m) => selectedModules.includes(m.value))
      .map((m) => {
        const c = countsByModuleStatus.get(m.serviceKey) || { pending: 0, approved: 0, rejected: 0, finished: 0 };
        return {
          module: labelOf(m.serviceKey),
          pending:  c.pending,
          approved: c.approved,
          rejected: c.rejected,
          finished: c.finished,
        };
      })
      .filter((row) => row.pending || row.approved || row.rejected || row.finished);
  }, [countsByModuleStatus, selectedModules]);

  const totalAll = useMemo(
    () => barDataset.reduce((a, r) => a + r.pending + r.approved + r.rejected + r.finished, 0),
    [barDataset]
  );

  /* ===== Overview monthly ===== */
  const [monthsWindow, setMonthsWindow] = useState(12);
  const [overviewService, setOverviewService] = useState('all');

  const SERVICE_KEYS = ['bicare','bimeal','bimeet','bistay','bimail','bidrive'];

  function buildMonthsForWindow(window) {
    const now = new Date();
    const yr  = now.getFullYear();
    const monthsAll = Array.from({ length: 12 }, (_, i) => {
      const d = new Date(yr, i, 1);
      return { key: `${yr}-${String(i+1).padStart(2,'0')}`, label: d.toLocaleString('id-ID', { month: 'short' }), index: i };
    });
    if (window === 12) return monthsAll;
    const end = now.getMonth();
    const start = Math.max(0, end - (window - 1));
    return monthsAll.slice(start, end + 1);
  }

  const monthlyAgg = useMemo(() => {
    const months = buildMonthsForWindow(monthsWindow);
    const initBucket = () => ({ total:0, bicare:0, bimeal:0, bimeet:0, bistay:0, bimail:0, bidrive:0 });
    const counter = new Map(months.map(m => [m.key, initBucket()]));

    rows
      .filter(r => overviewService === 'all' || guessFeatureKey(r) === overviewService)
      .forEach(r => {
        const d = getRowDate(r); if (!d) return;
        const now = new Date();
        if (d.getFullYear() !== now.getFullYear()) return;
        const k = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
        if (!counter.has(k)) return;
        const fk = guessFeatureKey(r);
        const c  = counter.get(k);
        c.total += 1;
        if (SERVICE_KEYS.includes(fk)) c[fk] += 1;
      });

    const data = months.map(m => ({
      key: m.key,
      month: m.label,
      total: counter.get(m.key)?.total ?? 0,
      ...SERVICE_KEYS.reduce((o, sk) => (o[sk] = counter.get(m.key)?.[sk] ?? 0, o), {}),
    }));

    let hiTotal = 0; let hiIndex = -1;
    data.forEach((row, i) => { if (row.total > hiTotal) { hiTotal = row.total; hiIndex = i; } });

    return { data, hiIndex, max: hiTotal };
  }, [rows, monthsWindow, overviewService]);

  const maxTotal = useMemo(() => {
    const v = monthlyAgg.data[monthlyAgg.hiIndex]?.total;
    return Number.isFinite(v) ? v : 0;
  }, [monthlyAgg]);

  const windowTotal = useMemo(
    () => monthlyAgg.data.reduce((s, x) => s + x.total, 0),
    [monthlyAgg]
  );

  /* ===== mode & layout ===== */
  const [openDetail, setOpenDetail] = useState(false);
  const [chartMode, setChartMode] = useState('overview'); // 'overview' | 'status'
  const SidebarComp = roleId === 1 ? SidebarAdmin : SidebarFitur;

  const CHART_H = 250;

  const IconBarsOutline = ({ size = 18, strokeWidth = 2 }) => (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
      <g fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" vectorEffect="non-scaling-stroke">
        <rect x="3"  y="10" width="4" height="10" rx="2" />
        <rect x="10" y="6"  width="4" height="14" rx="2" />
        <rect x="17" y="3"  width="4" height="17" rx="2" />
      </g>
    </svg>
  );

  const IconBarsFill = ({ size = 18 }) => (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" fill="currentColor">
      <rect x="3"  y="10" width="4" height="10" rx="2" />
      <rect x="10" y="6"  width="4" height="14" rx="2" />
      <rect x="17" y="3"  width="4" height="17" rx="2" />
    </svg>
  );

  return (
    <div className={styles.background}>
      {!sbLoading && <SidebarComp />}

      <main className={styles.main}>
        <div className={styles.wrap}>
          {!!err && <div className={styles.warning}>{err}</div>}
          {loading && <div className={styles.loading} />}

          <div className={styles.cardsRow}>
            {/* === Single Card (Overview/Status) === */}
            <section className={styles.card} style={{ '--chart-h': `${CHART_H}px` }}>
              <div className={styles.cardHeadRow}>
                <div className={styles.cardHead} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span className={styles.kpiLogo}>
                    {chartMode === 'status' ? <IconBarsFill /> : <IconBarsOutline />}
                  </span>
                  {chartMode === 'overview' ? 'Booking/Waktu' : 'Booking/Status'}
                </div>

                <div className={styles.actions}>
                  {chartMode === 'overview' ? (
                    <>
                      <select className={styles.kpiSelect} value={overviewService} onChange={(e) => setOverviewService(e.target.value)}>
                        <option value="all">Semua</option>
                        {allowedModules.map((m) => (
                          <option key={m.serviceKey} value={m.serviceKey}>{m.label}</option>
                        ))}
                      </select>
                      <select
                        className={styles.kpiSelect}
                        value={monthsWindow}
                        onChange={(e) => setMonthsWindow(Number(e.target.value))}
                        style={{ marginLeft: 8 }}
                      >
                        <option value={6}>6 bulan</option>
                        <option value={12}>12 bulan</option>
                      </select>
                    </>
                  ) : (
                    <div className={styles.sortGroup}>
                      <label htmlFor="sortBy">Sort by</label>
                      <select id="sortBy" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                        <option value="all">Semua</option>
                        <option value="today">Hari ini</option>
                        <option value="week">Minggu ini</option>
                        <option value="month">Bulan ini</option>
                        <option value="year">Tahun ini</option>
                      </select>
                    </div>
                  )}

                  <button className={styles.viewBtn} onClick={() => setOpenDetail(true)}>Details</button>
                </div>
              </div>

              {/* BODY */}
              {chartMode === 'overview' ? (
                <div className={styles.miniChartBox}>
                  <BarChart
                    xAxis={[{ scaleType: 'band', data: monthlyAgg.data.map(d => d.month) }]}
                    series={[{ data: monthlyAgg.data.map(r => r.total), label: 'Bookings', color: '#2f6ef3' }]}
                    height={CHART_H}
                    margin={{ top: 20, right: 12, bottom: 28, left: 40 }}
                    slotProps={{ legend: { hidden: true }, bar: { rx: 12 } }}
                    sx={{
                      '--Charts-axis-label-fontSize': '12px',
                      '--Charts-axis-tickLabel-fontSize': '12px',
                      '& .MuiBarElement-root': { opacity: 0.35, transition: 'opacity .2s ease' },
                      '& .MuiBarElement-root:hover': { opacity: 1 },
                      '& .MuiChartsHighlightElement-root': { opacity: 0 },
                    }}
                  >
                    {maxTotal > 0 && (
                      <ChartsReferenceLine
                        y={maxTotal}
                        label={`Max ${maxTotal.toLocaleString('id-ID')}`}
                        lineStyle={{ strokeDasharray: '4 4' }}
                        labelStyle={{ fontSize: 11, fill: '#111827', background: '#fff' }}
                      />
                    )}
                  </BarChart>
                </div>
              ) : (
                <div className={styles.chartBox}>
                  {barDataset.length === 0 ? (
                    <div className={styles.empty}>Tidak ada data untuk ditampilkan.</div>
                  ) : (
                    <BarChart
                      dataset={barDataset}
                      layout="horizontal"
                      height={CHART_H}
                      margin={{ top: 10, right: 24, bottom: 40, left: 60 }}
                      yAxis={[{
                        scaleType: 'band',
                        dataKey: 'module',
                        tickLabelStyle: { fontSize: 12, fontWeight: 500, fill: '#0f172a' },
                      }]}
                      xAxis={[{ label: 'Jumlah', tickMinStep: 1 }]}
                      series={[
                        { dataKey: 'pending',  label: 'Pending',  stack: 'total', color: STATUS_COLORS.pending  },
                        { dataKey: 'approved', label: 'Approved', stack: 'total', color: STATUS_COLORS.approved },
                        { dataKey: 'rejected', label: 'Rejected', stack: 'total', color: STATUS_COLORS.rejected },
                        { dataKey: 'finished', label: 'Finished', stack: 'total', color: STATUS_COLORS.finished },
                      ]}
                      slotProps={{ legend: { hidden: true }, tooltip: { trigger: 'item' } }}
                      sx={{ width: '100%', '--Charts-axis-label-fontSize': '13px', '--Charts-axis-tickLabel-fontSize': '12px' }}
                    />
                  )}
                </div>
              )}

              {/* FOOT */}
              <div className={styles.cardFoot}>
                <div className={styles.footLeft}>
                  {chartMode === 'overview' && (
                    <>Total booking:<b>{windowTotal.toLocaleString('id-ID')}</b></>
                  )}
                </div>

                <div className={styles.switchWrap}>
                  <div className={styles.switchTrack}>
                    <button
                      className={`${styles.tabBtn} ${chartMode === 'overview' ? styles.tabBtnActive : ''}`}
                      onClick={() => setChartMode('overview')}
                    >
                      <span className={styles.tabIcon}>
                        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                          <g fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" vectorEffect="non-scaling-stroke">
                            <rect x="3"  y="10" width="4" height="10" rx="2" />
                            <rect x="10" y="6"  width="4" height="14" rx="2" />
                            <rect x="17" y="3"  width="4" height="17" rx="2" />
                          </g>
                        </svg>
                      </span>
                      <span>Waktu</span>
                    </button>

                    <button
                      className={`${styles.tabBtn} ${chartMode === 'status' ? styles.tabBtnActive : ''}`}
                      onClick={() => setChartMode('status')}
                    >
                      <span className={styles.tabIcon}>
                        <svg viewBox="0 0 24 24" fill="currentColor">
                          <rect x="3"  y="10" width="4" height="10" rx="1.5"></rect>
                          <rect x="10" y="6"  width="4" height="14" rx="1.5"></rect>
                          <rect x="17" y="3"  width="4" height="17" rx="1.5"></rect>
                        </svg>
                      </span>
                      <span>Status</span>
                    </button>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
      </main>

      {/* ===== Modal Detail ===== */}
      {openDetail && (
        <div className={styles.modalOverlay} onClick={() => setOpenDetail(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHead}>
              <div className={styles.modalTitle}>
                {chartMode === 'overview' ? 'Detail Booking/Waktu' : 'Detail Booking/Status'}
              </div>
              <button className={styles.closeBtn} onClick={() => setOpenDetail(false)}>×</button>
            </div>

            <div className={styles.modalBody}>
              {chartMode === 'status' ? (
                <>
                  <div className={styles.modalChart}>
                    <BarChart
                      dataset={barDataset}
                      layout="horizontal"
                      height={Math.max(400, 44 * barDataset.length + 60)}
                      margin={{ top: 50, right: 20, bottom: 40, left: 110 }}
                      yAxis={[{ scaleType: 'band', dataKey: 'module', tickLabelStyle: { fontSize: 13, fontWeight: 500, fill: '#0f172a' } }]}
                      xAxis={[{ label: 'Jumlah', tickMinStep: 1 }]}
                      series={[
                        { dataKey: 'pending',  label: 'Pending',  stack: 'total', color: STATUS_COLORS.pending  },
                        { dataKey: 'approved', label: 'Approved', stack: 'total', color: STATUS_COLORS.approved },
                        { dataKey: 'rejected', label: 'Rejected', stack: 'total', color: STATUS_COLORS.rejected },
                        { dataKey: 'finished', label: 'Finished', stack: 'total', color: STATUS_COLORS.finished },
                      ]}
                      slotProps={{ tooltip: { trigger: 'item' } }}
                    />
                  </div>

                  <div className={styles.tableWrap}>
                    <table className={styles.table}>
                      <thead>
                        <tr>
                          <th>Layanan</th>
                          <th>Pending</th>
                          <th>Approved</th>
                          <th>Rejected</th>
                          <th>Finished</th>
                          <th>Total</th>
                          <th>%</th>
                        </tr>
                      </thead>
                      <tbody>
                        {MODULES
                          .filter((m) => selectedModules.includes(m.value))
                          .map((m) => {
                            const c = countsByModuleStatus.get(m.serviceKey) || { pending: 0, approved: 0, rejected: 0, finished: 0 };
                            const t = c.pending + c.approved + c.rejected + c.finished;
                            const pct = totalAll ? Math.round((t / totalAll) * 100) : 0;
                            return (
                              <tr key={m.serviceKey}>
                                <td>{labelOf(m.serviceKey)}</td>
                                <td>{c.pending}</td>
                                <td>{c.approved}</td>
                                <td>{c.rejected}</td>
                                <td>{c.finished}</td>
                                <td>{t}</td>
                                <td>{pct}%</td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <>
                  <div className={styles.modalChart}>
                    <BarChart
                      xAxis={[{ scaleType: 'band', data: monthlyAgg.data.map(d => d.month) }]}
                      series={[{ data: monthlyAgg.data.map(r => r.total), label: 'Bookings', color: '#2f6ef3' }]}
                      height={420}
                      margin={{ top: 30, right: 20, bottom: 40, left: 70 }}
                      slotProps={{ legend: { hidden: true }, bar: { rx: 12 } }}
                    >
                      {maxTotal > 0 && (
                        <ChartsReferenceLine
                          y={maxTotal}
                          label={`Max ${maxTotal.toLocaleString('id-ID')}`}
                          lineStyle={{ strokeDasharray: '4 4' }}
                          labelStyle={{ fontSize: 11, fill: '#111827', background: '#fff' }}
                        />
                      )}
                    </BarChart>
                  </div>

                  <div className={styles.tableWrap}>
                    <table className={styles.table}>
                      <thead>
                        <tr>
                          <th>Bulan</th>
                          {SERVICE_KEYS.map((k) => (<th key={k}>{labelOf(k)}</th>))}
                          <th>Total</th>
                          <th>%</th>
                        </tr>
                      </thead>
                      <tbody>
                        {monthlyAgg.data.map((r) => {
                          const pct = windowTotal ? Math.round((r.total / windowTotal) * 100) : 0;
                          return (
                            <tr key={r.key}>
                              <td>{r.month}</td>
                              {SERVICE_KEYS.map((k) => (<td key={k}>{r[k]}</td>))}
                              <td>{r.total}</td>
                              <td>{pct}%</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ====== SSR GUARD ====== */
export async function getServerSideProps(ctx) {
  const ns = getNsFromReq(ctx.req);
  const from = ctx.resolvedUrl || '/Admin/Monitor/hal-monitor';

  if (!ns) {
    return { redirect: { destination: `/Signin/hal-signAdmin?from=${encodeURIComponent(from)}`, permanent: false } };
  }

  const cookies = parseCookieHeader(ctx.req.headers.cookie);

  try {
    const a = await resolveAdmin(ns, cookies);
    if (!a?.hasToken || !a?.payload) {
      return { redirect: { destination: `/Signin/hal-signAdmin?from=${encodeURIComponent(withNs(from, ns))}`, permanent: false } };
    }

    if (a.payload.roleNormalized === 'super_admin') {
      return { props: { initialRoleId: 1, initialServiceIds: null } };
    }

    if (a.payload.roleNormalized === 'admin_fitur') {
      return {
        props: {
          initialRoleId: 2,
          initialServiceIds: Array.isArray(a.payload.service_ids) ? a.payload.service_ids : [],
        },
      };
    }

    return { redirect: { destination: `/Signin/hal-signAdmin?from=${encodeURIComponent(withNs(from, ns))}`, permanent: false } };
  } catch {
    return { redirect: { destination: `/Signin/hal-signAdmin?from=${encodeURIComponent(withNs(from, ns))}`, permanent: false } };
  }
}
