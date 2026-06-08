import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import { sendEmail } from '@/lib/sendEmail';
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';

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
    source?: 'qr' | 'unknown'
}

export async function POST(request: Request) {
    try {
        const body: NotificationRequest = await request.json()
        const { tagCode, location, timestamp, userAgent, locationMethod = 'gps', source = 'unknown' } = body

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

        // Apply rate limiting
        let maxPerHour = userData?.preferences?.maxNotificationsPerHour ?? 3
        // When pet is lost, increase the rate limit to at least 5/hour
        const effectiveMaxPerHour = tagData.isLost ? Math.max(maxPerHour, 5) : maxPerHour

        if (effectiveMaxPerHour !== -1) { // -1 means Unlimited
            const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
            try {
                const recentScansSnapshot = await adminDb
                    .collection('scan_events')
                    .where('tagCode', '==', tagCode.toUpperCase())
                    .where('createdAt', '>=', oneHourAgo)
                    .get()

                const recentNotificationCount = recentScansSnapshot.docs.filter(
                    doc => doc.data().notificationsSent?.sms || doc.data().notificationsSent?.email
                ).length

                if (recentNotificationCount >= effectiveMaxPerHour) {
                    // Still log the scan event, just skip sending notifications
                    await adminDb.collection('scan_events').add({
                        tagCode: tagCode.toUpperCase(),
                        userId: tagData.userId,
                        ownerName: owner.name,
                        petName: owner.petName,
                        location: location ? {
                            latitude: location.latitude,
                            longitude: location.longitude,
                            accuracy: location.accuracy,
                            ...(location.address && { address: location.address }),
                        } : null,
                        timestamp: new Date(timestamp).toISOString(),
                        userAgent,
                        locationMethod,
                        source,
                        notificationsSent: { sms: false, email: false },
                        rateLimited: true,
                        createdAt: new Date().toISOString(),
                    })
                    return NextResponse.json({ success: true, message: 'Rate limited', rateLimited: true })
                }
            } catch (queryError) {
                console.error('Error querying recent scans:', queryError)
                // Continue with notification if rate limit query fails
            }
        }

        // Format location information
        let locationText = 'Location not available'
        if (location) {
            if (location.address) {
                locationText = location.address
            } else if (location.latitude && location.longitude) {
                locationText = `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`
            }

            if (locationMethod === 'ip') {
                locationText += ' (approximate)'
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

        // Prepare notification messages with source-aware wording
        const eventLabel = source === 'qr' ? "tag was scanned" : "profile was accessed"
        const urgencyPrefix = tagData.isLost ? '🚨 LOST PET ALERT' : '🐾 FOUND PET ALERT'
        const contextText = tagData.isLost
            ? 'Your pet is marked as lost. This is an urgent alert!'
            : 'Someone may have found your pet.'

        const smsMessage = `${urgencyPrefix}: ${owner.petName}'s ${eventLabel}! Location: ${locationText}. Time: ${scanTime}. ${contextText} Check your email for more details.`

        const emailSubject = `${urgencyPrefix}: ${owner.petName}'s tag was ${source === 'qr' ? 'scanned' : 'accessed'}!`
        const emailBody = `
      <h2>Your pet's tag was just ${source === 'qr' ? 'scanned' : 'accessed'}!</h2>
      <p><strong>${owner.petName}'s</strong> ${source === 'qr' ? 'QR code tag was scanned' : 'profile was accessed'} by someone${source === 'qr' ? ' who may have found your pet' : ''}.</p>

      ${tagData.isLost ? '<p style="color: red; font-weight: bold;">⚠️ Your pet is marked as LOST. This is an urgent alert!</p>' : ''}

      <h3>Scan Details:</h3>
      <ul>
        <li><strong>Event:</strong> ${source === 'qr' ? 'QR code scanned' : 'Profile accessed'}</li>
        <li><strong>Time:</strong> ${scanTime}</li>
        <li><strong>Location:</strong> ${locationText}</li>
        <li><strong>Tag Code:</strong> ${tagCode}</li>
      </ul>

      <h3>What to do next:</h3>
      <ol>
        <li>Check your phone for missed calls or texts</li>
        <li>If no one has contacted you yet, they may be trying to reach you</li>
        <li>Consider posting on local lost pet groups with this location</li>
        <li>Head to the scan location if it's nearby</li>
      </ol>

      <p>The person who ${source === 'qr' ? 'scanned' : 'accessed'} your pet's profile can see ${owner.petName}'s information with your contact details.</p>

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
        const locationData = location ? {
            latitude: location.latitude,
            longitude: location.longitude,
            accuracy: location.accuracy,
            ...(location.address && { address: location.address }),
        } : null

        await adminDb.collection('scan_events').add({
            tagCode: tagCode.toUpperCase(),
            userId: tagData.userId,
            ownerName: owner.name,
            petName: owner.petName,
            location: locationData,
            timestamp: new Date(timestamp).toISOString(),
            userAgent,
            locationMethod,
            source,
            notificationsSent,
            createdAt: new Date().toISOString(),
        })

        return NextResponse.json({
            success: true,
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
