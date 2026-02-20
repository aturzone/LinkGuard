import sharp from 'sharp';
import { mkdirSync } from 'fs';

const outDir = '/tmp/lg-icons';
try { mkdirSync(outDir, { recursive: true }); } catch {}

// New LinkGuard shield logo SVG - clean, modern, Bitwarden-inspired
const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="shieldGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#3B82F6"/>
      <stop offset="100%" stop-color="#1D4ED8"/>
    </linearGradient>
  </defs>
  <path d="M256 28 C256 28, 56 100, 56 100 C56 100, 56 300, 56 300 C56 420, 256 492, 256 492 C256 492, 456 420, 456 420 C456 300, 456 100, 456 100 C456 100, 256 28, 256 28Z" fill="url(#shieldGrad)"/>
  <path d="M256 60 C256 60, 80 124, 80 124 C80 124, 80 290, 80 290 C80 396, 256 460, 256 460 C256 460, 432 396, 432 396 C432 290, 432 124, 432 124 C432 124, 256 60, 256 60Z" fill="#1E3A5F" opacity="0.3"/>
  <path d="M200 260 L240 300 L320 210" stroke="#FFFFFF" stroke-width="36" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
</svg>`;

const svgBuffer = Buffer.from(svgContent);
const sizes = [16, 32, 48, 128];

for (const size of sizes) {
  const buf = await sharp(svgBuffer).resize(size, size).png().toBuffer();
  const fs = await import('fs');
  fs.writeFileSync(`${outDir}/icon-${size}.png`, buf);
  console.log(`Generated icon-${size}.png (${buf.length} bytes)`);
}

console.log('Done! Icons at ' + outDir);
