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
      <body style="font-family: Arial, sans-serif; color: #333; line-height: 1.6; margin: 0; padding: 0;">
        <div style="max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">

          <!-- Header with Logo -->
          <div style="background-color: #047857; color: white; padding: 24px; text-align: center;">
            <img src="https://notastray.com/logo-darkmode.jpg" alt="NotAStray" style="height: 40px; margin-bottom: 12px;">
            <p style="margin: 8px 0 0 0; font-size: 16px;">Order Confirmation</p>
          </div>

          <!-- Content -->
          <div style="padding: 32px;">
            <p style="font-size: 16px;">Hi ${data.customerName || 'there'},</p>

            <p style="font-size: 16px;">Thank you for your order! We've received it and it's being prepared for shipment.</p>

            <h2 style="color: #047857; font-size: 18px; margin: 24px 0 12px 0;">Order #${data.orderId}</h2>

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
              <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 15px;">
                <span>Subtotal</span>
                <span>$${data.subtotal.toFixed(2)}</span>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 12px; font-size: 15px;">
                <span>Shipping</span>
                <span>$${data.shippingCost.toFixed(2)}</span>
              </div>
              <div style="display: flex; justify-content: space-between; font-size: 16px; font-weight: bold; padding-top: 12px; border-top: 2px solid #e5e7eb;">
                <span>Total</span>
                <span>$${data.total.toFixed(2)}</span>
              </div>
            </div>

            <h3 style="color: #047857; font-size: 16px; margin-top: 24px; margin-bottom: 8px;">Expected Delivery</h3>
            <p style="margin: 0; font-size: 15px; color: #666;">
              ${data.estimatedDeliveryMin} — ${data.estimatedDeliveryMax}
            </p>

            <h3 style="color: #047857; font-size: 16px; margin-top: 24px; margin-bottom: 8px;">Shipping To</h3>
            <p style="margin: 0; font-size: 15px; color: #666;">
              ${data.shippingAddress.name}<br>
              ${data.shippingAddress.line1}${data.shippingAddress.line2 ? '<br>' + data.shippingAddress.line2 : ''}<br>
              ${data.shippingAddress.city}, ${data.shippingAddress.state} ${data.shippingAddress.postalCode}
            </p>

            <div style="text-align: center; margin-top: 32px;">
              <a href="https://notastray.com/dashboard/orders" style="background-color: #047857; color: white; padding: 12px 32px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">View Your Orders</a>
            </div>

            <p style="color: #999; font-size: 13px; margin-top: 32px; text-align: center;">
              Confirmation Code: ${data.confirmationCode}
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
      <body style="font-family: Arial, sans-serif; color: #333; line-height: 1.6; margin: 0; padding: 0;">
        <div style="max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">

          <!-- Header with Logo -->
          <div style="background-color: #047857; color: white; padding: 24px; text-align: center;">
            <img src="https://notastray.com/logo-darkmode.jpg" alt="NotAStray" style="height: 40px; margin-bottom: 12px;">
            <p style="margin: 8px 0 0 0; font-size: 18px;">Your Order is on the Way! 🚚</p>
          </div>

          <!-- Content -->
          <div style="padding: 32px;">
            <p style="font-size: 16px;">Hi ${data.customerName || 'there'},</p>

            <p style="font-size: 16px;">Great news! Your NotAStray pet tag has shipped and is on its way to you.</p>

            <div style="background-color: #f0fdf4; border: 2px solid #047857; padding: 20px; margin: 24px 0; border-radius: 8px; text-align: center;">
              <p style="margin: 0 0 8px 0; color: #666; font-size: 12px;">TRACKING NUMBER</p>
              <p style="margin: 0; font-size: 24px; font-weight: bold; color: #047857; font-family: monospace;">
                ${data.trackingNumber}
              </p>
              <p style="margin: 12px 0 0 0;">
                <a href="${data.trackingUrl}" style="color: white; text-decoration: none; background-color: #047857; padding: 10px 20px; border-radius: 4px; font-weight: bold; display: inline-block;">Track Package</a>
              </p>
            </div>

            <h3 style="color: #047857; font-size: 16px; margin: 24px 0 8px 0;">Estimated Delivery</h3>
            <p style="margin: 0; font-size: 15px; color: #666;">
              ${data.estimatedDeliveryMin} — ${data.estimatedDeliveryMax}
            </p>

            <h3 style="color: #047857; font-size: 16px; margin: 24px 0 8px 0;">Carrier</h3>
            <p style="margin: 0; font-size: 15px; color: #666;">
              ${data.carrier}
            </p>

            <h3 style="color: #047857; font-size: 16px; margin: 24px 0 8px 0;">Shipping To</h3>
            <p style="margin: 0; font-size: 15px; color: #666;">
              ${data.shippingAddress.name}<br>
              ${data.shippingAddress.line1}<br>
              ${data.shippingAddress.city}, ${data.shippingAddress.state} ${data.shippingAddress.postalCode}
            </p>

            <p style="margin-top: 32px; color: #666; font-size: 13px;">
              Order #: <strong>${data.orderId}</strong>
            </p>

            <div style="text-align: center; margin-top: 32px;">
              <a href="https://notastray.com/dashboard/orders" style="color: #047857; text-decoration: none; font-weight: bold;">View Your Order →</a>
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

export function getTrackingUpdateEmail(data: TrackingUpdateEmailData): { subject: string; html: string; text: string } | null {
  const statusMessages: Record<string, string> = {
    delivered: 'Your Order Arrived! ✅',
    out_for_delivery: 'Out for Delivery Today! 🚚',
    in_transit: 'Your Order is in Transit 📦',
  };

  const statusMessage =
    statusMessages[data.status.toLowerCase()] || `Status Update: ${data.statusDisplay}`;

  // Only send delivered email, filter out other statuses
  if (data.status.toLowerCase() !== 'delivered') {
    return null;
  }

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
            <img src="https://notastray.com/logo-darkmode.jpg" alt="NotAStray" style="height: 40px; margin-bottom: 12px;">
            <p style="margin: 8px 0 0 0; font-size: 18px;">${statusMessage}</p>
          </div>

          <!-- Content -->
          <div style="padding: 32px;">
            <p style="font-size: 16px;">Hi there,</p>

            <p style="font-size: 16px;">Your NotAStray pet tag has been delivered! Your furry friend is now protected. 🐾</p>

            <div style="background-color: #f0fdf4; border: 2px solid #047857; padding: 20px; margin: 24px 0; border-radius: 8px; text-align: center;">
              <p style="margin: 0 0 8px 0; color: #666; font-size: 12px;">TRACKING NUMBER</p>
              <p style="margin: 0 0 12px 0; font-size: 20px; font-weight: bold; color: #047857; font-family: monospace;">
                ${data.trackingNumber}
              </p>
              <p style="margin: 0;">
                <a href="${data.trackingUrl}" style="color: white; text-decoration: none; background-color: #047857; padding: 10px 20px; border-radius: 4px; font-weight: bold; display: inline-block;">View Tracking</a>
              </p>
            </div>

            <h3 style="color: #047857; font-size: 16px; margin: 24px 0 8px 0;">Delivery Confirmation</h3>
            <p style="margin: 0; font-size: 15px; color: #666;">
              ${data.statusDisplay}
            </p>

            ${data.lastLocation ? `
              <h3 style="color: #047857; font-size: 16px; margin: 24px 0 8px 0;">Delivered To</h3>
              <p style="margin: 0; font-size: 15px; color: #666;">
                ${data.lastLocation.city}, ${data.lastLocation.state}
              </p>
            ` : ''}

            <div style="background-color: #f0fdf4; border-left: 4px solid #047857; padding: 16px; margin-top: 32px;">
              <p style="margin: 0; font-size: 14px;">
                <strong>Next Step:</strong> Activate your pet tag by scanning the QR code with your phone. This registers your pet and enables notifications.
              </p>
            </div>

            <p style="margin-top: 32px; color: #666; font-size: 13px;">
              Order #: <strong>${data.orderId}</strong>
            </p>

            <div style="text-align: center; margin-top: 32px;">
              <a href="https://notastray.com/dashboard/orders" style="color: #047857; text-decoration: none; font-weight: bold;">View Your Order →</a>
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
Your Order Arrived! ✅

Hi there,

Your NotAStray pet tag has been delivered! Your furry friend is now protected. 🐾

TRACKING NUMBER
${data.trackingNumber}

View tracking: ${data.trackingUrl}

DELIVERY CONFIRMATION
${data.statusDisplay}
${data.lastLocation ? `Delivered to: ${data.lastLocation.city}, ${data.lastLocation.state}` : ''}

NEXT STEP
Activate your pet tag by scanning the QR code with your phone. This registers your pet and enables notifications.

Order #: ${data.orderId}

Visit your orders: https://notastray.com/dashboard/orders

NotAStray.com
Keeping pets safe, one tag at a time.
  `;

  return {
    subject: `Your Order Arrived! - ${data.trackingNumber}`,
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
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${variant}</td>
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
            <img src="https://notastray.com/logo-darkmode.jpg" alt="NotAStray" style="height: 40px; margin-bottom: 12px;">
            <p style="margin: 8px 0 0 0; font-size: 18px;">New Order Received 📦</p>
          </div>

          <!-- Content -->
          <div style="padding: 32px;">
            <h2 style="color: #047857; margin: 0 0 8px 0;">Order #${data.orderId}</h2>
            <p style="margin: 0; color: #666; font-size: 14px;">Confirmation Code: ${data.confirmationCode}</p>

            <h3 style="color: #047857; font-size: 16px; margin: 24px 0 8px 0;">Customer</h3>
            <p style="margin: 0; font-size: 15px;">
              <strong>${data.customerName}</strong><br>
              ${data.customerEmail}
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
              ${data.shippingAddress.name}<br>
              ${data.shippingAddress.line1}${data.shippingAddress.line2 ? '<br>' + data.shippingAddress.line2 : ''}<br>
              ${data.shippingAddress.city}, ${data.shippingAddress.state} ${data.shippingAddress.postalCode}
            </p>

            <h3 style="color: #047857; font-size: 16px; margin: 24px 0 8px 0;">Order Total</h3>
            <p style="margin: 0; font-size: 16px; font-weight: bold;">$${data.total.toFixed(2)}</p>

            <div style="background-color: #f0fdf4; border-left: 4px solid #047857; padding: 16px; margin-top: 32px;">
              <p style="margin: 0; font-size: 14px;">
                <strong>Next Steps:</strong><br>
                1. Print the shipping label from EasyPost (link in dashboard)<br>
                2. Pack the items listed above<br>
                3. Attach label and drop off at USPS
              </p>
            </div>

            <div style="text-align: center; margin-top: 32px;">
              <a href="${data.dashboardUrl}" style="background-color: #047857; color: white; padding: 12px 32px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">View in Dashboard</a>
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

ORDER TOTAL
$${data.total.toFixed(2)}

NEXT STEPS
1. Print the shipping label from EasyPost (link in dashboard)
2. Pack the items listed above
3. Attach label and drop off at USPS

View in Dashboard: ${data.dashboardUrl}
  `;

  return {
    subject: `[FULFILLMENT] Order #${data.orderId} - ${data.customerName}`,
    html,
    text,
  };
}
