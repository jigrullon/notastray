export interface OrderConfirmationEmailData {
  orderId: string;
  confirmationCode: string;
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

export interface ShippingEmailData {
  orderId: string;
  confirmationCode: string;
  customerName?: string;
  trackingNumber: string;
  carrier: string;
  trackingUrl: string;
  estimatedDeliveryMin: string;
  estimatedDeliveryMax: string;
  shippingAddress: {
    name: string;
    line1: string;
    city: string;
    state: string;
    postalCode: string;
  };
}

export interface TrackingUpdateEmailData {
  orderId: string;
  trackingNumber: string;
  status: string;
  statusDisplay: string;
  lastLocation?: {
    city: string;
    state: string;
  };
  trackingUrl: string;
  estimatedDeliveryDate?: string;
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
  total: number;
  shippingAddress: {
    name: string;
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postalCode: string;
  };
  dashboardUrl: string;
}

export function getOrderConfirmationEmail(data: OrderConfirmationEmailData) {
  const itemsList = data.items
    .map(
      (item) =>
        `
        <tr>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">
            <strong>${item.name}</strong><br>
            <span style="color: #666; font-size: 14px;">${item.color} / ${item.size}</span><br>
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
      <body style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
        <div style="max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">

          <!-- Header -->
          <div style="background-color: #047857; color: white; padding: 24px; text-align: center;">
            <h1 style="margin: 0; font-size: 28px;">NotAStray</h1>
            <p style="margin: 8px 0 0 0; font-size: 16px;">Order Confirmation</p>
          </div>

          <!-- Content -->
          <div style="padding: 32px;">
            <p>Hi ${data.customerName || 'there'},</p>

            <p>Thank you for your purchase! We've received your order and it's being prepared for shipment.</p>

            <h2 style="color: #047857; font-size: 18px; margin-top: 24px; margin-bottom: 12px;">Order Details</h2>
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

            <div style="margin-top: 16px; border-top: 1px solid #e5e7eb; padding-top: 16px;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                <span>Subtotal</span>
                <span>$${data.subtotal.toFixed(2)}</span>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
                <span>Shipping</span>
                <span>$${data.shippingCost.toFixed(2)}</span>
              </div>
              <div style="display: flex; justify-content: space-between; font-size: 16px; font-weight: bold; padding-top: 12px; border-top: 2px solid #e5e7eb;">
                <span>Total</span>
                <span>$${data.total.toFixed(2)}</span>
              </div>
            </div>

            <h2 style="color: #047857; font-size: 18px; margin-top: 24px; margin-bottom: 12px;">Shipping Address</h2>
            <p style="margin: 0; color: #666;">
              ${data.shippingAddress.name}<br>
              ${data.shippingAddress.line1}${data.shippingAddress.line2 ? '<br>' + data.shippingAddress.line2 : ''}<br>
              ${data.shippingAddress.city}, ${data.shippingAddress.state} ${data.shippingAddress.postalCode}
            </p>

            <div style="background-color: #f0fdf4; border-left: 4px solid #047857; padding: 16px; margin-top: 24px;">
              <p style="margin: 0;">
                <strong>What's next?</strong> You'll receive a shipping notification email with tracking details shortly. Estimated delivery: ${data.estimatedDeliveryMin} - ${data.estimatedDeliveryMax}.
              </p>
            </div>

            <p style="margin-top: 24px; color: #666;">
              Order #: <strong>${data.orderId}</strong><br>
              Confirmation Code: <strong>${data.confirmationCode}</strong>
            </p>

            <p style="color: #999; font-size: 12px; margin-top: 24px;">
              Questions? Reply to this email or visit our website for support.
            </p>
          </div>

          <!-- Footer -->
          <div style="background-color: #f9fafb; padding: 16px; text-align: center; font-size: 12px; color: #999; border-top: 1px solid #e5e7eb;">
            <p style="margin: 0;">
              NotAStray Smart Pet Tags<br>
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

export function getShippingEmail(data: ShippingEmailData) {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
      </head>
      <body style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
        <div style="max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">

          <!-- Header -->
          <div style="background-color: #047857; color: white; padding: 24px; text-align: center;">
            <h1 style="margin: 0; font-size: 28px;">🎉</h1>
            <p style="margin: 8px 0 0 0; font-size: 18px;">Your Order is on the Way!</p>
          </div>

          <!-- Content -->
          <div style="padding: 32px;">
            <p>Hi ${data.customerName || 'there'},</p>

            <p>Great news! Your NotAStray pet tag is on its way to you.</p>

            <div style="background-color: #f0fdf4; border: 2px solid #047857; padding: 20px; margin: 24px 0; border-radius: 8px; text-align: center;">
              <p style="margin: 0 0 8px 0; color: #666; font-size: 12px;">TRACKING NUMBER</p>
              <p style="margin: 0; font-size: 24px; font-weight: bold; color: #047857; font-family: monospace;">
                ${data.trackingNumber}
              </p>
              <p style="margin: 12px 0 0 0;">
                <a href="${data.trackingUrl}" style="color: #047857; text-decoration: none; font-weight: bold;">
                  Track Your Package →
                </a>
              </p>
            </div>

            <h2 style="color: #047857; font-size: 18px; margin-top: 24px; margin-bottom: 12px;">Shipping Details</h2>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;"><strong>Carrier</strong></td>
                <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">${data.carrier}</td>
              </tr>
              <tr>
                <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;"><strong>Estimated Delivery</strong></td>
                <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">${data.estimatedDeliveryMin} - ${data.estimatedDeliveryMax}</td>
              </tr>
            </table>

            <h2 style="color: #047857; font-size: 18px; margin-top: 24px; margin-bottom: 12px;">Shipping To</h2>
            <p style="margin: 0; color: #666;">
              ${data.shippingAddress.name}<br>
              ${data.shippingAddress.line1}<br>
              ${data.shippingAddress.city}, ${data.shippingAddress.state} ${data.shippingAddress.postalCode}
            </p>

            <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin-top: 24px;">
              <p style="margin: 0; font-size: 14px;">
                <strong>💡 Tip:</strong> Save your tracking number! You can use it to track your package at ${data.carrier}.com
              </p>
            </div>

            <p style="margin-top: 24px; color: #666;">
              Order #: <strong>${data.orderId}</strong>
            </p>

            <p style="color: #999; font-size: 12px; margin-top: 24px;">
              Questions? Reply to this email or visit our website for support.
            </p>
          </div>

          <!-- Footer -->
          <div style="background-color: #f9fafb; padding: 16px; text-align: center; font-size: 12px; color: #999; border-top: 1px solid #e5e7eb;">
            <p style="margin: 0;">
              NotAStray Smart Pet Tags<br>
              Keeping pets safe, one tag at a time.
            </p>
          </div>
        </div>
      </body>
    </html>
  `;

  const text = `
Your Order is on the Way! 🎉

Hi ${data.customerName || 'there'},

Great news! Your NotAStray pet tag is on its way to you.

TRACKING NUMBER
${data.trackingNumber}

Track your package: ${data.trackingUrl}

SHIPPING DETAILS
Carrier: ${data.carrier}
Estimated Delivery: ${data.estimatedDeliveryMin} - ${data.estimatedDeliveryMax}

SHIPPING TO
${data.shippingAddress.name}
${data.shippingAddress.line1}
${data.shippingAddress.city}, ${data.shippingAddress.state} ${data.shippingAddress.postalCode}

💡 Tip: Save your tracking number! You can use it to track your package at ${data.carrier}.com

Order #: ${data.orderId}

Questions? Reply to this email or visit our website for support.

NotAStray Smart Pet Tags
Keeping pets safe, one tag at a time.
  `;

  return {
    subject: `Your Order is on the Way! - Tracking #${data.trackingNumber}`,
    html,
    text,
  };
}

export function getTrackingUpdateEmail(data: TrackingUpdateEmailData) {
  const statusMessages: Record<string, string> = {
    in_transit: '📦 Your package is in transit',
    out_for_delivery: '🚚 Out for delivery today!',
    delivered: '✅ Delivered!',
    return_in_transit: '↩️ Return in transit',
    returned: '↩️ Returned',
    failure: '⚠️ Delivery attempted',
  };

  const statusMessage =
    statusMessages[data.status.toLowerCase()] || `📍 Status Update: ${data.statusDisplay}`;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
      </head>
      <body style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
        <div style="max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">

          <!-- Header -->
          <div style="background-color: #047857; color: white; padding: 24px; text-align: center;">
            <h1 style="margin: 0; font-size: 28px;">${statusMessage.split(' ')[0]}</h1>
            <p style="margin: 8px 0 0 0; font-size: 18px;">${statusMessage}</p>
          </div>

          <!-- Content -->
          <div style="padding: 32px;">
            <p>Your NotAStray pet tag update:</p>

            <div style="background-color: #f0fdf4; border: 2px solid #047857; padding: 20px; margin: 24px 0; border-radius: 8px;">
              <p style="margin: 0 0 8px 0; color: #666; font-size: 12px;">TRACKING NUMBER</p>
              <p style="margin: 0 0 12px 0; font-size: 20px; font-weight: bold; color: #047857; font-family: monospace;">
                ${data.trackingNumber}
              </p>
              <p style="margin: 0;">
                <a href="${data.trackingUrl}" style="color: #047857; text-decoration: none; font-weight: bold;">
                  View Full Tracking Details →
                </a>
              </p>
            </div>

            <h2 style="color: #047857; font-size: 18px; margin-top: 24px; margin-bottom: 12px;">Status Details</h2>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;"><strong>Current Status</strong></td>
                <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">${data.statusDisplay}</td>
              </tr>
              ${data.lastLocation ? `
                <tr>
                  <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;"><strong>Last Location</strong></td>
                  <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">${data.lastLocation.city}, ${data.lastLocation.state}</td>
                </tr>
              ` : ''}
              ${data.estimatedDeliveryDate ? `
                <tr>
                  <td style="padding: 12px;"><strong>Estimated Delivery</strong></td>
                  <td style="padding: 12px; text-align: right;">${data.estimatedDeliveryDate}</td>
                </tr>
              ` : ''}
            </table>

            <p style="margin-top: 24px; color: #666;">
              Order #: <strong>${data.orderId}</strong>
            </p>

            <p style="color: #999; font-size: 12px; margin-top: 24px;">
              Questions? Reply to this email or visit our website for support.
            </p>
          </div>

          <!-- Footer -->
          <div style="background-color: #f9fafb; padding: 16px; text-align: center; font-size: 12px; color: #999; border-top: 1px solid #e5e7eb;">
            <p style="margin: 0;">
              NotAStray Smart Pet Tags<br>
              Keeping pets safe, one tag at a time.
            </p>
          </div>
        </div>
      </body>
    </html>
  `;

  const text = `
${statusMessage}

Your NotAStray pet tag update:

TRACKING NUMBER
${data.trackingNumber}

View full tracking: ${data.trackingUrl}

STATUS DETAILS
Current Status: ${data.statusDisplay}
${data.lastLocation ? `Last Location: ${data.lastLocation.city}, ${data.lastLocation.state}` : ''}
${data.estimatedDeliveryDate ? `Estimated Delivery: ${data.estimatedDeliveryDate}` : ''}

Order #: ${data.orderId}

Questions? Reply to this email or visit our website for support.

NotAStray Smart Pet Tags
Keeping pets safe, one tag at a time.
  `;

  return {
    subject: `${statusMessage} - Tracking #${data.trackingNumber}`,
    html,
    text,
  };
}

export function getMerchantOrderEmail(data: MerchantOrderEmailData) {
  const itemsList = data.items
    .map((item) => `${item.name} (${item.color}/${item.size}) x${item.quantity}`)
    .join('\n');

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
      </head>
      <body style="font-family: Arial, sans-serif; color: #333;">
        <div style="max-width: 600px; margin: 0 auto;">
          <h2 style="color: #047857;">New Order Received! 📦</h2>

          <p><strong>Order #:</strong> ${data.orderId}</p>
          <p><strong>Confirmation Code:</strong> ${data.confirmationCode}</p>

          <h3>Customer</h3>
          <p>
            ${data.customerName}<br>
            ${data.customerEmail}
          </p>

          <h3>Items</h3>
          <pre>${itemsList}</pre>

          <h3>Shipping Address</h3>
          <p>
            ${data.shippingAddress.name}<br>
            ${data.shippingAddress.line1}${data.shippingAddress.line2 ? '\n' + data.shippingAddress.line2 : ''}<br>
            ${data.shippingAddress.city}, ${data.shippingAddress.state} ${data.shippingAddress.postalCode}
          </p>

          <h3>Order Total</h3>
          <p><strong>$${data.total.toFixed(2)}</strong></p>

          <p>
            <a href="${data.dashboardUrl}" style="color: #047857; text-decoration: none; font-weight: bold;">
              View in Dashboard →
            </a>
          </p>
        </div>
      </body>
    </html>
  `;

  const text = `
New Order Received! 📦

Order #: ${data.orderId}
Confirmation Code: ${data.confirmationCode}

CUSTOMER
${data.customerName}
${data.customerEmail}

ITEMS
${itemsList}

SHIPPING ADDRESS
${data.shippingAddress.name}
${data.shippingAddress.line1}${data.shippingAddress.line2 ? '\n' + data.shippingAddress.line2 : ''}
${data.shippingAddress.city}, ${data.shippingAddress.state} ${data.shippingAddress.postalCode}

ORDER TOTAL
$${data.total.toFixed(2)}

View in Dashboard: ${data.dashboardUrl}
  `;

  return {
    subject: `New Order #${data.orderId} - ${data.customerName}`,
    html,
    text,
  };
}
