// lib/ns-server.js
const NS_RE = /^[A-Za-z0-9_-]{3,32}$/;

/**
 * Ambil ns dari API request.
 * Prioritas:
 * 1. Query ?ns=
 * 2. Body.ns
 */
export function getNsFromReq(req) {
  const qns = req.query?.ns;
  if (typeof qns === 'string' && NS_RE.test(qns)) return qns;

  const bns = req.body?.ns;
  if (typeof bns === 'string' && NS_RE.test(bns)) return bns;

  return null;
}
