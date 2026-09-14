/**
 * Supabase configuration guard.
 *
 * Auth is optional until credentials exist: the app must still run, and the
 * sign-in button must explain itself rather than throwing an opaque error.
 * Safe to import from both client and server components.
 */

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

/** Placeholder values ship in .env.example; treat them as "not configured". */
function isPlaceholder(v: string): boolean {
  return v === '' || v.includes('your-project') || v.includes('your-anon-key');
}

export const isSupabaseConfigured =
  !isPlaceholder(SUPABASE_URL) && !isPlaceholder(SUPABASE_ANON_KEY);

/**
 * Preview-only auth bypass. Never enable this in production.
 */
export const isAuthBypassed =
  process.env.NODE_ENV !== 'production' &&
  process.env.NEXT_PUBLIC_DEV_AUTH_BYPASS === 'true';

/** Public demo mode is explicitly enabled by the deployment environment. */
export const isDemoEnabled = process.env.NEXT_PUBLIC_DEMO_LOGIN === 'true';
