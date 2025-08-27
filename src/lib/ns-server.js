// lib/ns-server.js

export const NS_RE = /^[A-Za-z0-9_-]{3,32}$/;

/**
 * Ambil ns dari request.
 * Prioritas:
 * 1. Sticky cookie (current_admin_ns / current_user_ns)
 * 2. Cookie session (admin_session__ns / user_session__ns)
 * 3. Query ?ns=
 * 4. Body.ns
 */
export function getNsFromReq(req) {
  if (!req) return null;

  // 🔹 1. Sticky cookies
  const stickyAdmin = req.cookies?.current_admin_ns;
  if (typeof stickyAdmin === 'string' && NS_RE.test(stickyAdmin)) {
    return stickyAdmin;
  }
  const stickyUser = req.cookies?.current_user_ns;
  if (typeof stickyUser === 'string' && NS_RE.test(stickyUser)) {
    return stickyUser;
  }

  // 🔹 2. Session cookies dengan prefix
  const cookieKeys = Object.keys(req.cookies || {});
  const adminPrefix = 'admin_session__';
  const userPrefix = 'user_session__';

  const foundAdmin = cookieKeys.find((k) => k.startsWith(adminPrefix));
  if (foundAdmin) {
    const ns = foundAdmin.slice(adminPrefix.length);
    if (NS_RE.test(ns)) return ns;
  }

  const foundUser = cookieKeys.find((k) => k.startsWith(userPrefix));
  if (foundUser) {
    const ns = foundUser.slice(userPrefix.length);
    if (NS_RE.test(ns)) return ns;
  }

  // 🔹 3. Fallback query param
  const qns = req.query?.ns;
  if (typeof qns === 'string' && NS_RE.test(qns)) return qns;

  // 🔹 4. Fallback body
  const bns = req.body?.ns;
  if (typeof bns === 'string' && NS_RE.test(bns)) return bns;

  return null;
}
