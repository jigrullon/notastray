import { NextResponse } from 'next/server'
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses'
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns'

const sesClient = new SESClient({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    }
})

const snsClient = new SNSClient({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    }
})

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
            const fromEmail = process.env.AWS_SES_FROM_EMAIL || 'notifications@notastray.com'

            if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
                throw new Error('AWS credentials missing')
            }

            const command = new SendEmailCommand({
                Source: fromEmail,
                Destination: {
                    ToAddresses: [to],
                },
                Message: {
                    Subject: {
                        Data: 'Test Notification from NotAStray',
                    },
                    Body: {
                        Html: {
                            Data: `
                                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                                    <h1 style="color: #4F46E5;">It works!</h1>
                                    <p>This is a test notification from your NotAStray pet tag settings.</p>
                                    <p>If you received this, your email notifications are correctly configured.</p>
                                    <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 20px 0;" />
                                    <p style="color: #6B7280; font-size: 12px;">NotAStray Pet Safety System</p>
                                </div>
                            `,
                        },
                    },
                },
            })

            await sesClient.send(command)
            return NextResponse.json({ success: true, message: 'Email sent successfully' })

        } else if (type === 'sms') {
            if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
                throw new Error('AWS credentials missing')
            }

            // Normalize to E.164 format (+1XXXXXXXXXX) — strips spaces, dashes, parens, etc.
            const digits = to.replace(/\D/g, '')
            const toE164 = digits.startsWith('1') ? `+${digits}` : `+1${digits}`

            const command = new PublishCommand({
                Message: 'NotAStray Test: This is a test notification. Your settings are working correctly!',
                PhoneNumber: toE164,
            })

            console.log(`[SMS Test] To: ${toE164}`)

            await snsClient.send(command)
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
