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

## 4. Environment Files

*   **`.env.local`**: Contains public keys safe for the browser.
*   **`.dev.vars`**: Contains secret keys for Cloudflare Pages Functions (backend). NEVER commit this file or expose these keys on the client.
