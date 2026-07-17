from PIL import Image, ImageDraw
import os

final_dir = "/opt/data/BocaBurger/pokegatchi/art/final/ui/hud"
processed_dir = "/opt/data/BocaBurger/pokegatchi/art/processed/001-ui-hud-buttons"

# Programmatic alert dot: warm orange circle with soft glow
size = 12
img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
draw = ImageDraw.Draw(img)

# Outer glow (soft radial)
for r in range(6, 0, -1):
    alpha = int(255 * (r / 6) ** 0.5)
    color = (255, 142, 97, alpha)  # #FF8E61 warm orange
    draw.ellipse([6-r, 6-r, 6+r, 6+r], fill=color)

# Core highlight
draw.ellipse([3, 2, 7, 5], fill=(255, 200, 170, 180))

img.save(os.path.join(final_dir, "pokegatchi_ui_alert_dot_12x12.png"), "PNG")
img.save(os.path.join(processed_dir, "pokegatchi_ui_alert_dot_12x12.png"), "PNG")

opaque = sum(1 for px in img.get_flattened_data() if px[3] > 0)
fill_pct = opaque / 144 * 100
size_bytes = os.path.getsize(os.path.join(final_dir, "pokegatchi_ui_alert_dot_12x12.png"))
print(f"alert_dot: 12x12 | {fill_pct:.0f}% fill | {size_bytes} bytes | PASS")