import React from 'react';

/* ==== Konstanta layanan ==== */
export const SERVICE_ID_MAP = { 1: 'bidrive', 2: 'bicare', 3: 'bimeal', 4: 'bimeet', 5: 'bimail', 6: 'bistay' };

export const MODULES = [
  { value: 'bi-care',  label: 'CARE',  serviceKey: 'bicare'  },
  { value: 'bi-meal',  label: 'MEAL',  serviceKey: 'bimeal'  },
  { value: 'bi-meet',  label: 'MEET',  serviceKey: 'bimeet'  },
  { value: 'bi-stay',  label: 'STAY',  serviceKey: 'bistay'  },
  { value: 'bi-docs',  label: 'DOCS',  serviceKey: 'bimail'  },
  { value: 'bi-drive', label: 'DRIVE', serviceKey: 'bidrive' },
];

export const SERVICE_KEYS = ['bicare','bimeal','bimeet','bistay','bimail','bidrive'];

export const STATUS_COLORS = {
  pending:  '#FFC107',
  approved: '#2196F3',
  rejected: '#E91E63',
  finished: '#4CAF50',
};

export const MODULE_COLORS = {
  bicare: '#2563eb',
  bimeal: '#0ea5e9',
  bimeet: '#f59e0b',
  bistay: '#8b5cf6',
  bimail: '#22c55e',
  bidrive: '#ef4444',
};

export const isAlias = (a, b) =>
  a === b || (a === 'bimail' && b === 'bidocs') || (a === 'bidocs' && b === 'bimail');

export const labelOf = (fk) =>
  MODULES.find((m) => m.serviceKey === fk)?.label || fk.toUpperCase();

/* ==== Util tanggal & filter ==== */
export const pad2 = (n) => String(n).padStart(2, '0');
export const fmtYMD = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

export const rangeFor = (key) => {
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

export const getRowDate = (r) => {
  const cands = [r?.booking_date, r?.created_at, r?.createdAt, r?.date, r?.request_date, r?.tanggal];
  for (const v of cands) {
    if (!v) continue;
    const d = new Date(v);
    if (!isNaN(d)) return d;
  }
  return null;
};

export const filterRowsBySort = (rows, sortKey) => {
  if (sortKey === 'all') return rows;
  const { from, to } = rangeFor(sortKey);
  const fromD = from ? new Date(from) : null;
  const toD   = to   ? new Date(to)   : null;
  return rows.filter(r => {
    const d = getRowDate(r); if (!d) return false;
    if (fromD && d < fromD) return false;
    if (toD   && d > new Date(toD.getFullYear(), toD.getMonth(), toD.getDate(), 23, 59, 59, 999)) return false;
    return true;
  });
};

/* ==== Normalisasi ==== */
export const guessFeatureKey = (row) => {
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

export const normStatus = (row) => {
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

/* ==== Heatmap ==== */
export const DOW_FULL_ID = ['Senin','Selasa','Rabu','Kamis','Jumat','Sabtu','Minggu'];

const MONTHS_EN = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December'
];
const ordinal = (n) => {
  const v = n % 100;
  if (v >= 11 && v <= 13) return `${n}th`;
  const last = n % 10;
  if (last === 1) return `${n}st`;
  if (last === 2) return `${n}nd`;
  if (last === 3) return `${n}rd`;
  return `${n}th`;
};
export const ghTooltipText = (date, count) => {
  const month = MONTHS_EN[date.getMonth()];
  const day   = ordinal(date.getDate());
  const plural = count === 1 ? 'booking' : 'bookings';
  return `${count} ${plural} on ${month} ${day}.`;
};

/* ==== Ikon ==== */
export const IconBarsOutline = ({ size = 18, strokeWidth = 2 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
    <g fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" vectorEffect="non-scaling-stroke">
      <rect x="3"  y="10" width="4" height="10" rx="2" />
      <rect x="10" y="6"  width="4" height="14" rx="2" />
      <rect x="17" y="3"  width="4" height="17" rx="2" />
    </g>
  </svg>
);
export const IconBarsFill = ({ size = 18 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" fill="currentColor">
    <rect x="3"  y="10" width="4" height="10" rx="2" />
    <rect x="10" y="6"  width="4" height="14" rx="2" />
    <rect x="17" y="3"  width="4" height="17" rx="2" />
  </svg>
);
export const IconPie = ({ size = 18 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" fill="currentColor">
    <path d="M11 2a1 1 0 0 1 1 1v9h9a1 1 0 0 1 .96 1.28A10 10 0 1 1 11 2z"/>
    <path d="M13 2a10 10 0 0 1 9 9h-9V2z" opacity=".45"/>
  </svg>
);
export const IconHeat = ({ size = 18 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" fill="currentColor">
    <rect x="3" y="3" width="4" height="4" rx="1.2" />
    <rect x="9.5" y="3" width="4" height="4" rx="1.2" />
    <rect x="16" y="3" width="4" height="4" rx="1.2" />
    <rect x="3" y="9.5" width="4" height="4" rx="1.2" />
    <rect x="9.5" y="9.5" width="4" height="4" rx="1.2" />
    <rect x="16" y="9.5" width="4" height="4" rx="1.2" />
    <rect x="3" y="16" width="4" height="4" rx="1.2" />
    <rect x="9.5" y="16" width="4" height="4" rx="1.2" />
    <rect x="16" y="16" width="4" height="4" rx="1.2" />
  </svg>
);
