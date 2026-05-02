import { NextResponse } from 'next/server';
import {
  getOrderConfirmationEmail,
  getShippingEmail,
  getTrackingUpdateEmail,
  getMerchantOrderEmail,
} from '@/lib/emailTemplates';

export async function GET(request: Request) {
  // Test endpoint to preview emails - only available in development
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const emailType = searchParams.get('type') || 'confirmation';

  const mockOrder = {
    orderId: 'NAS-20260501-ABC12',
    confirmationCode: 'NAS-X7K9M2Q4',
    customerEmail: 'customer@example.com',
    customerName: 'John Doe',
    items: [
      {
        name: 'Smart Pet Tag',
        color: 'Forest Green',
        size: 'Medium',
        quantity: 2,
        price: 29.99,
      },
    ],
    subtotal: 59.98,
    shippingCost: 5.99,
    total: 65.97,
    estimatedDeliveryMin: '2026-05-05',
    estimatedDeliveryMax: '2026-05-07',
    shippingAddress: {
      name: 'John Doe',
      line1: '123 Main Street',
      line2: 'Apt 4B',
      city: 'New York',
      state: 'NY',
      postalCode: '10001',
    },
  };

  let emailData;

  switch (emailType) {
    case 'confirmation':
      emailData = getOrderConfirmationEmail({
        orderId: mockOrder.orderId,
        confirmationCode: mockOrder.confirmationCode,
        customerName: mockOrder.customerName,
        items: mockOrder.items,
        subtotal: mockOrder.subtotal,
        shippingCost: mockOrder.shippingCost,
        total: mockOrder.total,
        estimatedDeliveryMin: mockOrder.estimatedDeliveryMin,
        estimatedDeliveryMax: mockOrder.estimatedDeliveryMax,
        shippingAddress: mockOrder.shippingAddress,
      });
      break;

    case 'shipping':
      emailData = getShippingEmail({
        orderId: mockOrder.orderId,
        confirmationCode: mockOrder.confirmationCode,
        customerName: mockOrder.customerName,
        trackingNumber: '9400111899223456789012',
        carrier: 'USPS',
        trackingUrl: 'https://tracking.usps.com/?tracknumbers=9400111899223456789012',
        estimatedDeliveryMin: mockOrder.estimatedDeliveryMin,
        estimatedDeliveryMax: mockOrder.estimatedDeliveryMax,
        shippingAddress: mockOrder.shippingAddress,
      });
      break;

    case 'in_transit':
      emailData = getTrackingUpdateEmail({
        orderId: mockOrder.orderId,
        trackingNumber: '9400111899223456789012',
        status: 'in_transit',
        statusDisplay: 'In Transit',
        lastLocation: {
          city: 'Jersey City',
          state: 'NJ',
        },
        trackingUrl: 'https://tracking.usps.com/?tracknumbers=9400111899223456789012',
        estimatedDeliveryDate: mockOrder.estimatedDeliveryMax,
      });
      break;

    case 'out_for_delivery':
      emailData = getTrackingUpdateEmail({
        orderId: mockOrder.orderId,
        trackingNumber: '9400111899223456789012',
        status: 'out_for_delivery',
        statusDisplay: 'Out for Delivery',
        lastLocation: {
          city: 'New York',
          state: 'NY',
        },
        trackingUrl: 'https://tracking.usps.com/?tracknumbers=9400111899223456789012',
        estimatedDeliveryDate: mockOrder.estimatedDeliveryMax,
      });
      break;

    case 'delivered':
      emailData = getTrackingUpdateEmail({
        orderId: mockOrder.orderId,
        trackingNumber: '9400111899223456789012',
        status: 'delivered',
        statusDisplay: 'Delivered',
        lastLocation: {
          city: 'New York',
          state: 'NY',
        },
        trackingUrl: 'https://tracking.usps.com/?tracknumbers=9400111899223456789012',
      });
      break;

    case 'merchant':
      emailData = getMerchantOrderEmail({
        orderId: mockOrder.orderId,
        confirmationCode: mockOrder.confirmationCode,
        customerEmail: mockOrder.customerEmail,
        customerName: mockOrder.customerName,
        items: mockOrder.items,
        total: mockOrder.total,
        shippingAddress: mockOrder.shippingAddress,
        dashboardUrl: 'https://notastray.com/dashboard/orders',
      });
      break;

    default:
      return NextResponse.json(
        {
          error: 'Invalid email type',
          available: ['confirmation', 'shipping', 'in_transit', 'out_for_delivery', 'delivered', 'merchant'],
        },
        { status: 400 }
      );
  }

  return NextResponse.json({
    type: emailType,
    to: emailType === 'merchant' ? 'merchant@example.com' : mockOrder.customerEmail,
    subject: emailData.subject,
    html: emailData.html,
    text: emailData.text,
  });
}
