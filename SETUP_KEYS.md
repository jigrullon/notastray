# API Key Setup Guide

To run the application with Stripe and Firebase integration, you need to configure the following API keys.

## 1. Stripe Setup

1.  **Create a Stripe Account**: Go to [stripe.com](https://stripe.com) and sign up/login.
2.  **Get API Keys**:
    *   Navigate to **Developers > API keys**.
    *   Copy the **Publishable key** (`pk_test_...`) and paste it into `.env.local` as `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`.
    *   Copy the **Secret key** (`sk_test_...`) and paste it into `.dev.vars` as `STRIPE_SECRET_KEY`.
3.  **Get Webhook Secret** (for local development):
    *   You will need to use the Stripe CLI to listen for webhooks locally.
    *   Run `stripe listen --forward-to localhost:3000/api/webhook`.
    *   It will output a **Webhook Signing Secret** (`whsec_...`). Paste this into `.dev.vars` as `STRIPE_WEBHOOK_SECRET`.

## 2. Firebase Setup

1.  **Create a Firebase Project**: Go to [console.firebase.google.com](https://console.firebase.google.com) and create a project.
2.  **Add a Web App**:
    *   In Project Overview, click the Web icon (</>) to add an app.
    *   Copy the config values (apiKey, authDomain, etc.) and map them to the corresponding variables in `.env.local`.
3.  **Generate Private Key (for Backend Admin SDK)**:
    *   Go to **Project Settings > Service accounts**.
    *   Click **Generate new private key**.
    *   Open the downloaded JSON file.
    *   Copy `project_id`, `client_email`, and `private_key` into `.dev.vars`.

## 3. Product Setup (Stripe)

1.  **Create Subscription Product**:
    *   Go to **Products > Add Product**.
    *   Name: "NotAStray Plus" (or similar).
    *   Price: $5.00 Recurring / Monthly.
    *   Copy the **Price ID** (e.g., `price_1Pxyz...`) if you plan to hardcode it or fetch it dynamically.

## 4. Google reCAPTCHA Setup (tag lookup bot protection)

The `/lookup` page uses **reCAPTCHA v2 Checkbox** to slow down bots enumerating tag codes. Without keys, it runs in "dev mode" and skips the CAPTCHA entirely.

1.  **Create a site**: Go to [google.com/recaptcha/admin/create](https://www.google.com/recaptcha/admin/create).
    *   **Type**: reCAPTCHA v2 → **"I'm not a robot" Checkbox** (must be v2 Checkbox — v3/Enterprise use a different API).
    *   **Domains**: add your production domain (`notastray.com`, and `www.notastray.com` if used) and `localhost` for local testing.
2.  **Get the keys**:
    *   Copy the **Site key** into `.env.local` as `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` (public, inlined at build time).
    *   Copy the **Secret key** into `.dev.vars` as `RECAPTCHA_SECRET_KEY` (secret, read at runtime by `/api/verify-captcha`). Never prefix it with `NEXT_PUBLIC_`.
3.  **Deploy (Cloudflare Pages)**:
    *   `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` is inlined by Next.js **at build time**. Because `npm run deploy` builds locally before `wrangler pages deploy`, it must be present in the local build env (`.env.local`). Also add it in Cloudflare Pages → Settings → Environment variables for safety.
    *   `RECAPTCHA_SECRET_KEY` is a **runtime** value: add it as an encrypted (Secret) environment variable in Cloudflare Pages, and to `.dev.vars` for local `wrangler` preview.

## 5. Custom Email Verification

NotAStray sends its own branded verification emails (from `support@notastray.com` via AWS SES) instead of Firebase's default email. Tokens are HMAC-signed and expire in 24 hours.

> **HARD PREREQUISITE:** `support@notastray.com` (or the whole `notastray.com` domain) **must be a verified SES sending identity with DKIM enabled**, or every verification send will fail. Verify the identity in the AWS SES console (Verified identities → Create identity), publish the DKIM CNAME records, and confirm the SPF/DKIM status is "Successful" before relying on this flow.

1.  **Environment variables** (both live in `.env.local` for local dev, and must be added in **Vercel → Settings → Environment Variables** for deploys):
    *   `EMAIL_VERIFICATION_SECRET` — secret used to sign/verify tokens. Generate with `openssl rand -base64 32`. **Server-only**: never prefix with `NEXT_PUBLIC_`, never commit the real value.
    *   `NEXT_PUBLIC_APP_URL` — base URL used to build the verification link (e.g. `https://notastray.com`). **Build-time inlined** by Next.js, so it must be set in Vercel **before** the build runs (same handling as `NEXT_PUBLIC_RECAPTCHA_SITE_KEY`).
2.  **Flow**: signup / resend → `POST /api/auth/send-verification-email` (generates a signed token, sends it via SES) → user clicks `/verify-email?token=…` → `POST /api/auth/verify-email` validates the token and flips `emailVerified` server-side via the Firebase Admin SDK.

## 6. Environment Files

*   **`.env.local`**: Contains public keys safe for the browser (e.g. `NEXT_PUBLIC_RECAPTCHA_SITE_KEY`).
*   **`.dev.vars`**: Contains secret keys for Cloudflare Pages Functions (backend), e.g. `RECAPTCHA_SECRET_KEY`. NEVER commit this file or expose these keys on the client.
