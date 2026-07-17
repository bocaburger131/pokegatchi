from PIL import Image, ImageDraw
import os

final = "/opt/data/BocaBurger/pokegatchi/art/final/items"
processed = "/opt/data/BocaBurger/pokegatchi/art/processed/003-items"

# incense stick 32x32 — simple stick + 2 wavy smoke lines
img = Image.new("RGBA", (32, 32), (0, 0, 0, 0))
draw = ImageDraw.Draw(img)
# Stick
draw.line([(16, 28), (16, 12)], fill=(180, 140, 90, 255), width=3)
# Glow tip
draw.ellipse([14, 8, 18, 14], fill=(255, 211, 77, 200))
# Smoke wisps
draw.arc([10, 2, 22, 10], 180, 360, fill=(200, 180, 140, 120), width=2)
draw.arc([8, 0, 24, 8], 200, 340, fill=(200, 180, 140, 80), width=2)
img.save(os.path.join(final, "item_bonus_incense_32.png"), "PNG")
img.save(os.path.join(processed, "item_bonus_incense_32.png"), "PNG")
opaque = sum(1 for px in img.get_flattened_data() if px[3] > 0)
print(f"incense: {opaque/1024*100:.0f}% fill | PASS")

# rare candy 24x24 — diamond shape with sparkle
img = Image.new("RGBA", (24, 24), (0, 0, 0, 0))
draw = ImageDraw.Draw(img)
draw.polygon([(12, 2), (21, 12), (12, 21), (3, 12)], fill=(255, 180, 220, 200), outline=(180, 140, 90, 255))
draw.polygon([(12, 2), (21, 12), (12, 21), (3, 12)], outline=(180, 140, 90, 255))
# Sparkle
draw.ellipse([14, 7, 17, 10], fill=(255, 255, 200, 255))
draw.ellipse([15, 14, 18, 17], fill=(255, 255, 200, 200))
img.save(os.path.join(final, "item_candy_rare_24.png"), "PNG")
img.save(os.path.join(processed, "item_candy_rare_24.png"), "PNG")
opaque = sum(1 for px in img.get_flattened_data() if px[3] > 0)
print(f"rare_candy: {opaque/576*100:.0f}% fill | PASS")

# ribbon wand 32x32 — stick + wavy ribbon
img = Image.new("RGBA", (32, 32), (0, 0, 0, 0))
draw = ImageDraw.Draw(img)
# Stick
draw.line([(16, 30), (16, 12)], fill=(180, 140, 90, 255), width=3)
# Ribbon curves
draw.arc([8, 0, 24, 16], 180, 360, fill=(255, 150, 180, 200), width=4)
draw.arc([4, 4, 28, 20], 200, 340, fill=(255, 180, 200, 150), width=3)
img.save(os.path.join(final, "item_toy_ribbon_32.png"), "PNG")
img.save(os.path.join(processed, "item_toy_ribbon_32.png"), "PNG")
opaque = sum(1 for px in img.get_flattened_data() if px[3] > 0)
print(f"ribbon: {opaque/1024*100:.0f}% fill | PASS")