import { NextResponse } from 'next/server'
import { saveUserConsent } from '@/lib/userConsent'

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

        // Call the server-side encryption and save function
        await saveUserConsent({
            userId,
            phone,
            email,
            consentIp
        })

        return NextResponse.json({ success: true, message: 'Consent saved successfully' })

    } catch (error: any) {
        console.error('Consent save error:', error)
        return NextResponse.json(
            { success: false, error: error.message || 'Failed to save consent' },
            { status: 500 }
        )
    }
}
