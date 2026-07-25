import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import { withObservability } from '@/lib/observability/withObservability';
import { log } from '@/lib/observability/logger';

const TAG_CODE = 'TEST01';

async function resetTestTag(request: NextRequest): Promise<NextResponse> {
    try {
        const { searchParams } = new URL(request.url)
        const secret = searchParams.get('secret')
        if (!process.env.ADMIN_API_KEY || secret !== process.env.ADMIN_API_KEY) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const tagRef = adminDb.collection('tags').doc(TAG_CODE);
        const doc = await tagRef.get();

        if (!doc.exists) {
            return NextResponse.json({ error: `Tag ${TAG_CODE} not found` }, { status: 404 });
        }

        if (doc.data()?.isTestTag !== true) {
            return NextResponse.json({ error: 'Tag is not a test tag' }, { status: 403 });
        }

        const now = new Date().toISOString();

        await tagRef.update({
            isActive: false,
            pet: null,
            activatedAt: null,
            userId: null,
            isLost: false,
            foundReports: [],
            isTestTag: true,
            updatedAt: now,
        });

        log.info('test_tag_reset', { tagCode: TAG_CODE });
        return NextResponse.json({ success: true, tagCode: TAG_CODE, resetAt: now });
    } catch (error: any) {
        log.error('reset_test_tag_failed', { error: error.message });
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export const POST = withObservability('reset-test-tag', async (request: NextRequest) => {
    return resetTestTag(request);
})
