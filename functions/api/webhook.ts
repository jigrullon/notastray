
import Stripe from 'stripe';

interface Env {
  STRIPE_SECRET_KEY: string;
  STRIPE_WEBHOOK_SECRET: string;
  FIREBASE_PROJECT_ID: string;
  FIREBASE_CLIENT_EMAIL: string;
  FIREBASE_PRIVATE_KEY: string;
}

// @ts-ignore
export const onRequestPost = async (context: any) => {
  const { request, env } = context;

  if (!env.STRIPE_SECRET_KEY || !env.STRIPE_WEBHOOK_SECRET) {
    return new Response('Stripe configuration missing', { status: 500 });
  }

  const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
    apiVersion: '2023-10-16' as any,
  });

  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return new Response('No signature provided', { status: 400 });
  }

  try {
    const bodyText = await request.text();
    const event = await stripe.webhooks.constructEventAsync(
      bodyText,
      signature,
      env.STRIPE_WEBHOOK_SECRET
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
          
          // TODO: Implement actual Firebase update here
          // We needs to either:
          // 1. Use Firebase Admin SDK (if compatible with Workers/Pages)
          // 2. Use Firestore REST API to patch the user document
          // 3. Set a Custom Claim via Auth REST API
          
          // For now, we will log the intended action
          if (isSubscription) {
             console.log(`[Mock Action] Granting 'plus' tier to user ${userId}`);
             // await updateUserTier(userId, 'plus'); 
          }
        }
        break;
        
      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error(`Webhook Error: ${err.message}`);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }
};
