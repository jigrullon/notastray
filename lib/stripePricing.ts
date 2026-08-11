import type Stripe from 'stripe';

// Prices live in the Stripe product catalog, not in this source tree. Line items
// reference a Price by ID so the amount charged is whatever Stripe says it is —
// the client never supplies a price, and therefore can't tamper with one.
//
// We resolve Prices by `lookup_key` rather than storing raw price IDs in env
// vars. Price IDs differ between test and live mode, so env vars would need a
// separate value per environment and a wrong-mode ID fails at checkout time.
// A lookup key is stable across modes: the Stripe API key already determines
// which mode is being queried, so the same key resolves correctly in both.
//
// Create these with scripts/setup-stripe-products.ts (run once per mode).
export const PRICE_LOOKUP_KEYS = {
    tag: 'tag_standard',
    protectMonthly: 'protect_monthly',
    protectYearly: 'protect_yearly',
} as const;

export type PriceLookupKey = (typeof PRICE_LOOKUP_KEYS)[keyof typeof PRICE_LOOKUP_KEYS];

export interface ResolvedPrice {
    id: string;
    /** Unit amount in cents, as Stripe holds it. */
    unitAmount: number;
}

// Prices change rarely; resolving one per checkout would add a round trip to
// every purchase. Cached for the life of the process — a price edit in Stripe
// takes effect on the next cold start, or immediately after a deploy.
const cache = new Map<string, ResolvedPrice>();

/** Test seam — lets tests start from a clean cache. */
export function clearPriceCache(): void {
    cache.clear();
}

export async function resolvePrice(stripe: Stripe, lookupKey: string): Promise<ResolvedPrice> {
    const cached = cache.get(lookupKey);
    if (cached) return cached;

    const prices = await stripe.prices.list({ lookup_keys: [lookupKey], active: true, limit: 1 });
    const price = prices.data[0];

    if (!price) {
        throw new Error(
            `No active Stripe price found for lookup_key "${lookupKey}". ` +
            `Run scripts/setup-stripe-products.ts against this Stripe mode to create it.`
        );
    }

    // Tiered or metered prices have no flat unit_amount. We don't use those, and
    // charging from one would silently mis-bill, so refuse rather than guess.
    if (typeof price.unit_amount !== 'number') {
        throw new Error(`Stripe price "${lookupKey}" (${price.id}) has no unit_amount.`);
    }

    const resolved: ResolvedPrice = { id: price.id, unitAmount: price.unit_amount };
    cache.set(lookupKey, resolved);
    return resolved;
}
