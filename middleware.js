// middleware.js (DEBUG MODE)
import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const PUBLIC = new Set([
  '/', '/Login/hal-login', '/Signin/hal-sign', '/Signin/hal-signAdmin',
  '/SignUp/hal-signup', '/SignUp/hal-signupAdmin',
]);

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|images|api).*)'],
};

const isAdminPath = (p) => p.toLowerCase().startsWith('/admin');
const cookieNameFor = (p) => (isAdminPath(p) ? 'admin_session' : 'user_session');

export async function middleware(req) {
  const { pathname } = req.nextUrl;
  if (PUBLIC.has(pathname)) return NextResponse.next();

  const name = cookieNameFor(pathname);
  const token = req.cookies.get(name)?.value;

  const redirectTo = (path) => {
    const url = req.nextUrl.clone();
    url.pathname = path;
    url.searchParams.set('from', pathname);
    return url;
  };

  if (!token) {
    const res = NextResponse.redirect(redirectTo(isAdminPath(pathname) ? '/Signin/hal-signAdmin' : '/Login/hal-login'));
    res.headers.set('x-auth-reason', 'no-cookie');
    res.headers.set('x-auth-cookie-name', name);
    return res;
  }

  const secretStr = process.env.JWT_SECRET;
  if (!secretStr) {
    const res = NextResponse.redirect(redirectTo(isAdminPath(pathname) ? '/Signin/hal-signAdmin' : '/Login/hal-login'));
    res.headers.set('x-auth-reason', 'missing-jwt-secret-in-middleware');
    return res;
  }

  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secretStr), {
      algorithms: ['HS256'],
      clockTolerance: 10,
    });

    if (isAdminPath(pathname) && payload.role !== 'admin') {
      const res = NextResponse.redirect(redirectTo('/Signin/hal-signAdmin'));
      res.headers.set('x-auth-reason', 'role-mismatch');
      res.headers.set('x-auth-role', String(payload.role ?? ''));
      return res;
    }

    const res = NextResponse.next();
    // Tambah header debug agar kita yakin lolos middleware
    res.headers.set('x-auth-pass', 'true');
    res.headers.set('x-auth-role', String(payload.role ?? ''));
    return res;
  } catch (e) {
    const res = NextResponse.redirect(redirectTo(isAdminPath(pathname) ? '/Signin/hal-signAdmin' : '/Login/hal-login'));
    res.headers.set('x-auth-reason', 'jwt-verify-failed');
    res.headers.set('x-auth-error', (e && e.name) || 'unknown');
    res.cookies.set(name, '', { path: '/', maxAge: 0 });
    return res;
  }
}
