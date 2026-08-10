/**
 * Delete a user account and its associated data. Intended for cleaning up test
 * accounts.
 *
 * Usage:
 *   Dry run (default — prints what would be deleted, changes nothing):
 *     npx tsx scripts/delete-user.ts test@example.com
 *
 *   Actually delete:
 *     npx tsx scripts/delete-user.ts test@example.com --confirm
 *
 *   A uid works anywhere an email does:
 *     npx tsx scripts/delete-user.ts AbC123uid --confirm
 *
 * Requires FIREBASE_SERVICE_ACCOUNT in the environment, the same variable the
 * app's Admin SDK uses. Load it from .dev.vars however you normally do, e.g.:
 *   export $(grep FIREBASE_SERVICE_ACCOUNT .dev.vars | xargs) && npx tsx ...
 *
 * Tag documents are NOT deleted — tag codes are physical inventory. Each tag is
 * reset to unactivated so the code can be activated again by someone else.
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { getAuth, type Auth } from 'firebase-admin/auth';

const BATCH_LIMIT = 400; // Firestore caps a batch at 500 writes

interface Plan {
    uid: string;
    email: string | undefined;
    tags: string[];
    counts: Record<string, number>;
}

function init(): { db: Firestore; auth: Auth } {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!raw) {
        console.error('FIREBASE_SERVICE_ACCOUNT is not set. See the usage notes at the top of this file.');
        process.exit(1);
    }
    const app = getApps().length > 0 ? getApps()[0] : initializeApp({ credential: cert(JSON.parse(raw)) });
    return { db: getFirestore(app), auth: getAuth(app) };
}

// Accepts either an email or a raw uid so you don't have to look one up first.
async function resolveUser(auth: Auth, identifier: string) {
    try {
        return identifier.includes('@')
            ? await auth.getUserByEmail(identifier)
            : await auth.getUser(identifier);
    } catch {
        return null;
    }
}

async function buildPlan(db: Firestore, uid: string, email: string | undefined): Promise<Plan> {
    const counts: Record<string, number> = {};

    // Collections keyed by userId. Each is deleted outright.
    for (const collection of ['orders', 'scan_events', 'product_events']) {
        const snap = await db.collection(collection).where('userId', '==', uid).get();
        counts[collection] = snap.size;
    }

    // Tags are reset rather than deleted — see the note at the top.
    const tagSnap = await db.collection('tags').where('userId', '==', uid).get();
    const tags = tagSnap.docs.map((d) => d.id);

    // Newsletter subscriptions are keyed by email, not uid.
    if (email) {
        const newsSnap = await db.collection('newsletter_subscribers').where('email', '==', email).get();
        counts['newsletter_subscribers'] = newsSnap.size;
    }

    return { uid, email, tags, counts };
}

// Deletes every document matching a userId query, chunked to stay under the
// Firestore batch write limit.
async function deleteByUserId(db: Firestore, collection: string, uid: string): Promise<number> {
    const snap = await db.collection(collection).where('userId', '==', uid).get();
    let deleted = 0;
    for (let i = 0; i < snap.docs.length; i += BATCH_LIMIT) {
        const batch = db.batch();
        for (const doc of snap.docs.slice(i, i + BATCH_LIMIT)) batch.delete(doc.ref);
        await batch.commit();
        deleted += Math.min(BATCH_LIMIT, snap.docs.length - i);
    }
    return deleted;
}

async function execute(db: Firestore, auth: Auth, plan: Plan) {
    for (const collection of ['orders', 'scan_events', 'product_events']) {
        const n = await deleteByUserId(db, collection, plan.uid);
        console.log(`  deleted ${n} from ${collection}`);
    }

    if (plan.email) {
        const snap = await db.collection('newsletter_subscribers').where('email', '==', plan.email).get();
        for (let i = 0; i < snap.docs.length; i += BATCH_LIMIT) {
            const batch = db.batch();
            for (const doc of snap.docs.slice(i, i + BATCH_LIMIT)) batch.delete(doc.ref);
            await batch.commit();
        }
        console.log(`  deleted ${snap.size} from newsletter_subscribers`);
    }

    // Release each tag back to unactivated inventory.
    for (const code of plan.tags) {
        await db.collection('tags').doc(code).set(
            {
                userId: null,
                pet: null,
                isLost: false,
                activatedAt: null,
                releasedAt: new Date().toISOString(),
            },
            { merge: true }
        );
        console.log(`  released tag ${code}`);
    }

    await db.collection('users').doc(plan.uid).delete();
    console.log('  deleted users doc');

    await auth.deleteUser(plan.uid);
    console.log('  deleted Firebase Auth user');
}

async function main() {
    const identifier = process.argv[2];
    const confirm = process.argv.includes('--confirm');

    if (!identifier) {
        console.error('Usage: npx tsx scripts/delete-user.ts <email-or-uid> [--confirm]');
        process.exit(1);
    }

    const { db, auth } = init();

    const user = await resolveUser(auth, identifier);
    if (!user) {
        console.error(`No Firebase Auth user found for "${identifier}".`);
        process.exit(1);
    }

    const plan = await buildPlan(db, user.uid, user.email);

    console.log(`\nUser:  ${plan.email ?? '(no email)'}`);
    console.log(`UID:   ${plan.uid}`);
    console.log('\nWill delete:');
    for (const [collection, n] of Object.entries(plan.counts)) {
        console.log(`  ${collection}: ${n} doc(s)`);
    }
    console.log('  users: 1 doc');
    console.log('  Firebase Auth user: 1');
    console.log(`\nWill release ${plan.tags.length} tag(s) back to unactivated:`);
    for (const code of plan.tags) console.log(`  ${code}`);

    if (!confirm) {
        console.log('\nDry run — nothing was changed. Re-run with --confirm to delete.');
        return;
    }

    console.log('\nDeleting...');
    await execute(db, auth, plan);
    console.log('\nDone.');
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
