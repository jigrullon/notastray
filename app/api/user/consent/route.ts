import { NextResponse } from 'next/server'
import { adminDb, adminAuth } from '@/lib/firebaseAdmin'

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const {
            userId,
            smsOptIn = true,
            emailOptIn = true,
            phone,
            email,
            consentIp,
            consentMethod = 'user_selection',
            maxNotificationsPerHour = 3,
            locationSharing = true,
            displayName = undefined,
        } = body

        if (!userId) {
            return NextResponse.json(
                { success: false, error: 'User ID is required' },
                { status: 400 }
            )
        }

        // Validate displayName if provided
        let trimmedDisplayName: string | undefined = undefined
        if (displayName !== undefined && displayName !== null) {
            trimmedDisplayName = displayName.trim()
            if (!trimmedDisplayName) {
                return NextResponse.json(
                    { success: false, error: 'Name cannot be empty' },
                    { status: 400 }
                )
            }
            if (trimmedDisplayName.length > 100) {
                return NextResponse.json(
                    { success: false, error: 'Name must be 100 characters or less' },
                    { status: 400 }
                )
            }
        }

        const now = new Date().toISOString()

        // Build update object
        const updateData: any = {
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
                maxNotificationsPerHour,
                locationSharing,
            },
        }

        // Include phone and email if provided
        if (phone) updateData.phone = phone
        if (email) updateData.email = email
        if (trimmedDisplayName) updateData.displayName = trimmedDisplayName

        // Update Firebase Auth displayName if provided
        if (trimmedDisplayName) {
            await adminAuth.updateUser(userId, {
                displayName: trimmedDisplayName,
            })
        }

        // Update user document in Firestore
        await adminDb.collection('users').doc(userId).set(updateData, { merge: true })

        return NextResponse.json({
            success: true,
            message: 'Preferences saved successfully',
            preferences: {
                smsOptIn,
                emailOptIn,
                phone,
                email,
                displayName: trimmedDisplayName,
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
