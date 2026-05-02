import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import { createShipment, ShippingAddress } from '@/lib/easypost';
import { getShippingEmail, getMerchantOrderEmail } from '@/lib/emailTemplates';
import { sendEmail } from '@/lib/sendEmail';

interface Order {
  orderId: string;
  confirmationCode: string;
  customerEmail: string;
  items: Array<{ name: string; color: string; size: string; quantity: number; price: number }>;
  subtotal: number;
  shippingCost: number;
  total: number;
  shippingAddress: {
    name: string;
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  estimatedDeliveryMin: string;
  estimatedDeliveryMax: string;
}

export async function POST(request: Request) {
  try {
    const order: Order = await request.json();

    if (!order.orderId || !order.shippingAddress) {
      return NextResponse.json(
        { error: 'Invalid order data' },
        { status: 400 }
      );
    }

    // Create shipment in EasyPost
    const shipmentResponse = await createShipment({
      toAddress: {
        name: order.shippingAddress.name,
        street1: order.shippingAddress.line1,
        street2: order.shippingAddress.line2,
        city: order.shippingAddress.city,
        state: order.shippingAddress.state,
        zip: order.shippingAddress.postalCode,
        country: order.shippingAddress.country || 'US',
      },
    });

    // Update order in Firestore with tracking info
    await adminDb
      .collection('orders')
      .doc(order.orderId)
      .update({
        tracking_number: shipmentResponse.tracking_number,
        shipment_id: shipmentResponse.shipment_id,
        label_url: shipmentResponse.label_url,
        shipment_status: 'label_created',
        updated_at: new Date().toISOString(),
      });

    console.log(`Label created for order ${order.orderId}: ${shipmentResponse.tracking_number}`);

    // Send customer shipping email
    const trackingUrl = `https://tracking.usps.com/?tracknumbers=${shipmentResponse.tracking_number}`;
    const shippingEmailData = getShippingEmail({
      orderId: order.orderId,
      confirmationCode: order.confirmationCode,
      customerName: order.shippingAddress.name,
      trackingNumber: shipmentResponse.tracking_number,
      carrier: shipmentResponse.carrier,
      trackingUrl,
      estimatedDeliveryMin: order.estimatedDeliveryMin,
      estimatedDeliveryMax: order.estimatedDeliveryMax,
      shippingAddress: order.shippingAddress,
    });

    try {
      await sendEmail({
        to: order.customerEmail,
        subject: shippingEmailData.subject,
        html: shippingEmailData.html,
        text: shippingEmailData.text,
      });
      console.log(`Shipping email sent to ${order.customerEmail}`);
    } catch (emailError) {
      console.error('Failed to send shipping email:', emailError);
      // Don't fail the order if email fails
    }

    // Send merchant notification
    const merchantEmail = process.env.MERCHANT_EMAIL;
    if (merchantEmail) {
      const merchantEmailData = getMerchantOrderEmail({
        orderId: order.orderId,
        confirmationCode: order.confirmationCode,
        customerEmail: order.customerEmail,
        customerName: order.shippingAddress.name,
        items: order.items,
        total: order.total,
        shippingAddress: order.shippingAddress,
        dashboardUrl: `${new URL(request.url).origin}/dashboard/orders`,
      });

      try {
        await sendEmail({
          to: merchantEmail,
          subject: merchantEmailData.subject,
          html: merchantEmailData.html,
          text: merchantEmailData.text,
        });
        console.log(`Merchant notification sent to ${merchantEmail}`);
      } catch (emailError) {
        console.error('Failed to send merchant email:', emailError);
        // Don't fail the order if email fails
      }
    }

    return NextResponse.json({
      success: true,
      trackingNumber: shipmentResponse.tracking_number,
      labelUrl: shipmentResponse.label_url,
    });
  } catch (error) {
    console.error('Error creating shipment:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to create shipment. Order stored but label generation failed.',
      },
      { status: 500 }
    );
  }
}
