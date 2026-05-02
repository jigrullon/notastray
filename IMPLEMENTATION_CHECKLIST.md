# Shipping Automation Implementation Checklist

## ✅ Phase 1: Foundation (COMPLETED)

- [x] Created `/lib/easypost.ts` — EasyPost client wrapper
  - `getRates()` — Get USPS Ground rates for a ZIP code
  - `createShipment()` — Create shipment and buy label
  - `verifyWebhookSignature()` — Validate webhook origin
  - `getTrackerByCode()` — Retrieve tracking status

- [x] Created `/lib/sendEmail.ts` — Email utility for SendGrid

- [x] Created `/lib/emailTemplates.ts` — Reusable email templates
  - Order confirmation email
  - Shipping notification email  
  - Tracking update email
  - Merchant order notification email

## ✅ Phase 2: Shipping Rates (COMPLETED)

- [x] Created `/api/shipping/rates/route.ts`
  - Validates ZIP code format
  - Queries EasyPost for USPS Ground rates only
  - Returns formatted rates to checkout

- [x] Checkout page already calls this endpoint
  - No changes needed to `app/shop/checkout/page.tsx`

## ✅ Phase 3: Label Creation (COMPLETED)

- [x] Created `/api/orders/create-and-ship/route.ts`
  - Creates shipment in EasyPost
  - Buys USPS Ground label
  - Saves tracking number to Firestore
  - Sends customer shipping notification email
  - Sends merchant order notification email

- [x] Modified `/api/webhook/route.ts` (Stripe webhook)
  - Sends order confirmation email after payment
  - Calls create-and-ship endpoint
  - Logs success/failure

## ✅ Phase 4: Webhooks & Tracking (COMPLETED)

- [x] Created `/api/webhooks/easypost/route.ts`
  - Validates EasyPost webhook signature
  - Handles `tracker.updated` events
  - Updates order status in Firestore
  - Sends customer tracking update emails on key events (in_transit, out_for_delivery, delivered)

## ⏳ Phase 5: Environment Setup (PENDING - USER ACTION)

- [ ] Create EasyPost account (https://www.easypost.com)
- [ ] Get test API key from EasyPost
- [ ] Configure `.dev.vars` with:
  - `EASYPOST_API_KEY`
  - `FROM_STREET`, `FROM_CITY`, `FROM_STATE`, `FROM_ZIP`
  - `MERCHANT_EMAIL`
  - Optionally: `EASYPOST_WEBHOOK_SECRET`

- [ ] Run `npm install @easypost/api`

## ⏳ Phase 6: Testing (PENDING - USER ACTION)

- [ ] Test 1: Verify shipping rate calculation
  ```bash
  curl -X POST http://localhost:3000/api/shipping/rates \
    -H "Content-Type: application/json" \
    -d '{"destinationZip":"10001"}'
  ```

- [ ] Test 2: Full checkout flow
  - Add item to cart
  - Enter ZIP code → see rate
  - Complete payment → get tracking number

- [ ] Test 3: Email delivery
  - Verify order confirmation email received
  - Verify shipping notification email with tracking

- [ ] Test 4: Webhook simulation (optional)
  - Use EasyPost webhook test tool
  - Verify order status updates in Firestore

---

## Summary of Changes

### New Files Created (7 total)
1. `/lib/easypost.ts` — EasyPost client & utilities
2. `/lib/sendEmail.ts` — Email sending wrapper
3. `/lib/emailTemplates.ts` — Email template generators
4. `/app/api/shipping/rates/route.ts` — Shipping rate calculation
5. `/app/api/orders/create-and-ship/route.ts` — Label creation
6. `/app/api/webhooks/easypost/route.ts` — Shipment status updates
7. `EASYPOST_SETUP.md` — Setup & testing guide

### Existing Files Modified (1 total)
1. `/app/api/webhook/route.ts` — Added email & shipment triggers

### No Files Deleted or Broken
- Existing Stripe integration unchanged
- Checkout flow enhanced, not replaced
- All new code is additive and non-breaking

---

## Architecture Overview

```
Customer Checkout
  ↓
Enter ZIP → /api/shipping/rates
  ↓
See USPS Ground price + checkout
  ↓
Pay via Stripe
  ↓
Stripe Webhook (checkout.session.completed)
  ├→ Save order to Firestore
  ├→ Send order confirmation email
  └→ Call /api/orders/create-and-ship
      ├→ Create shipment in EasyPost
      ├→ Buy label
      ├→ Save tracking to Firestore
      ├→ Send shipping email with tracking
      └→ Send merchant notification

EasyPost Webhook Events
  ↓
/api/webhooks/easypost
  ├→ Update order status in Firestore
  └→ Send tracking update emails (in_transit, delivered, etc.)
```

---

## What Comes Next

1. **Sign up for EasyPost** — takes 5 minutes
2. **Configure environment variables** — 10 minutes
3. **Install npm dependency** — 1 minute
4. **Test shipping rates** — see if rates appear
5. **Do full checkout test** — complete a payment and verify all emails
6. **Optional: Deploy to staging** — test with real USPS carrier

Once all tests pass, you can go live with:
- Real EasyPost API key (production)
- Real USPS carrier account linked
- Webhook URL configured

---

## Support References

- **Plan Details**: `specs/shipping-label-automation.md`
- **Setup Guide**: `EASYPOST_SETUP.md`
- **EasyPost Docs**: https://www.easypost.com/docs
- **Stripe Integration**: Already working!
- **SendGrid Docs**: https://docs.sendgrid.com

