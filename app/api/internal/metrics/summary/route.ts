import { NextResponse } from 'next/server';
import { AggregateField } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebaseAdmin';
import { verifyInternalMetricsKey } from '@/lib/internalMetricsAuth';
import { withObservability } from '@/lib/observability/withObservability';
import { log } from '@/lib/observability/logger';

// Must stay in sync with the prices in app/api/subscribe/route.ts —
// there's no shared pricing config module yet, so this is the one other
// place plan price is duplicated. Used to estimate MRR without an extra
// Stripe API round trip on every dashboard refresh.
const MONTHLY_PLAN_PRICE = 3;
const YEARLY_PLAN_PRICE = 30;

export const GET = withObservability('internal-metrics-summary', async (request: Request) => {
  const authError = verifyInternalMetricsKey(request);
  if (authError) return authError;

  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const [
      totalTagsSnap,
      activatedTagsSnap,
      totalCustomersSnap,
      activeMonthlySubsSnap,
      activeYearlySubsSnap,
      totalRevenueSnap,
      revenue30dSnap,
      orders30dSnap,
      newsletterSubscribersSnap,
    ] = await Promise.all([
      adminDb.collection('tags').count().get(),
      adminDb.collection('tags').where('isActive', '==', true).count().get(),
      adminDb.collection('users').count().get(),
      adminDb.collection('users')
        .where('subscription.status', '==', 'active')
        .where('subscription.plan', '==', 'monthly')
        .count().get(),
      adminDb.collection('users')
        .where('subscription.status', '==', 'active')
        .where('subscription.plan', '==', 'yearly')
        .count().get(),
      adminDb.collection('orders').aggregate({ totalRevenue: AggregateField.sum('total') }).get(),
      adminDb.collection('orders')
        .where('createdAt', '>=', thirtyDaysAgo)
        .aggregate({ revenue: AggregateField.sum('total') }).get(),
      adminDb.collection('orders').where('createdAt', '>=', thirtyDaysAgo).count().get(),
      adminDb.collection('newsletter_subscribers').where('status', '==', 'active').count().get(),
    ]);

    const activeMonthlySubs = activeMonthlySubsSnap.data().count;
    const activeYearlySubs = activeYearlySubsSnap.data().count;

    const summary = {
      totalTags: totalTagsSnap.data().count,
      activatedTags: activatedTagsSnap.data().count,
      totalCustomers: totalCustomersSnap.data().count,
      activeSubscribers: activeMonthlySubs + activeYearlySubs,
      mrr: Number(
        (activeMonthlySubs * MONTHLY_PLAN_PRICE + activeYearlySubs * (YEARLY_PLAN_PRICE / 12)).toFixed(2)
      ),
      totalRevenue: totalRevenueSnap.data().totalRevenue || 0,
      revenue30d: revenue30dSnap.data().revenue || 0,
      orders30d: orders30dSnap.data().count,
      newsletterSubscribers: newsletterSubscribersSnap.data().count,
      generatedAt: new Date().toISOString(),
    };

    return NextResponse.json(summary);
  } catch (error) {
    log.error('internal_metrics_summary_failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: 'Failed to compute summary metrics' }, { status: 500 });
  }
});
