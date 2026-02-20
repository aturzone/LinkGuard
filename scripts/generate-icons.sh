#!/bin/bash
# Simple script to convert SVG to PNG using ImageMagick or Inkscape
# Run: bash scripts/generate-icons.sh

set -e

echo "Generating LinkGuard icons..."

cd "$(dirname "$0")/.."

# Check if ImageMagick is installed
if command -v convert &> /dev/null; then
    echo "Using ImageMagick..."
    convert -background none -density 1200 icons/icon.svg -resize 16x16 icons/icon-16.png
    convert -background none -density 1200 icons/icon.svg -resize 32x32 icons/icon-32.png
    convert -background none -density 1200 icons/icon.svg -resize 48x48 icons/icon-48.png
    convert -background none -density 1200 icons/icon.svg -resize 128x128 icons/icon-128.png
    echo "✓ All icons generated!"
elif command -v inkscape &> /dev/null; then
    echo "Using Inkscape..."
    inkscape icons/icon.svg -w 16 -h 16 -o icons/icon-16.png
    inkscape icons/icon.svg -w 32 -h 32 -o icons/icon-32.png
    inkscape icons/icon.svg -w 48 -h 48 -o icons/icon-48.png
    inkscape icons/icon.svg -w 128 -h 128 -o icons/icon-128.png
    echo "✓ All icons generated!"
else
    echo "Error: Neither ImageMagick nor Inkscape found."
    echo "Install one of them:"
    echo "  - Ubuntu/Debian: sudo apt install imagemagick"
    echo "  - or: sudo apt install inkscape"
    exit 1
fi

ls -lh icons/*.png