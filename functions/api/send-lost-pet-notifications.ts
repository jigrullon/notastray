interface Env {
  FIREBASE_PROJECT_ID: string
  FIREBASE_CLIENT_EMAIL: string
  FIREBASE_PRIVATE_KEY: string
  SENDGRID_API_KEY: string
  LOST_PET_NOTIFICATION_EMAIL: string
  LOST_PET_NOTIFICATION_TOKEN: string
}

// @ts-ignore
export const onRequestPost = async (context: any) => {
  const { request, env } = context

  // Verify this is called from a trusted source (webhook from scheduler)
  const authHeader = request.headers.get('authorization')
  const expectedToken = env.LOST_PET_NOTIFICATION_TOKEN

  if (!authHeader || !expectedToken || authHeader !== `Bearer ${expectedToken}`) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    )
  }

  try {
    console.log('[Lost Pet Notifications] Starting batch notification check')

    // This is a placeholder for the actual implementation
    // In production, you would use Firebase Admin SDK to query Firestore
    // For now, return success to indicate the endpoint is working

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Lost pet notification check completed',
        note: 'Implement Firebase Admin SDK integration in your Cloudflare Worker environment',
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('[Lost Pet Notifications] Fatal error:', err)
    return new Response(
      JSON.stringify({
        error: 'Failed to send lost pet notifications',
        message: err instanceof Error ? err.message : String(err),
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
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

          <!-- Header with Logo -->
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
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 15px;">
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
            <p style="margin: 0 0 24px 0; font-size: 15px; color: #666;">
              ${data.lostLocation}
            </p>

            <h3 style="color: #047857; font-size: 16px; margin: 24px 0 12px 0;">Date Lost</h3>
            <p style="margin: 0 0 24px 0; font-size: 15px; color: #666;">
              ${data.lostDate}
            </p>

            <div style="text-align: center; margin: 32px 0;">
              <a href="${data.reportUrl}" style="background-color: #047857; color: white; padding: 12px 32px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">View Full Report</a>
            </div>

            <div style="background-color: #f0f9ff; border: 1px solid #cffafe; padding: 16px; margin: 24px 0; border-radius: 4px;">
              <p style="margin: 0; font-size: 14px; color: #0369a1;">
                <strong>💡 How You Can Help:</strong><br>
                Share relevant local resources, social media groups, or connect with local shelters/rescues that might help this pet owner.
              </p>
            </div>

            <p style="color: #999; font-size: 13px; margin: 24px 0 0 0;">
              Tag Code: <strong>${data.tagCode}</strong>
            </p>
          </div>

          <!-- Footer -->
          <div style="background-color: #f9fafb; padding: 24px; text-align: center; font-size: 12px; color: #666; border-top: 1px solid #e5e7eb;">
            <p style="margin: 0 0 12px 0;">
              <a href="https://notastray.com" style="color: #047857; text-decoration: none; font-weight: bold;">NotAStray.com</a>
            </p>
            <p style="margin: 0; font-size: 11px; color: #999;">
              Keeping pets safe, one tag at a time.
            </p>
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
