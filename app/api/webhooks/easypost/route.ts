import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import { verifyWebhookSignature } from '@/lib/easypost';
import { getShippingEmail, getTrackingUpdateEmail } from '@/lib/emailTemplates';
import { sendEmail } from '@/lib/sendEmail';

const statusDisplayMap: Record<string, string> = {
  unknown: 'Shipment information received',
  pre_transit: 'Shipment picked up',
  in_transit: 'In transit',
  out_for_delivery: 'Out for delivery',
  delivered: 'Delivered',
  available_for_pickup: 'Available for pickup',
  return_in_transit: 'Return in transit',
  returned: 'Returned',
  failure: 'Delivery attempted - contact carrier',
  cancelled: 'Shipment cancelled',
  error: 'Shipment error',
};

export async function POST(request: Request) {
  try {
    // Get signature from headers
    const signature = request.headers.get('x-easypost-signature');
    if (!signature) {
      console.warn('Missing EasyPost signature');
      return new Response('Unauthorized', { status: 401 });
    }

    // Get body as text for signature verification
    const bodyText = await request.text();

    // Verify webhook signature
    if (!verifyWebhookSignature(bodyText, signature)) {
      console.warn('Invalid EasyPost webhook signature');
      return new Response('Unauthorized', { status: 401 });
    }

    // Parse body
    const event = JSON.parse(bodyText);

    // Handle tracker.updated events
    if (event.type === 'tracker.updated') {
      const tracker = event.data;
      const trackingNumber = tracker.tracking_code;

      console.log(
        `EasyPost webhook: Tracker updated - ${trackingNumber}, status: ${tracker.status}`
      );

      // Find order by tracking number
      const orderSnap = await adminDb
        .collection('orders')
        .where('tracking_number', '==', trackingNumber)
        .limit(1)
        .get();

      if (orderSnap.empty) {
        console.warn(`No order found for tracking number: ${trackingNumber}`);
        return NextResponse.json({ received: true });
      }

      const orderDoc = orderSnap.docs[0];
      const order = orderDoc.data();

      // Map EasyPost status to friendly display
      const statusDisplay = statusDisplayMap[tracker.status] || tracker.status;

      // Update order status in Firestore
      await orderDoc.ref.update({
        shipment_status: tracker.status,
        last_location: tracker.last_location || null,
        last_update_time: tracker.updated_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      console.log(`Order ${order.orderId} status updated to ${tracker.status}`);

      // Send customer email on key events
      if (order.customerEmail) {
        const trackingUrl = `https://tracking.usps.com/?tracknumbers=${trackingNumber}`;
        let emailData = null;

        // Send "Your order is on the way!" email when it enters the mail system
        if (tracker.status === 'in_transit') {
          emailData = getShippingEmail({
            orderId: order.orderId,
            confirmationCode: order.confirmationCode,
            customerName: order.shippingAddress?.name,
            trackingNumber,
            carrier: 'USPS',
            trackingUrl,
            estimatedDeliveryMin: order.estimatedDeliveryMin,
            estimatedDeliveryMax: order.estimatedDeliveryMax,
            shippingAddress: order.shippingAddress,
          });
        }
        // Send "Your order arrived!" email on delivery
        else if (tracker.status === 'delivered') {
          emailData = getTrackingUpdateEmail({
            orderId: order.orderId,
            trackingNumber,
            status: tracker.status,
            statusDisplay,
            lastLocation: tracker.last_location,
            trackingUrl,
            estimatedDeliveryDate: order.estimatedDeliveryMax,
          });
        }

        if (emailData) {
          try {
            await sendEmail({
              to: order.customerEmail,
              subject: emailData.subject,
              html: emailData.html,
              text: emailData.text,
            });
            console.log(
              `Email sent to ${order.customerEmail} for status ${tracker.status}`
            );
          } catch (emailError) {
            console.error('Failed to send email:', emailError);
            // Don't fail the webhook if email fails
          }
        }
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('EasyPost webhook error:', error);
    // Always return 200 to prevent retries unless it's an auth issue
    return NextResponse.json({ received: true, error: error instanceof Error ? error.message : 'Unknown error' });
  }
}
