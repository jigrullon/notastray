import { NextResponse } from 'next/server';
import { log } from './observability/logger';

/**
 * Guards `/api/internal/*` routes with a shared secret rather than Firebase
 * user auth — these are called server-to-server by Grafana's Infinity
 * datasource and the Vercel Cron rollup job, neither of which has (or
 * should have) a Firebase user session.
 */
export function verifyInternalMetricsKey(request: Request): NextResponse | null {
  const expected = process.env.INTERNAL_METRICS_API_KEY;
  if (!expected) {
    // This is an app-config problem (INTERNAL_METRICS_API_KEY missing from
    // the app's own env — separate from the same-named var in
    // observability/.env, which only controls what Grafana *sends*), not a
    // per-request one — log it explicitly since it returns before the
    // caller's own try/catch, so nothing else would otherwise record it.
    log.error('internal_metrics_key_not_configured', {});
    return NextResponse.json(
      { error: 'Internal metrics API is not configured' },
      { status: 500 }
    );
  }

  const provided = request.headers.get('x-internal-metrics-key');
  if (provided !== expected) {
    log.warn('internal_metrics_key_rejected', {});
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return null;
}
