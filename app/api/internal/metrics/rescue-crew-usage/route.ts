import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import { verifyInternalMetricsKey } from '@/lib/internalMetricsAuth';
import { withObservability } from '@/lib/observability/withObservability';
import { log } from '@/lib/observability/logger';

export const GET = withObservability('internal-metrics-rescue-crew-usage', async (request: Request) => {
  const authError = verifyInternalMetricsKey(request);
  if (authError) return authError;

  try {
    const [activatedTagsSnap, totalContactsSnap, viewedEventsSnap, createdEventsSnap] = await Promise.all([
      adminDb.collection('tags').where('isActive', '==', true).count().get(),
      // Collection-group query: every owner's users/{uid}/rescueCrew subcollection.
      adminDb.collectionGroup('rescueCrew').count().get(),
      adminDb.collection('product_events').where('type', '==', 'rescue_crew_viewed').count().get(),
      // Distinct-owner adoption isn't something count() can compute (no
      // GROUP BY / DISTINCT in Firestore aggregation) — read this one
      // collection's userId field and tally in memory. Acceptable at
      // current volume; revisit if product_events grows large enough to
      // make this a real cost.
      adminDb.collection('product_events').where('type', '==', 'rescue_crew_contact_created').get(),
    ]);

    const distinctOwnersWithContact = new Set(
      createdEventsSnap.docs.map((doc) => doc.data().userId).filter(Boolean)
    ).size;

    const activatedTags = activatedTagsSnap.data().count;

    const summary = {
      activatedTags,
      totalContactsConfigured: totalContactsSnap.data().count,
      ownersWithAtLeastOneContact: distinctOwnersWithContact,
      // Adoption is measured per-owner, not per-tag — an owner with
      // multiple tags who sets up Rescue Crew once still counts as adopted.
      contactCreationEvents: createdEventsSnap.size,
      viewedByFinderCount: viewedEventsSnap.data().count,
      generatedAt: new Date().toISOString(),
    };

    // See summary/route.ts's comment: Infinity needs an array of rows, not
    // a bare object, at the query root.
    return NextResponse.json({ data: [summary] });
  } catch (error) {
    log.error('internal_metrics_rescue_crew_usage_failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: 'Failed to compute Rescue Crew usage' }, { status: 500 });
  }
});
