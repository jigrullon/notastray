import { NextResponse } from 'next/server';
import type { QueryDocumentSnapshot } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebaseAdmin';
import { sendEmail } from '@/lib/sendEmail';
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';
import {
    SERVER_VISITOR_COOLDOWN_MS,
    SERVER_VISITOR_COOLDOWN_LOST_MS,
} from '@/lib/scanNotificationConfig';

// How the visitor arrived at the pet profile. 'likely_qr' is a client-side
// heuristic for legacy tags printed without ?src=qr — it affects wording and
// logging ONLY. Dedup/rate-limit behavior must never branch on source.
type ScanSource = 'qr' | 'lookup' | 'likely_qr' | 'unknown'

interface NotificationRequest {
    tagCode: string
    location?: {
        latitude: number
        longitude: number
        accuracy: number
        address?: string
    }
    timestamp: string
    userAgent: string
    locationMethod?: 'gps' | 'ip'
    source?: ScanSource
    manual?: boolean
}

// One-way fingerprint of the visitor (IP + user agent) used for the
// per-visitor notification cooldown. No raw IP is ever persisted.
async function computeVisitorHash(request: Request, userAgent: string): Promise<string> {
    const ip = request.headers.get('cf-connecting-ip')
        || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
        || 'unknown-ip'
    const data = new TextEncoder().encode(`${ip}|${userAgent}`)
    const digest = await crypto.subtle.digest('SHA-256', data)
    return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('')
}

export async function POST(request: Request) {
    try {
        const body: NotificationRequest = await request.json()
        const { tagCode, location, timestamp, userAgent, locationMethod = 'gps', manual = false } = body
        // Sanitize source — only accept known values from the client.
        const source: ScanSource = body.source === 'qr' || body.source === 'lookup' || body.source === 'likely_qr'
            ? body.source
            : 'unknown'

        // Get tag from Firestore
        const tagDoc = await adminDb.collection('tags').doc(tagCode.toUpperCase()).get()
        if (!tagDoc.exists) {
            return NextResponse.json({ error: 'Tag not found' }, { status: 404 })
        }

        const tagData = tagDoc.data()
        if (!tagData?.userId) {
            return NextResponse.json({ error: 'Tag not activated' }, { status: 404 })
        }

        // Get owner information from Firestore
        const userDoc = await adminDb.collection('users').doc(tagData.userId).get()
        if (!userDoc.exists) {
            return NextResponse.json({ error: 'Owner not found' }, { status: 404 })
        }

        const userData = userDoc.data()
        const owner = {
            name: tagData.pet?.ownerName || 'Pet Owner',
            email: userData?.email || tagData.pet?.ownerEmail,
            phone: userData?.phone || tagData.pet?.ownerPhone,
            petName: tagData.pet?.name || 'Your pet',
            smsEnabled: userData?.preferences?.sms?.optIn ?? true, // Default to true if not set
            emailEnabled: userData?.preferences?.email?.optIn ?? true, // Default to true if not set
        }

        if (!owner.email && !owner.phone) {
            return NextResponse.json({ error: 'No contact information available' }, { status: 400 })
        }

        const visitorHash = await computeVisitorHash(request, userAgent)

        const locationData = location ? {
            latitude: location.latitude,
            longitude: location.longitude,
            accuracy: location.accuracy,
            ...(location.address && { address: location.address }),
        } : null

        // Every scan is logged, whether or not a notification is sent.
        const logScanEvent = (extra: Record<string, unknown>) =>
            adminDb.collection('scan_events').add({
                tagCode: tagCode.toUpperCase(),
                userId: tagData.userId,
                ownerName: owner.name,
                petName: owner.petName,
                location: locationData,
                timestamp: new Date(timestamp).toISOString(),
                userAgent,
                locationMethod,
                source,
                visitorHash,
                manual,
                createdAt: new Date().toISOString(),
                ...extra,
            })

        // Fetch the last hour of scan events for this tag ONCE — shared by the
        // per-visitor cooldown and the per-tag hourly rate limit. Fails open:
        // if the query errors, we proceed to send.
        let recentScanDocs: QueryDocumentSnapshot[] = []
        try {
            const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
            const recentScansSnapshot = await adminDb
                .collection('scan_events')
                .where('tagCode', '==', tagCode.toUpperCase())
                .where('createdAt', '>=', oneHourAgo)
                .get()
            recentScanDocs = recentScansSnapshot.docs
        } catch (queryError) {
            console.error('Error querying recent scans:', queryError)
            // Continue with notification if the query fails
        }

        // Per-visitor cooldown: if this same visitor (IP+UA fingerprint) already
        // triggered a sent notification for this tag recently, skip the send but
        // still log the scan. Applies to manual re-alerts too — the manual flag
        // bypasses client-side guards only.
        const visitorCooldownMs = tagData.isLost ? SERVER_VISITOR_COOLDOWN_LOST_MS : SERVER_VISITOR_COOLDOWN_MS
        const visitorCutoff = new Date(Date.now() - visitorCooldownMs).toISOString()
        const recentlyNotifiedByVisitor = recentScanDocs.some(doc => {
            const data = doc.data()
            return data.visitorHash === visitorHash
                && (data.notificationsSent?.sms || data.notificationsSent?.email)
                && data.createdAt >= visitorCutoff
        })

        if (recentlyNotifiedByVisitor) {
            await logScanEvent({
                notificationsSent: { sms: false, email: false },
                deduped: true,
            })
            return NextResponse.json({
                success: true,
                status: 'deduped',
                message: 'Visitor recently notified owner',
                notificationsSent: { sms: false, email: false },
            })
        }

        // Per-tag hourly rate limit
        const maxPerHour = userData?.preferences?.maxNotificationsPerHour ?? 3
        // When pet is lost, increase the rate limit to at least 5/hour
        const effectiveMaxPerHour = tagData.isLost ? Math.max(maxPerHour, 5) : maxPerHour

        if (effectiveMaxPerHour !== -1) { // -1 means Unlimited
            const recentNotificationCount = recentScanDocs.filter(
                doc => doc.data().notificationsSent?.sms || doc.data().notificationsSent?.email
            ).length

            if (recentNotificationCount >= effectiveMaxPerHour) {
                // Still log the scan event, just skip sending notifications
                await logScanEvent({
                    notificationsSent: { sms: false, email: false },
                    rateLimited: true,
                })
                return NextResponse.json({
                    success: true,
                    status: 'rate_limited',
                    message: 'Rate limited',
                    rateLimited: true,
                    notificationsSent: { sms: false, email: false },
                })
            }
        }

        // Format location information
        let locationText = 'Location not available'
        let mapsUrl: string | null = null

        if (location) {
            if (location.address) {
                locationText = location.address
            } else if (location.latitude && location.longitude) {
                locationText = `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`
            }

            if (locationMethod === 'ip') {
                locationText += ' (approximate)'
            }

            // Build Google Maps URL if coordinates are available
            if (location.latitude && location.longitude) {
                mapsUrl = `https://maps.google.com/?q=${location.latitude},${location.longitude}`
            }
        }

        // Format timestamp
        const scanTime = new Date(timestamp).toLocaleString('en-US', {
            timeZone: 'America/Los_Angeles',
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })

        // Prepare notification messages with source-aware wording.
        // 'likely_qr' reads as a scan to the owner; it is stored distinctly in
        // scan_events so ground truth stays honest.
        const isScan = source === 'qr' || source === 'likely_qr'
        const eventLabel = isScan
            ? 'tag was scanned'
            : source === 'lookup'
                ? 'tag code was looked up'
                : 'profile was viewed'
        const eventLabelShort = isScan ? 'scanned' : source === 'lookup' ? 'looked up' : 'viewed'
        const urgencyPrefix = tagData.isLost ? '🚨 LOST PET ALERT' : '🐾 FOUND PET ALERT'

        // Build SMS with actionable map link on own line for auto-linking
        const locationLine = mapsUrl
            ? `📍 ${locationText}\n${mapsUrl}`
            : `📍 ${locationText}`

        const smsMessage = [
            `${urgencyPrefix}: ${owner.petName}'s ${eventLabel}!`,
            locationLine,
            scanTime,
            'See email for full details.'
        ].join('\n')

        // Build location HTML with map link for email
        const locationHtml = mapsUrl
            ? `${locationText} &mdash; <a href="${mapsUrl}" style="color: #2563eb; text-decoration: none;"><strong>View on Google Maps →</strong></a>`
            : locationText

        const emailSubject = `${urgencyPrefix}: ${owner.petName}'s tag was ${eventLabelShort}!`
        const emailBody = `
      <h2>Your pet's ${eventLabel}!</h2>
      <p><strong>${owner.petName}'s</strong> ${isScan ? 'QR code tag was scanned' : source === 'lookup' ? 'tag code was looked up' : 'profile was viewed'} by someone${isScan ? ' who may have found your pet' : ''}.</p>

      ${tagData.isLost ? '<p style="color: red; font-weight: bold;">⚠️ Your pet is marked as LOST. This is an urgent alert!</p>' : ''}

      <h3>Scan Details:</h3>
      <ul>
        <li><strong>Event:</strong> ${isScan ? 'QR code scanned' : source === 'lookup' ? 'Tag code looked up' : 'Profile viewed'}</li>
        <li><strong>Time:</strong> ${scanTime}</li>
        <li><strong>Location:</strong> ${locationHtml}</li>
        <li><strong>Tag Code:</strong> ${tagCode}</li>
      </ul>

      <h3>What to do next:</h3>
      <ol>
        <li>Check your phone for missed calls or texts</li>
        <li>If no one has contacted you yet, they may be trying to reach you</li>
        <li>Consider posting on local lost pet groups with this location</li>
        <li>Head to the scan location if it's nearby</li>
      </ol>

      <p>The person who ${eventLabelShort} your pet's ${isScan ? 'tag' : source === 'lookup' ? 'code' : 'profile'} can see ${owner.petName}'s information with your contact details.</p>

      <p><em>This is an automated notification from NotAStray. The location is ${locationMethod === 'ip' ? 'approximate based on internet connection' : 'based on the scanner\'s device GPS'}.</em></p>
    `

        const notificationsSent = {
            sms: false,
            email: false,
        }

        // Send SMS notification
        console.log(`SMS check - enabled: ${owner.smsEnabled}, phone: ${owner.phone}`)
        if (owner.smsEnabled && owner.phone) {
            try {
                console.log(`Attempting to send SMS to ${owner.phone}`)
                await sendSMS(owner.phone, smsMessage)
                notificationsSent.sms = true
                console.log(`SMS sent successfully to ${owner.phone}`)
            } catch (smsError) {
                console.error('Failed to send SMS:', smsError)
            }
        } else {
            console.log(`SMS not sent - smsEnabled: ${owner.smsEnabled}, phone exists: ${!!owner.phone}`)
        }

        // Send email notification
        if (owner.emailEnabled && owner.email) {
            try {
                await sendEmail({
                    to: owner.email,
                    subject: emailSubject,
                    html: emailBody,
                    text: emailBody,
                })
                notificationsSent.email = true
                console.log(`Email sent to ${owner.email}`)
            } catch (emailError) {
                console.error('Failed to send email:', emailError)
            }
        }

        // Log the scan event
        await logScanEvent({ notificationsSent })

        return NextResponse.json({
            success: true,
            status: 'sent',
            message: 'Owner notified successfully',
            notificationsSent,
        })
    } catch (error) {
        console.error('Notification error:', error)
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to send notification' },
            { status: 500 }
        )
    }
}

async function sendSMS(phoneNumber: string, message: string) {
    try {
        // Format phone number to E.164 format (+1XXXXXXXXXX for US numbers)
        let formattedNumber = phoneNumber.replace(/\D/g, '') // Remove all non-digits
        if (formattedNumber.length === 10) {
            formattedNumber = '1' + formattedNumber // Add country code if missing
        }
        if (!formattedNumber.startsWith('+')) {
            formattedNumber = '+' + formattedNumber
        }

        const smsClient = new SNSClient({
            region: process.env.AWS_REGION || 'us-east-1',
            credentials: {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
            },
        })

        const response = await smsClient.send(
            new PublishCommand({
                Message: message,
                PhoneNumber: formattedNumber,
            })
        )

        console.log(`SMS sent successfully to ${formattedNumber}. Message ID: ${response.MessageId}`)
        return response.MessageId
    } catch (error) {
        console.error(`Failed to send SMS to ${phoneNumber}:`, error)
        throw error
    }
}
