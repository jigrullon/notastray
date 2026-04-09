import { NextResponse } from 'next/server';

/**
 * POST /api/import-tags
 * Body: { tags: [{ code, url }] }
 *
 * Bulk-imports tags into Firestore using the REST API (server-side, bypasses client security rules).
 * This is a one-time admin endpoint. Remove after use or add auth protection.
 */
export async function POST(request: Request) {
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID;
    if (!projectId) {
        return NextResponse.json({ error: 'Firebase project ID not configured' }, { status: 500 });
    }

    try {
        const { tags } = await request.json();
        if (!Array.isArray(tags) || tags.length === 0) {
            return NextResponse.json({ error: 'tags array is required' }, { status: 400 });
        }

        const now = new Date().toISOString();
        let created = 0;
        let skipped = 0;
        let errors = 0;

        // Process in batches of 50 concurrent requests
        const BATCH_SIZE = 50;
        for (let i = 0; i < tags.length; i += BATCH_SIZE) {
            const batch = tags.slice(i, i + BATCH_SIZE);
            const results = await Promise.all(batch.map(async (tag: { code: string; url: string }) => {
                const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/tags?documentId=${tag.code}`;
                const response = await fetch(firestoreUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        fields: {
                            code: { stringValue: tag.code },
                            url: { stringValue: tag.url },
                            isActive: { booleanValue: false },
                            userId: { nullValue: null },
                            pet: { nullValue: null },
                            activatedAt: { nullValue: null },
                            createdAt: { stringValue: now },
                            updatedAt: { stringValue: now },
                        }
                    }),
                });

                if (response.ok) return 'created';
                if (response.status === 409) return 'skipped'; // already exists
                return 'error';
            }));

            for (const r of results) {
                if (r === 'created') created++;
                else if (r === 'skipped') skipped++;
                else errors++;
            }
        }

        return NextResponse.json({ created, skipped, errors, total: tags.length });
    } catch (error: any) {
        console.error('Import error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
