// pages/api/me.js
import { jwtVerify } from 'jose';

const SECRET_STR = process.env.JWT_SECRET || '';
const SECRET = new TextEncoder().encode(SECRET_STR);
const NS_RE = /^[A-Za-z0-9_-]{3,32}$/;

async function verifyOrNull(token) {
  if (!token || !SECRET_STR) return null;
  try { const { payload } = await jwtVerify(token, SECRET); return payload; } catch { return null; }
}

function parseCookieHeader(header) {
  const raw = String(header || '');
  if (!raw) return [];
  return raw.split(';').map(s=>s.trim()).filter(Boolean).map(s=>{
    const i=s.indexOf('=');
    if(i===-1) return [s,''];
    const name=s.slice(0,i), v=s.slice(i+1);
    try { return [name, decodeURIComponent(v)]; } catch { return [name, v]; }
  });
}
function getCookie(cookies, name) {
  const hit = cookies.find(([n]) => n === name);
  return hit ? hit[1] : undefined;
}
function getCookiesByPrefix(cookies, prefix) {
  return cookies.filter(([n]) => n.startsWith(prefix));
}
async function chooseLatestValidTokenPayload(pairs) {
  const verified = await Promise.all(pairs.map(async ([name, token])=>{
    const payload = await verifyOrNull(token);
    return payload ? { name, payload } : null;
  }));
  const valid = verified.filter(Boolean);
  if (!valid.length) return null;
  valid.sort((a,b) => Number(b.payload?.exp||0)-Number(a.payload?.exp||0)
                  || Number(b.payload?.iat||0)-Number(a.payload?.iat||0));
  return { cookieName: valid[0].name, payload: valid[0].payload };
}

// 🔸 Baru: ambil ns dari query/header atau REFERER
function getNsFromReq(req) {
  const scopeRaw = req.query.scope ?? req.headers['x-session-scope'] ?? '';
  const nsRaw = req.query.ns ?? req.headers['x-session-ns'] ?? '';
  const scope = String(Array.isArray(scopeRaw) ? scopeRaw[0] : scopeRaw).toLowerCase();
  let ns = String(Array.isArray(nsRaw) ? nsRaw[0] : nsRaw).trim();

  if (!ns) {
    const ref = String(req.headers.referer || '');
    try {
      const u = new URL(ref);
      const qns = u.searchParams.get('ns');
      if (qns && NS_RE.test(qns)) ns = qns;
    } catch {}
  }
  return { scope, ns: ns && NS_RE.test(ns) ? ns : '' };
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  const cookies = parseCookieHeader(req.headers.cookie);
  const { scope, ns } = getNsFromReq(req);

  async function resolveUser() {
    // STRICT by NS jika ns ada
    if (ns) {
      const token = getCookie(cookies, `user_session__${ns}`) || getCookie(cookies, `user_session_${ns}`);
      const payload = await verifyOrNull(token);
      return { hasToken: !!payload, payload: payload || null, cookieName: token ? `user_session__${ns}` : null };
    }
    // legacy global
    const legacy = getCookie(cookies, 'user_session');
    if (legacy) { const payload = await verifyOrNull(legacy); if (payload) return { hasToken:true, payload, cookieName:'user_session' }; }
    // auto-pick latest namespaced
    const chosen = await chooseLatestValidTokenPayload(getCookiesByPrefix(cookies, 'user_session__'));
    if (chosen) return { hasToken:true, payload: chosen.payload, cookieName: chosen.cookieName };
    return { hasToken:false, payload:null, cookieName:null };
  }

  async function resolveAdmin() {
    if (ns) {
      const token = getCookie(cookies, `admin_session__${ns}`) || getCookie(cookies, `admin_session_${ns}`);
      const payload = await verifyOrNull(token);
      return { hasToken: !!payload, payload: payload || null, cookieName: token ? `admin_session__${ns}` : null };
    }
    const legacy = getCookie(cookies, 'admin_session');
    if (legacy) { const payload = await verifyOrNull(legacy); if (payload) return { hasToken:true, payload, cookieName:'admin_session' }; }
    const chosen = await chooseLatestValidTokenPayload(getCookiesByPrefix(cookies, 'admin_session__'));
    if (chosen) return { hasToken:true, payload: chosen.payload, cookieName: chosen.cookieName };
    return { hasToken:false, payload:null, cookieName:null };
  }

  try {
    if (scope === 'user') {
      const u = await resolveUser();
      return res.status(200).json({ scope: 'user', ...u, ns: ns || null });
    }
    if (scope === 'admin') {
      const a = await resolveAdmin();
      return res.status(200).json({ scope: 'admin', ...a, ns: ns || null });
    }
    const [u, a] = await Promise.all([resolveUser(), resolveAdmin()]);
    return res.status(200).json({ scope: 'both', ns: ns || null, user: u, admin: a });
  } catch (e) {
    console.error('me API error:', e);
    return res.status(200).json({
      scope: scope || 'both',
      error: 'parse_or_verify_failed',
      ns: ns || null,
      user: { hasToken: false, payload: null },
      admin: { hasToken: false, payload: null },
    });
  }
}
