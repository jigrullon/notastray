// Escapes HTML metacharacters before interpolating user-controlled strings
// into an email's HTML body (never apply this to the plain-text body).
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export interface OrderConfirmationEmailData {
  orderId: string;
  confirmationCode: string;
  orderConfirmationUrl?: string;
  customerName?: string;
  items: Array<{
    name: string;
    color: string;
    size: string;
    quantity: number;
    price: number;
  }>;
  subtotal: number;
  shippingCost: number;
  total: number;
  estimatedDeliveryMin: string;
  estimatedDeliveryMax: string;
  shippingAddress: {
    name: string;
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postalCode: string;
  };
}

export interface LostPetNotificationEmailData {
  petName: string
  species: string
  breed?: string
  ownerName?: string
  ownerPhone?: string
  ownerEmail?: string
  lostLocation: string
  lostDate: string
  tagCode: string
  reportUrl: string
}

export interface MerchantOrderEmailData {
  orderId: string;
  confirmationCode: string;
  customerEmail: string;
  customerName: string;
  items: Array<{
    name: string;
    color: string;
    size: string;
    quantity: number;
  }>;
  subtotal: number;
  shippingCost: number;
  tax: number;
  total: number;
  shippingAddress: {
    name: string;
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postalCode: string;
  };
}

export function getOrderConfirmationEmail(data: OrderConfirmationEmailData) {
  const itemsList = data.items
    .map(
      (item) =>
        `
        <tr>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">
            <strong>${escapeHtml(item.name)}</strong><br>
            <span style="color: #666; font-size: 14px;">${escapeHtml(item.color)} / ${escapeHtml(item.size)}</span><br>
            <span style="color: #666; font-size: 14px;">Qty: ${item.quantity}</span>
          </td>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">
            $${(item.price * item.quantity).toFixed(2)}
          </td>
        </tr>
      `
    )
    .join('');

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
      </head>
      <body style="font-family: Arial, sans-serif; color: #333; line-height: 1.6; margin: 0; padding: 0;">
        <div style="max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">

          <!-- Header with Logo -->
          <div style="background-color: #047857; color: white; padding: 24px; text-align: center;">
            <img src="https://the-well-images.s3.us-east-1.amazonaws.com/logo-darkmode.jpeg" alt="NotAStray" style="height: 40px; margin-bottom: 12px;">
            <p style="margin: 8px 0 0 0; font-size: 16px;">Order Confirmation</p>
          </div>

          <!-- Content -->
          <div style="padding: 32px;">
            <p style="font-size: 16px;">Hi ${escapeHtml(data.customerName || 'there')},</p>

            <p style="font-size: 16px;">Thank you for your order! We've received it and it's being prepared for shipment.</p>

            <h2 style="color: #047857; font-size: 18px; margin: 24px 0 12px 0;">Order #${escapeHtml(data.orderId)}</h2>

            <table style="width: 100%; border-collapse: collapse;">
              <thead>
                <tr style="background-color: #f3f4f6;">
                  <th style="padding: 12px; text-align: left; border-bottom: 2px solid #d1d5db;">Item</th>
                  <th style="padding: 12px; text-align: right; border-bottom: 2px solid #d1d5db;">Price</th>
                </tr>
              </thead>
              <tbody>
                ${itemsList}
              </tbody>
            </table>

            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top: 16px; border-top: 1px solid #e5e7eb; padding-top: 16px;">
              <tr>
                <td style="padding: 4px 0; font-size: 15px;">Subtotal:</td>
                <td style="padding: 4px 0; font-size: 15px; text-align: right;">$${data.subtotal.toFixed(2)}</td>
              </tr>
              <tr>
                <td style="padding: 4px 0 12px 0; font-size: 15px;">Shipping:</td>
                <td style="padding: 4px 0 12px 0; font-size: 15px; text-align: right;">$${data.shippingCost.toFixed(2)}</td>
              </tr>
              <tr>
                <td style="padding: 12px 0 0 0; font-size: 16px; font-weight: bold; border-top: 2px solid #e5e7eb;">Total:</td>
                <td style="padding: 12px 0 0 0; font-size: 16px; font-weight: bold; text-align: right; border-top: 2px solid #e5e7eb;">$${data.total.toFixed(2)}</td>
              </tr>
            </table>

            <h3 style="color: #047857; font-size: 16px; margin-top: 24px; margin-bottom: 8px;">Expected Delivery</h3>
            <p style="margin: 0; font-size: 15px; color: #666;">
              ${escapeHtml(data.estimatedDeliveryMin)} — ${escapeHtml(data.estimatedDeliveryMax)}
            </p>

            <h3 style="color: #047857; font-size: 16px; margin-top: 24px; margin-bottom: 8px;">Shipping To</h3>
            <p style="margin: 0; font-size: 15px; color: #666;">
              ${escapeHtml(data.shippingAddress.name)}<br>
              ${escapeHtml(data.shippingAddress.line1)}${data.shippingAddress.line2 ? '<br>' + escapeHtml(data.shippingAddress.line2) : ''}<br>
              ${escapeHtml(data.shippingAddress.city)}, ${escapeHtml(data.shippingAddress.state)} ${escapeHtml(data.shippingAddress.postalCode)}
            </p>

            ${data.orderConfirmationUrl ? `
            <div style="text-align: center; margin-top: 32px;">
              <a href="${escapeHtml(data.orderConfirmationUrl)}" style="background-color: #047857; color: white; padding: 12px 32px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">View Your Order</a>
            </div>
            ` : ''}

            <p style="color: #999; font-size: 13px; margin-top: 32px; text-align: center;">
              Confirmation Code: ${escapeHtml(data.confirmationCode)}
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
  `;

  const text = `
NotAStray Order Confirmation

Hi ${data.customerName || 'there'},

Thank you for your purchase! We've received your order and it's being prepared for shipment.

ORDER DETAILS
${data.items.map((item) => `${item.name} (${item.color}/${item.size}) x${item.quantity} - $${(item.price * item.quantity).toFixed(2)}`).join('\n')}

Subtotal: $${data.subtotal.toFixed(2)}
Shipping: $${data.shippingCost.toFixed(2)}
Total: $${data.total.toFixed(2)}

SHIPPING ADDRESS
${data.shippingAddress.name}
${data.shippingAddress.line1}${data.shippingAddress.line2 ? '\n' + data.shippingAddress.line2 : ''}
${data.shippingAddress.city}, ${data.shippingAddress.state} ${data.shippingAddress.postalCode}

WHAT'S NEXT?
You'll receive a shipping notification email with tracking details shortly.
Estimated delivery: ${data.estimatedDeliveryMin} - ${data.estimatedDeliveryMax}

Order #: ${data.orderId}
Confirmation Code: ${data.confirmationCode}
${data.orderConfirmationUrl ? `\nView your order: ${data.orderConfirmationUrl}\n` : ''}
Questions? Reply to this email or visit our website for support.

NotAStray Smart Pet Tags
Keeping pets safe, one tag at a time.
  `;

  return {
    subject: `Order Confirmation #${data.orderId}`,
    html,
    text,
  };
}

export interface ActivationReminderEmailData {
  customerName?: string;
  activationUrl: string;
  petTagsCount: number;
  orderId: string;
}

export interface RenewalReminderEmailData {
  customerName?: string;
  renewalDate: string;
  planType: 'monthly' | 'annual';
  planPrice: number;
  manageSubscriptionUrl: string;
  cancelUrl: string;
  userEmail?: string;
}

export interface ActivationConfirmationEmailData {
  customerName?: string;
  petName: string;
  tagCode: string;
  petSpecies?: string;
  petPhotoUrl?: string;
  dashboardUrl: string;
  userEmail?: string;
}

export function getActivationReminderEmail(data: ActivationReminderEmailData) {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
      </head>
      <body style="font-family: Arial, sans-serif; color: #333; line-height: 1.6; margin: 0; padding: 0;">
        <div style="max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">

          <!-- Header with Logo -->
          <div style="background-color: #047857; color: white; padding: 24px; text-align: center;">
            <img src="https://the-well-images.s3.us-east-1.amazonaws.com/logo-darkmode.jpeg" alt="NotAStray" style="height: 40px; margin-bottom: 12px;">
            <p style="margin: 8px 0 0 0; font-size: 18px;">Your Tags Have Arrived! 🎉</p>
          </div>

          <!-- Content -->
          <div style="padding: 32px;">
            <p style="font-size: 16px;">Hi ${escapeHtml(data.customerName || 'there')},</p>

            <p style="font-size: 16px;">Great news! Your NotAStray pet tag${data.petTagsCount > 1 ? 's have' : ' has'} arrived and are ready to protect your furry friend. Now comes the important part—let's activate it!</p>

            <h3 style="color: #047857; font-size: 16px; margin: 24px 0 12px 0;">How to Activate Your Tag</h3>
            <ol style="margin: 0 0 24px 0; padding-left: 20px; color: #666; line-height: 1.8;">
              <li style="margin-bottom: 8px;">Scan the QR code on your tag with your phone camera</li>
              <li style="margin-bottom: 8px;">Fill in your pet's information and photo</li>
              <li style="margin-bottom: 8px;">Add your contact details (someone will scan if your pet is found)</li>
              <li>Choose your notification plan to enable alerts</li>
            </ol>

            <div style="text-align: center; margin: 32px 0;">
              <a href="${escapeHtml(data.activationUrl)}" style="background-color: #047857; color: white; padding: 14px 40px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; font-size: 16px;">Activate Your Tag Now</a>
            </div>

            <div style="background-color: #fef3c7; border: 1px solid #fcd34d; padding: 16px; margin: 24px 0; border-radius: 4px;">
              <p style="margin: 0; font-size: 14px; color: #92400e;">
                <strong>💡 Tip:</strong> Your tag is already registered under your email. When someone scans it, they'll see your pet's profile with your contact information—no app needed!
              </p>
            </div>

            <p style="color: #666; font-size: 14px; margin: 24px 0;">
              Not ready yet? Your tag won't expire, so you can activate anytime. But the sooner you activate, the sooner your pet is protected! 🐾
            </p>

            <p style="margin-top: 32px; color: #999; font-size: 13px;">
              Order #: ${escapeHtml(data.orderId)}
            </p>

            <div style="text-align: center; margin-top: 32px;">
              <a href="https://notastray.com/resources/setup" style="color: #047857; text-decoration: none; font-weight: bold;">Need help? View our activation guide →</a>
            </div>
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
  `;

  const text = `
Your Tags Have Arrived! 🎉

Hi ${data.customerName || 'there'},

Great news! Your NotAStray pet tag${data.petTagsCount > 1 ? 's have' : ' has'} arrived. Now comes the important part—let's activate it!

YOUR TAG${data.petTagsCount > 1 ? 'S ARE' : ' IS'} READY
Once activated, your pet is protected with instant SMS & email alerts if they're ever lost.

HOW TO ACTIVATE YOUR TAG
1. Scan the QR code on your tag with your phone camera
2. Fill in your pet's information and photo
3. Add your contact details
4. Choose your notification plan to enable alerts

👉 Activate Your Tag: ${data.activationUrl}

💡 HELPFUL TIP
Your tag is already registered under your email. When someone scans it, they'll see your pet's profile with your contact information—no app needed!

You can activate anytime—your tag won't expire. But the sooner you activate, the sooner your pet is protected! 🐾

Questions? View our activation guide: https://notastray.com/resources

Order #: ${data.orderId}

NotAStray Smart Pet Tags
Keeping pets safe, one tag at a time.
  `;

  return {
    subject: `Your NotAStray Tag${data.petTagsCount > 1 ? 's' : ''} Have Arrived - Activate Now`,
    html,
    text,
  };
}

export function getActivationConfirmationEmail(data: ActivationConfirmationEmailData) {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
      </head>
      <body style="font-family: Arial, sans-serif; color: #333; line-height: 1.6; margin: 0; padding: 0;">
        <div style="max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">

          <!-- Header with Logo -->
          <div style="background-color: #047857; color: white; padding: 24px; text-align: center;">
            <img src="https://the-well-images.s3.us-east-1.amazonaws.com/logo-darkmode.jpeg" alt="NotAStray" style="height: 40px; margin-bottom: 12px;">
            <p style="margin: 8px 0 0 0; font-size: 18px;">Tag Activated! ✅</p>
          </div>

          <!-- Content -->
          <div style="padding: 32px;">
            <p style="font-size: 16px;">Hi ${escapeHtml(data.customerName || 'there')},</p>

            <p style="font-size: 16px;">Great news! Your NotAStray pet tag has been successfully activated and registered for <strong>${escapeHtml(data.petName)}</strong>.</p>

            <div style="background-color: #f0fdf4; border-left: 4px solid #047857; padding: 20px; margin: 24px 0; border-radius: 4px;">
              <p style="margin: 0 0 12px 0; font-size: 14px; color: #666;"><strong>TAG DETAILS</strong></p>
              <div style="margin: 0;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 15px;">
                  <span>Pet Name:</span>
                  <strong style="color: #047857;">${escapeHtml(data.petName)}</strong>
                </div>
                ${data.petSpecies ? `
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 15px;">
                  <span>Species:</span>
                  <strong style="color: #047857;">${escapeHtml(data.petSpecies)}</strong>
                </div>
                ` : ''}
                <div style="display: flex; justify-content: space-between; font-size: 15px;">
                  <span>Tag Code:</span>
                  <strong style="color: #047857; font-family: monospace;">${escapeHtml(data.tagCode)}</strong>
                </div>
              </div>
            </div>

            <h3 style="color: #047857; font-size: 16px; margin: 24px 0 12px 0;">Your Pet is Now Protected</h3>
            <p style="margin: 0 0 12px 0; color: #666; font-size: 15px;">
              Anyone who finds your pet and scans the QR code on the tag will be directed to ${escapeHtml(data.petName)}'s profile page with your contact information. You'll receive instant SMS and email alerts if someone scans the tag.
            </p>

            <p style="margin: 0; color: #666; font-size: 15px;">
              Your pet's profile is now live and ready to bring them home if they ever get lost. 🐾
            </p>

            <div style="text-align: center; margin: 32px 0;">
              <a href="${escapeHtml(data.dashboardUrl)}" style="background-color: #047857; color: white; padding: 12px 32px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">View Your Pet's Profile</a>
            </div>

            <div style="background-color: #fef3c7; border: 1px solid #fcd34d; padding: 16px; margin: 24px 0; border-radius: 4px;">
              <p style="margin: 0; font-size: 14px; color: #92400e;">
                <strong>💡 Keep your info updated:</strong> If your phone number, email, or address changes, you can update it anytime in your dashboard. Changes take effect immediately.
              </p>
            </div>

            <div style="background-color: #f0f9ff; border: 1px solid #cffafe; padding: 16px; margin: 24px 0; border-radius: 4px; font-size: 12px;">
              <p style="margin: 0 0 8px 0; color: #0369a1; font-weight: bold;">📱 SMS Notifications (if enabled)</p>
              <p style="margin: 0; color: #0c4a6e; line-height: 1.5;">
                By opting in to SMS notifications, you agree to receive alerts when your pet's tag is scanned.
                <strong>Message frequency:</strong> Variable depending on scan activity (estimated 1-10 per month).
                <strong>Message and data rates may apply.</strong> Reply STOP to unsubscribe anytime.
              </p>
            </div>

            <p style="color: #999; font-size: 13px; margin: 24px 0 0 0;">
              Questions? Visit our help center or reply to this email for support.
            </p>
          </div>

          <!-- Footer -->
          <div style="background-color: #f9fafb; padding: 24px; text-align: center; font-size: 12px; color: #666; border-top: 1px solid #e5e7eb;">
            <p style="margin: 0 0 12px 0;">
              <a href="https://notastray.com" style="color: #047857; text-decoration: none; font-weight: bold;">NotAStray.com</a>
            </p>
            ${data.userEmail ? `
            <p style="margin: 0 0 8px 0; font-size: 11px; color: #999;">
              <a href="https://notastray.com/api/unsubscribe/email?email=${encodeURIComponent(data.userEmail)}" style="color: #999; text-decoration: none;">Unsubscribe from emails</a>
            </p>
            ` : ''}
            <p style="margin: 0; font-size: 11px; color: #999;">
              Keeping pets safe, one tag at a time.
            </p>
          </div>
        </div>
      </body>
    </html>
  `;

  const text = `
Tag Activated! ✅

Hi ${data.customerName || 'there'},

Great news! Your NotAStray pet tag has been successfully activated and registered for ${data.petName}.

TAG DETAILS
Pet Name: ${data.petName}
${data.petSpecies ? `Species: ${data.petSpecies}` : ''}
Tag Code: ${data.tagCode}

YOUR PET IS NOW PROTECTED
Anyone who finds your pet and scans the QR code on the tag will be directed to ${data.petName}'s profile with your contact information. You'll receive instant SMS and email alerts if someone scans the tag.

Your pet's profile is now live and ready to bring them home if they ever get lost. 🐾

View Your Pet's Profile: ${data.dashboardUrl}

💡 KEEP YOUR INFO UPDATED
If your phone number, email, or address changes, you can update it anytime in your dashboard. Changes take effect immediately.

📱 SMS NOTIFICATIONS (if enabled)
By opting in to SMS notifications, you agree to receive alerts when your pet's tag is scanned.
Message frequency: Variable depending on scan activity (estimated 1-10 per month).
Message and data rates may apply. Reply STOP to unsubscribe anytime.

Questions? Visit our help center or reply to this email for support.

---
NotAStray.com
Keeping pets safe, one tag at a time.

${data.userEmail ? `Unsubscribe from emails: https://notastray.com/api/unsubscribe/email?email=${encodeURIComponent(data.userEmail)}` : ''}
  `;

  return {
    subject: `${data.petName}'s Tag is Now Active!`,
    html,
    text,
  };
}

export function getRenewalReminderEmail(data: RenewalReminderEmailData) {
  const planLabel = data.planType === 'monthly' ? 'Monthly' : 'Annual';
  const planPrice = data.planType === 'monthly' ? '$3' : '$30';
  const billingPeriod = data.planType === 'monthly' ? '/month' : '/year';

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
      </head>
      <body style="font-family: Arial, sans-serif; color: #333; line-height: 1.6; margin: 0; padding: 0;">
        <div style="max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">

          <!-- Header with Logo -->
          <div style="background-color: #047857; color: white; padding: 24px; text-align: center;">
            <img src="https://the-well-images.s3.us-east-1.amazonaws.com/logo-darkmode.jpeg" alt="NotAStray" style="height: 40px; margin-bottom: 12px;">
            <p style="margin: 8px 0 0 0; font-size: 18px;">Subscription Renewal Reminder</p>
          </div>

          <!-- Content -->
          <div style="padding: 32px;">
            <p style="font-size: 16px;">Hi ${escapeHtml(data.customerName || 'there')},</p>

            <p style="font-size: 16px;">We wanted to give you a heads up—your NotAStray subscription renews in 3 days.</p>

            <div style="background-color: #f3f4f6; border: 1px solid #d1d5db; padding: 20px; margin: 24px 0; border-radius: 6px;">
              <p style="margin: 0 0 12px 0; font-size: 14px; color: #666;">RENEWAL DETAILS</p>
              <div style="margin: 0;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 15px;">
                  <span>Plan:</span>
                  <strong style="color: #047857;">${planLabel}</strong>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 0; font-size: 15px;">
                  <span>Renewal Date:</span>
                  <strong style="color: #047857;">${escapeHtml(data.renewalDate)}</strong>
                </div>
              </div>
              <div style="border-top: 1px solid #e5e7eb; padding-top: 12px; margin-top: 12px;">
                <div style="display: flex; justify-content: space-between; font-size: 16px; font-weight: bold;">
                  <span>Amount to be charged:</span>
                  <span style="color: #047857;">${planPrice}${billingPeriod}</span>
                </div>
              </div>
            </div>

            <h3 style="color: #047857; font-size: 16px; margin: 24px 0 12px 0;">What You Get</h3>
            <p style="margin: 0 0 12px 0; color: #666; font-size: 15px;">
              <strong>Instant Alerts:</strong> Get SMS & email notifications whenever someone scans your pet's tag. This is how you'll know if your pet is lost and found.
            </p>

            <div style="background-color: #fef3c7; border: 1px solid #fcd34d; padding: 16px; margin: 24px 0; border-radius: 4px;">
              <p style="margin: 0; font-size: 14px; color: #92400e;">
                <strong>Want to change your plan?</strong> You can manage your subscription in your dashboard.
              </p>
            </div>

            <div style="text-align: center; margin: 32px 0;">
              <a href="${escapeHtml(data.manageSubscriptionUrl)}" style="background-color: #047857; color: white; padding: 12px 32px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Go to Dashboard</a>
            </div>

            <p style="color: #666; font-size: 14px; margin: 24px 0;">
              If you no longer want to subscribe, you can cancel anytime from your dashboard. No questions asked—we'll process it right away.
            </p>

            <p style="color: #999; font-size: 13px; margin: 24px 0 0 0;">
              You're receiving this reminder because you have an active NotAStray subscription. If you didn't sign up for this, please contact us at support@notastray.com
            </p>
          </div>

          <!-- Footer -->
          <div style="background-color: #f9fafb; padding: 24px; text-align: center; font-size: 12px; color: #666; border-top: 1px solid #e5e7eb;">
            <p style="margin: 0 0 12px 0;">
              <a href="https://notastray.com" style="color: #047857; text-decoration: none; font-weight: bold;">NotAStray.com</a>
            </p>
            ${data.userEmail ? `
            <p style="margin: 0 0 8px 0; font-size: 11px; color: #999;">
              <a href="https://notastray.com/api/unsubscribe/email?email=${encodeURIComponent(data.userEmail)}" style="color: #999; text-decoration: none;">Unsubscribe from emails</a>
            </p>
            ` : ''}
            <p style="margin: 0; font-size: 11px; color: #999;">
              Keeping pets safe, one tag at a time.
            </p>
          </div>
        </div>
      </body>
    </html>
  `;

  const text = `
Subscription Renewal Reminder

Hi ${data.customerName || 'there'},

We wanted to give you a heads up—your NotAStray subscription renews in 3 days.

RENEWAL DETAILS
Plan: ${planLabel}
Renewal Date: ${data.renewalDate}
Amount to be charged: ${planPrice}${billingPeriod}

WHAT YOU GET
✓ Instant Alerts: Get SMS & email notifications whenever someone scans your pet's tag. This is how you'll know if your pet is lost and found.

MANAGE YOUR SUBSCRIPTION
Visit your dashboard to change your plan or cancel:
${data.manageSubscriptionUrl}

If you no longer want to subscribe, you can cancel anytime from your dashboard. No questions asked—we'll process it right away.

Questions? Contact us at support@notastray.com

---
NotAStray Smart Pet Tags
Keeping pets safe, one tag at a time.

${data.userEmail ? `Unsubscribe: https://notastray.com/api/unsubscribe/email?email=${encodeURIComponent(data.userEmail)}` : ''}
  `;

  return {
    subject: `Subscription Renewal in 3 Days - ${planLabel} Plan`,
    html,
    text,
  };
}

export function getMerchantOrderEmail(data: MerchantOrderEmailData) {
  // Group items by color/size
  const groupedItems = data.items.reduce((acc: Record<string, number>, item) => {
    const key = `${item.color} - ${item.size}`;
    acc[key] = (acc[key] || 0) + item.quantity;
    return acc;
  }, {});

  const itemsGroupedList = Object.entries(groupedItems)
    .map(([variant, qty]) => `${qty}x ${variant}`)
    .join('\n');

  const itemsGroupedHtml = Object.entries(groupedItems)
    .map(
      ([variant, qty]) => `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${qty}x</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${escapeHtml(variant)}</td>
      </tr>
    `
    )
    .join('');

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
      </head>
      <body style="font-family: Arial, sans-serif; color: #333; line-height: 1.6; margin: 0; padding: 0;">
        <div style="max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">

          <!-- Header with Logo -->
          <div style="background-color: #047857; color: white; padding: 24px; text-align: center;">
            <img src="https://the-well-images.s3.us-east-1.amazonaws.com/logo-darkmode.jpeg" alt="NotAStray" style="height: 40px; margin-bottom: 12px;">
            <p style="margin: 8px 0 0 0; font-size: 18px;">New Order Received 📦</p>
          </div>

          <!-- Content -->
          <div style="padding: 32px;">
            <h2 style="color: #047857; margin: 0 0 8px 0;">Order #${escapeHtml(data.orderId)}</h2>
            <p style="margin: 0; color: #666; font-size: 14px;">Confirmation Code: ${escapeHtml(data.confirmationCode)}</p>

            <h3 style="color: #047857; font-size: 16px; margin: 24px 0 8px 0;">Customer</h3>
            <p style="margin: 0; font-size: 15px;">
              <strong>${escapeHtml(data.customerName)}</strong><br>
              ${escapeHtml(data.customerEmail)}
            </p>

            <h3 style="color: #047857; font-size: 16px; margin: 24px 0 8px 0;">Items to Pack</h3>
            <table style="width: 100%; border-collapse: collapse; background-color: #f9fafb;">
              <thead>
                <tr style="background-color: #f3f4f6;">
                  <th style="padding: 12px; text-align: left; border-bottom: 2px solid #d1d5db; font-weight: bold;">Qty</th>
                  <th style="padding: 12px; text-align: left; border-bottom: 2px solid #d1d5db; font-weight: bold;">Color / Size</th>
                </tr>
              </thead>
              <tbody>
                ${itemsGroupedHtml}
              </tbody>
            </table>

            <h3 style="color: #047857; font-size: 16px; margin: 24px 0 8px 0;">Shipping Address</h3>
            <p style="margin: 0; font-size: 15px; color: #666;">
              ${escapeHtml(data.shippingAddress.name)}<br>
              ${escapeHtml(data.shippingAddress.line1)}${data.shippingAddress.line2 ? '<br>' + escapeHtml(data.shippingAddress.line2) : ''}<br>
              ${escapeHtml(data.shippingAddress.city)}, ${escapeHtml(data.shippingAddress.state)} ${escapeHtml(data.shippingAddress.postalCode)}
            </p>

            <h3 style="color: #047857; font-size: 16px; margin: 24px 0 12px 0;">Order Summary</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr style="background-color: #f9fafb;">
                <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; font-size: 15px;">Subtotal</td>
                <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right; font-size: 15px;">$${data.subtotal.toFixed(2)}</td>
              </tr>
              <tr style="background-color: #f9fafb;">
                <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; font-size: 15px;">Shipping</td>
                <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right; font-size: 15px;">$${data.shippingCost.toFixed(2)}</td>
              </tr>
              <tr style="background-color: #f9fafb;">
                <td style="padding: 12px; border-bottom: 2px solid #d1d5db; font-size: 15px;">Tax</td>
                <td style="padding: 12px; border-bottom: 2px solid #d1d5db; text-align: right; font-size: 15px;">$${data.tax.toFixed(2)}</td>
              </tr>
              <tr>
                <td style="padding: 12px; font-size: 16px; font-weight: bold;">Total</td>
                <td style="padding: 12px; text-align: right; font-size: 16px; font-weight: bold; color: #047857;">$${data.total.toFixed(2)}</td>
              </tr>
            </table>

            <div style="background-color: #f0fdf4; border-left: 4px solid #047857; padding: 16px; margin-top: 32px;">
              <p style="margin: 0; font-size: 14px;">
                <strong>Next Steps:</strong><br>
                1. Print the shipping label from EasyPost (link in dashboard)<br>
                2. Pack the items listed above<br>
                3. Attach label and drop off at USPS
              </p>
            </div>
          </div>

          <!-- Footer -->
          <div style="background-color: #f9fafb; padding: 24px; text-align: center; font-size: 12px; color: #666; border-top: 1px solid #e5e7eb;">
            <p style="margin: 0; font-size: 11px; color: #999;">
              NotAStray Fulfillment System
            </p>
          </div>
        </div>
      </body>
    </html>
  `;

  const text = `
New Order Received 📦

Order #: ${data.orderId}
Confirmation Code: ${data.confirmationCode}

CUSTOMER
${data.customerName}
${data.customerEmail}

ITEMS TO PACK
${itemsGroupedList}

SHIPPING ADDRESS
${data.shippingAddress.name}
${data.shippingAddress.line1}${data.shippingAddress.line2 ? '\n' + data.shippingAddress.line2 : ''}
${data.shippingAddress.city}, ${data.shippingAddress.state} ${data.shippingAddress.postalCode}

ORDER SUMMARY
Subtotal: $${data.subtotal.toFixed(2)}
Shipping: $${data.shippingCost.toFixed(2)}
Tax: $${data.tax.toFixed(2)}
---
Total: $${data.total.toFixed(2)}

NEXT STEPS
1. Print the shipping label from EasyPost (link in dashboard)
2. Pack the items listed above
3. Attach label and drop off at USPS
  `;

  return {
    subject: `[FULFILLMENT] Order #${data.orderId} - ${data.customerName}`,
    html,
    text,
  };
}

export interface EmailVerificationEmailData {
  customerName?: string;
  verifyUrl: string;
}

export function getEmailVerificationEmail(data: EmailVerificationEmailData) {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
      </head>
      <body style="font-family: Arial, sans-serif; color: #333; line-height: 1.6; margin: 0; padding: 0;">
        <div style="max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">

          <!-- Header with Logo -->
          <div style="background-color: #047857; color: white; padding: 24px; text-align: center;">
            <img src="https://the-well-images.s3.us-east-1.amazonaws.com/logo-darkmode.jpeg" alt="NotAStray" style="height: 40px; margin-bottom: 12px;">
            <p style="margin: 8px 0 0 0; font-size: 18px;">Verify Your Email Address</p>
          </div>

          <!-- Content -->
          <div style="padding: 32px;">
            <p style="font-size: 16px;">Hi ${escapeHtml(data.customerName || 'there')},</p>

            <p style="font-size: 16px;">Welcome to NotAStray! Please verify your email address to complete your account setup and start protecting your pet.</p>

            <div style="text-align: center; margin: 32px 0;">
              <a href="${escapeHtml(data.verifyUrl)}" style="background-color: #047857; color: white; padding: 14px 40px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; font-size: 16px;">Verify My Email</a>
            </div>

            <p style="font-size: 14px; color: #666; margin: 24px 0 8px 0;">
              If the button above doesn't work, copy and paste this link into your browser:
            </p>
            <p style="font-size: 13px; color: #047857; word-break: break-all; margin: 0 0 24px 0;">
              ${escapeHtml(data.verifyUrl)}
            </p>

            <div style="background-color: #fef3c7; border: 1px solid #fcd34d; padding: 16px; margin: 24px 0; border-radius: 4px;">
              <p style="margin: 0; font-size: 14px; color: #92400e;">
                <strong>This link expires in 24 hours.</strong> If it expires, you can request a new one from your dashboard.
              </p>
            </div>

            <p style="color: #999; font-size: 13px; margin: 24px 0 0 0;">
              If you did not create a NotAStray account, you can safely ignore this email.
            </p>
          </div>

          <!-- Footer -->
          <div style="background-color: #f9fafb; padding: 24px; text-align: center; font-size: 12px; color: #666; border-top: 1px solid #e5e7eb;">
            <p style="margin: 0 0 8px 0;">
              Questions? Email us at <a href="mailto:support@notastray.com" style="color: #047857; text-decoration: none;">support@notastray.com</a>
            </p>
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
  `;

  const text = `
Verify Your Email Address

Hi ${data.customerName || 'there'},

Welcome to NotAStray! Please verify your email address to complete your account setup and start protecting your pet.

Verify your email here:
${data.verifyUrl}

This link expires in 24 hours. If it expires, you can request a new one from your dashboard.

If you did not create a NotAStray account, you can safely ignore this email.

Questions? Email us at support@notastray.com

---
NotAStray.com
Keeping pets safe, one tag at a time.
  `;

  return {
    subject: 'Verify your NotAStray email address',
    html,
    text,
  };
}

export interface PasswordChangedEmailData {
  customerName?: string;
  changedAt: string;
  resetUrl: string;
}

export function getPasswordChangedEmail(data: PasswordChangedEmailData) {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
      </head>
      <body style="font-family: Arial, sans-serif; color: #333; line-height: 1.6; margin: 0; padding: 0;">
        <div style="max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">

          <!-- Header with Logo -->
          <div style="background-color: #047857; color: white; padding: 24px; text-align: center;">
            <img src="https://the-well-images.s3.us-east-1.amazonaws.com/logo-darkmode.jpeg" alt="NotAStray" style="height: 40px; margin-bottom: 12px;">
            <p style="margin: 8px 0 0 0; font-size: 18px;">Your Password Was Changed</p>
          </div>

          <!-- Content -->
          <div style="padding: 32px;">
            <p style="font-size: 16px;">Hi ${escapeHtml(data.customerName || 'there')},</p>

            <p style="font-size: 16px;">
              This is a confirmation that the password for your NotAStray account was changed on ${escapeHtml(data.changedAt)}.
            </p>

            <div style="background-color: #fef3c7; border: 1px solid #fcd34d; padding: 16px; margin: 24px 0; border-radius: 4px;">
              <p style="margin: 0; font-size: 14px; color: #92400e;">
                <strong>Didn't make this change?</strong> Reset your password immediately and contact us at support@notastray.com.
              </p>
            </div>

            <div style="text-align: center; margin: 32px 0;">
              <a href="${escapeHtml(data.resetUrl)}" style="background-color: #047857; color: white; padding: 14px 40px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; font-size: 16px;">Reset My Password</a>
            </div>

            <p style="color: #999; font-size: 13px; margin: 24px 0 0 0;">
              If you made this change, no further action is needed.
            </p>
          </div>

          <!-- Footer -->
          <div style="background-color: #f9fafb; padding: 24px; text-align: center; font-size: 12px; color: #666; border-top: 1px solid #e5e7eb;">
            <p style="margin: 0 0 8px 0;">
              Questions? Email us at <a href="mailto:support@notastray.com" style="color: #047857; text-decoration: none;">support@notastray.com</a>
            </p>
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
  `;

  const text = `
Your Password Was Changed

Hi ${data.customerName || 'there'},

This is a confirmation that the password for your NotAStray account was changed on ${data.changedAt}.

Didn't make this change? Reset your password immediately here:
${data.resetUrl}

Then contact us at support@notastray.com.

If you made this change, no further action is needed.

Questions? Email us at support@notastray.com

---
NotAStray.com
Keeping pets safe, one tag at a time.
  `;

  return {
    subject: 'Your NotAStray password was changed',
    html,
    text,
  };
}

export function getLostPetNotificationEmail(data: LostPetNotificationEmailData) {
  const html = `
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
                  <span>${escapeHtml(data.petName)}</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 15px;">
                  <span style="font-weight: bold;">Species:</span>
                  <span>${escapeHtml(data.species)}</span>
                </div>
                ${data.breed ? `
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 15px;">
                  <span style="font-weight: bold;">Breed:</span>
                  <span>${escapeHtml(data.breed)}</span>
                </div>
                ` : ''}
              </div>
            </div>

            <h3 style="color: #047857; font-size: 16px; margin: 24px 0 12px 0;">Owner Information</h3>
            <div style="background-color: #f3f4f6; border-left: 4px solid #047857; padding: 16px; margin-bottom: 24px;">
              ${data.ownerName ? `<p style="margin: 0 0 8px 0; font-size: 15px;"><strong>Name:</strong> ${escapeHtml(data.ownerName)}</p>` : ''}
              ${data.ownerPhone ? `<p style="margin: 0 0 8px 0; font-size: 15px;"><strong>Phone:</strong> ${escapeHtml(data.ownerPhone)}</p>` : ''}
              ${data.ownerEmail ? `<p style="margin: 0; font-size: 15px;"><strong>Email:</strong> ${escapeHtml(data.ownerEmail)}</p>` : ''}
            </div>

            <h3 style="color: #047857; font-size: 16px; margin: 24px 0 12px 0;">Lost Location</h3>
            <p style="margin: 0 0 24px 0; font-size: 15px; color: #666;">
              ${escapeHtml(data.lostLocation)}
            </p>

            <h3 style="color: #047857; font-size: 16px; margin: 24px 0 12px 0;">Date Lost</h3>
            <p style="margin: 0 0 24px 0; font-size: 15px; color: #666;">
              ${escapeHtml(data.lostDate)}
            </p>

            <div style="text-align: center; margin: 32px 0;">
              <a href="${escapeHtml(data.reportUrl)}" style="background-color: #047857; color: white; padding: 12px 32px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">View Full Report</a>
            </div>

            <div style="background-color: #f0f9ff; border: 1px solid #cffafe; padding: 16px; margin: 24px 0; border-radius: 4px;">
              <p style="margin: 0; font-size: 14px; color: #0369a1;">
                <strong>💡 How You Can Help:</strong><br>
                Share relevant local resources, social media groups, or connect with local shelters/rescues that might help this pet owner.
              </p>
            </div>

            <p style="color: #999; font-size: 13px; margin: 24px 0 0 0;">
              Tag Code: <strong>${escapeHtml(data.tagCode)}</strong>
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
  `;

  const text = `
🚨 PET REPORTED MISSING

A user has reported their pet as missing on NotAStray. Reach out to help with their search!

PET DETAILS
Name: ${data.petName}
Species: ${data.species}
${data.breed ? `Breed: ${data.breed}` : ''}

OWNER INFORMATION
${data.ownerName ? `Name: ${data.ownerName}` : ''}
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
  `;

  return {
    subject: `🚨 Missing Pet Alert: ${data.petName} (${data.species})`,
    html,
    text,
  };
}

export interface SubscriptionConfirmationEmailData {
  customerName?: string;
  planType: 'monthly' | 'yearly';
  planPrice: number;
  renewalDate: string;
  dashboardUrl: string;
  userEmail?: string;
}

export function getSubscriptionConfirmationEmail(data: SubscriptionConfirmationEmailData) {
  const planLabel = data.planType === 'monthly' ? 'Monthly' : 'Annual';
  const planPrice = data.planType === 'monthly' ? '$3' : '$30';
  const billingPeriod = data.planType === 'monthly' ? '/month' : '/year';

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
      </head>
      <body style="font-family: Arial, sans-serif; color: #333; line-height: 1.6; margin: 0; padding: 0;">
        <div style="max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">

          <!-- Header with Logo -->
          <div style="background-color: #047857; color: white; padding: 24px; text-align: center;">
            <img src="https://the-well-images.s3.us-east-1.amazonaws.com/logo-darkmode.jpeg" alt="NotAStray" style="height: 40px; margin-bottom: 12px;">
            <p style="margin: 8px 0 0 0; font-size: 18px;">Your PROTECT Plan is Active 🎉</p>
          </div>

          <!-- Content -->
          <div style="padding: 32px;">
            <p style="font-size: 16px;">Hi ${escapeHtml(data.customerName || 'there')},</p>

            <p style="font-size: 16px;">Thank you for subscribing to the NotAStray PROTECT Plan! Your subscription is now active and your pet is protected with instant alerts.</p>

            <div style="background-color: #f3f4f6; border: 1px solid #d1d5db; padding: 20px; margin: 24px 0; border-radius: 6px;">
              <p style="margin: 0 0 12px 0; font-size: 14px; color: #666;">SUBSCRIPTION DETAILS</p>
              <div style="margin: 0;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 15px;">
                  <span>Plan:</span>
                  <strong style="color: #047857;">${planLabel}</strong>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 0; font-size: 15px;">
                  <span>Next Renewal Date:</span>
                  <strong style="color: #047857;">${escapeHtml(data.renewalDate)}</strong>
                </div>
              </div>
              <div style="border-top: 1px solid #e5e7eb; padding-top: 12px; margin-top: 12px;">
                <div style="display: flex; justify-content: space-between; font-size: 16px; font-weight: bold;">
                  <span>Amount:</span>
                  <span style="color: #047857;">${planPrice}${billingPeriod}</span>
                </div>
              </div>
            </div>

            <h3 style="color: #047857; font-size: 16px; margin: 24px 0 12px 0;">What You Get</h3>
            <p style="margin: 0 0 12px 0; color: #666; font-size: 15px;">
              <strong>Instant Alerts:</strong> Get SMS & email notifications whenever someone scans your pet's tag. This is how you'll know if your pet is lost and found.
            </p>

            <div style="background-color: #fef3c7; border: 1px solid #fcd34d; padding: 16px; margin: 24px 0; border-radius: 4px;">
              <p style="margin: 0; font-size: 14px; color: #92400e;">
                <strong>Want to change your plan?</strong> You can manage or cancel your subscription anytime from your dashboard.
              </p>
            </div>

            <div style="text-align: center; margin: 32px 0;">
              <a href="${escapeHtml(data.dashboardUrl)}" style="background-color: #047857; color: white; padding: 12px 32px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Manage Your Subscription</a>
            </div>

            <p style="color: #999; font-size: 13px; margin: 24px 0 0 0;">
              You're receiving this confirmation because you subscribed to a NotAStray PROTECT Plan. If you didn't sign up for this, please contact us at support@notastray.com
            </p>
          </div>

          <!-- Footer -->
          <div style="background-color: #f9fafb; padding: 24px; text-align: center; font-size: 12px; color: #666; border-top: 1px solid #e5e7eb;">
            <p style="margin: 0 0 12px 0;">
              <a href="https://notastray.com" style="color: #047857; text-decoration: none; font-weight: bold;">NotAStray.com</a>
            </p>
            ${data.userEmail ? `
            <p style="margin: 0 0 8px 0; font-size: 11px; color: #999;">
              <a href="https://notastray.com/api/unsubscribe/email?email=${encodeURIComponent(data.userEmail)}" style="color: #999; text-decoration: none;">Unsubscribe from emails</a>
            </p>
            ` : ''}
            <p style="margin: 0; font-size: 11px; color: #999;">
              Keeping pets safe, one tag at a time.
            </p>
          </div>
        </div>
      </body>
    </html>
  `;

  const text = `
Your PROTECT Plan is Active 🎉

Hi ${data.customerName || 'there'},

Thank you for subscribing to the NotAStray PROTECT Plan! Your subscription is now active and your pet is protected with instant alerts.

SUBSCRIPTION DETAILS
Plan: ${planLabel}
Next Renewal Date: ${data.renewalDate}
Amount: ${planPrice}${billingPeriod}

WHAT YOU GET
✓ Instant Alerts: Get SMS & email notifications whenever someone scans your pet's tag. This is how you'll know if your pet is lost and found.

MANAGE YOUR SUBSCRIPTION
Visit your dashboard to change your plan or cancel anytime:
${data.dashboardUrl}

Questions? Contact us at support@notastray.com

---
NotAStray Smart Pet Tags
Keeping pets safe, one tag at a time.

${data.userEmail ? `Unsubscribe: https://notastray.com/api/unsubscribe/email?email=${encodeURIComponent(data.userEmail)}` : ''}
  `;

  return {
    subject: `Your PROTECT Plan is Active - ${planLabel} Plan`,
    html,
    text,
  };
}

export interface MerchantSubscriptionEmailData {
  customerEmail: string;
  customerName?: string;
  planType: 'monthly' | 'yearly';
  planPrice: number;
}

export function getMerchantSubscriptionEmail(data: MerchantSubscriptionEmailData) {
  const planLabel = data.planType === 'monthly' ? 'Monthly' : 'Annual';
  const planPrice = data.planType === 'monthly' ? '$3' : '$30';
  const billingPeriod = data.planType === 'monthly' ? '/month' : '/year';

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
      </head>
      <body style="font-family: Arial, sans-serif; color: #333; line-height: 1.6; margin: 0; padding: 0;">
        <div style="max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">

          <!-- Header with Logo -->
          <div style="background-color: #047857; color: white; padding: 24px; text-align: center;">
            <img src="https://the-well-images.s3.us-east-1.amazonaws.com/logo-darkmode.jpeg" alt="NotAStray" style="height: 40px; margin-bottom: 12px;">
            <p style="margin: 8px 0 0 0; font-size: 18px;">New Subscriber 🎉</p>
          </div>

          <!-- Content -->
          <div style="padding: 32px;">
            <p style="margin: 0 0 24px 0; font-size: 15px;">A customer just subscribed to the PROTECT Plan. There's nothing to pack or ship—this is a recurring subscription.</p>

            <h3 style="color: #047857; font-size: 16px; margin: 24px 0 8px 0;">Customer</h3>
            <p style="margin: 0; font-size: 15px;">
              <strong>${escapeHtml(data.customerName || 'Customer')}</strong><br>
              ${escapeHtml(data.customerEmail)}
            </p>

            <h3 style="color: #047857; font-size: 16px; margin: 24px 0 8px 0;">Subscription</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr style="background-color: #f9fafb;">
                <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; font-size: 15px;">Plan</td>
                <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right; font-size: 15px;">${planLabel}</td>
              </tr>
              <tr>
                <td style="padding: 12px; font-size: 16px; font-weight: bold;">Price</td>
                <td style="padding: 12px; text-align: right; font-size: 16px; font-weight: bold; color: #047857;">${planPrice}${billingPeriod}</td>
              </tr>
            </table>
          </div>

          <!-- Footer -->
          <div style="background-color: #f9fafb; padding: 24px; text-align: center; font-size: 12px; color: #666; border-top: 1px solid #e5e7eb;">
            <p style="margin: 0; font-size: 11px; color: #999;">
              NotAStray Fulfillment System
            </p>
          </div>
        </div>
      </body>
    </html>
  `;

  const text = `
New Subscriber 🎉

A customer just subscribed to the PROTECT Plan. There's nothing to pack or ship—this is a recurring subscription.

CUSTOMER
${data.customerName || 'Customer'}
${data.customerEmail}

SUBSCRIPTION
Plan: ${planLabel}
Price: ${planPrice}${billingPeriod}
  `;

  return {
    subject: `[SUBSCRIPTION] New ${planLabel} Subscriber - ${data.customerName || data.customerEmail}`,
    html,
    text,
  };
}
