# Real-Time Notification System

## Overview

The NotAStray notification system provides instant alerts to pet owners when someone scans their pet's QR code tag. This system includes location sharing, multiple notification methods, and smart privacy controls.

## How It Works

### 1. Tag Scan Detection
When someone visits a pet profile page (`/pet/[code]`), the system automatically:
- Detects the page load
- Attempts to get the scanner's location
- Sends notifications to the pet owner
- Shows confirmation to the scanner

### 2. Location Detection Process

The system uses a multi-tier approach for location detection:

#### Tier 1: GPS Location (Most Accurate)
- Requests precise GPS coordinates from the scanner's device
- Requires user permission
- Accuracy: ~3-10 meters
- Includes reverse geocoding to get human-readable address

#### Tier 2: IP-Based Location (Fallback)
- Uses the scanner's IP address to determine approximate location
- No permission required
- Accuracy: ~50km (city-level)
- Clearly marked as "approximate" in notifications

#### Tier 3: No Location (Graceful Degradation)
- If both methods fail, notifications are still sent
- Includes timestamp and device information
- Owner is informed that location is unavailable

### 3. Notification Methods

#### SMS Notifications
- Instant text message alerts
- Includes pet name, location, and timestamp
- Optimized for mobile readability
- Example: "🐾 FOUND PET ALERT: Buddy's tag was just scanned! Location: 123 Main St, Portland, OR. Time: Jan 5, 2:30 PM. Someone may have found your pet."

#### Email Notifications
- Detailed HTML emails with full information
- Includes next steps and recommendations
- Professional formatting with clear call-to-actions
- Backup method if SMS fails

### 4. Privacy & Security Features

#### Location Privacy
- Location data is never stored permanently
- Only shared with the pet owner
- Scanner's identity remains anonymous
- Clear indicators of location accuracy

#### Rate Limiting
- Prevents spam from repeated scans
- Configurable limits (1-10 notifications per hour)
- Smart deduplication for same location/time

#### Quiet Hours
- Reduces notification volume during specified times
- Emergency notifications still go through
- Customizable time ranges

## Technical Implementation

### Frontend (Pet Profile Page)
```typescript
// Automatic notification on page load
useEffect(() => {
  sendNotification()
}, [])

// Location detection with fallbacks
navigator.geolocation.getCurrentPosition(
  successCallback,
  errorCallback,
  { enableHighAccuracy: true, timeout: 10000 }
)
```

### Backend APIs

#### `/api/notify-owner`
- Processes notification requests
- Handles SMS and email sending
- Logs scan events
- Returns confirmation

#### `/api/geocode`
- Converts GPS coordinates to addresses
- Uses OpenStreetMap Nominatim (free tier)
- Fallback to coordinates if geocoding fails

#### `/api/ip-location`
- Gets approximate location from IP address
- Uses ip-api.com (free tier)
- Handles localhost/development scenarios

### Database Schema (Recommended)

```sql
-- Pet owners table
CREATE TABLE owners (
  id UUID PRIMARY KEY,
  name VARCHAR(255),
  email VARCHAR(255),
  phone VARCHAR(20),
  sms_enabled BOOLEAN DEFAULT true,
  email_enabled BOOLEAN DEFAULT true,
  quiet_hours_enabled BOOLEAN DEFAULT false,
  quiet_start TIME,
  quiet_end TIME,
  max_notifications_per_hour INTEGER DEFAULT 3
);

-- Pet tags table
CREATE TABLE pet_tags (
  code VARCHAR(10) PRIMARY KEY,
  owner_id UUID REFERENCES owners(id),
  pet_name VARCHAR(255),
  active BOOLEAN DEFAULT true
);

-- Scan events log
CREATE TABLE scan_events (
  id UUID PRIMARY KEY,
  tag_code VARCHAR(10) REFERENCES pet_tags(code),
  scanned_at TIMESTAMP DEFAULT NOW(),
  location_lat DECIMAL(10, 8),
  location_lng DECIMAL(11, 8),
  location_address TEXT,
  location_method VARCHAR(10), -- 'gps' or 'ip'
  user_agent TEXT,
  notifications_sent JSONB -- {sms: true, email: true}
);
```

## Integration Guide

### 1. SMS Service Setup

#### Option A: Twilio
```bash
npm install twilio
```

```typescript
const twilio = require('twilio')
const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)

await client.messages.create({
  body: message,
  from: process.env.TWILIO_PHONE_NUMBER,
  to: phoneNumber
})
```

#### Option B: AWS SNS
```bash
npm install @aws-sdk/client-sns
```

```typescript
import { SNSClient, PublishCommand } from "@aws-sdk/client-sns"

const snsClient = new SNSClient({ region: "us-east-1" })
await snsClient.send(new PublishCommand({
  PhoneNumber: phoneNumber,
  Message: message
}))
```

### 2. Email Service Setup

#### Option A: SendGrid
```bash
npm install @sendgrid/mail
```

```typescript
const sgMail = require('@sendgrid/mail')
sgMail.setApiKey(process.env.SENDGRID_API_KEY)

await sgMail.send({
  to: email,
  from: 'alerts@notastray.com',
  subject: subject,
  html: htmlBody
})
```

#### Option B: AWS SES
```bash
npm install @aws-sdk/client-ses
```

### 3. Environment Variables

```env
# SMS (Twilio)
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1234567890

# Email (SendGrid)
SENDGRID_API_KEY=your_api_key

# Geocoding (optional - for better address resolution)
GOOGLE_MAPS_API_KEY=your_api_key
```

## User Experience Features

### For Pet Owners
- **Instant Alerts**: Know immediately when someone finds your pet
- **Location Context**: See where your pet was found
- **Customizable Settings**: Control when and how you're notified
- **Privacy Controls**: Choose what information to share

### For Pet Finders
- **Automatic Notifications**: Owner is notified without finder taking action
- **Location Sharing**: Optional GPS sharing to help reunite pets
- **Clear Instructions**: Guidance on what to do next
- **Privacy Protection**: Finder's identity remains anonymous

## Best Practices

### 1. User Consent
- Always request location permission politely
- Explain why location is helpful
- Provide clear opt-out options
- Respect user privacy choices

### 2. Error Handling
- Graceful degradation when services fail
- Clear error messages for users
- Fallback options for all features
- Logging for debugging

### 3. Performance
- Minimize API calls
- Cache geocoding results temporarily
- Async processing for notifications
- Rate limiting to prevent abuse

### 4. Testing
- Test with various location scenarios
- Verify notification delivery
- Check privacy controls
- Test error conditions

## Future Enhancements

1. **Push Notifications**: Browser push notifications for web users
2. **Multi-Language**: Notifications in owner's preferred language  
3. **Photo Sharing**: Allow finders to share photos of the pet
4. **Two-Way Communication**: Secure messaging between owner and finder
5. **Integration with Shelters**: Automatic alerts to local animal shelters
6. **Analytics Dashboard**: Show owners scan patterns and locations

## Compliance & Legal

- **GDPR**: Ensure proper consent for location data
- **CCPA**: Provide data deletion options
- **TCPA**: Follow SMS marketing regulations
- **CAN-SPAM**: Comply with email regulations
- **Location Privacy**: Clear disclosure of location usage

## Monitoring & Analytics

Track key metrics:
- Notification delivery rates
- Location accuracy
- User engagement with notifications
- System performance and errors
- User satisfaction scores

This notification system provides a comprehensive solution for reuniting lost pets with their families while respecting privacy and providing excellent user experience.