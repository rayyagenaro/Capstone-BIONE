import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { getNsFromReq } from '@/lib/ns-server';
import { parseCookieHeader, resolveAdmin } from '@/lib/resolve';
import { withNs, NS_RE } from '@/lib/ns';

import SidebarAdmin from '@/components/SidebarAdmin/SidebarAdmin';
import SidebarFitur from '@/components/SidebarFitur/SidebarFitur';
import styles from './monitor.module.css';

/* Komponen pecahan */
import OverviewStatusCard from '@/components/adminMonitor/OverviewStatusCard';
import PieCard from '@/components/adminMonitor/PieCard';
import HeatmapCard from '@/components/adminMonitor/HeatmapCard';
import ModalStatusTime from '@/components/adminMonitor/ModalStatusTime';
import ModalPie from '@/components/adminMonitor/ModalPie';
import ModalHeatmap from '@/components/adminMonitor/ModalHeatmap';

/* Shared util & konstanta */
import {
  SERVICE_ID_MAP, MODULES, SERVICE_KEYS, MODULE_COLORS,
  isAlias, labelOf, filterRowsBySort, guessFeatureKey, normStatus,
  getRowDate, pad2, fmtYMD
} from '@/components/adminMonitor/shared';

/* helper */
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

  /* ===== sort (independen) ===== */
  const [sortByStatus, setSortByStatus] = useState('all');
  const [sortByPie, setSortByPie] = useState('all');

  /* ===== fetch data ===== */
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!router.isReady) return;

    const activeMods = allowedModules.filter((m) => selectedModules.includes(m.value));
    if (!activeMods.length) { setRows([]); return; }

    const ac = new AbortController();
    setLoading(true); setErr('');

    (async () => {
      const settled = await Promise.allSettled(
        activeMods.map(async (m) => {
          const query = qs({ module: m.value });
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
  }, [router.isReady, ns, allowedModules, selectedModules]);

  /* ===== Stacked bar (status) ===== */
  const rowsForStatus = useMemo(() => {
    const { rangeFor } = require('@/components/adminMonitor/shared');
    return filterRowsBySort(rows, sortByStatus);
  }, [rows, sortByStatus]);

  const countsByModuleStatus = useMemo(() => {
    const m = new Map();
    rowsForStatus.forEach((r) => {
      const fk = guessFeatureKey(r);
      const st = normStatus(r);
      if (fk === 'unknown' || !st) return;
      if (!m.has(fk)) m.set(fk, { pending: 0, approved: 0, rejected: 0, finished: 0 });
      m.get(fk)[st] += 1;
    });
    return m;
  }, [rowsForStatus]);

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

  /* ===== Booking Overview (by year) ===== */
  const [overviewYear, setOverviewYear] = useState('all');
  const overviewYearOptions = useMemo(() => {
    const ys = new Set();
    rows.forEach(r => { const d = getRowDate(r); if (d) ys.add(d.getFullYear()); });
    if (!ys.size) {
      const y = new Date().getFullYear();
      return [y, y - 1, y - 2];
    }
    return Array.from(ys).sort((a, b) => b - a);
  }, [rows]);
  const [overviewService, setOverviewService] = useState('all');

  function buildMonths() {
    return Array.from({ length: 12 }, (_, i) => {
      const d = new Date(2000, i, 1);
      return { key: String(i + 1).padStart(2,'0'), label: d.toLocaleString('id-ID', { month: 'short' }), index: i };
    });
  }

  const monthlyAgg = useMemo(() => {
    const months = buildMonths();
    const initBucket = () => ({ total:0, bicare:0, bimeal:0, bimeet:0, bistay:0, bimail:0, bidrive:0 });
    const counter = new Map(months.map(m => [m.key, initBucket()]));

    rows
      .filter(r => overviewService === 'all' || guessFeatureKey(r) === overviewService)
      .forEach(r => {
        const d = getRowDate(r); if (!d) return;
        if (overviewYear !== 'all' && d.getFullYear() !== Number(overviewYear)) return;
        const k = String(d.getMonth()+1).padStart(2,'0');
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
  }, [rows, overviewService, overviewYear]);

  const maxTotal = useMemo(() => {
    const v = monthlyAgg.data[monthlyAgg.hiIndex]?.total;
    return Number.isFinite(v) ? v : 0;
  }, [monthlyAgg]);

  const windowTotal = useMemo(() => monthlyAgg.data.reduce((s, x) => s + x.total, 0), [monthlyAgg]);

  /* ===== Pie ===== */
  const rowsForPie = useMemo(() => {
    const { rangeFor } = require('@/components/adminMonitor/shared');
    return filterRowsBySort(rows, sortByPie);
  }, [rows, sortByPie]);

  const pieCountsMap = useMemo(() => {
    const selectedKeys = new Set(
      MODULES.filter(m => selectedModules.includes(m.value)).map(m => m.serviceKey)
    );
    const map = new Map([...selectedKeys].map(k => [k, 0]));
    rowsForPie.forEach(r => {
      const fk = guessFeatureKey(r);
      if (selectedKeys.has(fk)) map.set(fk, (map.get(fk) || 0) + 1);
    });
    return map;
  }, [rowsForPie, selectedModules]);

  const pieDataByModule = useMemo(() => {
    return MODULES
      .filter(m => selectedModules.includes(m.value))
      .map(m => ({
        id: m.serviceKey,
        label: m.label,
        value: pieCountsMap.get(m.serviceKey) || 0,
        color: MODULE_COLORS[m.serviceKey],
      }))
      .filter(d => d.value > 0);
  }, [pieCountsMap, selectedModules]);

  const pieTotal = useMemo(() => pieDataByModule.reduce((s, d) => s + d.value, 0), [pieDataByModule]);
  const pieValueFormatter = (item) => {
    const pct = pieTotal ? Math.round((item.value / pieTotal) * 100) : 0;
    return `${item.value.toLocaleString('id-ID')} (${pct}%)`;
  };

  /* ===== Heatmap ===== */
  const [hmService, setHmService] = useState('all');
  const [openHeatDetail, setOpenHeatDetail] = useState(false);

  const hmYearOptions = useMemo(() => {
    const ys = new Set();
    rows.forEach((r) => { const d = getRowDate(r); if (d) ys.add(d.getFullYear()); });
    if (!ys.size) {
      const y = new Date().getFullYear();
      return [y, y - 1, y - 2];
    }
    return Array.from(ys).sort((a, b) => a - b);
  }, [rows]);
  const [hmYear, setHmYear] = useState(() => new Date().getFullYear());

  const dailyCountMap = useMemo(() => {
    const m = new Map();
    rows
      .filter((r) => hmService === 'all' || guessFeatureKey(r) === hmService)
      .forEach((r) => {
        const d = getRowDate(r); if (!d) return;
        const ymd = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
        m.set(ymd, (m.get(ymd) || 0) + 1);
      });
    return m;
  }, [rows, hmService]);

  function startOfWeekSun(d) { const x = new Date(d); x.setHours(0,0,0,0); x.setDate(x.getDate() - x.getDay()); return x; }
  function endOfWeekSat(d)   { const x = new Date(d); x.setHours(0,0,0,0); x.setDate(x.getDate() + (6 - x.getDay())); return x; }

  const heatmapData = useMemo(() => {
    const year = hmYear;
    const start = startOfWeekSun(new Date(year, 0, 1));
    const end   = endOfWeekSat(new Date(year, 11, 31));

    const ONE = 24 * 3600 * 1000;
    const days = Math.round((end - start) / ONE) + 1;
    const weeksCount = Math.ceil(days / 7);

    const cells = [];
    let max = 0;
    const cur = new Date(start);

    for (let w = 0; w < weeksCount; w++) {
      for (let d = 0; d < 7; d++) {
        const ymd = fmtYMD(cur);
        const inYear = cur.getFullYear() === year;
        const count = inYear ? (dailyCountMap.get(ymd) || 0) : 0;
        if (inYear && count > max) max = count;
        cells.push({ key: ymd, date: new Date(cur), inYear, count });
        cur.setDate(cur.getDate() + 1);
      }
    }

    const levelFor = (c) => {
      if (c <= 0) return 0;
      if (max <= 4) return Math.min(c, 4);
      const t2 = Math.max(2, Math.round(max * 0.33));
      const t3 = Math.max(3, Math.round(max * 0.66));
      if (c === 1) return 1;
      if (c <= t2) return 2;
      if (c <= t3) return 3;
      return 4;
    };
    const cellsWithLevel = cells.map((c) => ({ ...c, level: levelFor(c.count) }));

    const monthTicks = Array.from({ length: 12 }, (_, m) => {
      const first = new Date(year, m, 1);
      const col = Math.floor((first - start) / (ONE * 7));
      return { col, label: first.toLocaleString('id-ID', { month: 'short' }) };
    });

    return { cells: cellsWithLevel, weeksCount, monthTicks, max };
  }, [dailyCountMap, hmYear]);

  /* ===== Modal flags ===== */
  const [openDetail, setOpenDetail] = useState(false);
  const [openPieDetail, setOpenPieDetail] = useState(false);
  const [chartMode, setChartMode] = useState('overview');

  const SidebarComp = roleId === 1 ? SidebarAdmin : SidebarFitur;
  const CHART_H = 250;

  return (
    <div className={styles.background}>
      {!sbLoading && <SidebarComp />}

      <main className={styles.main}>
        <div className={styles.wrap}>
          {!!err && <div className={styles.warning}>{err}</div>}
          {loading && <div className={styles.loading} />}

          <div className={styles.cardsRow}>
            <OverviewStatusCard
              styles={styles}
              CHART_H={CHART_H}
              chartMode={chartMode}
              setChartMode={setChartMode}
              overviewService={overviewService}
              setOverviewService={setOverviewService}
              overviewYear={overviewYear}
              setOverviewYear={setOverviewYear}
              overviewYearOptions={overviewYearOptions}
              allowedModules={allowedModules}
              monthlyAgg={monthlyAgg}
              maxTotal={maxTotal}
              windowTotal={windowTotal}
              barDataset={barDataset}
              sortByStatus={sortByStatus}
              setSortByStatus={setSortByStatus}
              onOpenDetail={() => setOpenDetail(true)}
            />

            <PieCard
              styles={styles}
              CHART_H={CHART_H}
              pieDataByModule={pieDataByModule}
              pieValueFormatter={pieValueFormatter}
              sortByPie={sortByPie}
              setSortByPie={setSortByPie}
              onOpenDetail={() => setOpenPieDetail(true)}
            />
          </div>

          <HeatmapCard
            styles={styles}
            heatmapData={heatmapData}
            hmService={hmService}
            setHmService={setHmService}
            hmYear={hmYear}
            setHmYear={setHmYear}
            hmYearOptions={hmYearOptions}
            onOpenDetail={() => setOpenHeatDetail(true)}
          />
        </div>
      </main>

      <ModalStatusTime
        styles={styles}
        open={openDetail}
        onClose={() => setOpenDetail(false)}
        chartMode={chartMode}
        barDataset={barDataset}
        totalAll={totalAll}
        monthlyAgg={monthlyAgg}
        maxTotal={maxTotal}
        windowTotal={windowTotal}
      />

      <ModalPie
        styles={styles}
        open={openPieDetail}
        onClose={() => setOpenPieDetail(false)}
        CHART_H={CHART_H}
        pieDataByModule={pieDataByModule}
        pieValueFormatter={pieValueFormatter}
        pieCountsMap={pieCountsMap}
        selectedModules={selectedModules}
        pieTotal={pieTotal}
      />

      <ModalHeatmap
        styles={styles}
        open={openHeatDetail}
        onClose={() => setOpenHeatDetail(false)}
        heatmapData={heatmapData}
      />
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
