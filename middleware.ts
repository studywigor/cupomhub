// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PROTECTED_PREFIXES = ['/admin', '/api/deals'];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));
  if (!isProtected) return NextResponse.next();

  const header = req.headers.get('authorization') ?? '';
  const adminPass = process.env.ADMIN_PASSWORD ?? '';

  if (!header.startsWith('Basic ')) {
    return new NextResponse('Auth required', {
      status: 401,
      headers: { 'WWW-Authenticate': 'Basic realm="Admin"' },
    });
  }

  const base64 = header.split(' ')[1] ?? '';
  let decoded = '';
  try {
    decoded = atob(base64);
  } catch {
    return new NextResponse('Invalid auth header', { status: 400 });
  }
  // Format is username:password — we ignore the username
  const providedPassword = decoded.split(':').slice(1).join(':');

  if (providedPassword !== adminPass) {
    return new NextResponse('Unauthorized', {
      status: 401,
      headers: { 'WWW-Authenticate': 'Basic realm="Admin"' },
    });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/api/deals/:path*', '/api/deals'],
};
