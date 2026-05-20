import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import { sendEmail } from '@/lib/sendEmail';

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
}

export async function POST(request: Request) {
    try {
        const body: NotificationRequest = await request.json()
        const { tagCode, location, timestamp, userAgent, locationMethod = 'gps' } = body

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
            email: tagData.pet?.ownerEmail || userData?.email,
            phone: tagData.pet?.ownerPhone,
            petName: tagData.pet?.name || 'Your pet',
            smsEnabled: userData?.preferences?.sms?.optIn ?? true, // Default to true if not set
            emailEnabled: userData?.preferences?.email?.optIn ?? true, // Default to true if not set
        }

        if (!owner.email && !owner.phone) {
            return NextResponse.json({ error: 'No contact information available' }, { status: 400 })
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

        // Prepare notification messages
        const smsMessage = `🐾 FOUND PET ALERT: ${owner.petName}'s tag was just scanned! Location: ${locationText}. Time: ${scanTime}. Someone may have found your pet. Check your email for more details.`

        const emailSubject = `🐾 ${owner.petName}'s tag was scanned - Someone may have found your pet!`
        const emailBody = `
      <h2>Your pet's tag was just scanned!</h2>
      <p><strong>${owner.petName}'s</strong> QR code tag was scanned by someone who may have found your pet.</p>
      
      <h3>Scan Details:</h3>
      <ul>
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
      
      <p>The person who scanned the tag can see ${owner.petName}'s profile with your contact information.</p>
      
      <p><em>This is an automated notification from NotAStray. The location is ${locationMethod === 'ip' ? 'approximate based on internet connection' : 'based on the scanner\'s device GPS'}.</em></p>
    `

        const notificationsSent = {
            sms: false,
            email: false,
        }

        // Send SMS notification
        if (owner.smsEnabled && owner.phone) {
            try {
                await sendSMS(owner.phone, smsMessage)
                notificationsSent.sms = true
                console.log(`SMS sent to ${owner.phone}`)
            } catch (smsError) {
                console.error('Failed to send SMS:', smsError)
            }
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
        await adminDb.collection('scan_events').add({
            tagCode,
            userId: tagData.userId,
            ownerName: owner.name,
            petName: owner.petName,
            location: location ? {
                latitude: location.latitude,
                longitude: location.longitude,
                accuracy: location.accuracy,
                address: location.address,
            } : null,
            timestamp: new Date(timestamp).toISOString(),
            userAgent,
            locationMethod,
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
    // TODO: Integrate Twilio or other SMS provider
    console.log(`[SMS] to ${phoneNumber}: ${message}`)
}
