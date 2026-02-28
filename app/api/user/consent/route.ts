import { NextResponse } from 'next/server'
import { encryptUserContact } from '@/lib/userConsent'

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { userId, phone, email, consentIp } = body

        if (!userId || !phone || !email) {
            return NextResponse.json(
                { success: false, error: 'Missing required fields' },
                { status: 400 }
            )
        }

        // Encrypt data server-side
        const encryptedData = encryptUserContact(phone, email)

        // Return encrypted data to client for saving
        // This leverages the authenticated client's permission to write to their own doc
        return NextResponse.json({
            success: true,
            data: {
                ...encryptedData,
                consent: {
                    smsOptIn: true,
                    consentTimestamp: new Date().toISOString(),
                    consentIp: consentIp || null,
                    consentMethod: "checkbox",
                }
            }
        })

    } catch (error: any) {
        console.error('Encryption error:', error)
        return NextResponse.json(
            { success: false, error: error.message || 'Failed to encrypt data' },
            { status: 500 }
        )
    }
}
