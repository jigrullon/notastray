import { NextResponse } from 'next/server';

/**
 * Guards `/api/internal/*` routes with a shared secret rather than Firebase
 * user auth — these are called server-to-server by Grafana's Infinity
 * datasource and the Vercel Cron rollup job, neither of which has (or
 * should have) a Firebase user session.
 */
export function verifyInternalMetricsKey(request: Request): NextResponse | null {
  const expected = process.env.INTERNAL_METRICS_API_KEY;
  if (!expected) {
    return NextResponse.json(
      { error: 'Internal metrics API is not configured' },
      { status: 500 }
    );
  }

  const provided = request.headers.get('x-internal-metrics-key');
  if (provided !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return null;
}
