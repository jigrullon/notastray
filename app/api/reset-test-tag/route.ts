import { NextResponse } from 'next/server';

/**
 * POST/GET /api/reset-test-tag
 *
 * Resets the TEST01 tag to its default inactive state.
 * Uses the Firestore REST API directly (no client SDK needed).
 * GET handler provided for easy browser-based triggering.
 */

async function resetTestTag(): Promise<NextResponse> {
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID;
    if (!projectId) {
        return NextResponse.json({ error: 'Firebase project ID not configured' }, { status: 500 });
    }

    const tagCode = 'TEST01';
    const firestoreBase = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`;
    const docUrl = `${firestoreBase}/tags/${tagCode}`;

    try {
        // Read the current document to verify it exists and check isTestTag
        const getResponse = await fetch(docUrl, { method: 'GET' });

        if (!getResponse.ok) {
            if (getResponse.status === 404) {
                return NextResponse.json({ error: `Tag ${tagCode} not found in Firestore` }, { status: 404 });
            }
            const errorText = await getResponse.text();
            return NextResponse.json({ error: `Failed to read tag: ${errorText}` }, { status: 500 });
        }

        const doc = await getResponse.json();

        // Allow reset if isTestTag is true OR if the document exists (for first-time setup)
        const isTestTag = doc.fields?.isTestTag?.booleanValue === true;
        const documentExists = !!doc.name;

        if (!isTestTag && !documentExists) {
            return NextResponse.json({ error: 'Tag is not a test tag and document does not exist' }, { status: 403 });
        }

        // PATCH the tag to reset it
        const now = new Date().toISOString();
        const fieldPaths = [
            'isActive',
            'pet',
            'activatedAt',
            'userId',
            'isLost',
            'foundReports',
            'isTestTag',
            'updatedAt',
        ];

        const updateMaskParams = fieldPaths.map(f => `updateMask.fieldPaths=${f}`).join('&');
        const patchUrl = `${docUrl}?${updateMaskParams}`;

        const patchResponse = await fetch(patchUrl, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                fields: {
                    isActive: { booleanValue: false },
                    pet: { nullValue: null },
                    activatedAt: { nullValue: null },
                    userId: { nullValue: null },
                    isLost: { booleanValue: false },
                    foundReports: { arrayValue: { values: [] } },
                    isTestTag: { booleanValue: true },
                    updatedAt: { stringValue: now },
                },
            }),
        });

        if (!patchResponse.ok) {
            const errorText = await patchResponse.text();
            console.error('Firestore PATCH error:', errorText);
            return NextResponse.json({ error: `Failed to reset tag: ${errorText}` }, { status: 500 });
        }

        console.log(`Test tag ${tagCode} reset successfully`);
        return NextResponse.json({ success: true, tagCode, resetAt: now });
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
