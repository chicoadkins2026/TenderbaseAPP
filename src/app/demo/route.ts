import { NextResponse } from 'next/server';

const DEMO_COOKIE = 'tb_demo';
const TIER_COOKIE = 'tb_tier';

/**
 * Public product demo entry point. This is intentionally a demo identity,
 * not a real authenticated Supabase session and must never be treated as one
 * by code that performs account-specific writes or billing actions.
 */
export async function GET(request: Request) {
  const response = NextResponse.redirect(new URL('/', request.url));

  response.cookies.set(DEMO_COOKIE, 'pro', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 8,
  });

  // The client entitlement store also reads this cookie during preview/demo.
  response.cookies.set(TIER_COOKIE, 'pro', {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 8,
  });

  return response;
}
