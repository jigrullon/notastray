import { describe, it, expect } from 'vitest';
import { hasAlertEntitlement, isSubscriptionStale } from './subscriptionAccess';

// ─── Entitlement ───────────────────────────────────────────────────────────

describe('hasAlertEntitlement', () => {
    it('grants alerts for an active subscription', () => {
        expect(hasAlertEntitlement({ status: 'active' })).toBe(true);
    });

    it.each(['canceled', 'past_due', 'incomplete', 'unpaid', 'trialing', 'paused'])(
        'denies alerts for status "%s"',
        (status) => {
            expect(hasAlertEntitlement({ status })).toBe(false);
        }
    );

    it('denies alerts when there is no subscription record at all', () => {
        expect(hasAlertEntitlement(undefined)).toBe(false);
        expect(hasAlertEntitlement(null)).toBe(false);
        expect(hasAlertEntitlement({})).toBe(false);
    });

    it('is not fooled by a stripeSubscriptionId without an active status', () => {
        // A canceled sub keeps its ID — presence of an ID must never imply access.
        expect(hasAlertEntitlement({ status: 'canceled', stripeSubscriptionId: 'sub_123' })).toBe(false);
    });
});

// ─── Staleness ─────────────────────────────────────────────────────────────

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

describe('isSubscriptionStale', () => {
    const now = new Date('2026-08-08T12:00:00Z');

    it('is not stale while inside the billing period', () => {
        const sub = { status: 'active', currentPeriodEnd: '2026-09-01T00:00:00Z' };
        expect(isSubscriptionStale(sub, now)).toBe(false);
    });

    it('is not stale just past period end, within the grace window', () => {
        // Period ended 6 hours ago; the renewal webhook is still plausibly in flight.
        const sub = { status: 'active', currentPeriodEnd: new Date(now.getTime() - 6 * HOUR).toISOString() };
        expect(isSubscriptionStale(sub, now)).toBe(false);
    });

    it('is stale once the grace window has elapsed with no webhook', () => {
        // This is the missed-webhook case: 3 days past period end, record untouched.
        const sub = { status: 'active', currentPeriodEnd: new Date(now.getTime() - 3 * DAY).toISOString() };
        expect(isSubscriptionStale(sub, now)).toBe(true);
    });

    it('detects staleness in the harmful direction too (stuck canceled)', () => {
        // Customer renewed in Stripe, but the webhook never landed, so the local
        // copy is frozen at canceled. A paying customer would get no alerts.
        const sub = { status: 'canceled', currentPeriodEnd: new Date(now.getTime() - 10 * DAY).toISOString() };
        expect(isSubscriptionStale(sub, now)).toBe(true);
        expect(hasAlertEntitlement(sub)).toBe(false);
    });

    it('respects a custom grace window', () => {
        const sub = { status: 'active', currentPeriodEnd: new Date(now.getTime() - 2 * HOUR).toISOString() };
        expect(isSubscriptionStale(sub, now, 1 * HOUR)).toBe(true);
        expect(isSubscriptionStale(sub, now, 6 * HOUR)).toBe(false);
    });

    it('treats a missing or unparseable currentPeriodEnd as not stale', () => {
        // No date means nothing to compare against — don't manufacture a signal.
        expect(isSubscriptionStale({ status: 'active' }, now)).toBe(false);
        expect(isSubscriptionStale({ status: 'active', currentPeriodEnd: 'not-a-date' }, now)).toBe(false);
        expect(isSubscriptionStale(undefined, now)).toBe(false);
    });
});
