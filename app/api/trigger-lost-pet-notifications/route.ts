import { NextRequest, NextResponse } from 'next/server'
import { getFirestore } from 'firebase-admin/firestore'
import { getAuth } from 'firebase-admin/auth'
import { initializeApp, getApps, cert } from 'firebase-admin/app'

interface Env {
  FIREBASE_PROJECT_ID?: string
  FIREBASE_CLIENT_EMAIL?: string
  FIREBASE_PRIVATE_KEY?: string
  SENDGRID_API_KEY?: string
  LOST_PET_NOTIFICATION_EMAIL?: string
  LOST_PET_NOTIFICATION_TOKEN?: string
}

// Initialize Firebase Admin SDK
function initializeFirebase() {
  if (getApps().length > 0) {
    return
  }

  const projectId = process.env.FIREBASE_PROJECT_ID
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
  const privateKey = process.env.FIREBASE_PRIVATE_KEY

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error('Firebase config missing from environment')
  }

  initializeApp({
    credential: cert({
      projectId,
      clientEmail,
      privateKey: privateKey.replace(/\\n/g, '\n'),
    }),
  })
}

export async function POST(request: NextRequest) {
  try {
    // Verify authorization token
    const authHeader = request.headers.get('authorization')
    const expectedToken = process.env.LOST_PET_NOTIFICATION_TOKEN

    if (!authHeader || !expectedToken || authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('[Lost Pet Notifications] Starting batch notification check')

    initializeFirebase()
    const db = getFirestore()
    const auth = getAuth()

    const now = Date.now()
    const threeHoursInMs = 3 * 60 * 60 * 1000

    // Query for lost pets that haven't had notification sent yet
    const snapshot = await db
      .collection('tags')
      .where('isLost', '==', true)
      .where('lostNotificationSent', '==', false)
      .get()

    console.log(`[Lost Pet Notifications] Found ${snapshot.size} lost pets pending notification`)

    let sentCount = 0
    let errorCount = 0
    const results = []

    // Process each lost pet
    for (const doc of snapshot.docs) {
      const tagData = doc.data()
      const lostAt = tagData.lostAt ? new Date(tagData.lostAt).getTime() : null

      // Check if 3+ hours have passed since pet was marked lost
      if (!lostAt || now - lostAt < threeHoursInMs) {
        console.log(`[Lost Pet Notifications] Skipping ${doc.id}: Not 3 hours yet`)
        continue
      }

      try {
        // Check if pet is still marked as lost (might have been found/unmarked)
        const freshDoc = await db.collection('tags').doc(doc.id).get()
        if (!freshDoc.exists() || !freshDoc.get('isLost')) {
          console.log(`[Lost Pet Notifications] Skipping ${doc.id}: Pet no longer marked as lost`)
          continue
        }

        // Get owner info for context in email
        const userId = tagData.userId
        const petName = tagData.pet?.name || 'Unknown'
        const species = tagData.pet?.species || 'Pet'
        const breed = tagData.pet?.primaryBreed || tagData.pet?.breed
        const lostReport = tagData.lostReport || {}

        // Get owner email from Firebase Auth
        let ownerEmail = ''
        try {
          const user = await auth.getUser(userId)
          ownerEmail = user.email || ''
        } catch (err) {
          console.error(`[Lost Pet Notifications] Failed to get user email for ${userId}:`, err)
        }

        // Build email data
        const ownerPhone = tagData.pet?.ownerPhone || lostReport.contactInfo || ''
        const ownerName = tagData.pet?.ownerName || 'Pet Owner'
        const lostLocation = lostReport.city
          ? `${lostReport.street || ''}, ${lostReport.city}, ${lostReport.state} ${lostReport.postalCode}`.trim()
          : 'Unknown location'
        const lostDate = lostReport.lastSeenDate || new Date(lostAt).toLocaleDateString()

        // Send email via SendGrid
        const sendGridApiKey = process.env.SENDGRID_API_KEY
        const notificationEmail = process.env.LOST_PET_NOTIFICATION_EMAIL

        if (!sendGridApiKey || !notificationEmail) {
          throw new Error('SendGrid configuration missing')
        }

        const sendGridResponse = await fetch('https://api.sendgrid.com/v3/mail/send', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${sendGridApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            personalizations: [
              {
                to: [{ email: notificationEmail }],
                subject: `🚨 Missing Pet Alert: ${petName} (${species})`,
              },
            ],
            from: { email: 'notifications@notastray.com', name: 'NotAStray' },
            content: [
              {
                type: 'text/html',
                value: buildLostPetEmailHtml({
                  petName,
                  species,
                  breed,
                  ownerName,
                  ownerPhone,
                  ownerEmail,
                  lostLocation,
                  lostDate,
                  tagCode: doc.id,
                  reportUrl: `https://notastray.com/report-lost/${doc.id}`,
                }),
              },
              {
                type: 'text/plain',
                value: buildLostPetEmailText({
                  petName,
                  species,
                  breed,
                  ownerName,
                  ownerPhone,
                  ownerEmail,
                  lostLocation,
                  lostDate,
                  tagCode: doc.id,
                  reportUrl: `https://notastray.com/report-lost/${doc.id}`,
                }),
              },
            ],
          }),
        })

        if (!sendGridResponse.ok) {
          const errorData = await sendGridResponse.text()
          throw new Error(`SendGrid API error: ${sendGridResponse.status} - ${errorData}`)
        }

        // Mark as notification sent
        await db.collection('tags').doc(doc.id).update({
          lostNotificationSent: true,
          lostNotificationSentAt: new Date().toISOString(),
        })

        sentCount++
        results.push({ tagCode: doc.id, petName, status: 'sent' })
        console.log(`[Lost Pet Notifications] Successfully sent notification for ${doc.id}`)
      } catch (err) {
        errorCount++
        results.push({
          tagCode: doc.id,
          error: err instanceof Error ? err.message : String(err),
          status: 'error',
        })
        console.error(`[Lost Pet Notifications] Error processing ${doc.id}:`, err)
      }
    }

    return NextResponse.json({
      success: true,
      message: `Processed ${snapshot.size} lost pets`,
      sent: sentCount,
      errors: errorCount,
      skipped: snapshot.size - sentCount - errorCount,
      results,
    })
  } catch (err) {
    console.error('[Lost Pet Notifications] Fatal error:', err)
    return NextResponse.json(
      {
        error: 'Failed to send lost pet notifications',
        message: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    )
  }
}

interface EmailData {
  petName: string
  species: string
  breed?: string
  ownerName: string
  ownerPhone?: string
  ownerEmail?: string
  lostLocation: string
  lostDate: string
  tagCode: string
  reportUrl: string
}

function buildLostPetEmailHtml(data: EmailData): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
      </head>
      <body style="font-family: Arial, sans-serif; color: #333; line-height: 1.6; margin: 0; padding: 0;">
        <div style="max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">

          <!-- Header -->
          <div style="background-color: #ea580c; color: white; padding: 24px; text-align: center;">
            <p style="margin: 0; font-size: 18px; font-weight: bold;">🚨 Pet Reported Missing</p>
          </div>

          <!-- Content -->
          <div style="padding: 32px;">
            <p style="font-size: 16px; margin: 0 0 24px 0;">A user has reported their pet as missing on NotAStray. Reach out to help with their search!</p>

            <div style="background-color: #fef3c7; border: 2px solid #f59e0b; padding: 20px; margin: 24px 0; border-radius: 8px;">
              <p style="margin: 0 0 12px 0; font-size: 14px; font-weight: bold; color: #92400e;">PET DETAILS</p>
              <div style="margin: 0;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 15px;">
                  <span style="font-weight: bold;">Name:</span>
                  <span>${data.petName}</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 15px;">
                  <span style="font-weight: bold;">Species:</span>
                  <span>${data.species}</span>
                </div>
                ${data.breed ? `
                <div style="display: flex; justify-content: space-between; font-size: 15px;">
                  <span style="font-weight: bold;">Breed:</span>
                  <span>${data.breed}</span>
                </div>
                ` : ''}
              </div>
            </div>

            <h3 style="color: #047857; font-size: 16px; margin: 24px 0 12px 0;">Owner Information</h3>
            <div style="background-color: #f3f4f6; border-left: 4px solid #047857; padding: 16px; margin-bottom: 24px;">
              <p style="margin: 0 0 8px 0; font-size: 15px;"><strong>Name:</strong> ${data.ownerName}</p>
              ${data.ownerPhone ? `<p style="margin: 0 0 8px 0; font-size: 15px;"><strong>Phone:</strong> ${data.ownerPhone}</p>` : ''}
              ${data.ownerEmail ? `<p style="margin: 0; font-size: 15px;"><strong>Email:</strong> ${data.ownerEmail}</p>` : ''}
            </div>

            <h3 style="color: #047857; font-size: 16px; margin: 24px 0 12px 0;">Lost Location</h3>
            <p style="margin: 0 0 24px 0; font-size: 15px; color: #666;">${data.lostLocation}</p>

            <h3 style="color: #047857; font-size: 16px; margin: 24px 0 12px 0;">Date Lost</h3>
            <p style="margin: 0 0 24px 0; font-size: 15px; color: #666;">${data.lostDate}</p>

            <div style="text-align: center; margin: 32px 0;">
              <a href="${data.reportUrl}" style="background-color: #047857; color: white; padding: 12px 32px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">View Full Report</a>
            </div>

            <div style="background-color: #f0f9ff; border: 1px solid #cffafe; padding: 16px; margin: 24px 0; border-radius: 4px;">
              <p style="margin: 0; font-size: 14px; color: #0369a1;"><strong>💡 How You Can Help:</strong><br>Share relevant local resources, social media groups, or connect with local shelters/rescues.</p>
            </div>

            <p style="color: #999; font-size: 13px; margin: 24px 0 0 0;">Tag Code: <strong>${data.tagCode}</strong></p>
          </div>

          <!-- Footer -->
          <div style="background-color: #f9fafb; padding: 24px; text-align: center; font-size: 12px; color: #666; border-top: 1px solid #e5e7eb;">
            <p style="margin: 0 0 12px 0;"><a href="https://notastray.com" style="color: #047857; text-decoration: none; font-weight: bold;">NotAStray.com</a></p>
            <p style="margin: 0; font-size: 11px; color: #999;">Keeping pets safe, one tag at a time.</p>
          </div>
        </div>
      </body>
    </html>
  `
}

function buildLostPetEmailText(data: EmailData): string {
  return `
🚨 PET REPORTED MISSING

A user has reported their pet as missing on NotAStray. Reach out to help with their search!

PET DETAILS
Name: ${data.petName}
Species: ${data.species}
${data.breed ? `Breed: ${data.breed}` : ''}

OWNER INFORMATION
Name: ${data.ownerName}
${data.ownerPhone ? `Phone: ${data.ownerPhone}` : ''}
${data.ownerEmail ? `Email: ${data.ownerEmail}` : ''}

LOST LOCATION
${data.lostLocation}

DATE LOST
${data.lostDate}

VIEW FULL REPORT
${data.reportUrl}

💡 HOW YOU CAN HELP
Share relevant local resources, social media groups, or connect with local shelters/rescues that might help this pet owner.

Tag Code: ${data.tagCode}

---
NotAStray Smart Pet Tags
Keeping pets safe, one tag at a time.
  `
}
