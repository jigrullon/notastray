import { NextResponse } from 'next/server';
import Stripe from 'stripe';

interface CancelRequest {
    subscriptionId: string;
}

export async function POST(request: Request) {
    if (!process.env.STRIPE_SECRET_KEY) {
        return NextResponse.json({ error: 'Stripe configuration missing' }, { status: 500 });
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
        apiVersion: '2023-10-16' as any,
    });

    try {
        const body: CancelRequest = await request.json();
        const { subscriptionId } = body;

        if (!subscriptionId) {
            return NextResponse.json({ error: 'Subscription ID is required' }, { status: 400 });
        }

        const subscription = await stripe.subscriptions.cancel(subscriptionId);

        return NextResponse.json({ status: subscription.status });
    } catch (error: any) {
        console.error('Stripe Cancel Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
