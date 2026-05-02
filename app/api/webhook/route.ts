import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { adminDb } from '@/lib/firebaseAdmin';
import { getOrderConfirmationEmail } from '@/lib/emailTemplates';
import { sendEmail } from '@/lib/sendEmail';

function encodeEmailId(email: string): string {
    return encodeURIComponent(email.toLowerCase().trim()).replace(/\./g, '%2E');
}

async function subscribeToNewsletter(email: string, source: string): Promise<void> {
    if (!email) return;
    const docId = encodeEmailId(email);
    await adminDb.collection('newsletter_subscribers').doc(docId).set({
        email: email.toLowerCase().trim(),
        source,
        status: 'active',
        subscribedAt: new Date().toISOString(),
    }, { merge: true });
}

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

async function writeSubscriptionToFirestore(userId: string, subscription: any): Promise<void> {
    await adminDb.collection('users').doc(userId).set({
        subscription: {
            status: subscription.status,
            plan: subscription.plan,
            stripeSubscriptionId: subscription.stripeSubscriptionId,
            stripeCustomerId: subscription.stripeCustomerId || '',
            currentPeriodEnd: subscription.currentPeriodEnd || '',
            createdAt: new Date().toISOString(),
        },
    }, { merge: true });
    console.log('Subscription written to Firestore for user:', userId);
}

async function writeOrderToFirestore(order: any): Promise<void> {
    await adminDb.collection('orders').doc(order.orderId).set({
        orderId: order.orderId,
        confirmationCode: order.confirmationCode,
        stripeSessionId: order.stripeSessionId,
        stripePaymentIntentId: order.stripePaymentIntentId || '',
        userId: order.userId || '',
        customerEmail: order.customerEmail || '',
        items: order.items,
        subtotal: order.subtotal,
        shippingMethod: order.shippingMethod,
        shippingOption: order.shippingOption || '',
        shippingZipCode: order.shippingZipCode || '',
        shippingCost: order.shippingCost,
        total: order.total,
        shippingAddress: order.shippingAddress,
        estimatedDeliveryMin: order.estimatedDeliveryMin,
        estimatedDeliveryMax: order.estimatedDeliveryMax,
        status: 'confirmed',
        createdAt: new Date().toISOString(),
    });
    console.log('Order written to Firestore:', order.orderId);
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
        const event = stripe.webhooks.constructEvent(bodyText, signature, webhookSecret);

        switch (event.type) {
            case 'checkout.session.completed': {
                const session = event.data.object as Stripe.Checkout.Session;
                console.log('Payment successful for session:', session.id);

                const userId = session.metadata?.userId;
                const isSubscription = session.mode === 'subscription';

                if (userId && isSubscription) {
                    const stripeSubscriptionId = session.subscription as string;
                    if (stripeSubscriptionId) {
                        const stripeSub = await stripe.subscriptions.retrieve(stripeSubscriptionId);
                        const plan = session.metadata?.plan || 'monthly';
                        await writeSubscriptionToFirestore(userId, {
                            status: 'active',
                            plan,
                            stripeSubscriptionId,
                            stripeCustomerId: session.customer as string || '',
                            currentPeriodEnd: new Date((stripeSub as any).current_period_end * 1000).toISOString(),
                        });
                    }
                }

                const fullSession = await stripe.checkout.sessions.retrieve(session.id, {
                    expand: ['line_items', 'shipping_cost.shipping_rate', 'payment_intent'],
                });

                const sessionAny = fullSession as any;
                const shippingAddress = sessionAny.shipping_details?.address;
                const shippingName = sessionAny.shipping_details?.name;
                const shippingRate = fullSession.shipping_cost?.shipping_rate as Stripe.ShippingRate | undefined;
                const shippingDisplayName = shippingRate?.display_name || '';
                const shippingAmount = (fullSession.shipping_cost?.amount_total || 0) / 100;
                const shippingOption = session.metadata?.shippingOption || '';
                const shippingZipCode = session.metadata?.shippingZipCode || '';

                const now = new Date();
                let deliveryMin: Date;
                let deliveryMax: Date;

                if (shippingDisplayName.includes('Expedited')) {
                    deliveryMin = addBusinessDays(now, 2);
                    deliveryMax = addBusinessDays(now, 3);
                } else {
                    deliveryMin = addBusinessDays(now, 5);
                    deliveryMax = addBusinessDays(now, 7);
                }

                const items = JSON.parse(session.metadata?.items || '[]');
                const subtotal = items.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0);
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
                    shippingOption,
                    shippingZipCode,
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

                await writeOrderToFirestore(order);

                // Send order confirmation email
                if (order.customerEmail) {
                    try {
                        const confirmationEmailData = getOrderConfirmationEmail({
                            orderId: order.orderId,
                            confirmationCode: order.confirmationCode,
                            customerName: order.shippingAddress.name,
                            items: order.items,
                            subtotal: order.subtotal,
                            shippingCost: order.shippingCost,
                            total: order.total,
                            estimatedDeliveryMin: order.estimatedDeliveryMin,
                            estimatedDeliveryMax: order.estimatedDeliveryMax,
                            shippingAddress: order.shippingAddress,
                        });

                        await sendEmail({
                            to: order.customerEmail,
                            subject: confirmationEmailData.subject,
                            html: confirmationEmailData.html,
                            text: confirmationEmailData.text,
                        });
                        console.log(`Order confirmation email sent to ${order.customerEmail}`);
                    } catch (emailErr) {
                        console.error('Order confirmation email failed (non-fatal):', emailErr);
                    }
                }

                // Create shipment and generate label
                try {
                    const shipmentResponse = await fetch(
                        `${new URL(request.url).origin}/api/orders/create-and-ship`,
                        {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify(order),
                        }
                    );

                    if (!shipmentResponse.ok) {
                        const error = await shipmentResponse.text();
                        console.error('Shipment creation failed:', error);
                    } else {
                        const result = await shipmentResponse.json();
                        console.log(
                            `Shipment created for order ${order.orderId}: tracking ${result.trackingNumber}`
                        );
                    }
                } catch (shipmentErr) {
                    console.error('Shipment creation failed (non-fatal):', shipmentErr);
                }

                if (order.customerEmail) {
                    try {
                        await subscribeToNewsletter(order.customerEmail, 'purchase');
                        console.log('Newsletter auto-enrolled buyer:', order.customerEmail);
                    } catch (newsletterErr) {
                        console.error('Newsletter auto-enroll failed (non-fatal):', newsletterErr);
                    }
                }

                break;
            }

            case 'customer.subscription.deleted': {
                const canceledSub = event.data.object as Stripe.Subscription;
                const canceledUserId = canceledSub.metadata?.userId;
                if (canceledUserId) {
                    await writeSubscriptionToFirestore(canceledUserId, {
                        status: 'canceled',
                        plan: canceledSub.metadata?.plan || '',
                        stripeSubscriptionId: canceledSub.id,
                        stripeCustomerId: canceledSub.customer as string || '',
                        currentPeriodEnd: new Date((canceledSub as any).current_period_end * 1000).toISOString(),
                    });
                    console.log('Subscription canceled for user:', canceledUserId);
                }
                break;
            }

            case 'customer.subscription.updated': {
                const updatedSub = event.data.object as Stripe.Subscription;
                const updatedUserId = updatedSub.metadata?.userId;
                if (updatedUserId) {
                    await writeSubscriptionToFirestore(updatedUserId, {
                        status: updatedSub.status === 'active' ? 'active' : updatedSub.status,
                        plan: updatedSub.metadata?.plan || '',
                        stripeSubscriptionId: updatedSub.id,
                        stripeCustomerId: updatedSub.customer as string || '',
                        currentPeriodEnd: new Date((updatedSub as any).current_period_end * 1000).toISOString(),
                    });
                }
                break;
            }

            default:
                console.log(`Unhandled event type ${event.type}`);
        }

        return NextResponse.json({ received: true });
    } catch (err: any) {
        console.error(`Webhook Error: ${err.message}`);
        return new Response(`Webhook Error: ${err.message}`, { status: 400 });
    }
}
