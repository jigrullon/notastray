import { NextResponse } from 'next/server';
import Stripe from 'stripe';

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

                    // TODO: Implement actual Firebase update here using firebase-admin
                    if (isSubscription) {
                        console.log(`[Mock Action] Granting 'plus' tier to user ${userId}`);
                    }
                }
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
