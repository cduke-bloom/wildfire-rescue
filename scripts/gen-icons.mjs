// One-off script: render static/icon.svg into the various PNG sizes
// iOS, Android, and favicons need.
//
// Run with: node scripts/gen-icons.mjs

import sharp from 'sharp';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const svg = readFileSync(resolve(root, 'static/icon.svg'));

const targets = [
	{ out: 'static/apple-touch-icon.png', size: 180 },
	{ out: 'static/icon-192.png', size: 192 },
	{ out: 'static/icon-512.png', size: 512 },
	{ out: 'static/favicon-32.png', size: 32 },
	{ out: 'static/favicon-16.png', size: 16 }
];

for (const { out, size } of targets) {
	const path = resolve(root, out);
	await sharp(svg).resize(size, size).png().toFile(path);
	console.log(`✓ ${out} (${size}×${size})`);
}
