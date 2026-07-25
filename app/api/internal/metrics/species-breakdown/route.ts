import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import { verifyInternalMetricsKey } from '@/lib/internalMetricsAuth';
import { withObservability } from '@/lib/observability/withObservability';
import { log } from '@/lib/observability/logger';

// Firestore aggregation queries have no GROUP BY, so this runs one count()
// per known species value instead of one scan — cheap since these are all
// pure-equality filters (no composite index needed) and the species list
// is small and fixed (matches lib/breedUtils.ts's getSpecies()).
const KNOWN_SPECIES = ['Dog', 'Cat', 'Other'] as const;

export const GET = withObservability('internal-metrics-species-breakdown', async (request: Request) => {
  const authError = verifyInternalMetricsKey(request);
  if (authError) return authError;

  try {
    const activeTags = adminDb.collection('tags').where('isActive', '==', true);

    const [activatedTagsSnap, ...speciesSnaps] = await Promise.all([
      activeTags.count().get(),
      ...KNOWN_SPECIES.map((species) => activeTags.where('pet.species', '==', species).count().get()),
    ]);

    const activatedTags = activatedTagsSnap.data().count;
    const bySpecies: Record<string, number> = {};
    let accountedFor = 0;
    KNOWN_SPECIES.forEach((species, i) => {
      const count = speciesSnaps[i].data().count;
      bySpecies[species] = count;
      accountedFor += count;
    });

    // Anything not matching a known species value — blank/legacy data, not
    // a real category to chart, but the numbers should still reconcile.
    bySpecies['Unknown'] = Math.max(0, activatedTags - accountedFor);

    // Infinity's table/pie-chart parser wants an array of rows, not a
    // bare object keyed by species — `data` is that array form; `bySpecies`
    // stays too for anything that wants keyed lookup.
    const data = Object.entries(bySpecies).map(([species, count]) => ({ species, count }));

    return NextResponse.json({
      activatedTags,
      bySpecies,
      data,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    log.error('internal_metrics_species_breakdown_failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: 'Failed to compute species breakdown' }, { status: 500 });
  }
});
