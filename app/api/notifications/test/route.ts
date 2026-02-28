import { NextResponse } from 'next/server'
import sgMail from '@sendgrid/mail'
import twilio from 'twilio'

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { type, to } = body

        if (!type || !to) {
            return NextResponse.json(
                { success: false, error: 'Missing type or recipient' },
                { status: 400 }
            )
        }

        if (type === 'email') {
            const apiKey = process.env.SENDGRID_API_KEY
            const fromEmail = process.env.SENDGRID_FROM_EMAIL

            if (!apiKey || !fromEmail) {
                throw new Error('SendGrid configuration missing')
            }

            sgMail.setApiKey(apiKey)

            const msg = {
                to: to,
                from: fromEmail,
                subject: 'Test Notification from NotAStray',
                text: 'This is a test notification to verify your settings.',
                html: `
          <div style="font-family: sans-serif; max-w-600px; margin: 0 auto;">
            <h1 style="color: #4F46E5;">It works!</h1>
            <p>This is a test notification from your NotAStray pet tag settings.</p>
            <p>If you received this, your email notifications are correctly configured.</p>
            <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 20px 0;" />
            <p style="color: #6B7280; font-size: 12px;">NotAStray Pet Safety System</p>
          </div>
        `,
            }

            await sgMail.send(msg)
            return NextResponse.json({ success: true, message: 'Email sent successfully' })

        } else if (type === 'sms') {
            const accountSid = process.env.TWILIO_ACCOUNT_SID
            const authToken = process.env.TWILIO_AUTH_TOKEN
            const fromNumber = process.env.TWILIO_PHONE_NUMBER

            if (!accountSid || !authToken || !fromNumber) {
                throw new Error('Twilio configuration missing')
            }

            // Normalize to E.164 format (+1XXXXXXXXXX) — strips spaces, dashes, parens, etc.
            const digits = to.replace(/\D/g, '')
            const toE164 = digits.startsWith('1') ? `+${digits}` : `+1${digits}`

            const client = twilio(accountSid, authToken)

            console.log(`[SMS Test] From: ${fromNumber} | To: ${toE164}`)

            await client.messages.create({
                body: 'NotAStray Test: This is a test notification. Your settings are working correctly!',
                from: fromNumber,
                to: toE164,
            })

            return NextResponse.json({ success: true, message: 'SMS sent successfully' })
        }

        return NextResponse.json(
            { success: false, error: 'Invalid notification type' },
            { status: 400 }
        )

    } catch (error: any) {
        console.error('Notification error:', error)
        return NextResponse.json(
            { success: false, error: error.message || 'Failed to send notification' },
            { status: 500 }
        )
    }
}
