import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { adminDb } from '@/lib/firebaseAdmin';

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

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('session_id');

    if (!sessionId) {
        return NextResponse.json({ error: 'session_id is required' }, { status: 400 });
    }

    if (!process.env.STRIPE_SECRET_KEY) {
        return NextResponse.json({ error: 'Stripe configuration missing' }, { status: 500 });
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
        apiVersion: '2023-10-16' as any,
    });

    try {
        const fullSession = await stripe.checkout.sessions.retrieve(sessionId, {
            expand: ['line_items', 'shipping_cost.shipping_rate', 'payment_intent'],
        });

        if (fullSession.payment_status !== 'paid') {
            return NextResponse.json({ error: 'Payment not completed' }, { status: 400 });
        }

        // Look up the order in Firestore by Stripe session ID
        const snapshot = await adminDb
            .collection('orders')
            .where('stripeSessionId', '==', sessionId)
            .limit(1)
            .get();

        if (!snapshot.empty) {
            return NextResponse.json(snapshot.docs[0].data());
        }

        // Fallback: construct from Stripe session (handles webhook race condition)
        const items = JSON.parse(fullSession.metadata?.items || '[]');
        const subtotal = items.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0);

        const sessionAny = fullSession as any;
        const shippingAddress = sessionAny.shipping_details?.address;
        const shippingName = sessionAny.shipping_details?.name;
        const shippingRate = fullSession.shipping_cost?.shipping_rate as Stripe.ShippingRate | undefined;
        const shippingDisplayName = shippingRate?.display_name || '';
        const shippingAmount = (fullSession.shipping_cost?.amount_total || 0) / 100;

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

        const paymentIntent = fullSession.payment_intent as Stripe.PaymentIntent | null;

        const fallbackOrder = {
            orderId: generateOrderId(),
            confirmationCode: generateConfirmationCode(),
            stripeSessionId: sessionId,
            stripePaymentIntentId: paymentIntent?.id || '',
            userId: fullSession.metadata?.userId || '',
            customerEmail: fullSession.customer_email || fullSession.customer_details?.email || '',
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
            status: 'confirmed',
            createdAt: new Date().toISOString(),
        };

        return NextResponse.json(fallbackOrder);
    } catch (error: any) {
        console.error('Order verification error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
