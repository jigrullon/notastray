import { NextResponse } from 'next/server';
import Stripe from 'stripe';

function generateOrderId(): string {
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let random = '';
    for (let i = 0; i < 5; i++) {
        random += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `NAS-${dateStr}-${random}`;
}

function generateConfirmationCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `NAS-${code}`;
}

function addBusinessDays(startDate: Date, days: number): Date {
    let current = new Date(startDate);
    let added = 0;
    while (added < days) {
        current.setDate(current.getDate() + 1);
        const dayOfWeek = current.getDay();
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
            added++;
        }
    }
    return current;
}

async function writeOrderToFirestore(order: any): Promise<void> {
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID;
    if (!projectId) {
        console.error('Firebase project ID not configured');
        return;
    }

    const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/orders?documentId=${order.orderId}`;

    const firestoreDoc = {
        fields: {
            orderId: { stringValue: order.orderId },
            confirmationCode: { stringValue: order.confirmationCode },
            stripeSessionId: { stringValue: order.stripeSessionId },
            stripePaymentIntentId: { stringValue: order.stripePaymentIntentId || '' },
            userId: { stringValue: order.userId || '' },
            customerEmail: { stringValue: order.customerEmail || '' },
            items: {
                arrayValue: {
                    values: order.items.map((item: any) => ({
                        mapValue: {
                            fields: {
                                name: { stringValue: item.name },
                                color: { stringValue: item.color },
                                size: { stringValue: item.size },
                                quantity: { integerValue: String(item.quantity) },
                                unitPrice: { doubleValue: item.price },
                            }
                        }
                    }))
                }
            },
            subtotal: { doubleValue: order.subtotal },
            shippingMethod: { stringValue: order.shippingMethod },
            shippingCost: { doubleValue: order.shippingCost },
            total: { doubleValue: order.total },
            shippingAddress: {
                mapValue: {
                    fields: {
                        name: { stringValue: order.shippingAddress?.name || '' },
                        line1: { stringValue: order.shippingAddress?.line1 || '' },
                        line2: { stringValue: order.shippingAddress?.line2 || '' },
                        city: { stringValue: order.shippingAddress?.city || '' },
                        state: { stringValue: order.shippingAddress?.state || '' },
                        postalCode: { stringValue: order.shippingAddress?.postalCode || '' },
                        country: { stringValue: order.shippingAddress?.country || '' },
                    }
                }
            },
            estimatedDeliveryMin: { stringValue: order.estimatedDeliveryMin },
            estimatedDeliveryMax: { stringValue: order.estimatedDeliveryMax },
            status: { stringValue: 'confirmed' },
            createdAt: { stringValue: new Date().toISOString() },
        }
    };

    const response = await fetch(firestoreUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(firestoreDoc),
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error('Firestore write error:', errorText);
    } else {
        console.log('Order written to Firestore:', order.orderId);
    }
}

export async function POST(request: Request) {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!process.env.STRIPE_SECRET_KEY || !webhookSecret) {
        return new Response('Stripe configuration missing', { status: 500 });
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
        apiVersion: '2023-10-16' as any,
    });

    const signature = request.headers.get('stripe-signature');

    if (!signature) {
        return new Response('No signature provided', { status: 400 });
    }

    try {
        const bodyText = await request.text();
        const event = stripe.webhooks.constructEvent(
            bodyText,
            signature,
            webhookSecret
        );

        // Handle the event
        switch (event.type) {
            case 'checkout.session.completed':
                const session = event.data.object as Stripe.Checkout.Session;
                console.log('Payment successful for session:', session.id);

                // Retrieve userId from metadata
                const userId = session.metadata?.userId;
                const isSubscription = session.mode === 'subscription';

                if (userId) {
                    console.log(`Processing ${isSubscription ? 'subscription' : 'purchase'} for user ${userId}`);

                    if (isSubscription) {
                        console.log(`[Mock Action] Granting 'plus' tier to user ${userId}`);
                    }
                }

                // Retrieve full session with expanded data for order creation
                const fullSession = await stripe.checkout.sessions.retrieve(session.id, {
                    expand: ['line_items', 'shipping_cost.shipping_rate', 'payment_intent'],
                });

                // Extract shipping details
                const sessionAny = fullSession as any;
                const shippingAddress = sessionAny.shipping_details?.address;
                const shippingName = sessionAny.shipping_details?.name;
                const shippingRate = fullSession.shipping_cost?.shipping_rate as Stripe.ShippingRate | undefined;
                const shippingDisplayName = shippingRate?.display_name || '';
                const shippingAmount = (fullSession.shipping_cost?.amount_total || 0) / 100;

                // Calculate delivery dates based on shipping method
                const now = new Date();
                let deliveryMin: Date;
                let deliveryMax: Date;

                if (shippingDisplayName.includes('Expedited')) {
                    deliveryMin = addBusinessDays(now, 2);
                    deliveryMax = addBusinessDays(now, 3);
                } else {
                    // Default to standard shipping
                    deliveryMin = addBusinessDays(now, 5);
                    deliveryMax = addBusinessDays(now, 7);
                }

                // Parse items from metadata
                const items = JSON.parse(session.metadata?.items || '[]');

                // Calculate subtotal from items
                const subtotal = items.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0);

                // Build order object
                const paymentIntent = fullSession.payment_intent as Stripe.PaymentIntent | null;
                const order = {
                    orderId: generateOrderId(),
                    confirmationCode: generateConfirmationCode(),
                    stripeSessionId: session.id,
                    stripePaymentIntentId: paymentIntent?.id || '',
                    userId: userId || '',
                    customerEmail: fullSession.customer_email || session.customer_details?.email || '',
                    items,
                    subtotal,
                    shippingMethod: shippingDisplayName,
                    shippingCost: shippingAmount,
                    total: subtotal + shippingAmount,
                    shippingAddress: {
                        name: shippingName || '',
                        line1: shippingAddress?.line1 || '',
                        line2: shippingAddress?.line2 || '',
                        city: shippingAddress?.city || '',
                        state: shippingAddress?.state || '',
                        postalCode: shippingAddress?.postal_code || '',
                        country: shippingAddress?.country || '',
                    },
                    estimatedDeliveryMin: deliveryMin.toISOString().slice(0, 10),
                    estimatedDeliveryMax: deliveryMax.toISOString().slice(0, 10),
                };

                // Write order to Firestore
                await writeOrderToFirestore(order);

                break;

            default:
                console.log(`Unhandled event type ${event.type}`);
        }

        return NextResponse.json({ received: true });
    } catch (err: any) {
        console.error(`Webhook Error: ${err.message}`);
        return new Response(`Webhook Error: ${err.message}`, { status: 400 });
    }
}
