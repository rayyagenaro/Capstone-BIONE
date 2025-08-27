// middleware.js
import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { normalizeRole } from '@/lib/role';
import { getNsFromReq } from '@/lib/ns-server'; // ✅ gunakan helper

const PUBLIC = new Set([
  '/', '/Login/hal-login', '/Signin/hal-sign', '/Signin/hal-signAdmin',
  '/SignUp/hal-signup', '/SignUp/hal-signupAdmin',
]);

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|images|api).*)'],
};

async function verifyToken(token, secretStr) {
  if (!token || !secretStr) return null;
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secretStr), {
      algorithms: ['HS256'],
      clockTolerance: 10,
    });
    return payload;
  } catch {
    return null;
  }
}

export async function middleware(req) {
  const { pathname, search } = req.nextUrl;

  if (PUBLIC.has(pathname)) return NextResponse.next();

  const lower = pathname.toLowerCase();
  const isUserArea  = lower.startsWith('/user/');
  const isAdminArea = lower.startsWith('/admin/');

  if (!isUserArea && !isAdminArea) return NextResponse.next();

  const secretStr = process.env.JWT_SECRET;
  const fromFull = pathname + search;

  const redirectTo = (path) => {
    const url = req.nextUrl.clone();
    url.pathname = path;
    url.searchParams.set('from', fromFull);
    return url;
  };

  // === 1) Ambil ns pakai helper ===
  let ns = getNsFromReq({
    query: Object.fromEntries(req.nextUrl.searchParams),
    cookies: Object.fromEntries(req.cookies.getAll().map(c => [c.name, c.value])),
  });

  // fallback infer jika helper tidak dapat ns
  if (!ns) {
    const r = NextResponse.redirect(
      redirectTo(isAdminArea ? '/Signin/hal-signAdmin' : '/Login/hal-login')
    );
    r.headers.set('x-auth-reason', 'missing-ns');
    return r;
  }

  // === 2) Ambil token untuk ns ===
  const cookieName = `${isAdminArea ? 'admin' : 'user'}_session__${ns}`;
  const token = req.cookies.get(cookieName)?.value;

  if (!token) {
    const url = req.nextUrl.clone();
    url.pathname = isAdminArea ? '/Signin/hal-signAdmin' : '/Login/hal-login';
    url.searchParams.set('from', `${pathname}?ns=${encodeURIComponent(ns)}`);
    const r = NextResponse.redirect(url);
    r.headers.set('x-auth-reason', 'no-cookie-for-ns');
    return r;
  }

  // === 2b) Cross-check ns di cookieName
  const cookieNs = cookieName.split('__')[1];
  if (cookieNs !== ns) {
    const r = NextResponse.redirect(
      redirectTo(isAdminArea ? '/Signin/hal-signAdmin' : '/Login/hal-login')
    );
    r.headers.set('x-auth-reason', 'ns-cookie-mismatch');
    r.headers.set('x-auth-cookie-ns', cookieNs);
    r.headers.set('x-auth-query-ns', ns);
    return r;
  }

  if (!secretStr) {
    const r = NextResponse.redirect(
      redirectTo(isAdminArea ? '/Signin/hal-signAdmin' : '/Login/hal-login')
    );
    r.headers.set('x-auth-reason', 'missing-jwt-secret-in-middleware');
    return r;
  }

  // === 3) Verifikasi token ===
  const payload = await verifyToken(token, secretStr);
  if (!payload) {
    const r = NextResponse.redirect(
      redirectTo(isAdminArea ? '/Signin/hal-signAdmin' : '/Login/hal-login')
    );
    r.headers.set('x-auth-reason', 'jwt-verify-failed');
    r.cookies.set(cookieName, '', { path: '/', maxAge: 0 });
    return r;
  }

  // 🔒 Cross-check ns
  if (payload.ns && payload.ns !== ns) {
    const r = NextResponse.redirect(
      redirectTo(isAdminArea ? '/Signin/hal-signAdmin' : '/Login/hal-login')
    );
    r.headers.set('x-auth-reason', 'ns-mismatch');
    r.headers.set('x-auth-token-ns', String(payload.ns));
    r.headers.set('x-auth-request-ns', String(ns));
    return r;
  }

  // === 4) Role check ===
  const role = normalizeRole(payload.role);

  if (isAdminArea && !['super_admin','admin_fitur'].includes(role)) {
    const r = NextResponse.redirect(redirectTo('/Signin/hal-signAdmin'));
    r.headers.set('x-auth-reason', 'role-mismatch');
    r.headers.set('x-auth-role', String(payload.role ?? ''));
    return r;
  }
  if (isUserArea && role !== 'user') {
    const r = NextResponse.redirect(redirectTo('/Login/hal-login'));
    r.headers.set('x-auth-reason', 'role-mismatch');
    r.headers.set('x-auth-role', String(payload.role ?? ''));
    return r;
  }

  // === 5) Lolos ===
  const r = NextResponse.next();
  r.headers.set('x-auth-pass', 'true');
  r.headers.set('x-auth-ns', ns);
  r.headers.set('x-auth-role', String(role ?? ''));

  const stickyKey = isAdminArea ? 'current_admin_ns' : 'current_user_ns';
  r.cookies.set(stickyKey, ns, {
    path: '/',
    sameSite: 'Lax',
    maxAge: 60 * 60 * 24 * 30,
  });

  return r;
}
