import Stripe from 'stripe';
import type { PagesFunction } from '../types';

interface Env {
  STRIPE_SECRET_KEY: string;
}

interface CheckoutRequest {
  items: Array<{
    priceId?: string; // For subscriptions
    name?: string;    // For one-time items (if dynamic)
    amount?: number;  // For one-time items
    quantity: number;
    currency?: string;
  }>;
  subscription?: boolean; // Flag to indicate if this includes a subscription
  userEmail?: string;
  userId?: string; // Firebase UID
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  if (!env.STRIPE_SECRET_KEY) {
    return new Response(JSON.stringify({ error: 'Stripe configuration missing' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
    apiVersion: '2023-10-16', // Use a recent API version
  });

  try {
    const body: CheckoutRequest = await request.json();
    const { items, subscription, userEmail, userId } = body;

    const line_items: Stripe.Checkout.SessionCreateParams.LineItem[] = items.map((item) => {
      if (item.priceId) {
        // Existing product/price (e.g. subscription)
        return {
          price: item.priceId,
          quantity: item.quantity,
        };
      } else {
        // One-time product created on the fly
        return {
          price_data: {
            currency: item.currency || 'usd',
            product_data: {
              name: item.name || 'Product',
            },
            unit_amount: Math.round((item.amount || 0) * 100), // Stripe expects cents
          },
          quantity: item.quantity,
        };
      }
    });

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: line_items,
      mode: subscription ? 'subscription' : 'payment',
      success_url: `${new URL(request.url).origin}/shop/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${new URL(request.url).origin}/shop/checkout`,
      customer_email: userEmail,
      metadata: {
        userId: userId || '',
        ...((subscription) ? { type: 'subscription_upgrade' } : { type: 'one_time_purchase' }),
      },
    });

    return new Response(JSON.stringify({ id: session.id, url: session.url }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Stripe Checkout Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
