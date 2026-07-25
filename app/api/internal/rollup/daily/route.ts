import { NextResponse } from 'next/server';
import { AggregateField } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebaseAdmin';
import { withObservability } from '@/lib/observability/withObservability';
import { log } from '@/lib/observability/logger';

/**
 * Accepts either Vercel Cron's own convention (Authorization: Bearer
 * $CRON_SECRET, sent automatically by Vercel when CRON_SECRET is set) or
 * the same internal-metrics key used by the other /api/internal/* routes,
 * so this can also be triggered manually (backfill, testing) with a plain
 * curl.
 */
function isAuthorized(request: Request): boolean {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get('authorization');
  if (cronSecret && authHeader === `Bearer ${cronSecret}`) return true;

  const internalKey = process.env.INTERNAL_METRICS_API_KEY;
  const providedKey = request.headers.get('x-internal-metrics-key');
  if (internalKey && providedKey === internalKey) return true;

  return false;
}

function dateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export const GET = withObservability('internal-rollup-daily', async (request: Request) => {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    // Defaults to yesterday (UTC) — a cron firing once daily is capturing
    // the prior full day, not the still-in-progress current one. ?date=
    // allows backfilling a specific day manually.
    const targetDateParam = searchParams.get('date');
    const dayStart = targetDateParam
      ? new Date(`${targetDateParam}T00:00:00.000Z`)
      : new Date(new Date().setUTCHours(0, 0, 0, 0) - 24 * 60 * 60 * 1000);
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
    const dayStartIso = dayStart.toISOString();
    const dayEndIso = dayEnd.toISOString();
    const key = dateKey(dayStart);

    const [
      newActivatedTagsSnap,
      ordersAggSnap,
      newSubscribersSnap,
      canceledSubscribersSnap,
    ] = await Promise.all([
      adminDb.collection('tags')
        .where('activatedAt', '>=', dayStartIso)
        .where('activatedAt', '<', dayEndIso)
        .count().get(),
      adminDb.collection('orders')
        .where('createdAt', '>=', dayStartIso)
        .where('createdAt', '<', dayEndIso)
        .aggregate({ count: AggregateField.count(), revenue: AggregateField.sum('total') })
        .get(),
      adminDb.collection('product_events')
        .where('type', '==', 'subscription_started')
        .where('createdAt', '>=', dayStartIso)
        .where('createdAt', '<', dayEndIso)
        .count().get(),
      adminDb.collection('product_events')
        .where('type', '==', 'subscription_canceled')
        .where('createdAt', '>=', dayStartIso)
        .where('createdAt', '<', dayEndIso)
        .count().get(),
    ]);

    const rollup = {
      date: key,
      newActivatedTags: newActivatedTagsSnap.data().count,
      newOrders: ordersAggSnap.data().count,
      revenue: ordersAggSnap.data().revenue || 0,
      newSubscribers: newSubscribersSnap.data().count,
      canceledSubscribers: canceledSubscribersSnap.data().count,
      computedAt: new Date().toISOString(),
    };

    await adminDb.collection('daily_metrics').doc(key).set(rollup);

    log.info('daily_rollup_computed', rollup);

    return NextResponse.json({ success: true, rollup });
  } catch (error) {
    log.error('daily_rollup_failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: 'Failed to compute daily rollup' }, { status: 500 });
  }
});
