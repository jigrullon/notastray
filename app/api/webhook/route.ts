import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { adminDb } from '@/lib/firebaseAdmin';
import { getOrderConfirmationEmail, getMerchantOrderEmail, getSubscriptionConfirmationEmail, getMerchantSubscriptionEmail } from '@/lib/emailTemplates';
import { sendEmail } from '@/lib/sendEmail';
import { createShipment, calculateShipmentWeightOz } from '@/lib/easypost';
import { withObservability } from '@/lib/observability/withObservability';
import { log, setRequestUser } from '@/lib/observability/logger';
import { logProductEvent } from '@/lib/observability/productEvents';

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

interface AcquisitionInfo {
    source: string;
    medium: string;
    campaign: string;
}

interface SubscriptionRecord {
    status: string;
    plan: string;
    stripeSubscriptionId: string;
    stripeCustomerId?: string;
    currentPeriodEnd?: string;
    // Only set on creation — omitted on cancel/update writes so merge:true
    // leaves the original first-touch acquisition value in place.
    acquisition?: AcquisitionInfo;
}

async function writeSubscriptionToFirestore(userId: string, subscription: SubscriptionRecord): Promise<void> {
    await adminDb.collection('users').doc(userId).set({
        subscription: {
            status: subscription.status,
            plan: subscription.plan,
            stripeSubscriptionId: subscription.stripeSubscriptionId,
            stripeCustomerId: subscription.stripeCustomerId || '',
            currentPeriodEnd: subscription.currentPeriodEnd || '',
            createdAt: new Date().toISOString(),
            ...(subscription.acquisition && { acquisition: subscription.acquisition }),
        },
    }, { merge: true });
    log.info('subscription_written', { userId, status: subscription.status });
}

interface OrderItem {
    name: string;
    color: string;
    size: string;
    quantity: number;
    price: number;
}

interface OrderRecord {
    orderId: string;
    confirmationCode: string;
    stripeSessionId: string;
    stripePaymentIntentId?: string;
    userId?: string;
    customerEmail?: string;
    items: OrderItem[];
    subtotal: number;
    shippingMethod: string;
    shippingOption?: string;
    shippingZipCode?: string;
    shippingCost: number;
    tax?: number;
    // Total promotion-code discount applied, in dollars. 0 when no code was used.
    discount?: number;
    total: number;
    shippingAddress: {
        name: string;
        line1: string;
        line2: string;
        city: string;
        state: string;
        postalCode: string;
        country: string;
    };
    estimatedDeliveryMin: string;
    estimatedDeliveryMax: string;
    acquisition?: AcquisitionInfo;
}

async function writeOrderToFirestore(order: OrderRecord): Promise<void> {
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
        tax: order.tax || 0,
        discount: order.discount || 0,
        total: order.total,
        shippingAddress: order.shippingAddress,
        estimatedDeliveryMin: order.estimatedDeliveryMin,
        estimatedDeliveryMax: order.estimatedDeliveryMax,
        acquisition: order.acquisition || null,
        status: 'confirmed',
        createdAt: new Date().toISOString(),
    });
    log.info('order_written', { orderId: order.orderId, total: order.total });
}

export const POST = withObservability('webhook', async (request: Request) => {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!process.env.STRIPE_SECRET_KEY || !webhookSecret) {
        return new Response('Stripe configuration missing', { status: 500 });
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
        apiVersion: '2025-12-15.clover',
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
                log.info('payment_successful', { sessionId: session.id, mode: session.mode });

                const userId = session.metadata?.userId;
                if (userId) setRequestUser(userId);
                const isSubscription = session.mode === 'subscription';

                let stripeSub: Stripe.Subscription | null = null;
                const plan = (session.metadata?.plan as 'monthly' | 'yearly') || 'monthly';
                const acquisition: AcquisitionInfo = {
                    source: session.metadata?.utm_source || '',
                    medium: session.metadata?.utm_medium || '',
                    campaign: session.metadata?.utm_campaign || '',
                };

                if (isSubscription) {
                    const stripeSubscriptionId = session.subscription as string;
                    if (stripeSubscriptionId) {
                        stripeSub = await stripe.subscriptions.retrieve(stripeSubscriptionId);
                        if (userId) {
                            await writeSubscriptionToFirestore(userId, {
                                status: 'active',
                                plan,
                                stripeSubscriptionId,
                                stripeCustomerId: session.customer as string || '',
                                currentPeriodEnd: new Date(stripeSub.items.data[0].current_period_end * 1000).toISOString(),
                                acquisition,
                            });
                            await logProductEvent('subscription_started', { userId, plan });
                        }
                    }
                }

                if (isSubscription) {
                    const customerEmail = session.customer_email || session.customer_details?.email || '';

                    // Recurring price straight from the Stripe price object, so
                    // these emails stay correct if the plan price ever changes in
                    // Stripe. Falls back to current list pricing only if absent.
                    const recurringUnitAmount = stripeSub?.items.data[0]?.price?.unit_amount;
                    const planPrice = typeof recurringUnitAmount === 'number'
                        ? recurringUnitAmount / 100
                        : (plan === 'yearly' ? 30 : 3);

                    // What Stripe actually charged for the first period. Differs
                    // from planPrice when a promotion code applied (e.g. first
                    // month free, or a Black Friday discount on the annual plan),
                    // so the emails can show "paid today" vs "renews at" instead
                    // of quoting a price the customer wasn't charged.
                    const amountPaidToday = typeof session.amount_total === 'number'
                        ? session.amount_total / 100
                        : undefined;
                    const renewalDate = stripeSub
                        ? new Date(stripeSub.items.data[0].current_period_end * 1000).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                          })
                        : '';
                    const dashboardUrl = `${new URL(request.url).origin}/dashboard`;

                    // Send subscription confirmation email to customer
                    if (customerEmail) {
                        try {
                            const subscriptionEmailData = getSubscriptionConfirmationEmail({
                                customerName: session.customer_details?.name || undefined,
                                planType: plan,
                                planPrice,
                                amountPaidToday,
                                renewalDate,
                                dashboardUrl,
                                userEmail: customerEmail,
                            });

                            await sendEmail({
                                to: customerEmail,
                                subject: subscriptionEmailData.subject,
                                html: subscriptionEmailData.html,
                                text: subscriptionEmailData.text,
                            });
                            log.info('subscription_confirmation_email_sent', {});
                        } catch (emailErr) {
                            log.error('subscription_confirmation_email_failed', {
                                error: emailErr instanceof Error ? emailErr.message : String(emailErr),
                            });
                        }
                    }

                    // Send merchant new-subscriber notification
                    const subMerchantEmail = process.env.MERCHANT_EMAIL;
                    if (subMerchantEmail) {
                        try {
                            const merchantSubEmailData = getMerchantSubscriptionEmail({
                                customerEmail,
                                customerName: session.customer_details?.name || undefined,
                                planType: plan,
                                planPrice,
                                amountPaidToday,
                            });

                            await sendEmail({
                                to: subMerchantEmail,
                                subject: merchantSubEmailData.subject,
                                html: merchantSubEmailData.html,
                                text: merchantSubEmailData.text,
                            });
                            log.info('merchant_subscription_notification_sent', {});
                        } catch (emailErr) {
                            log.error('merchant_subscription_email_failed', {
                                error: emailErr instanceof Error ? emailErr.message : String(emailErr),
                            });
                        }
                    }

                    // Auto-enroll subscriber in newsletter
                    if (customerEmail) {
                        try {
                            await subscribeToNewsletter(customerEmail, 'purchase');
                            log.info('newsletter_auto_enrolled', { source: 'subscription' });
                        } catch (newsletterErr) {
                            log.error('newsletter_auto_enroll_failed', {
                                source: 'subscription',
                                error: newsletterErr instanceof Error ? newsletterErr.message : String(newsletterErr),
                            });
                        }
                    }

                    break;
                }

                // One-time tag purchase flow
                const fullSession = await stripe.checkout.sessions.retrieve(session.id, {
                    expand: ['line_items', 'shipping_cost.shipping_rate', 'payment_intent'],
                });

                const shippingDetails = fullSession.collected_information?.shipping_details;
                const shippingAddress = shippingDetails?.address;
                const shippingName = shippingDetails?.name;
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

                const items = JSON.parse(session.metadata?.items || '[]') as OrderItem[];
                // Pre-discount, pre-tax amount straight from Stripe. The metadata
                // sum is only a fallback: it's written server-side from the
                // catalog price, so it agrees with Stripe, but Stripe is the
                // authority on what was actually billed.
                const subtotal = typeof fullSession.amount_subtotal === 'number'
                    ? fullSession.amount_subtotal / 100
                    : items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
                const taxAmount = (fullSession.total_details?.amount_tax || 0) / 100;
                const discountAmount = (fullSession.total_details?.amount_discount || 0) / 100;
                const paymentIntent = fullSession.payment_intent as Stripe.PaymentIntent | null;

                // Use Stripe's amount_total — the amount actually charged — rather
                // than recomputing from cart metadata. Recomputing ignores any
                // promotion code, so a discounted order would be recorded, emailed,
                // and reported at full price. Falls back to the computed sum only
                // if amount_total is somehow absent.
                const total = typeof fullSession.amount_total === 'number'
                    ? fullSession.amount_total / 100
                    : subtotal + shippingAmount + taxAmount - discountAmount;

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
                    tax: taxAmount,
                    discount: discountAmount,
                    total,
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
                    acquisition,
                };

                await writeOrderToFirestore(order);

                // Create shipment in EasyPost
                try {
                    const shipmentResponse = await createShipment({
                        toAddress: {
                            name: order.shippingAddress.name,
                            street1: order.shippingAddress.line1,
                            street2: order.shippingAddress.line2,
                            city: order.shippingAddress.city,
                            state: order.shippingAddress.state,
                            zip: order.shippingAddress.postalCode,
                            country: order.shippingAddress.country || 'US',
                            // Required for WeSupply to auto-subscribe the buyer
                            // to shipping notification emails
                            email: order.customerEmail || undefined,
                            phone: session.customer_details?.phone || undefined,
                        },
                        reference: order.orderId,
                        // Weight scales with tag count: envelope + per-tag weight
                        weightOz: calculateShipmentWeightOz(
                            order.items.reduce((sum, item) => sum + (item.quantity || 1), 0)
                        ),
                    });

                    // Update order with shipment info
                    await adminDb.collection('orders').doc(order.orderId).update({
                        tracking_number: shipmentResponse.tracking_number,
                        shipment_id: shipmentResponse.shipment_id,
                        label_url: shipmentResponse.label_url,
                        shipment_status: 'label_created',
                        updated_at: new Date().toISOString(),
                    });

                    log.info('easypost_shipment_created', {
                        orderId: order.orderId,
                        trackingNumber: shipmentResponse.tracking_number,
                    });
                } catch (easypostErr) {
                    log.error('easypost_shipment_creation_failed', {
                        orderId: order.orderId,
                        error: easypostErr instanceof Error ? easypostErr.message : String(easypostErr),
                    })
                    // Don't fail the webhook if EasyPost fails - order is still valid
                }

                // Send order confirmation email
                if (order.customerEmail) {
                    try {
                        const confirmationEmailData = getOrderConfirmationEmail({
                            orderId: order.orderId,
                            confirmationCode: order.confirmationCode,
                            orderConfirmationUrl: `https://notastray.com/shop/success?session_id=${encodeURIComponent(order.stripeSessionId)}`,
                            customerName: order.shippingAddress.name,
                            items: order.items,
                            subtotal: order.subtotal,
                            shippingCost: order.shippingCost,
                            discount: order.discount,
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
                        log.info('order_confirmation_email_sent', { orderId: order.orderId });
                    } catch (emailErr) {
                        log.error('order_confirmation_email_failed', {
                            orderId: order.orderId,
                            error: emailErr instanceof Error ? emailErr.message : String(emailErr),
                        });
                    }
                }

                // Send merchant fulfillment email
                const merchantEmail = process.env.MERCHANT_EMAIL;
                if (merchantEmail) {
                    try {
                        const merchantEmailData = getMerchantOrderEmail({
                            orderId: order.orderId,
                            confirmationCode: order.confirmationCode,
                            customerEmail: order.customerEmail,
                            customerName: order.shippingAddress.name,
                            items: order.items,
                            subtotal: order.subtotal || order.total,
                            shippingCost: order.shippingCost || 0,
                            tax: order.tax || 0,
                            discount: order.discount,
                            total: order.total,
                            shippingAddress: order.shippingAddress,
                        });

                        await sendEmail({
                            to: merchantEmail,
                            subject: merchantEmailData.subject,
                            html: merchantEmailData.html,
                            text: merchantEmailData.text,
                        });
                        log.info('merchant_order_notification_sent', { orderId: order.orderId });
                    } catch (emailErr) {
                        log.error('merchant_order_email_failed', {
                            orderId: order.orderId,
                            error: emailErr instanceof Error ? emailErr.message : String(emailErr),
                        });
                    }
                }


                if (order.customerEmail) {
                    try {
                        await subscribeToNewsletter(order.customerEmail, 'purchase');
                        log.info('newsletter_auto_enrolled', { source: 'order', orderId: order.orderId });
                    } catch (newsletterErr) {
                        log.error('newsletter_auto_enroll_failed', {
                            source: 'order',
                            orderId: order.orderId,
                            error: newsletterErr instanceof Error ? newsletterErr.message : String(newsletterErr),
                        });
                    }
                }

                break;
            }

            case 'customer.subscription.deleted': {
                const canceledSub = event.data.object as Stripe.Subscription;
                const canceledUserId = canceledSub.metadata?.userId;
                if (canceledUserId) {
                    setRequestUser(canceledUserId);
                    await writeSubscriptionToFirestore(canceledUserId, {
                        status: 'canceled',
                        plan: canceledSub.metadata?.plan || '',
                        stripeSubscriptionId: canceledSub.id,
                        stripeCustomerId: canceledSub.customer as string || '',
                        currentPeriodEnd: new Date(canceledSub.items.data[0].current_period_end * 1000).toISOString(),
                    });
                    log.info('subscription_canceled', { userId: canceledUserId });
                    await logProductEvent('subscription_canceled', { userId: canceledUserId });
                }
                break;
            }

            case 'customer.subscription.updated': {
                const updatedSub = event.data.object as Stripe.Subscription;
                const updatedUserId = updatedSub.metadata?.userId;
                if (updatedUserId) {
                    setRequestUser(updatedUserId);
                    await writeSubscriptionToFirestore(updatedUserId, {
                        status: updatedSub.status === 'active' ? 'active' : updatedSub.status,
                        plan: updatedSub.metadata?.plan || '',
                        stripeSubscriptionId: updatedSub.id,
                        stripeCustomerId: updatedSub.customer as string || '',
                        currentPeriodEnd: new Date(updatedSub.items.data[0].current_period_end * 1000).toISOString(),
                    });
                }
                break;
            }

            default:
                log.info('webhook_event_unhandled', { eventType: event.type });
        }

        return NextResponse.json({ received: true });
    } catch (err: any) {
        log.error('webhook_error', { error: err.message });
        return new Response(`Webhook Error: ${err.message}`, { status: 400 });
    }
})
