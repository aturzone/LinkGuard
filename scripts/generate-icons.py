#!/usr/bin/env python3
"""
Generate perfect LinkGuard icons at all sizes
Requires: pip install pillow
"""

from PIL import Image, ImageDraw
import os

# Icon sizes needed
SIZES = [16, 32, 48, 128]

# Colors
BG_COLOR = (0, 0, 0, 0)  # Transparent
SHIELD_COLOR = (59, 130, 246)  # #3B82F6
SHIELD_DARK = (30, 64, 175)  # #1E40AF
CHECK_COLOR = (255, 255, 255)  # White

def draw_shield(draw, size):
    """Draw a perfectly symmetrical shield"""
    center_x = size // 2
    top = size * 0.15
    bottom = size * 0.85
    width = size * 0.65
    
    # Shield points (perfectly symmetrical)
    points = [
        (center_x - width//2, top),  # Top left
        (center_x + width//2, top),  # Top right
        (center_x + width//2, top + width * 0.7),  # Right mid
        (center_x, bottom),  # Bottom center
        (center_x - width//2, top + width * 0.7),  # Left mid
    ]
    
    # Draw shield with gradient effect (simulate with darker bottom)
    draw.polygon(points, fill=SHIELD_COLOR, outline=SHIELD_DARK)
    
def draw_checkmark(draw, size):
    """Draw a perfectly centered checkmark"""
    center_x = size // 2
    center_y = size // 2
    
    # Checkmark dimensions (proportional to size)
    check_width = size * 0.45
    check_height = size * 0.35
    thickness = max(3, size // 10)
    
    # Checkmark points (perfectly centered)
    x1 = center_x - check_width // 2
    y1 = center_y
    
    x2 = center_x - check_width // 6
    y2 = center_y + check_height // 2
    
    x3 = center_x + check_width // 2
    y3 = center_y - check_height // 2
    
    # Draw checkmark with thick line
    draw.line([(x1, y1), (x2, y2)], fill=CHECK_COLOR, width=thickness, joint='curve')
    draw.line([(x2, y2), (x3, y3)], fill=CHECK_COLOR, width=thickness, joint='curve')

def generate_icon(size, output_path):
    """Generate a single icon at specified size"""
    # Create image with transparency
    img = Image.new('RGBA', (size, size), BG_COLOR)
    draw = ImageDraw.Draw(img)
    
    # Draw shield
    draw_shield(draw, size)
    
    # Draw checkmark
    draw_checkmark(draw, size)
    
    # Save with maximum quality
    img.save(output_path, 'PNG', optimize=True)
    print(f"✓ Generated {size}x{size} icon: {output_path}")

def main():
    # Output directory
    script_dir = os.path.dirname(os.path.abspath(__file__))
    icons_dir = os.path.join(os.path.dirname(script_dir), 'icons')
    
    print("Generating LinkGuard icons...\n")
    
    for size in SIZES:
        output_path = os.path.join(icons_dir, f'icon-{size}.png')
        generate_icon(size, output_path)
    
    print("\n✅ All icons generated successfully!")
    print(f"\nIcons saved to: {icons_dir}")

if __name__ == '__main__':
    main()
