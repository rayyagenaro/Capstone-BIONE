// middleware.js
import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const PUBLIC = new Set([
  '/', '/Login/hal-login', '/Signin/hal-sign', '/Signin/hal-signAdmin',
  '/SignUp/hal-signup', '/SignUp/hal-signupAdmin',
]);

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|images|api).*)'],
};

const NS_RE = /^[A-Za-z0-9_-]{3,32}$/;

const getNsFromQuery = (url) => {
  try {
    const u = new URL(url);
    const ns = u.searchParams.get('ns');
    return (ns && NS_RE.test(ns)) ? ns : null;
  } catch { return null; }
};

async function verifyToken(token, secretStr) {
  if (!token || !secretStr) return null;
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secretStr), {
      algorithms: ['HS256'],
      clockTolerance: 10,
    });
    return payload; // { role, exp, iat, ... }
  } catch {
    return null;
  }
}

// Jika ?ns= hilang, coba tebak dari cookie per-area.
async function inferNsFromCookies(req, isAdminArea, secretStr) {
  const prefix = isAdminArea ? 'admin_session__' : 'user_session__';
  const all = req.cookies.getAll();
  const candidates = all.filter(c => c.name.startsWith(prefix));

  if (candidates.length === 0) return null;
  if (candidates.length === 1) {
    return candidates[0].name.slice(prefix.length) || null;
  }

  const verified = await Promise.all(
    candidates.map(async c => {
      const payload = await verifyToken(c.value, secretStr);
      return payload ? { ns: c.name.slice(prefix.length), payload } : null;
    })
  );
  const valid = verified.filter(Boolean);
  if (!valid.length) {
    // fallback lemah saat secret tidak ada / semua invalid
    return candidates[0]?.name.slice(prefix.length) || null;
  }

  valid.sort((a, b) =>
    (Number(b.payload?.exp || 0) - Number(a.payload?.exp || 0)) ||
    (Number(b.payload?.iat || 0) - Number(a.payload?.iat || 0))
  );

  return valid[0].ns || null;
}

export async function middleware(req) {
  const { pathname, search } = req.nextUrl;

  // Allow pages publik
  if (PUBLIC.has(pathname)) return NextResponse.next();

  // Deteksi area (case-insensitive)
  const lower = pathname.toLowerCase();
  const isUserArea  = lower.startsWith('/user/');
  const isAdminArea = lower.startsWith('/admin/');

  // Non-area → lewati
  if (!isUserArea && !isAdminArea) return NextResponse.next();

  const secretStr = process.env.JWT_SECRET;
  const fromFull = pathname + search;

  const redirectTo = (path) => {
    const url = req.nextUrl.clone();
    url.pathname = path;
    url.searchParams.set('from', fromFull);
    return url;
  };

  // === 1) Ambil ns dari query; jika kosong, coba dari sticky cookie terlebih dahulu ===
  let ns = getNsFromQuery(req.url);

  if (!ns) {
    const stickyKey = isAdminArea ? 'current_admin_ns' : 'current_user_ns';
    const stickyNs = req.cookies.get(stickyKey)?.value;
    if (stickyNs && NS_RE.test(stickyNs)) {
      const stickyCookieName = `${isAdminArea ? 'admin' : 'user'}_session__${stickyNs}`;
      if (req.cookies.get(stickyCookieName)?.value) {
        const u = req.nextUrl.clone();
        u.searchParams.set('ns', stickyNs);
        const r = NextResponse.redirect(u);
        r.headers.set('x-auth-reason', 'ns-from-sticky');
        r.headers.set('x-auth-inferred-ns', stickyNs);
        return r;
      }
    }
  }

  // === 2) Jika masih kosong, infer dari cookies per-area ===
  if (!ns) {
    ns = await inferNsFromCookies(req, isAdminArea, secretStr);
    if (ns && NS_RE.test(ns)) {
      const u = req.nextUrl.clone();
      u.searchParams.set('ns', ns);
      const r = NextResponse.redirect(u);
      r.headers.set('x-auth-reason', 'ns-inferred');
      r.headers.set('x-auth-inferred-ns', ns);
      return r;
    }

    const r = NextResponse.redirect(redirectTo(isAdminArea ? '/Signin/hal-signAdmin' : '/Login/hal-login'));
    r.headers.set('x-auth-reason', 'missing-ns');
    return r;
  }

  // === 3) Cek token sesuai ns & area ===
  const cookieName = `${isAdminArea ? 'admin' : 'user'}_session__${ns}`;
  const token = req.cookies.get(cookieName)?.value;

  if (!token) {
    const url = req.nextUrl.clone();
    url.pathname = isAdminArea ? '/Signin/hal-signAdmin' : '/Login/hal-login';
    url.searchParams.set('from', `${pathname}?ns=${encodeURIComponent(ns)}`);
    const r = NextResponse.redirect(url);
    r.headers.set('x-auth-reason', 'no-cookie-for-ns');
    r.headers.set('x-auth-cookie-name', cookieName);
    return r;
  }

  if (!secretStr) {
    const r = NextResponse.redirect(redirectTo(isAdminArea ? '/Signin/hal-signAdmin' : '/Login/hal-login'));
    r.headers.set('x-auth-reason', 'missing-jwt-secret-in-middleware');
    return r;
  }

  // === 4) Verifikasi & cek role per area ===
  const payload = await verifyToken(token, secretStr);
  if (!payload) {
    const r = NextResponse.redirect(redirectTo(isAdminArea ? '/Signin/hal-signAdmin' : '/Login/hal-login'));
    r.headers.set('x-auth-reason', 'jwt-verify-failed');
    r.cookies.set(cookieName, '', { path: '/', maxAge: 0 });
    return r;
  }

  // ⬇⬇⬇ PERUBAHAN PENTING: terima 'super_admin' dan 'admin_fitur' untuk area admin
  if (isAdminArea) {
    const allowedAdminRoles = new Set(['admin', 'super_admin', 'admin_fitur']);
    if (!allowedAdminRoles.has(String(payload.role || ''))) {
      const r = NextResponse.redirect(redirectTo('/Signin/hal-signAdmin'));
      r.headers.set('x-auth-reason', 'role-mismatch');
      r.headers.set('x-auth-role', String(payload.role ?? ''));
      return r;
    }
  }
  if (isUserArea && String(payload.role || '') !== 'user') {
    const r = NextResponse.redirect(redirectTo('/Login/hal-login'));
    r.headers.set('x-auth-reason', 'role-mismatch');
    r.headers.set('x-auth-role', String(payload.role ?? ''));
    return r;
  }

  // === 5) Lolos → set sticky cookie ns agar nyaman next navigations ===
  const r = NextResponse.next();
  r.headers.set('x-auth-pass', 'true');
  r.headers.set('x-auth-ns', ns);
  r.headers.set('x-auth-role', String(payload.role ?? ''));

  const stickyKey = isAdminArea ? 'current_admin_ns' : 'current_user_ns';
  r.cookies.set(stickyKey, ns, {
    path: '/',
    sameSite: 'Lax',
    maxAge: 60 * 60 * 24 * 30, // 30 hari
  });

  return r;
}
