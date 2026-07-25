import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import { verifyWebhookSignature } from '@/lib/easypost';
import { withObservability } from '@/lib/observability/withObservability';
import { log, setRequestUser } from '@/lib/observability/logger';

// Note: customer-facing shipping-status notifications (shipped / in transit /
// out for delivery / delivered) are handled by WeSupply, not here. This webhook
// only syncs shipment status onto the order document in Firestore.

export const POST = withObservability('webhooks-easypost', async (request: Request) => {
  try {
    // Get signature from headers
    const signature = request.headers.get('x-easypost-signature');
    if (!signature) {
      log.warn('easypost_webhook_missing_signature', {});
      return new Response('Unauthorized', { status: 401 });
    }

    // Get body as text for signature verification
    const bodyText = await request.text();

    // Verify webhook signature
    if (!verifyWebhookSignature(bodyText, signature)) {
      log.warn('easypost_webhook_invalid_signature', {});
      return new Response('Unauthorized', { status: 401 });
    }

    // Parse body
    const event = JSON.parse(bodyText);

    // Handle tracker.updated events (ignore other event types)
    if (event.type !== 'tracker.updated') {
      log.info('easypost_webhook_event_ignored', { eventType: event.type });
      return NextResponse.json({ received: true });
    }

    if (event.type === 'tracker.updated') {
      const tracker = event.data;
      const trackingNumber = tracker.tracking_code;

      log.info('easypost_tracker_updated', { trackingNumber, status: tracker.status });

      // Find order by tracking number
      const orderSnap = await adminDb
        .collection('orders')
        .where('tracking_number', '==', trackingNumber)
        .limit(1)
        .get();

      if (orderSnap.empty) {
        log.warn('easypost_webhook_order_not_found', { trackingNumber });
        return NextResponse.json({ received: true });
      }

      const orderDoc = orderSnap.docs[0];
      const order = orderDoc.data();
      if (order.userId) setRequestUser(order.userId);

      // Update order status in Firestore (WeSupply handles the emails)
      await orderDoc.ref.update({
        shipment_status: tracker.status,
        last_location: tracker.last_location || null,
        last_update_time: tracker.updated_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      log.info('order_shipment_status_updated', { orderId: order.orderId, status: tracker.status });
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    log.error('easypost_webhook_failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    // Always return 200 to prevent retries unless it's an auth issue
    return NextResponse.json({ received: true, error: error instanceof Error ? error.message : 'Unknown error' });
  }
})
