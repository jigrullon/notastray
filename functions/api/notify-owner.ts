
// This would normally connect to your database and notification services
// For demo purposes, we'll simulate the notification process

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

// Mock owner data - this would come from your database
const mockOwnerData = {
  'ABC123': {
    name: 'Sarah Johnson',
    email: 'sarah.johnson@email.com',
    phone: '+15551234567',
    smsEnabled: true,
    emailEnabled: true,
    petName: 'Buddy'
  }
}

export async function onRequestPost(context) {
  const { request } = context;
  try {
    const body: NotificationRequest = await request.json()
    const { tagCode, location, timestamp, userAgent, locationMethod = 'gps' } = body

    // Get owner information from database
    const owner = mockOwnerData[tagCode as keyof typeof mockOwnerData]
    if (!owner) {
      return Response.json({ error: 'Tag not found' }, { status: 404 })
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
      timeZone: 'America/Los_Angeles', // This would be the owner's timezone
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

    // Send SMS notification
    if (owner.smsEnabled) {
      await sendSMS(owner.phone, smsMessage)
    }

    // Send email notification
    if (owner.emailEnabled) {
      await sendEmail(owner.email, emailSubject, emailBody)
    }

    // Log the scan event (you'd save this to your database)
    console.log('Pet tag scanned:', {
      tagCode,
      ownerName: owner.name,
      petName: owner.petName,
      location: locationText,
      timestamp,
      userAgent
    })

    return Response.json({ 
      success: true, 
      message: 'Owner notified successfully',
      notificationsSent: {
        sms: owner.smsEnabled,
        email: owner.emailEnabled
      }
    })

  } catch (error) {
    console.error('Notification error:', error)
    return Response.json(
      { error: 'Failed to send notification' }, 
      { status: 500 }
    )
  }
}

// SMS sending function - integrate with Twilio, AWS SNS, etc.
async function sendSMS(phoneNumber: string, message: string) {
  // Example with Twilio (you'd need to install twilio package and add credentials)
  /*
  const twilio = require('twilio')
  const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
  
  await client.messages.create({
    body: message,
    from: process.env.TWILIO_PHONE_NUMBER,
    to: phoneNumber
  })
  */
  
  // For demo purposes, just log
  console.log(`SMS to ${phoneNumber}: ${message}`)
}

// Email sending function - integrate with SendGrid, AWS SES, etc.
async function sendEmail(email: string, subject: string, htmlBody: string) {
  // Example with SendGrid (you'd need to install @sendgrid/mail and add API key)
  /*
  const sgMail = require('@sendgrid/mail')
  sgMail.setApiKey(process.env.SENDGRID_API_KEY)
  
  await sgMail.send({
    to: email,
    from: 'alerts@notastray.com',
    subject: subject,
    html: htmlBody
  })
  */
  
  // For demo purposes, just log
  console.log(`Email to ${email}: ${subject}`)
  console.log(htmlBody)
}
