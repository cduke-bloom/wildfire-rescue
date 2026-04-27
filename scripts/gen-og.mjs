// Render static/og-image.svg → static/og-image.png (1200×630)
// for Facebook / LinkedIn / Twitter / iMessage rich previews.
//
// Run with: node scripts/gen-og.mjs

import sharp from 'sharp';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const svg = readFileSync(resolve(root, 'static/og-image.svg'));
const out = resolve(root, 'static/og-image.png');

await sharp(svg).resize(1200, 630).png().toFile(out);
console.log(`✓ static/og-image.png (1200×630)`);
