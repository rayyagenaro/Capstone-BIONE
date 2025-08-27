// lib/ns.js
export const makeNs = () =>
  (globalThis.crypto?.randomUUID?.() || Math.random().toString(36).slice(2))
    .replace(/-/g, '')
    .slice(0, 8);

export const NS_RE = /^[A-Za-z0-9_-]{3,32}$/;

/**
 * Ambil ns dari router (prioritas query, fallback localStorage).
 * - Query ns harus valid (NS_RE).
 * - Kalau valid → simpan ke localStorage agar konsisten.
 * - Kalau tidak ada → fallback localStorage.
 */
export function getNs(router) {
  if (!router) return '';

  // 🔹 Ambil dari query
  const queryNs = router.query?.ns;
  if (typeof queryNs === 'string' && NS_RE.test(queryNs)) {
    if (typeof window !== 'undefined') {
      localStorage.setItem('current_ns', queryNs);
    }
    return queryNs;
  }

  // 🔹 fallback ke localStorage
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('current_ns');
    if (stored && NS_RE.test(stored)) {
      return stored;
    }
  }

  return '';
}

/**
 * Sisipkan ?ns= ke URL internal (kalau belum ada).
 */
export const withNs = (to, ns) => {
  if (!ns || !NS_RE.test(ns)) return to;
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
