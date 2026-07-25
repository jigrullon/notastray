import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import { createShipment, ShippingAddress } from '@/lib/easypost';
import { getMerchantOrderEmail } from '@/lib/emailTemplates';
import { sendEmail } from '@/lib/sendEmail';
import { withObservability } from '@/lib/observability/withObservability';
import { log } from '@/lib/observability/logger';

interface Order {
  orderId: string;
  confirmationCode: string;
  customerEmail: string;
  items: Array<{ name: string; color: string; size: string; quantity: number; price: number }>;
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
    country: string;
  };
  estimatedDeliveryMin: string;
  estimatedDeliveryMax: string;
}

export const POST = withObservability('orders-create-and-ship', async (request: Request) => {
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

    log.info('shipping_label_created', {
      orderId: order.orderId,
      trackingNumber: shipmentResponse.tracking_number,
    });

    // Send merchant notification
    const merchantEmail = process.env.MERCHANT_EMAIL;
    if (merchantEmail) {
      const merchantEmailData = getMerchantOrderEmail({
        orderId: order.orderId,
        confirmationCode: order.confirmationCode,
        customerEmail: order.customerEmail,
        customerName: order.shippingAddress.name,
        items: order.items,
        subtotal: order.subtotal || order.total,
        shippingCost: order.shippingCost || 0,
        tax: order.tax || 0,
        total: order.total,
        shippingAddress: order.shippingAddress,
      });

      try {
        await sendEmail({
          to: merchantEmail,
          subject: merchantEmailData.subject,
          html: merchantEmailData.html,
          text: merchantEmailData.text,
        });
        log.info('merchant_order_notification_sent', { orderId: order.orderId });
      } catch (emailError) {
        log.error('merchant_order_email_failed', {
          orderId: order.orderId,
          error: emailError instanceof Error ? emailError.message : String(emailError),
        });
        // Don't fail the order if email fails
      }
    }

    return NextResponse.json({
      success: true,
      trackingNumber: shipmentResponse.tracking_number,
      labelUrl: shipmentResponse.label_url,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log.error('create_and_ship_failed', {
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json(
      {
        error: errorMessage,
        details: 'Order stored but label generation failed. Check server logs for details.',
      },
      { status: 500 }
    );
  }
})
