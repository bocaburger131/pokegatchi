import os
from PIL import Image
from rembg import remove

source_dir = "/opt/data/BocaBurger/pokegatchi/art/source/001-ui-hud-buttons"
processed_dir = "/opt/data/BocaBurger/pokegatchi/art/processed/001-ui-hud-buttons"
final_dir = "/opt/data/BocaBurger/pokegatchi/art/final/ui/hud"

files = [
    ("pokegatchi_ui_hudpill_idle_v2_160x30.png", "pokegatchi_ui_hudpill_idle_160x30.png", (160, 30)),
    ("pokegatchi_ui_hudpill_hungry_v2_160x30.png", "pokegatchi_ui_hudpill_hungry_160x30.png", (160, 30)),
    ("pokegatchi_ui_hudpill_bored_v2_160x30.png", "pokegatchi_ui_hudpill_bored_160x30.png", (160, 30)),
    ("pokegatchi_ui_alert_dot_v2_12x12.png", "pokegatchi_ui_alert_dot_12x12.png", (12, 12)),
]

for src_name, dst_name, (tw, th) in files:
    src = os.path.join(source_dir, src_name)
    
    img = Image.open(src).convert("RGBA")
    img_no_bg = remove(img)
    
    bbox = img_no_bg.getbbox()
    if bbox:
        cropped = img_no_bg.crop(bbox)
    else:
        cropped = img_no_bg
    
    # Add padding
    cw, ch = cropped.size
    padded = Image.new("RGBA", (cw + 4, ch + 4), (0, 0, 0, 0))
    padded.paste(cropped, (2, 2))
    
    # Resize to target, center
    padded.thumbnail((tw - 4, th - 4), Image.LANCZOS)
    pw, ph = padded.size
    
    canvas = Image.new("RGBA", (tw, th), (0, 0, 0, 0))
    ox = (tw - pw) // 2
    oy = (th - ph) // 2
    canvas.paste(padded, (ox, oy))
    
    # Save to processed
    dst_processed = os.path.join(processed_dir, dst_name)
    canvas.save(dst_processed, "PNG")
    
    # Save to final (overwrite v1)
    dst_final = os.path.join(final_dir, dst_name)
    canvas.save(dst_final, "PNG")
    
    fill_pct = sum(1 for px in canvas.get_flattened_data() if px[3] > 0) / (tw * th) * 100
    print(f"{dst_name}: {pw}x{ph} in {tw}x{th} | {fill_pct:.0f}% fill | {os.path.getsize(dst_final)} bytes")

print("\nDone — 4 assets regenerated and saved to processed + final")