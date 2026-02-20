/**
 * Generate high-quality PNG icons from SVG using sharp
 * Run: node scripts/generate-icons.js
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const sizes = [16, 32, 48, 128];
const svgPath = path.join(__dirname, '../icons/icon.svg');
const outputDir = path.join(__dirname, '../icons');

async function generateIcons() {
    const svgBuffer = fs.readFileSync(svgPath);

    for (const size of sizes) {
        const outputPath = path.join(outputDir, `icon-${size}.png`);
        
        await sharp(svgBuffer)
            .resize(size, size, {
                fit: 'contain',
                background: { r: 0, g: 0, b: 0, alpha: 0 }
            })
            .png({ quality: 100, compressionLevel: 9 })
            .toFile(outputPath);

        console.log(`✓ Generated ${size}x${size} icon`);
    }

    console.log('\n✅ All icons generated successfully!');
}

generateIcons().catch(console.error);
