import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';

/**
 * POST /api/import-tags
 * Body: { tags: [{ code, url }] }
 *
 * Bulk-imports tags into Firestore via Firebase Admin SDK (server-side, bypasses security rules).
 * Admin-only endpoint — protect or remove after use.
 */
export async function POST(request: Request) {
    try {
        const { tags } = await request.json();
        if (!Array.isArray(tags) || tags.length === 0) {
            return NextResponse.json({ error: 'tags array is required' }, { status: 400 });
        }

        const now = new Date().toISOString();
        let created = 0;
        let skipped = 0;
        let errors = 0;

        // Process in batches of 50 (Firestore batch write limit is 500, but we check existence first)
        const BATCH_SIZE = 50;
        for (let i = 0; i < tags.length; i += BATCH_SIZE) {
            const chunk = tags.slice(i, i + BATCH_SIZE) as { code: string; url: string }[];

            // Check which docs already exist
            const existingDocs = await Promise.all(
                chunk.map(tag => adminDb.collection('tags').doc(tag.code).get())
            );

            const writeBatch = adminDb.batch();
            let batchHasWrites = false;

            existingDocs.forEach((doc, idx) => {
                if (doc.exists) {
                    skipped++;
                } else {
                    writeBatch.set(adminDb.collection('tags').doc(chunk[idx].code), {
                        code: chunk[idx].code,
                        url: chunk[idx].url,
                        isActive: false,
                        userId: null,
                        pet: null,
                        activatedAt: null,
                        createdAt: now,
                        updatedAt: now,
                    });
                    created++;
                    batchHasWrites = true;
                }
            });

            if (batchHasWrites) {
                try {
                    await writeBatch.commit();
                } catch {
                    errors += chunk.filter((_, idx) => !existingDocs[idx].exists).length;
                    created -= chunk.filter((_, idx) => !existingDocs[idx].exists).length;
                }
            }
        }

        return NextResponse.json({ created, skipped, errors, total: tags.length });
    } catch (error: any) {
        console.error('Import error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
