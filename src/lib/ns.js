// lib/ns.js
export const makeNs = () =>
  (globalThis.crypto?.randomUUID?.() || Math.random().toString(36).slice(2))
    .replace(/-/g, '')
    .slice(0, 8);

const NS_RE = /^[A-Za-z0-9_-]{3,32}$/;

// Ambil ns dari router (prioritas: query ?ns=, fallback: legacy /u/:ns atau /admin/:ns)
export const getNs = (router) => {
  // 1) query
  const qns = router?.query?.ns ? String(router.query.ns) : null;
  if (qns && NS_RE.test(qns)) return qns;

  // 2) fallback: coba parse dari asPath (legacy path-based)
  const pathOnly = String(router?.asPath || '').split('?')[0];
  const seg = pathOnly.split('/').filter(Boolean);
  if ((seg[0] === 'u' || seg[0] === 'admin') && seg[1] && NS_RE.test(seg[1])) {
    return seg[1];
  }

  return null;
};

// Sisipkan ?ns= ke URL internal (kalau belum ada)
export const withNs = (to, ns) => {
  if (!ns) return to;
  if (typeof to !== 'string') return to; // biarkan object URL Next.js tetap
  if (/^(https?:|mailto:|tel:)/i.test(to)) return to; // external: jangan diubah
  if (/[?&]ns=/.test(to)) return to; // sudah ada ns

  const sep = to.includes('?') ? '&' : '?';
  return `${to}${sep}ns=${encodeURIComponent(ns)}`;
};

// Router helpers (query-based)
export const pushNs = (router, to) => {
  const ns = getNs(router);
  return router.push(withNs(to, ns));
};

export const replaceNs = (router, to) => {
  const ns = getNs(router);
  return router.replace(withNs(to, ns));
};
