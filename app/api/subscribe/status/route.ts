import { NextResponse } from 'next/server';
import Stripe from 'stripe';

export async function POST(request: Request) {
    if (!process.env.STRIPE_SECRET_KEY) {
        return NextResponse.json({ error: 'Stripe configuration missing' }, { status: 500 });
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
        apiVersion: '2023-10-16' as any,
    });

    try {
        const { userEmail, userId } = await request.json();

        // First check Firestore
        const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID;
        if (projectId && userId) {
            try {
                const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users/${userId}`;
                const fsResponse = await fetch(firestoreUrl, { method: 'GET' });
                if (fsResponse.ok) {
                    const doc = await fsResponse.json();
                    const subFields = doc.fields?.subscription?.mapValue?.fields;
                    if (subFields?.status?.stringValue === 'active') {
                        return NextResponse.json({
                            status: 'active',
                            plan: subFields.plan?.stringValue || 'monthly',
                            stripeSubscriptionId: subFields.stripeSubscriptionId?.stringValue || '',
                            currentPeriodEnd: subFields.currentPeriodEnd?.stringValue || '',
                        });
                    }
                }
            } catch (e) {
                console.error('Firestore check failed, falling back to Stripe:', e);
            }
        }

        // Fallback: check Stripe directly by email
        if (userEmail && userEmail !== 'guest@example.com') {
            const customers = await stripe.customers.list({ email: userEmail, limit: 5 });
            for (const customer of customers.data) {
                const subs = await stripe.subscriptions.list({
                    customer: customer.id,
                    status: 'active',
                    limit: 1,
                });
                if (subs.data.length > 0) {
                    const sub = subs.data[0];
                    const plan = sub.metadata?.plan ||
                        (sub.items.data[0]?.price?.recurring?.interval === 'year' ? 'yearly' : 'monthly');

                    // Sync back to Firestore if userId is available
                    if (projectId && userId) {
                        try {
                            const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users/${userId}?updateMask.fieldPaths=subscription`;
                            await fetch(firestoreUrl, {
                                method: 'PATCH',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    fields: {
                                        subscription: {
                                            mapValue: {
                                                fields: {
                                                    status: { stringValue: 'active' },
                                                    plan: { stringValue: plan },
                                                    stripeSubscriptionId: { stringValue: sub.id },
                                                    stripeCustomerId: { stringValue: customer.id },
                                                    currentPeriodEnd: { stringValue: new Date((sub as any).current_period_end * 1000).toISOString() },
                                                    createdAt: { stringValue: new Date(sub.created * 1000).toISOString() },
                                                }
                                            }
                                        }
                                    }
                                }),
                            });
                        } catch (e) {
                            console.error('Failed to sync subscription to Firestore:', e);
                        }
                    }

                    return NextResponse.json({
                        status: 'active',
                        plan,
                        stripeSubscriptionId: sub.id,
                        currentPeriodEnd: new Date((sub as any).current_period_end * 1000).toISOString(),
                    });
                }
            }
        }

        return NextResponse.json({ status: 'none' });
    } catch (error: any) {
        console.error('Subscription status error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
