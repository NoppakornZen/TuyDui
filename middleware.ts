import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Inject runtime config as script tag
  if (request.nextUrl.pathname === '/' || request.nextUrl.pathname.startsWith('/login')) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

    response.headers.set('x-supabase-url', url);
    response.headers.set('x-supabase-anon-key', anonKey);
  }

  return response;
}

export const config = {
  matcher: ['/', '/login', '/workspace'],
};
