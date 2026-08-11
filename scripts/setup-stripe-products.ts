/**
 * Create the Stripe product catalog (Products + Prices) this app charges from.
 *
 * Run once per Stripe mode. Which mode you hit is decided entirely by the secret
 * key, so run it once with your sk_test_... key and again with sk_live_...:
 *
 *   Dry run (default — prints what it would create, changes nothing):
 *     npm run stripe:setup
 *
 *   Create for real:
 *     npm run stripe:setup -- --confirm
 *
 *   Against live mode:
 *     STRIPE_SECRET_KEY=sk_live_... npm run stripe:setup -- --confirm
 *
 * STRIPE_SECRET_KEY is loaded from .env.local or .dev.vars by scripts/run.js;
 * an already-set environment variable wins, which is how you target live mode.
 *
 * Idempotent: prices are looked up by `lookup_key` first, so re-running reports
 * what already exists rather than creating duplicates.
 *
 * To CHANGE a price later, do NOT edit here — Stripe prices are immutable. In
 * the Dashboard, create a new price, move the lookup key onto it (a lookup key
 * can only be on one active price at a time), and archive the old one.
 */

import Stripe from 'stripe';
import { PRICE_LOOKUP_KEYS } from '../lib/stripePricing';

interface PriceSpec {
    lookupKey: string;
    productName: string;
    productDescription: string;
    unitAmount: number; // cents
    interval?: 'month' | 'year';
}

// The catalog this app expects. Amounts mirror what was previously hardcoded in
// the route handlers, so running this changes no prices.
const CATALOG: PriceSpec[] = [
    {
        lookupKey: PRICE_LOOKUP_KEYS.tag,
        productName: 'NotAStray Smart Pet Tag',
        productDescription: 'QR code pet ID tag. All colours and sizes are the same price.',
        unitAmount: 1850,
    },
    {
        lookupKey: PRICE_LOOKUP_KEYS.protectMonthly,
        productName: 'PROTECT Plan',
        productDescription: 'Monthly PROTECT plan — instant SMS/Email alerts, advanced location tracking, and detailed medical profile.',
        unitAmount: 300,
        interval: 'month',
    },
    {
        lookupKey: PRICE_LOOKUP_KEYS.protectYearly,
        productName: 'PROTECT Plan',
        productDescription: 'Annual PROTECT plan — instant SMS/Email alerts, advanced location tracking, and detailed medical profile.',
        unitAmount: 3000,
        interval: 'year',
    },
];

// Both PROTECT prices belong on one Product, so Stripe reporting treats monthly
// and annual as the same thing and a coupon scoped to that product covers both.
async function findOrCreateProduct(
    stripe: Stripe,
    name: string,
    description: string,
    created: Map<string, string>,
    confirm: boolean
): Promise<string> {
    const alreadyMade = created.get(name);
    if (alreadyMade) return alreadyMade;

    const existing = await stripe.products.search({ query: `name:'${name}' AND active:'true'` });
    if (existing.data.length > 0) {
        const id = existing.data[0].id;
        console.log(`  product exists: ${name} (${id})`);
        created.set(name, id);
        return id;
    }

    if (!confirm) {
        console.log(`  WOULD CREATE product: ${name}`);
        created.set(name, 'prod_dryrun');
        return 'prod_dryrun';
    }

    const product = await stripe.products.create({ name, description });
    console.log(`  created product: ${name} (${product.id})`);
    created.set(name, product.id);
    return product.id;
}

async function main() {
    const confirm = process.argv.includes('--confirm');

    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
        console.error('STRIPE_SECRET_KEY not found in .env.local, .dev.vars, or the environment.');
        process.exit(1);
    }
    if (!key.startsWith('sk_')) {
        console.error(`STRIPE_SECRET_KEY does not look like a Stripe secret key ("${key.slice(0, 12)}...").`);
        console.error('Check .env.local — a placeholder like "sk_test_..." will fail authentication.');
        process.exit(1);
    }

    const mode = key.startsWith('sk_live_') ? 'LIVE' : 'TEST';
    const stripe = new Stripe(key, { apiVersion: '2025-12-15.clover' });

    console.log(`\nStripe mode: ${mode}`);
    if (mode === 'LIVE') {
        console.log('This will create real catalog entries in your live account.');
    }
    console.log('');

    const productIds = new Map<string, string>();

    for (const spec of CATALOG) {
        console.log(`${spec.lookupKey}:`);

        const existing = await stripe.prices.list({ lookup_keys: [spec.lookupKey], active: true, limit: 1 });
        if (existing.data.length > 0) {
            const price = existing.data[0];
            console.log(`  price exists: ${price.id} ($${((price.unit_amount ?? 0) / 100).toFixed(2)})`);
            console.log('');
            continue;
        }

        const productId = await findOrCreateProduct(
            stripe,
            spec.productName,
            spec.productDescription,
            productIds,
            confirm
        );

        if (!confirm) {
            const recurring = spec.interval ? `/${spec.interval}` : '';
            console.log(`  WOULD CREATE price: $${(spec.unitAmount / 100).toFixed(2)}${recurring} (lookup_key: ${spec.lookupKey})`);
            console.log('');
            continue;
        }

        const price = await stripe.prices.create({
            product: productId,
            currency: 'usd',
            unit_amount: spec.unitAmount,
            lookup_key: spec.lookupKey,
            ...(spec.interval && { recurring: { interval: spec.interval } }),
        });
        console.log(`  created price: ${price.id} ($${(spec.unitAmount / 100).toFixed(2)})`);
        console.log('');
    }

    if (!confirm) {
        console.log('Dry run — nothing was created. Re-run with --confirm.');
    } else {
        console.log('Done. Catalog ready for this Stripe mode.');
    }
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
