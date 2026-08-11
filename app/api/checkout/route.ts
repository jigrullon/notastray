import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { withObservability } from '@/lib/observability/withObservability';
import { log, setRequestUser } from '@/lib/observability/logger';
import { getAttributionFromRequest } from '@/lib/observability/attribution';
import { PRICE_LOOKUP_KEYS, resolvePrice } from '@/lib/stripePricing';

interface CheckoutRequest {
    items: Array<{
        name: string;
        color: string;
        size: string;
        quantity: number;
        // The cart may still send a price for its own display purposes; it is
        // deliberately absent from this type because the server must never read
        // it. The amount charged comes from the Stripe catalog price.
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

export const POST = withObservability('checkout', async (request: Request) => {
    if (!process.env.STRIPE_SECRET_KEY) {
        return NextResponse.json({ error: 'Stripe configuration missing' }, { status: 500 });
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
        apiVersion: '2025-12-15.clover',
    });

    try {
        const body: CheckoutRequest = await request.json();
        const { items, userEmail, userId, shippingOption, shippingZipCode } = body;
        if (userId) setRequestUser(userId);

        const attribution = getAttributionFromRequest(request);

        if (!Array.isArray(items) || items.length === 0) {
            return NextResponse.json({ error: 'Cart is empty' }, { status: 400 });
        }

        // Quantities are the only numbers the client still influences, so they
        // get validated. Anything non-positive or non-integer is a malformed or
        // tampered cart.
        const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
        if (!Number.isInteger(totalQuantity) || totalQuantity < 1 || totalQuantity > 100) {
            return NextResponse.json({ error: 'Invalid cart quantity' }, { status: 400 });
        }

        // Every tag variant shares one catalog price, so this is a single line
        // item at the total quantity. Colour/size live in metadata below —
        // they affect fulfilment, not cost.
        const tagPrice = await resolvePrice(stripe, PRICE_LOOKUP_KEYS.tag);
        const line_items: Stripe.Checkout.SessionCreateParams.LineItem[] = [
            { price: tagPrice.id, quantity: totalQuantity },
        ];

        // Server-side unit price, used only to record what each line cost on the
        // order. Sourced from Stripe rather than the request body, so the order
        // record and the confirmation email can't be skewed by a doctored cart.
        const unitPrice = tagPrice.unitAmount / 100;

        const sessionParams: Stripe.Checkout.SessionCreateParams = {
            payment_method_types: ['card'],
            line_items,
            mode: 'payment',
            automatic_tax: { enabled: true },
            // Shows the "Add promotion code" field on Stripe's hosted checkout.
            // Codes themselves live entirely in the Stripe Dashboard (Products →
            // Coupons → Promotion codes) — adding, expiring, or capping a code
            // needs no deploy. Stripe validates redemption limits and expiry, and
            // recomputes tax on the discounted amount.
            //
            // Mutually exclusive with `discounts: [...]`. If a code ever needs to
            // be auto-applied from a landing page instead of typed, that flag
            // must come out.
            allow_promotion_codes: true,
            success_url: `${new URL(request.url).origin}/shop/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${new URL(request.url).origin}/shop/checkout`,
            metadata: {
                userId: userId || '',
                items: JSON.stringify(items.map(i => ({ name: i.name, color: i.color, size: i.size, quantity: i.quantity, price: unitPrice }))),
                type: 'one_time_purchase',
                shippingOption: shippingOption?.service || '',
                shippingZipCode: shippingZipCode || '',
                utm_source: attribution?.source || '',
                utm_medium: attribution?.medium || '',
                utm_campaign: attribution?.campaign || '',
            },
        };

        // Only add customer_email if provided and not a guest placeholder
        if (userEmail && userEmail !== 'guest@example.com') {
            sessionParams.customer_email = userEmail;
        }

        // Free shipping: always a single $0 "Free Shipping" option.
        sessionParams.shipping_options = [
            {
                shipping_rate_data: {
                    type: 'fixed_amount',
                    fixed_amount: {
                        amount: 0,
                        currency: 'usd',
                    },
                    display_name: 'Free Shipping',
                    delivery_estimate: {
                        minimum: { unit: 'business_day', value: 5 },
                        maximum: { unit: 'business_day', value: 7 },
                    },
                },
            },
        ];

        sessionParams.shipping_address_collection = {
            allowed_countries: ['US'],
        };

        const session = await stripe.checkout.sessions.create(sessionParams);

        return NextResponse.json({ id: session.id, url: session.url });
    } catch (error: any) {
        log.error('checkout_session_failed', { error: error.message });
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
})
