import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';

const TAG_CODE = 'TEST01';

async function resetTestTag(): Promise<NextResponse> {
    try {
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

        console.log(`Test tag ${TAG_CODE} reset successfully`);
        return NextResponse.json({ success: true, tagCode: TAG_CODE, resetAt: now });
    } catch (error: any) {
        console.error('Reset test tag error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST() {
    return resetTestTag();
}

export async function GET() {
    return resetTestTag();
}
