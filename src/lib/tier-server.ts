import 'server-only';

import { cookies } from 'next/headers';
import { TIER_COOKIE, TRIAL_END_COOKIE, previewGrantAllowed } from '@/lib/tier-cookies';
import { entitlementFromSubscription, type SubscriptionSnapshot } from '@/lib/entitlement';
import { fetchSubscription } from '@/lib/billing.server';
import { getUser } from '@/lib/supabase-server';
import { createClient } from '@/lib/supabase-server';
import { isAuthBypassed, isDemoEnabled, isSupabaseConfigured } from '@/lib/supabase-config';
import type { Tier } from '@/types/tier';

const VALID: Tier[] = ['free', 'basic', 'pro'];
const TEST_PRO_ENABLED = process.env.TENDERBASE_TEST_PRO === 'true';

function isTier(v: string | undefined): v is Tier {
  return v !== undefined && (VALID as string[]).includes(v);
}

export interface ServerTier {
  tier: Tier;
  trialEnd: string | null;
  source: 'verified' | 'guest' | 'cookie';
}

/** Server-side tier resolution. */
export async function getServerTier(): Promise<ServerTier> {
  if (TEST_PRO_ENABLED) {
    return { tier: 'pro', trialEnd: null, source: 'cookie' };
  }

  try {
    const user = await getUser();
    if (user) {
      const sub = await fetchSubscription(createClient());
      const snapshot: SubscriptionSnapshot | null = sub
        ? {
            plan: sub.plan,
            status: sub.status,
            currentPeriodEnd: sub.currentPeriodEnd,
            trialEndsAt: sub.trialEndsAt,
            cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
          }
        : null;
      const ent = entitlementFromSubscription(snapshot);
      return { tier: ent.tier, trialEnd: ent.trialEnd, source: 'verified' };
    }
  } catch {
    // Unreachable auth on a preview deployment falls through to the cookie;
    // a configured one fails closed to 'guest' just below.
  }

  const demo = cookies().get('tb_demo')?.value;
  if (isDemoEnabled && demo === 'pro') {
    return { tier: 'pro', trialEnd: null, source: 'cookie' };
  }

  if (!previewGrantAllowed({ supabaseConfigured: isSupabaseConfigured, authBypassed: isAuthBypassed })) {
    return { tier: 'free', trialEnd: null, source: 'guest' };
  }

  const store = cookies();
  const raw = store.get(TIER_COOKIE)?.value;
  const trialEnd = store.get(TRIAL_END_COOKIE)?.value ?? null;
  return { tier: isTier(raw) ? raw : 'free', trialEnd, source: 'cookie' };
}
