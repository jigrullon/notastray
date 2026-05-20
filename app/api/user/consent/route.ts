import { NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebaseAdmin'

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const {
            userId,
            smsOptIn = true,
            emailOptIn = true,
            consentIp,
            consentMethod = 'user_selection',
        } = body

        if (!userId) {
            return NextResponse.json(
                { success: false, error: 'User ID is required' },
                { status: 400 }
            )
        }

        const now = new Date().toISOString()

        // Update user preferences in Firestore
        await adminDb.collection('users').doc(userId).set(
            {
                preferences: {
                    sms: {
                        optIn: smsOptIn,
                        consentTimestamp: now,
                        consentIp: consentIp || null,
                        consentMethod,
                    },
                    email: {
                        optIn: emailOptIn,
                        consentTimestamp: now,
                        consentIp: consentIp || null,
                        consentMethod,
                    },
                },
            },
            { merge: true }
        )

        return NextResponse.json({
            success: true,
            message: 'Preferences saved successfully',
            preferences: {
                smsOptIn,
                emailOptIn,
                consentTimestamp: now,
            },
        })
    } catch (error: any) {
        console.error('Consent error:', error)
        return NextResponse.json(
            { success: false, error: error.message || 'Failed to save preferences' },
            { status: 500 }
        )
    }
}
