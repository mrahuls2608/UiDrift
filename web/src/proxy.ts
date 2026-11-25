import { NextResponse, type NextRequest } from 'next/server';

/**
 * Login gate for every app page. This is an optimistic check (cookie present) that keeps signed-out
 * visitors on the landing and auth pages; the API verifies the JWT on every request and returns 401,
 * which the client also turns into a redirect to /login.
 */
const AUTH_COOKIE = 'uidrift_token';
const AUTH_PAGES = ['/login', '/signup'];

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const signedIn = Boolean(request.cookies.get(AUTH_COOKIE)?.value);

  if (AUTH_PAGES.includes(pathname)) {
    return signedIn
      ? NextResponse.redirect(new URL('/dashboard', request.url))
      : NextResponse.next();
  }
  if (!signedIn) {
    const login = new URL('/login', request.url);
    login.searchParams.set('next', `${pathname}${search}`);
    return NextResponse.redirect(login);
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/new/:path*',
    '/scan/:path*',
    '/report/:path*',
    '/login',
    '/signup',
  ],
};
