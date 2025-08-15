// pages/api/me.js
import { jwtVerify } from 'jose';
import db from '@/lib/db';

const SECRET_STR = process.env.JWT_SECRET || '';
const SECRET = new TextEncoder().encode(SECRET_STR);
const NS_RE = /^[A-Za-z0-9_-]{3,32}$/;

async function verifyOrNull(token) {
  if (!token || !SECRET_STR) return null;
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return payload; // { role, role_id?, id?, sub?, iat, exp, ns?, ... }
  } catch {
    return null;
  }
}

function parseCookieHeader(header) {
  const raw = String(header || '');
  if (!raw) return [];
  return raw
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

// 🔸 Ambil ns dari query/header/Referer; kalau kosong, kembalikan '' (akan coba sticky cookie)
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

// 🔸 Normalisasi role agar konsisten di FE
function normalizeRole(role) {
  const r = String(role || '').toLowerCase();
  if (r === 'super_admin' || r === 'superadmin' || r === 'super-admin') return 'super_admin';
  if (r === 'admin_fitur' || r === 'adminfitur' || r === 'admin-fitur' || r === 'admin') return 'admin_fitur';
  if (r === 'user') return 'user';
  return r || null;
}

// 🔸 Ambil semua service_id untuk admin tertentu
async function getAdminServiceIds(adminId) {
  if (!adminId) return [];
  const [rows] = await db.query(
    'SELECT service_id FROM admin_services WHERE admin_id = ?',
    [Number(adminId)]
  );
  return rows.map(r => Number(r.service_id));
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const cookies = parseCookieHeader(req.headers.cookie);
  const { scope, ns: nsFromReq } = getNsFromReq(req);

  // baca sticky ns bila ada
  const stickyUserNs = getCookie(cookies, 'current_user_ns');
  const stickyAdminNs = getCookie(cookies, 'current_admin_ns');

  async function resolveUser(nsOpt) {
    const ns = nsOpt || (stickyUserNs && NS_RE.test(stickyUserNs) ? stickyUserNs : '');
    if (ns) {
      const token =
        getCookie(cookies, `user_session__${ns}`) ||
        getCookie(cookies, `user_session_${ns}`) || // legacy name
        getCookie(cookies, 'user_session'); // super legacy (global)
      const payload = await verifyOrNull(token);
      return {
        hasToken: !!payload,
        payload: payload ? { ...payload, roleNormalized: normalizeRole(payload.role) } : null,
        cookieName: token ? (getCookie(cookies, `user_session__${ns}`) ? `user_session__${ns}` : 'user_session') : null,
        ns: ns || null,
      };
    }
    // tanpa ns → pilih latest valid namespaced dulu
    const chosen =
      (await chooseLatestValidTokenPayload(getCookiesByPrefix(cookies, 'user_session__'))) ||
      (await (async () => {
        const legacy = getCookie(cookies, 'user_session');
        const payload = await verifyOrNull(legacy);
        return payload ? { cookieName: 'user_session', payload } : null;
      })());
    if (chosen) {
      return {
        hasToken: true,
        payload: { ...chosen.payload, roleNormalized: normalizeRole(chosen.payload?.role) },
        cookieName: chosen.cookieName,
        ns: chosen.cookieName?.replace(/^user_session__/, '') || null,
      };
    }
    return { hasToken: false, payload: null, cookieName: null, ns: nsOpt || null };
  }

  async function resolveAdmin(nsOpt) {
    const ns = nsOpt || (stickyAdminNs && NS_RE.test(stickyAdminNs) ? stickyAdminNs : '');
    if (ns) {
      const token =
        getCookie(cookies, `admin_session__${ns}`) ||
        getCookie(cookies, `admin_session_${ns}`) ||
        getCookie(cookies, 'admin_session');
      const payload = await verifyOrNull(token);
      if (!payload) {
        return { hasToken: false, payload: null, cookieName: null, ns: ns || null };
      }
      const roleNormalized = normalizeRole(payload.role);
      const adminId =
        payload.id ?? payload.admin_id ?? (payload.sub ? Number(payload.sub) : null);
      const service_ids = await getAdminServiceIds(adminId);
      const role_id_num =
        payload.role_id !== undefined
          ? Number(payload.role_id)
          : roleNormalized === 'super_admin'
          ? 1
          : roleNormalized === 'admin_fitur'
          ? 2
          : null;

      return {
        hasToken: true,
        payload: {
          ...payload,
          admin_id: adminId,
          roleNormalized,
          role_id_num,
          service_ids,
        },
        cookieName: token
          ? (getCookie(cookies, `admin_session__${ns}`) ? `admin_session__${ns}` : 'admin_session')
          : null,
        ns: ns || null,
      };
    }
    const chosen =
      (await chooseLatestValidTokenPayload(getCookiesByPrefix(cookies, 'admin_session__'))) ||
      (await (async () => {
        const legacy = getCookie(cookies, 'admin_session');
        const payload = await verifyOrNull(legacy);
        return payload ? { cookieName: 'admin_session', payload } : null;
      })());
    if (chosen) {
      const payload = chosen.payload || {};
      const roleNormalized = normalizeRole(payload.role);
      const adminId =
        payload.id ?? payload.admin_id ?? (payload.sub ? Number(payload.sub) : null);
      const service_ids = await getAdminServiceIds(adminId);
      const role_id_num =
        payload.role_id !== undefined
          ? Number(payload.role_id)
          : roleNormalized === 'super_admin'
          ? 1
          : roleNormalized === 'admin_fitur'
          ? 2
          : null;
      return {
        hasToken: true,
        payload: {
          ...payload,
          admin_id: adminId,
          roleNormalized,
          role_id_num,
          service_ids,
        },
        cookieName: chosen.cookieName,
        ns: chosen.cookieName?.replace(/^admin_session__/, '') || null,
      };
    }
    return { hasToken: false, payload: null, cookieName: null, ns: nsOpt || null };
  }

  try {
    // Jika scope diminta spesifik, utamakan itu
    if (scope === 'user') {
      const u = await resolveUser(nsFromReq);
      return res.status(200).json({ scope: 'user', ...u });
    }
    if (scope === 'admin') {
      const a = await resolveAdmin(nsFromReq);
      return res.status(200).json({ scope: 'admin', ...a });
    }

    // Default: kembalikan keduanya
    const [u, a] = await Promise.all([resolveUser(nsFromReq), resolveAdmin(nsFromReq)]);
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
