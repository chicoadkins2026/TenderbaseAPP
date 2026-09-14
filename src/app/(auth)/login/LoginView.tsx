'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { AlertCircle, Loader2, PlayCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase';
import { isDemoEnabled, isSupabaseConfigured } from '@/lib/supabase-config';
import { cn } from '@/lib/cn';

/** Google's mark. Inline so it renders without a network request. */
function GoogleMark() {
  return (
    <svg width="19" height="19" viewBox="0 0 48 48" aria-hidden focusable="false">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}

const ERROR_COPY: Record<string, string> = {
  missing_code: 'Google didn’t send an authorisation code. Please try again.',
  access_denied: 'Sign-in was cancelled.',
};

export function LoginView() {
  const params = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const next = params.get('next');
  const callbackError = params.get('reason');

  const handleGoogle = async () => {
    setError(null);
    setLoading(true);
    try {
      const supabase = createClient();
      const redirectTo = new URL('/auth/callback', window.location.origin);
      if (next && next.startsWith('/')) redirectTo.searchParams.set('next', next);

      const { error: err } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: redirectTo.toString() },
      });
      if (err) {
        setError(err.message);
        setLoading(false);
      }
    } catch {
      setError('Could not reach the sign-in service. Check your connection.');
      setLoading(false);
    }
  };

  const shownError =
    error ?? (callbackError ? (ERROR_COPY[callbackError] ?? callbackError) : null);

  return (
    <main className="mx-auto flex min-h-[100dvh] w-full max-w-md flex-col px-6 pb-8 pt-14">
      <div className="flex items-center gap-2.5">
        <span className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-navy">
          <span className="text-[17px] font-bold leading-none text-white">T</span>
        </span>
        <p className="text-[19px] font-bold tracking-[-0.03em]">
          Tender<span className="text-ink-3">Base</span>
        </p>
      </div>

      <div className="mt-11">
        <h1 className="text-[30px] font-bold leading-[1.12] tracking-[-0.04em]">
          Welcome to TenderBase
        </h1>
        <p className="mt-2.5 text-[15px] leading-[1.5] text-ink-2">
          Sign in to access your tender opportunities.
        </p>
      </div>

      {shownError && (
        <div role="alert" className="mt-6 flex items-start gap-2.5 rounded-[12px] border border-urgent/25 bg-urgent-bg px-3 py-2.5">
          <AlertCircle size={15} strokeWidth={2.1} className="mt-px shrink-0 text-urgent" aria-hidden />
          <p className="text-[12.5px] leading-[1.45] text-ink-2">{shownError}</p>
        </div>
      )}

      <div className="mt-9 space-y-3">
        {isDemoEnabled && (
          <Link
            href="/demo"
            className={cn(
              'flex h-[52px] w-full items-center justify-center gap-2.5 rounded-[12px]',
              'bg-navy text-[16px] font-semibold text-white transition-opacity hover:opacity-90',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy/40',
            )}
          >
            <PlayCircle size={19} aria-hidden />
            Try TenderBase Pro Demo
          </Link>
        )}

        <button
          type="button"
          onClick={handleGoogle}
          disabled={loading || !isSupabaseConfigured}
          className={cn(
            'flex h-[52px] w-full items-center justify-center gap-2.5 rounded-[12px]',
            'border-[1.5px] border-line bg-white text-[16px] font-semibold text-ink',
            'transition-colors active:bg-canvas',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy/40',
            'disabled:cursor-not-allowed disabled:opacity-55',
          )}
        >
          {loading ? (
            <><Loader2 size={18} className="animate-spin" aria-hidden /> Redirecting to Google…</>
          ) : (
            <><GoogleMark /> Continue with Google</>
          )}
        </button>

        <p className="text-center text-[12.5px] leading-[1.5] text-ink-2">
          The demo opens TenderBase with Pro features enabled. No Google account is required.
        </p>
      </div>

      {!isSupabaseConfigured && !isDemoEnabled && (
        <div role="alert" className="mt-6 rounded-[12px] border border-soon/25 bg-soon-bg px-3 py-2.5">
          <p className="text-[12.5px] font-semibold text-soon">Sign-in not configured</p>
          <p className="mt-0.5 text-[11.5px] leading-[1.45] text-ink-2">
            Add your Supabase URL and key to <code>.env.local</code>. See GOOGLE-AUTH-SETUP.md.
          </p>
        </div>
      )}

      <div className="flex-1" />
      <p className="mt-8 text-center text-[11.5px] leading-[1.55] text-ink-3">
        By continuing you agree to TenderBase&apos;s <span className="underline">Terms of Service</span> and <span className="underline">Privacy Policy</span>.
      </p>
    </main>
  );
}
