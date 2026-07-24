import { NextResponse } from 'next/server';
import { FieldPath } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebaseAdmin';
import { verifyInternalMetricsKey } from '@/lib/internalMetricsAuth';
import { withObservability } from '@/lib/observability/withObservability';
import { log } from '@/lib/observability/logger';

function dateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export const GET = withObservability('internal-metrics-revenue-timeseries', async (request: Request) => {
  const authError = verifyInternalMetricsKey(request);
  if (authError) return authError;

  try {
    const { searchParams } = new URL(request.url);
    const days = Math.min(Number(searchParams.get('days')) || 30, 180);

    const end = new Date();
    const start = new Date(end.getTime() - days * 24 * 60 * 60 * 1000);
    const startKey = dateKey(start);
    const endKey = dateKey(end);

    // daily_metrics/{YYYY-MM-DD} doc IDs sort lexicographically the same as
    // chronologically, so a plain document-ID range query works without a
    // separate date field or composite index.
    const snap = await adminDb.collection('daily_metrics')
      .where(FieldPath.documentId(), '>=', startKey)
      .where(FieldPath.documentId(), '<=', endKey)
      .get();

    const byDate = new Map(snap.docs.map((doc) => [doc.id, doc.data()]));

    // Fill in every day in the range explicitly (not just days with a
    // rollup doc) so the chart doesn't silently skip missing days —
    // days before the rollup cron started running will legitimately be
    // all zeros, and that's a real signal ("we don't have data yet"),
    // not a gap to paper over.
    const series = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const key = dateKey(d);
      const data = byDate.get(key);
      series.push({
        date: key,
        revenue: data?.revenue || 0,
        newOrders: data?.newOrders || 0,
        newSubscribers: data?.newSubscribers || 0,
        canceledSubscribers: data?.canceledSubscribers || 0,
        newActivatedTags: data?.newActivatedTags || 0,
      });
    }

    return NextResponse.json({
      windowDays: days,
      series,
      hasRollupData: snap.size > 0,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    log.error('internal_metrics_revenue_timeseries_failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: 'Failed to compute revenue timeseries' }, { status: 500 });
  }
});
