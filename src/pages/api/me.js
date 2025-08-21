// pages/api/me.js
import db from '@/lib/db';
import { jwtVerify } from 'jose';
import { getNsFromReq } from '@/lib/ns-server';

const SECRET_STR = process.env.JWT_SECRET || '';
const SECRET = new TextEncoder().encode(SECRET_STR);

// ================== Helpers ================== //
function parseCookieHeader(header) {
  return String(header || '')
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => {
      const i = s.indexOf('=');
      if (i === -1) return [s, ''];
      const name = s.slice(0, i);
      const v = s.slice(i + 1);
      try {
        return [name, decodeURIComponent(v)];
      } catch {
        return [name, v];
      }
    });
}
function getCookie(cookies, name) {
  const hit = cookies.find(([n]) => n === name);
  return hit ? hit[1] : undefined;
}
function getCookiesByPrefix(cookies, prefix) {
  return cookies.filter(([n]) => n.startsWith(prefix));
}

async function verifyOrNull(token) {
  if (!token || !SECRET_STR) return null;
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return payload;
  } catch {
    return null;
  }
}
async function chooseLatestValidTokenPayload(pairs) {
  const verified = await Promise.all(
    pairs.map(async ([name, token]) => {
      const payload = await verifyOrNull(token);
      return payload ? { name, payload } : null;
    })
  );
  const valid = verified.filter(Boolean);
  if (!valid.length) return null;
  valid.sort(
    (a, b) =>
      Number(b.payload?.exp || 0) - Number(a.payload?.exp || 0) ||
      Number(b.payload?.iat || 0) - Number(a.payload?.iat || 0)
  );
  return { cookieName: valid[0].name, payload: valid[0].payload };
}

function normalizeRole(role) {
  const r = String(role || '').toLowerCase();
  if (['super_admin', 'superadmin', 'super-admin'].includes(r)) return 'super_admin';
  if (['admin_fitur', 'adminfitur', 'admin-fitur', 'admin'].includes(r)) return 'admin_fitur';
  if (r === 'user') return 'user';
  return r || null;
}

async function getAdminServiceIds(adminId) {
  if (!adminId) return [];
  const [rows] = await db.query('SELECT service_id FROM admin_services WHERE admin_id = ?', [
    Number(adminId),
  ]);
  return rows.map((r) => Number(r.service_id));
}

// ================== Resolver ================== //
async function resolveUser(ns, cookies) {
  if (!ns) {
    // fallback: ambil latest valid user token
    const chosen =
      (await chooseLatestValidTokenPayload(getCookiesByPrefix(cookies, 'user_session__'))) ||
      (await (async () => {
        const legacy = getCookie(cookies, 'user_session');
        const payload = await verifyOrNull(legacy);
        return payload ? { cookieName: 'user_session', payload } : null;
      })());
    if (!chosen) return { hasToken: false, payload: null, ns: null, cookieName: null };
    return {
      hasToken: true,
      payload: { ...chosen.payload, roleNormalized: normalizeRole(chosen.payload?.role) },
      cookieName: chosen.cookieName,
      ns: chosen.cookieName?.replace(/^user_session__/, '') || null,
    };
  }

  const token =
    getCookie(cookies, `user_session__${ns}`) ||
    getCookie(cookies, `user_session_${ns}`) ||
    getCookie(cookies, 'user_session');
  const payload = await verifyOrNull(token);
  return {
    hasToken: !!payload,
    payload: payload ? { ...payload, roleNormalized: normalizeRole(payload.role) } : null,
    cookieName: token
      ? (getCookie(cookies, `user_session__${ns}`) ? `user_session__${ns}` : 'user_session')
      : null,
    ns,
  };
}

async function resolveAdmin(ns, cookies) {
  if (!ns) {
    const chosen =
      (await chooseLatestValidTokenPayload(getCookiesByPrefix(cookies, 'admin_session__'))) ||
      (await (async () => {
        const legacy = getCookie(cookies, 'admin_session');
        const payload = await verifyOrNull(legacy);
        return payload ? { cookieName: 'admin_session', payload } : null;
      })());
    if (!chosen) return { hasToken: false, payload: null, ns: null, cookieName: null };

    const payload = chosen.payload;
    const roleNormalized = normalizeRole(payload?.role);
    const adminId = payload.id ?? payload.admin_id ?? (payload.sub ? Number(payload.sub) : null);
    const service_ids = await getAdminServiceIds(adminId);

    return {
      hasToken: true,
      payload: { ...payload, roleNormalized, admin_id: adminId, service_ids },
      cookieName: chosen.cookieName,
      ns: chosen.cookieName?.replace(/^admin_session__/, '') || null,
    };
  }

  const token =
    getCookie(cookies, `admin_session__${ns}`) ||
    getCookie(cookies, `admin_session_${ns}`) ||
    getCookie(cookies, 'admin_session');
  const payload = await verifyOrNull(token);
  if (!payload) return { hasToken: false, payload: null, ns, cookieName: null };

  const roleNormalized = normalizeRole(payload.role);
  const adminId = payload.id ?? payload.admin_id ?? (payload.sub ? Number(payload.sub) : null);
  const service_ids = await getAdminServiceIds(adminId);

  return {
    hasToken: true,
    payload: { ...payload, roleNormalized, admin_id: adminId, service_ids },
    cookieName: token
      ? (getCookie(cookies, `admin_session__${ns}`) ? `admin_session__${ns}` : 'admin_session')
      : null,
    ns,
  };
}

// ================== Main Handler ================== //
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const cookies = parseCookieHeader(req.headers.cookie);
  const ns = getNsFromReq(req);
  const scope = String(req.query.scope || '').toLowerCase();

  try {
    if (scope === 'user') {
      const u = await resolveUser(ns, cookies);
      return res.status(200).json({ scope: 'user', ...u });
    }
    if (scope === 'admin') {
      const a = await resolveAdmin(ns, cookies);
      return res.status(200).json({ scope: 'admin', ...a });
    }

    const [u, a] = await Promise.all([resolveUser(ns, cookies), resolveAdmin(ns, cookies)]);
    return res.status(200).json({ scope: 'both', user: u, admin: a });
  } catch (e) {
    console.error('me API error:', e);
    return res.status(200).json({
      scope: scope || 'both',
      error: 'parse_or_verify_failed',
      user: { hasToken: false, payload: null },
      admin: { hasToken: false, payload: null },
    });
  }
}
