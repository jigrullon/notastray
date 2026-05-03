# EasyPost Setup Guide

This guide walks through setting up EasyPost for shipping rate calculation and automatic label generation.

## Step 1: Create EasyPost Account

1. Go to https://www.easypost.com/
2. Click "Sign Up"
3. Fill in your business details (your home address where you ship from)
4. Verify your email
5. Go to **Settings → API Keys**
6. Copy your **Test API Key** (starts with `sk_test_`)

> Note: EasyPost has a free tier for testing. No payment card required until you go live.

## Step 2: Get Your Carrier Account ID (Optional but Recommended)

After signup, you can link a USPS carrier account to EasyPost for better integration:

1. In EasyPost Dashboard, go to **Integrations → Carriers**
2. Click **Link USPS Account**
3. You'll need your USPS account credentials (or sign up for USPS Managed Postage)
4. Note the **Carrier Account ID** (looks like `ca_xxx...`)

> If you skip this, EasyPost will use USPS Postage Rates but you may need to manually link later.

## Step 3: Configure Environment Variables

### For Development (.dev.vars - Cloudflare)

Add to `.dev.vars`:

```env
EASYPOST_API_KEY=sk_test_xxx...
EASYPOST_WEBHOOK_SECRET=whsec_test_xxx...
MERCHANT_EMAIL=your-email@example.com
FROM_STREET=123 Main St
FROM_STREET2=Apt 4
FROM_CITY=New York
FROM_STATE=NY
FROM_ZIP=10001
```

> **Important**: `.dev.vars` is in `.gitignore` and never committed. This is where secrets go.

### For Production (After Testing)

When ready to go live, repeat the above with production keys:
- Get production API key from EasyPost: Settings → API Keys (toggle to Production)
- Request production webhook secret from EasyPost support

Add to `.dev.vars`:

```env
EASYPOST_API_KEY=sk_live_xxx...
EASYPOST_WEBHOOK_SECRET=whsec_live_xxx...
```

## Step 4: Set Up Webhook (After Testing)

EasyPost needs to know where to send tracking updates. After you deploy:

1. Go to **EasyPost Dashboard → Integrations → Webhooks**
2. Click **Add Webhook**
3. Enter your webhook URL:
   ```
   https://yourdomain.com/api/webhooks/easypost
   ```
4. Copy the **Webhook Secret** generated
5. Add to your `.dev.vars`:
   ```env
   EASYPOST_WEBHOOK_SECRET=whsec_xxx...
   ```

> We'll test webhooks locally first, then set this up for production.

## Step 5: Install Dependencies

```bash
npm install @easypost/api
```

That's it! The code is already in place. Now let's test.

---

## Testing Locally

### Test 1: Verify EasyPost Connection

Run this in your dev server logs. You should see a test request succeed:

```bash
npm run dev
# Then in another terminal:
curl -X POST http://localhost:3000/api/shipping/rates \
  -H "Content-Type: application/json" \
  -d '{"destinationZip":"10001"}'

# Expected response:
# {"rates":[{"service":"usps_ground","cost":5.99,"minDays":5,"maxDays":7,...}]}
```

### Test 2: Full Checkout Flow

1. Start dev server: `npm run dev`
2. Go to http://localhost:3000/shop
3. Add a tag to cart
4. Go to Checkout
5. Enter ZIP code → should see shipping rate
6. Complete payment with Stripe test card: `4242 4242 4242 4242`, any future date, any CVC
7. Check:
   - ✅ Stripe payment succeeds
   - ✅ Order appears in Firestore
   - ✅ Tracking number saved to order
   - ✅ Customer email received (check spam folder)

### Test 3: Webhook Simulation

You can simulate EasyPost webhooks locally without deploying:

1. Use EasyPost **Test Event Tool** in Dashboard
2. Send fake `tracker.updated` event to your local endpoint (requires ngrok):
   ```bash
   # Terminal 1: Start ngrok tunnel
   ngrok http 3000
   
   # Terminal 2: In EasyPost Dashboard, Webhooks section
   # Send test event to: https://your-ngrok-url.ngrok.io/api/webhooks/easypost
   ```
3. Check Firestore: order status should update
4. Check customer email: should receive tracking update

### Test 4: Verify Label Generation

After a successful checkout:

1. Check Firestore order document
2. Find `label_url` field
3. Open it in browser — should be a PDF you can download
4. Print it (or print to PDF)
5. Test barcode with USPS tracking tool

---

## Troubleshooting

### "Invalid ZIP code" Error
- Make sure you entered exactly 5 digits (e.g., `10001`)
- Some ZIP codes may not have USPS Ground service

### "Failed to calculate shipping rates"
- Check `.dev.vars` has `EASYPOST_API_KEY` set
- Verify API key is valid (copy directly from EasyPost Dashboard)
- Check network tab in browser for actual error response

### Email Not Sending
- Verify `SENDGRID_API_KEY` is set in `.dev.vars`
- Check `FROM_EMAIL` is configured (defaults to `noreply@notastray.com`)
- Check Stripe test email is correct (or use your real email in checkout)

### Webhook Not Firing
- Webhooks only fire on real events, not in test mode
- Use EasyPost's webhook test tool to simulate events first
- Once deployed, test with real order

### "FROM_ADDRESS not fully configured" Error
- Check `.dev.vars` has all `FROM_` variables:
  - `FROM_STREET`
  - `FROM_CITY`
  - `FROM_STATE`
  - `FROM_ZIP`

---

## Cost Breakdown

**Per Label**:
- EasyPost fee: ~$0.05 per label
- USPS postage: ~$4-8 depending on weight/distance
- Total: ~$4-8 per order

**Per Month** (example: 100 orders):
- EasyPost: $5
- USPS postage: $400-800
- Stripe fees: ~$30 (2.9% + $0.30 per transaction)
- SendGrid: Free tier supports 100 emails/day

---

## Next Steps

1. **Sign up for EasyPost** and get test API key
2. **Configure `.dev.vars`** with EasyPost credentials
3. **Run tests** (see above) to verify connection
4. **Go through full checkout flow** to test label generation
5. **Set up webhook** when ready for production

---

## Support

- **EasyPost Docs**: https://www.easypost.com/docs
- **Troubleshooting**: https://www.easypost.com/support
- **Our Plan**: See `specs/shipping-label-automation.md` for detailed architecture

