import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const PUBLIC = [
  '/',
  '/Login/hal-login',
  '/Signin/hal-sign',
  '/Signin/hal-signAdmin',
  '/SignUp/hal-signup',
  '/SignUp/hal-signupAdmin',
];

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|images|api).*)'],
};

export async function middleware(req) {
  const { pathname } = req.nextUrl;
  if (PUBLIC.includes(pathname)) return NextResponse.next();

  const token = req.cookies.get('token')?.value;
  if (!token) {
    const url = req.nextUrl.clone();
    url.pathname = pathname.startsWith('/Admin') ? '/Signin/hal-signAdmin' : '/Login/hal-login';
    url.searchParams.set('from', pathname);
    return NextResponse.redirect(url);
  }

  try {
    const { payload } = await jwtVerify(
      token,
      new TextEncoder().encode(process.env.JWT_SECRET)
    );

    // ROLE GUARD
    const p = pathname.toLowerCase();
    const inAdmin = p.startsWith('/Admin')
    if (inAdmin && payload.role !== 'admin') {
      return NextResponse.redirect(new URL('/Signin/hal-signAdmin', req.url));
    }

    // === TURUNKAN DATA KE COOKIE YANG BISA DIBACA CLIENT ===
    const res = NextResponse.next();

    const roleCookie = req.cookies.get('role')?.value;
    const nameCookie = req.cookies.get('displayName')?.value;

    if (roleCookie !== payload.role) {
      res.cookies.set('role', String(payload.role), {
        path: '/',
        sameSite: 'lax',
        // penting: agar bisa dibaca di client
        httpOnly: false,
      });
    }

    const displayName = payload.name || (payload.role === 'admin' ? 'Admin' : 'User');
    if (nameCookie !== displayName) {
      res.cookies.set('displayName', displayName, {
        path: '/',
        sameSite: 'lax',
        httpOnly: false,
      });
    }

    return res;
  } catch {
    const url = req.nextUrl.clone();
    url.pathname = '/Login/hal-login';
    url.searchParams.set('from', pathname);
    return NextResponse.redirect(url);
  }
}
