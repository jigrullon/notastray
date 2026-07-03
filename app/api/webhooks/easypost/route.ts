import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import { verifyWebhookSignature } from '@/lib/easypost';

// Note: customer-facing shipping-status notifications (shipped / in transit /
// out for delivery / delivered) are handled by WeSupply, not here. This webhook
// only syncs shipment status onto the order document in Firestore.

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

    // Handle tracker.updated events (ignore other event types)
    if (event.type !== 'tracker.updated') {
      console.log(`EasyPost webhook: Ignoring event type ${event.type}`);
      return NextResponse.json({ received: true });
    }

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

      // Update order status in Firestore (WeSupply handles the emails)
      await orderDoc.ref.update({
        shipment_status: tracker.status,
        last_location: tracker.last_location || null,
        last_update_time: tracker.updated_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      console.log(`Order ${order.orderId} status updated to ${tracker.status}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('EasyPost webhook error:', error);
    // Always return 200 to prevent retries unless it's an auth issue
    return NextResponse.json({ received: true, error: error instanceof Error ? error.message : 'Unknown error' });
  }
}
