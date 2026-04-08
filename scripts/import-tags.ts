/**
 * Import tags from CSV into Firestore via the /api/import-tags endpoint.
 *
 * Usage:
 *   1. Start the dev server: npm run dev
 *   2. Run: npx tsx scripts/import-tags.ts /path/to/pet_codes.csv
 *
 * Sends tags in chunks of 200 to the API endpoint which handles Firestore writes.
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';

const API_URL = process.env.API_URL || 'http://localhost:3000/api/import-tags';

interface TagRow {
    code: string;
    url: string;
}

function parseCSV(filePath: string): TagRow[] {
    const content = readFileSync(filePath, 'utf-8');
    const lines = content.trim().split('\n');
    const rows = lines.slice(1); // skip header
    return rows.map(line => {
        const [code, url] = line.split(',').map(s => s.trim());
        return { code, url };
    });
}

async function main() {
    const csvPath = process.argv[2];
    if (!csvPath) {
        console.error('Usage: npx tsx scripts/import-tags.ts <path-to-csv>');
        process.exit(1);
    }

    const tags = parseCSV(resolve(csvPath));
    console.log(`Parsed ${tags.length} tags from CSV`);
    console.log(`API endpoint: ${API_URL}`);
    console.log('');

    let totalCreated = 0;
    let totalSkipped = 0;
    let totalErrors = 0;
    const CHUNK_SIZE = 200;

    for (let i = 0; i < tags.length; i += CHUNK_SIZE) {
        const chunk = tags.slice(i, i + CHUNK_SIZE);
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tags: chunk }),
        });

        if (!response.ok) {
            const text = await response.text();
            console.error(`Chunk ${i}-${i + chunk.length} failed: ${text}`);
            totalErrors += chunk.length;
            continue;
        }

        const result = await response.json();
        totalCreated += result.created;
        totalSkipped += result.skipped;
        totalErrors += result.errors;

        const progress = Math.min(i + CHUNK_SIZE, tags.length);
        console.log(`  Chunk ${progress}/${tags.length}: +${result.created} created, ${result.skipped} skipped`);
    }

    console.log('');
    console.log(`Done! Created: ${totalCreated}, Skipped: ${totalSkipped}, Errors: ${totalErrors}`);
}

main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
