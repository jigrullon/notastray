import { NextResponse } from 'next/server';
import Stripe from 'stripe';

interface CheckoutRequest {
    items: Array<{
        name: string;
        color: string;
        size: string;
        quantity: number;
        price: number;
    }>;
    userEmail?: string;
    userId?: string;
    shippingOption?: {
        service: string;
        cost: number;
        minDays: number;
        maxDays: number;
        displayName: string;
    };
    shippingZipCode?: string;
}

export async function POST(request: Request) {
    if (!process.env.STRIPE_SECRET_KEY) {
        return NextResponse.json({ error: 'Stripe configuration missing' }, { status: 500 });
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
        apiVersion: '2023-10-16' as any,
    });

    try {
        const body: CheckoutRequest = await request.json();
        const { items, userEmail, userId, shippingOption, shippingZipCode } = body;

        const line_items: Stripe.Checkout.SessionCreateParams.LineItem[] = items.map((item) => ({
            price_data: {
                currency: 'usd',
                product_data: {
                    name: `${item.name} - ${item.color} / ${item.size}`,
                },
                unit_amount: Math.round(item.price * 100),
            },
            quantity: item.quantity,
        }));

        const sessionParams: Stripe.Checkout.SessionCreateParams = {
            payment_method_types: ['card'],
            line_items,
            mode: 'payment',
            success_url: `${new URL(request.url).origin}/shop/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${new URL(request.url).origin}/shop/checkout`,
            metadata: {
                userId: userId || '',
                items: JSON.stringify(items.map(i => ({ name: i.name, color: i.color, size: i.size, quantity: i.quantity, price: i.price }))),
                type: 'one_time_purchase',
                shippingOption: shippingOption?.service || '',
                shippingZipCode: shippingZipCode || '',
            },
        };

        // Only add customer_email if provided and not a guest placeholder
        if (userEmail && userEmail !== 'guest@example.com') {
            sessionParams.customer_email = userEmail;
        }

        // Set shipping options
        if (shippingOption) {
            sessionParams.shipping_options = [
                {
                    shipping_rate_data: {
                        type: 'fixed_amount',
                        fixed_amount: { amount: Math.round(shippingOption.cost * 100), currency: 'usd' },
                        display_name: shippingOption.displayName,
                        delivery_estimate: {
                            minimum: { unit: 'business_day', value: shippingOption.minDays },
                            maximum: { unit: 'business_day', value: shippingOption.maxDays },
                        },
                    },
                },
            ];
        } else {
            // Fallback if no shipping option provided (shouldn't happen with new frontend)
            sessionParams.shipping_options = [
                {
                    shipping_rate_data: {
                        type: 'fixed_amount',
                        fixed_amount: { amount: 499, currency: 'usd' },
                        display_name: 'Standard Shipping',
                        delivery_estimate: {
                            minimum: { unit: 'business_day', value: 5 },
                            maximum: { unit: 'business_day', value: 7 },
                        },
                    },
                },
            ];
        }

        sessionParams.shipping_address_collection = {
            allowed_countries: ['US', 'CA'],
        };

        const session = await stripe.checkout.sessions.create(sessionParams);

        return NextResponse.json({ id: session.id, url: session.url });
    } catch (error: any) {
        console.error('Stripe Checkout Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
