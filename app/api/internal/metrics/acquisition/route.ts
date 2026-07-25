import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import { verifyInternalMetricsKey } from '@/lib/internalMetricsAuth';
import { withObservability } from '@/lib/observability/withObservability';
import { log } from '@/lib/observability/logger';

const DIRECT = 'direct / organic';
// Bounds how many recent docs get tallied in memory — Firestore has no
// GROUP BY, so this reads real documents rather than running count()
// per channel (the channel set isn't known in advance, unlike species).
// Fine at current volume; if this collection grows large enough for the
// cap to matter, move this to a field the daily rollup pre-aggregates.
const MAX_DOCS = 2000;

function bucket(tally: Record<string, number>, key: string | undefined | null) {
  const label = key && key.trim() ? key.trim() : DIRECT;
  tally[label] = (tally[label] || 0) + 1;
}

export const GET = withObservability('internal-metrics-acquisition', async (request: Request) => {
  const authError = verifyInternalMetricsKey(request);
  if (authError) return authError;

  try {
    const { searchParams } = new URL(request.url);
    const days = Math.min(Number(searchParams.get('days')) || 90, 365);
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    const [ordersSnap, usersSnap] = await Promise.all([
      adminDb.collection('orders')
        .where('createdAt', '>=', since)
        .limit(MAX_DOCS)
        .get(),
      adminDb.collection('users')
        .where('createdAt', '>=', since)
        .limit(MAX_DOCS)
        .get(),
    ]);

    const ordersBySource: Record<string, number> = {};
    const revenueBySource: Record<string, number> = {};
    ordersSnap.docs.forEach((doc) => {
      const data = doc.data();
      const source = data.acquisition?.source;
      bucket(ordersBySource, source);
      const label = source && source.trim() ? source.trim() : DIRECT;
      revenueBySource[label] = (revenueBySource[label] || 0) + (data.total || 0);
    });

    const signupsBySource: Record<string, number> = {};
    usersSnap.docs.forEach((doc) => {
      bucket(signupsBySource, doc.data().acquisition?.source);
    });

    // Infinity's table/bar-gauge parser wants an array of rows — `data`
    // combines the per-source tallies into one row per channel; the plain
    // by-source objects stay too for anything that wants keyed lookup.
    const allSources = new Set([...Object.keys(ordersBySource), ...Object.keys(signupsBySource)]);
    const data = Array.from(allSources).map((source) => ({
      source,
      orders: ordersBySource[source] || 0,
      revenue: revenueBySource[source] || 0,
      signups: signupsBySource[source] || 0,
    }));

    return NextResponse.json({
      windowDays: days,
      ordersBySource,
      revenueBySource,
      signupsBySource,
      data,
      sampledOrders: ordersSnap.size,
      sampledSignups: usersSnap.size,
      truncated: ordersSnap.size >= MAX_DOCS || usersSnap.size >= MAX_DOCS,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    log.error('internal_metrics_acquisition_failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: 'Failed to compute acquisition breakdown' }, { status: 500 });
  }
});
