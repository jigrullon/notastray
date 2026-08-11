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
 *   Against live mode (reads STRIPE_LIVE_SECRET_KEY, see below):
 *     npm run stripe:setup -- --live
 *     npm run stripe:setup -- --live --confirm
 *
 * Keys are loaded from .env.local or .dev.vars by scripts/run.js (both are
 * gitignored). Put the live key in one of them as a SEPARATE variable:
 *
 *   STRIPE_LIVE_SECRET_KEY=rk_live_...
 *
 * Stripe shows a secret key exactly once, at creation, so an existing sk_live_
 * key usually can't be re-read. Don't roll it — that invalidates the key your
 * production deployment is using. Instead create a RESTRICTED key
 * (Developers → API keys → Create restricted key) with write access to
 * Products and Prices only. It works here, can't do anything else, and can be
 * deleted once the catalog exists.
 *
 * A separate name matters: STRIPE_SECRET_KEY is what the dev server reads, so
 * putting a live key there would point local development at real customer data.
 *
 * Pasting the key inline (STRIPE_SECRET_KEY=sk_live_... npm run ...) also works
 * but is worth avoiding — it lands in your shell history in plaintext and is
 * briefly visible in the process list.
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

// Resolves which key to use, and refuses any combination where the requested
// mode and the key's actual mode disagree. Creating a catalog in the wrong mode
// is quiet and confusing to unpick, so it's worth failing loudly up front.
function resolveKey(wantLive: boolean): string {
    const varName = wantLive ? 'STRIPE_LIVE_SECRET_KEY' : 'STRIPE_SECRET_KEY';
    const key = process.env[varName];

    if (!key) {
        console.error(`${varName} not found in .env.local, .dev.vars, or the environment.`);
        if (wantLive) {
            console.error('Add it to .env.local (gitignored) as:  STRIPE_LIVE_SECRET_KEY=sk_live_...');
            console.error('Keep it under that name — STRIPE_SECRET_KEY is what the dev server reads.');
        }
        process.exit(1);
    }

    // Accepts both standard secret keys (sk_) and restricted keys (rk_). A
    // restricted key scoped to Products + Prices write is the better choice for
    // this script: it doesn't require retrieving the account's real secret key,
    // and it can't do anything beyond building the catalog.
    if (!key.startsWith('sk_') && !key.startsWith('rk_')) {
        console.error(`${varName} does not look like a Stripe secret or restricted key ("${key.slice(0, 12)}...").`);
        console.error('Expected a key starting with sk_ or rk_. A publishable key (pk_) will not work —');
        console.error('it has no permission to create products.');
        process.exit(1);
    }

    const keyIsLive = key.startsWith('sk_live_') || key.startsWith('rk_live_');
    if (wantLive && !keyIsLive) {
        console.error(`--live was passed but ${varName} is a test key. Refusing to run.`);
        process.exit(1);
    }
    if (!wantLive && keyIsLive) {
        console.error(`STRIPE_SECRET_KEY is a LIVE key. Refusing to run without --live.`);
        console.error('Move the live key to STRIPE_LIVE_SECRET_KEY and keep a test key here.');
        process.exit(1);
    }

    return key;
}

async function main() {
    const confirm = process.argv.includes('--confirm');
    const wantLive = process.argv.includes('--live');

    const key = resolveKey(wantLive);
    const mode = wantLive ? 'LIVE' : 'TEST';
    const stripe = new Stripe(key, { apiVersion: '2025-12-15.clover' });

    console.log(`\nStripe mode: ${mode}`);
    if (mode === 'LIVE' && confirm) {
        console.log('Creating real catalog entries in your LIVE account.');
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
