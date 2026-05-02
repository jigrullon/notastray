# Email Flow - Updated (May 2, 2026)

All emails now use:
- ✅ NotAStray logo from `/public/logo-darkmode.jpg`
- ✅ Brand green color (#047857)
- ✅ Links to NotAStray dashboard and website
- ✅ Clean, professional design
- ✅ AWS SES for sending (via `/lib/sendEmail.ts`)

---

## Customer Email Flow

### 1️⃣ Order Confirmation Email
**When**: Immediately after Stripe payment (webhook fires)
**From**: `/api/webhook/route.ts`
**Content**:
- Customer name
- Order number (#NAS-XXXXXX-XXXXX)
- Itemized list with colors, sizes, quantities
- Order subtotal, shipping, total
- Expected delivery date range
- Shipping address
- Button to view orders dashboard
- Logo and branding

---

### 2️⃣ Shipping Email (Your Order is on the Way!)
**When**: USPS scans it at their facility (EasyPost "in_transit" webhook)
**From**: `/api/webhooks/easypost/route.ts`
**Content**:
- "Your Order is on the Way! 🚚"
- Tracking number (prominent)
- "Track Package" button
- Estimated delivery date range
- Carrier (USPS)
- Shipping address
- Button to view order
- Logo and branding

---

### 3️⃣ Delivery Confirmation Email
**When**: USPS scans it on delivery (EasyPost "delivered" webhook)
**From**: `/api/webhooks/easypost/route.ts`
**Content**:
- "Your Order Arrived! ✅"
- Tracking number
- Delivery confirmation
- Last location (city, state)
- Activation instructions ("Scan QR code to register your pet")
- Button to view order
- Logo and branding

---

## Merchant (You) Email Flow

### Fulfillment Notification
**When**: Order is placed and label is created (same time as order confirmation)
**From**: `/api/orders/create-and-ship/route.ts`
**Subject**: `[FULFILLMENT] Order #NAS-XXXXXX-XXXXX - Customer Name`
**Content**:
- Order number
- Confirmation code
- Customer name + email
- **Items grouped by color/size for easy packing**:
  - 2x Forest Green - Medium
  - 1x Ocean Blue - Large
- Shipping address
- Order total
- Next steps (print label, pack, ship)
- Dashboard link
- Logo and branding

---

## Email Timeline Example

```
t=0s:  Customer completes Stripe payment
       └─ Stripe webhook fires
          ├─ Save order to Firestore
          └─ Send CUSTOMER: Order Confirmation Email
          └─ Create shipment in EasyPost
          └─ Buy label
          └─ Save tracking to Firestore
          └─ Send MERCHANT: Fulfillment Notification Email

t=2-3min: You print label and drop off at USPS

t=6-24h: USPS scans it at their facility
         └─ EasyPost webhook: "in_transit"
            └─ Send CUSTOMER: "Your Order is on the Way!" Email

t=1-7 days: USPS delivers it
            └─ EasyPost webhook: "delivered"
               └─ Send CUSTOMER: "Order Arrived!" Email
```

---

## What Changed

### Email Templates Updated (`/lib/emailTemplates.ts`)
- ✅ Order Confirmation: Simplified, added logo, added dashboard link
- ✅ Shipping Email: Now only sent when "in_transit" webhook fires
- ✅ Tracking Update Email: Now only sends on "delivered" status
- ✅ Merchant Email: Added grouped items by color/size, cleaner layout

### Webhooks Updated
- ✅ `/api/webhooks/easypost/route.ts`: Sends shipping email on "in_transit", delivers email on "delivered"
- ✅ `/api/orders/create-and-ship/route.ts`: Removed shipping email (now sent via webhook)
- ✅ `/api/webhook/route.ts` (Stripe): Sends order confirmation immediately

### Email Sending
- ✅ Migrated from SendGrid to AWS SES
- ✅ Updated `/lib/sendEmail.ts` to use AWS SES
- ✅ Fixed `/app/api/newsletter/subscribe/route.ts` to use correct property name

---

## Testing the Emails

### View email templates:
```bash
curl "http://localhost:3000/api/test/emails?type=confirmation"
curl "http://localhost:3000/api/test/emails?type=shipping"
curl "http://localhost:3000/api/test/emails?type=delivered"
curl "http://localhost:3000/api/test/emails?type=merchant"
```

### Send a test email:
```bash
curl -X POST http://localhost:3000/api/test/send-email \
  -H "Content-Type: application/json" \
  -d '{"to":"your-email@example.com","subject":"Test","html":"<h1>Test</h1>","text":"Test"}'
```

### Do a full checkout test:
1. Add item to cart
2. Go to checkout
3. Enter ZIP code (see shipping rate)
4. Complete payment with test Stripe card
5. Check inbox:
   - ✅ Order confirmation (immediate)
   - ✅ Merchant fulfillment notification (immediate)
6. Simulate USPS scan (manual webhook or EasyPost test tool)
   - ✅ Shipping email should arrive
7. Simulate delivery (manual webhook or EasyPost test tool)
   - ✅ Delivery email should arrive

---

## Notes

- All emails include logo (references `https://notastray.com/logo-darkmode.jpg`)
- All emails link to `https://notastray.com` dashboard/site
- Logo image URL may need to be updated based on your actual domain
- Grouped items in merchant email format: "2x Color - Size"
- Emails gracefully handle missing customer names (defaults to "there")

