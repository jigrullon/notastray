import { NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebaseAdmin';
import type { DecodedIdToken } from 'firebase-admin/auth';

// Verifies the `Authorization: Bearer <idToken>` header used across our
// user-facing API routes. Returns the decoded token on success, or a ready
// -to-return 401 NextResponse on failure.
export async function verifyBearerToken(
    request: Request
): Promise<{ decoded: DecodedIdToken; error?: undefined } | { decoded?: undefined; error: NextResponse }> {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
        return {
            error: NextResponse.json(
                { success: false, error: 'Missing or invalid authorization header' },
                { status: 401 }
            ),
        };
    }

    try {
        const decoded = await adminAuth.verifyIdToken(authHeader.slice(7));
        return { decoded };
    } catch (err) {
        console.error('verifyBearerToken: token verification failed', err);
        return {
            error: NextResponse.json(
                { success: false, error: 'Invalid or expired authorization token' },
                { status: 401 }
            ),
        };
    }
}
