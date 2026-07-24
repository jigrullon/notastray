import { adminDb } from '@/lib/firebaseAdmin';
import { log } from './logger';

/**
 * Slow-moving product-usage counters (e.g. "is anyone using Rescue Crew")
 * belong in Firestore, not Loki — they're queried by count/aggregation for
 * the business dashboard, not tailed as a log stream.
 */
export type ProductEventType =
  | 'rescue_crew_contact_created'
  | 'rescue_crew_viewed'
  | 'subscription_started'
  | 'subscription_canceled';

interface ProductEventFields {
  [key: string]: string | number | boolean | undefined;
}

/**
 * Fire-and-forget-style event write: failures are logged but never thrown,
 * so a product_events write can never break the feature it's measuring.
 */
export async function logProductEvent(type: ProductEventType, fields: ProductEventFields): Promise<void> {
  try {
    await adminDb.collection('product_events').add({
      type,
      ...fields,
      createdAt: new Date().toISOString(),
    });
  } catch (error) {
    log.warn('product_event_write_failed', {
      eventType: type,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
