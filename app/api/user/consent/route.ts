import { NextResponse } from 'next/server'
import { adminDb, adminAuth } from '@/lib/firebaseAdmin'
import { verifyBearerToken } from '@/lib/apiAuth'
import { withObservability } from '@/lib/observability/withObservability'
import { log, setRequestUser } from '@/lib/observability/logger'

interface ConsentUpdate {
    preferences: {
        sms: { optIn: boolean; consentTimestamp: string; consentIp: string | null; consentMethod: string }
        email: { optIn: boolean; consentTimestamp: string; consentIp: string | null; consentMethod: string }
        maxNotificationsPerHour: number
        locationSharing: boolean
    }
    phone?: string
    phone2?: string
    // Set independently, only for whichever number the SMS consent modal was
    // just confirmed for — never both from a single confirmation.
    phoneConsentedAt?: string
    phone2ConsentedAt?: string | null
    email?: string
    displayName?: string
}

export const POST = withObservability('user-consent', async (request: Request) => {
    try {
        const { decoded, error } = await verifyBearerToken(request)
        if (error) return error
        const uid = decoded.uid
        setRequestUser(uid)

        const body = await request.json()
        const {
            userId,
            smsOptIn = true,
            emailOptIn = true,
            phone,
            phone2,
            // Which number this specific request just obtained consent for, if any.
            // Omitted on a plain settings save that isn't a consent confirmation.
            consentFor,
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

        if (userId !== uid) {
            return NextResponse.json(
                { success: false, error: 'You do not have permission to update these preferences' },
                { status: 403 }
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
        const updateData: ConsentUpdate = {
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
        // phone2 is optional and removable — unlike phone/email, an explicit empty
        // string clears it (there's no other field a user would be left without).
        if (phone2 !== undefined) updateData.phone2 = phone2
        // Clearing phone2 also clears its consent record — there's nothing left to
        // have consented to. Re-adding a number always requires fresh consent.
        if (phone2 === '') updateData.phone2ConsentedAt = null
        if (email) updateData.email = email
        if (trimmedDisplayName) updateData.displayName = trimmedDisplayName

        // Consent timestamps are set independently per number — confirming consent
        // for one number must never touch the other's consent record.
        if (consentFor === 'phone' && phone) updateData.phoneConsentedAt = now
        if (consentFor === 'phone2' && phone2) updateData.phone2ConsentedAt = now

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
                phone2,
                email,
                displayName: trimmedDisplayName,
                consentTimestamp: now,
            },
        })
    } catch (error: any) {
        log.error('user_consent_failed', { error: error.message })
        return NextResponse.json(
            { success: false, error: error.message || 'Failed to save preferences' },
            { status: 500 }
        )
    }
})
