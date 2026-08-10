// Whether an owner's plan currently entitles them to scan alerts (SMS/email).
//
// Reads the cached `subscription` record on the user doc, which the Stripe
// webhook keeps up to date. Kept as a pure function so the entitlement rule
// lives in exactly one place and can be tested without Firestore or Stripe.

export interface SubscriptionRecord {
    status?: string
    plan?: string
    stripeSubscriptionId?: string
    currentPeriodEnd?: string
}

// Only 'active' grants alerts. Notably NOT included:
//   past_due    — payment failed; Stripe is retrying. No alerts until it clears.
//   trialing    — no trial is offered today; if one is ever added, decide
//                 deliberately whether it includes alerts rather than
//                 inheriting the answer from this function by accident.
//   canceled / incomplete / unpaid / undefined — no entitlement.
export function hasAlertEntitlement(subscription: SubscriptionRecord | undefined | null): boolean {
    return subscription?.status === 'active'
}

// A cached record is stale when Stripe's billing period has already elapsed but
// no webhook has arrived to renew or cancel it. That means the local copy can no
// longer be trusted in EITHER direction:
//
//   - still 'active' past its period end  → we may be sending alerts for a
//     subscription Stripe already canceled (revenue leak, no user harm)
//   - stuck 'canceled'/'past_due'         → a paying customer silently gets no
//     alerts (the harmful direction)
//
// Callers use this to decide when to reconcile against Stripe rather than
// trusting the cache. `graceMs` absorbs the normal gap between period end and
// the renewal webhook landing.
export function isSubscriptionStale(
    subscription: SubscriptionRecord | undefined | null,
    now: Date = new Date(),
    graceMs: number = 24 * 60 * 60 * 1000
): boolean {
    if (!subscription?.currentPeriodEnd) return false
    const periodEnd = new Date(subscription.currentPeriodEnd)
    if (isNaN(periodEnd.getTime())) return false
    return now.getTime() > periodEnd.getTime() + graceMs
}
