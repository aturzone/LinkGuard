import sharp from 'sharp';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const svgPath = resolve(__dirname, '../icons/icon.svg');
const svgBuffer = readFileSync(svgPath);

const sizes = [16, 32, 48, 128];

for (const size of sizes) {
  const outputPath = resolve(__dirname, `../icons/icon-${size}.png`);
  await sharp(svgBuffer)
    .resize(size, size)
    .png()
    .toFile(outputPath);
  console.log(`Generated icon-${size}.png`);
}

console.log('All icons generated successfully!');
