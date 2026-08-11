#!/usr/bin/env node
/**
 * Runs a TypeScript file in scripts/ using the esbuild that already ships with
 * this project's dependencies.
 *
 * Why not `npx tsx`: tsx isn't a dependency here, so npx tries to download it,
 * which fails on machines whose npm cache has root-owned files. esbuild is
 * already installed (Next.js pulls it in), so this needs no network and no sudo.
 *
 * Usage (via the package.json wrappers):
 *   npm run stripe:setup -- --confirm
 *   npm run user:delete -- test@example.com --confirm
 *
 * Or directly:
 *   npm run script -- scripts/some-file.ts [args...]
 */

const { execFileSync } = require('child_process');
const { mkdirSync, readFileSync } = require('fs');
const path = require('path');

// Secrets live in two different files depending on how the app is being run:
// .env.local is what `next dev` reads, .dev.vars is what Wrangler reads for the
// Cloudflare deployment. Scripts should work regardless of which one you keep
// populated, so load both. Earlier sources win, and a variable already present
// in the real environment always wins over both — that's how you point a script
// at live mode (STRIPE_SECRET_KEY=sk_live_... npm run stripe:setup).
//
// Splits on the FIRST '=' only, so JSON values (FIREBASE_SERVICE_ACCOUNT) and
// values containing '=' survive. Deliberately not `export $(... | xargs)`,
// which word-splits on the spaces inside that JSON and corrupts it.
function loadEnvFiles(root) {
    const env = { ...process.env };
    for (const file of ['.env.local', '.dev.vars']) {
        let contents;
        try {
            contents = readFileSync(path.join(root, file), 'utf-8');
        } catch {
            continue;
        }
        for (const line of contents.split('\n')) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('#')) continue;
            const eq = trimmed.indexOf('=');
            if (eq === -1) continue;
            const key = trimmed.slice(0, eq).trim();
            let value = trimmed.slice(eq + 1).trim();
            if (
                value.length >= 2 &&
                ((value.startsWith('"') && value.endsWith('"')) ||
                    (value.startsWith("'") && value.endsWith("'")))
            ) {
                value = value.slice(1, -1);
            }
            if (!(key in env)) env[key] = value;
        }
    }
    return env;
}

const [, , entry, ...args] = process.argv;

if (!entry) {
    console.error('Usage: npm run script -- <path-to-ts-file> [args...]');
    process.exit(1);
}

const root = path.resolve(__dirname, '..');
// The bundle must live inside the repo so that `--packages=external` imports
// (stripe, firebase-admin) resolve against node_modules at runtime.
const outDir = path.join(root, 'node_modules', '.cache', 'scripts');
const outFile = path.join(outDir, path.basename(entry).replace(/\.ts$/, '.cjs'));

mkdirSync(outDir, { recursive: true });

const esbuild = path.join(root, 'node_modules', '.bin', 'esbuild');

try {
    execFileSync(
        esbuild,
        [
            path.resolve(root, entry),
            '--bundle',
            '--platform=node',
            '--format=cjs',
            '--packages=external',
            `--outfile=${outFile}`,
        ],
        // esbuild writes its build summary to stderr; capture it so a successful
        // build stays quiet and only genuine failures surface.
        { stdio: ['ignore', 'ignore', 'pipe'] }
    );
} catch (err) {
    console.error(`Failed to build ${entry}.`);
    if (err.stderr) console.error(err.stderr.toString());
    process.exit(1);
}

try {
    execFileSync(process.execPath, [outFile, ...args], {
        stdio: 'inherit',
        cwd: root,
        env: loadEnvFiles(root),
    });
} catch (err) {
    // The script already printed its own error; just mirror its exit code.
    process.exit(typeof err.status === 'number' ? err.status : 1);
}
