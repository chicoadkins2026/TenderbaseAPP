import { NextResponse, type NextRequest } from 'next/server';
import {
  SUPABASE_ANON_KEY, SUPABASE_URL, isAuthBypassed, isDemoEnabled, isSupabaseConfigured,
} from './supabase-config';
import { isDemoRequest } from './demo';

/** Routes that require a signed-in user. */
const PROTECTED = ['/', '/search', '/saved', '/alerts', '/profile', '/tenders', '/briefing', '/welcome'];

/** Routes only a signed-out user should see. */
const AUTH_ROUTES = ['/login', '/signup'];

function isProtected(pathname: string): boolean {
  if (pathname === '/') return true;
  return PROTECTED.some((p) => p !== '/' && pathname.startsWith(p));
}

/**
 * Refreshes the auth cookie on every request and enforces route access.
 *
 * The response object must be the one Supabase wrote cookies onto, otherwise
 * the refreshed token is silently dropped and the user is logged out at random.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  // The explicit demo route is allowed to establish the demo cookie without
  // requiring Supabase. All other requests follow the normal auth flow.
  if (!isSupabaseConfigured) return response;
  if (isAuthBypassed || (isDemoEnabled && isDemoRequest(request))) return response;

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (toSet) => {
        toSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        toSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const { data: { user } } = await supabase.auth.getUser();
  const { pathname, search } = request.nextUrl;

  const demoActive = isDemoEnabled && request.cookies.get('tb_demo')?.value === 'pro';

  if (!user && !demoActive && isProtected(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.search = '';
    if (pathname !== '/') url.searchParams.set('next', `${pathname}${search}`);
    return NextResponse.redirect(url);
  }

  if (user && AUTH_ROUTES.some((p) => pathname.startsWith(p))) {
    const url = request.nextUrl.clone();
    url.pathname = '/';
    url.search = '';
    return NextResponse.redirect(url);
  }

  return response;
}

import { createServerClient } from '@supabase/ssr';
