import { describe, it, expect, beforeEach, vi } from 'vitest';
import type Stripe from 'stripe';
import { resolvePrice, clearPriceCache, PRICE_LOOKUP_KEYS } from './stripePricing';

beforeEach(() => {
    clearPriceCache();
});

// Minimal stand-in for the one Stripe method resolvePrice touches.
function fakeStripe(data: Array<Partial<Stripe.Price>>) {
    const list = vi.fn().mockResolvedValue({ data });
    return { stripe: { prices: { list } } as unknown as Stripe, list };
}

describe('resolvePrice', () => {
    it('returns the id and unit amount for a known lookup key', async () => {
        const { stripe } = fakeStripe([{ id: 'price_tag', unit_amount: 1850 }]);
        const price = await resolvePrice(stripe, PRICE_LOOKUP_KEYS.tag);
        expect(price).toEqual({ id: 'price_tag', unitAmount: 1850 });
    });

    it('queries Stripe for active prices matching the lookup key', async () => {
        const { stripe, list } = fakeStripe([{ id: 'price_tag', unit_amount: 1850 }]);
        await resolvePrice(stripe, PRICE_LOOKUP_KEYS.tag);
        expect(list).toHaveBeenCalledWith({
            lookup_keys: [PRICE_LOOKUP_KEYS.tag],
            active: true,
            limit: 1,
        });
    });

    it('caches, so repeat checkouts do not re-query Stripe', async () => {
        const { stripe, list } = fakeStripe([{ id: 'price_tag', unit_amount: 1850 }]);
        await resolvePrice(stripe, PRICE_LOOKUP_KEYS.tag);
        await resolvePrice(stripe, PRICE_LOOKUP_KEYS.tag);
        await resolvePrice(stripe, PRICE_LOOKUP_KEYS.tag);
        expect(list).toHaveBeenCalledTimes(1);
    });

    it('caches each lookup key separately', async () => {
        const { stripe, list } = fakeStripe([{ id: 'price_x', unit_amount: 300 }]);
        await resolvePrice(stripe, PRICE_LOOKUP_KEYS.protectMonthly);
        await resolvePrice(stripe, PRICE_LOOKUP_KEYS.protectYearly);
        expect(list).toHaveBeenCalledTimes(2);
    });

    it('throws a setup-actionable error when the price does not exist', async () => {
        const { stripe } = fakeStripe([]);
        await expect(resolvePrice(stripe, 'missing_key')).rejects.toThrow(/No active Stripe price/);
        // The message should point at the fix, since this fires on a fresh
        // Stripe mode where the catalog hasn't been created yet.
        await expect(resolvePrice(stripe, 'missing_key')).rejects.toThrow(/setup-stripe-products/);
    });

    it('refuses a price with no flat unit_amount rather than guessing', async () => {
        // Tiered/metered prices have unit_amount: null. Charging from one would
        // silently mis-bill.
        const { stripe } = fakeStripe([{ id: 'price_tiered', unit_amount: null }]);
        await expect(resolvePrice(stripe, 'tiered_key')).rejects.toThrow(/no unit_amount/);
    });

    it('does not cache a failed lookup', async () => {
        // A price created in Stripe after a failed attempt must be picked up
        // without restarting the process.
        const list = vi
            .fn()
            .mockResolvedValueOnce({ data: [] })
            .mockResolvedValueOnce({ data: [{ id: 'price_tag', unit_amount: 1850 }] });
        const stripe = { prices: { list } } as unknown as Stripe;

        await expect(resolvePrice(stripe, PRICE_LOOKUP_KEYS.tag)).rejects.toThrow();
        const price = await resolvePrice(stripe, PRICE_LOOKUP_KEYS.tag);
        expect(price.unitAmount).toBe(1850);
    });

    it('reports the amount Stripe holds, not a value supplied by a caller', async () => {
        // The point of the whole module: the charged amount comes from Stripe.
        const { stripe } = fakeStripe([{ id: 'price_tag', unit_amount: 1850 }]);
        const price = await resolvePrice(stripe, PRICE_LOOKUP_KEYS.tag);
        expect(price.unitAmount).toBe(1850);
        expect(price.unitAmount / 100).toBe(18.5);
    });
});
