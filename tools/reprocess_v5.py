import os
from PIL import Image
from rembg import remove, new_session

source_dir = "/opt/data/BocaBurger/pokegatchi/art/source/001-ui-hud-buttons"
final_dir = "/opt/data/BocaBurger/pokegatchi/art/final/ui/hud"
processed_dir = "/opt/data/BocaBurger/pokegatchi/art/processed/001-ui-hud-buttons"

session = new_session("u2netp")

files = [
    ("pokegatchi_ui_hudpill_idle_v2_160x30.png", "pokegatchi_ui_hudpill_idle_160x30.png", (160, 30)),
    ("pokegatchi_ui_hudpill_hungry_v2_160x30.png", "pokegatchi_ui_hudpill_hungry_160x30.png", (160, 30)),
    ("pokegatchi_ui_hudpill_bored_v2_160x30.png", "pokegatchi_ui_hudpill_bored_160x30.png", (160, 30)),
    ("pokegatchi_ui_alert_dot_v2_12x12.png", "pokegatchi_ui_alert_dot_12x12.png", (12, 12)),
]

for src_name, dst_name, (tw, th) in files:
    src = os.path.join(source_dir, src_name)
    
    img = Image.open(src).convert("RGBA")
    
    img_no_bg = remove(img, session=session, alpha_matting=True,
                       alpha_matting_foreground_threshold=200,
                       alpha_matting_background_threshold=20)
    
    bbox = img_no_bg.getbbox()
    if bbox:
        cropped = img_no_bg.crop(bbox)
    else:
        cropped = img_no_bg
    
    cw, ch = cropped.size
    
    if tw > th * 3:  # Wide asset: fill width, center-crop height if needed
        # Scale to exactly fill target width
        scale = (tw - 4) / cw
        new_h = int(ch * scale)
        new_w = tw - 4
        resized = cropped.resize((new_w, new_h), Image.LANCZOS)
        
        # If taller than target, center-crop the height
        if new_h > th - 4:
            crop_y = (new_h - (th - 4)) // 2
            resized = resized.crop((0, crop_y, new_w, crop_y + th - 4))
            new_h = th - 4
    else:  # Square/small: fit within bounds
        scale = min((tw - 4) / cw, (th - 4) / ch)
        new_w = int(cw * scale)
        new_h = int(ch * scale)
        resized = cropped.resize((new_w, new_h), Image.LANCZOS)
    
    canvas = Image.new("RGBA", (tw, th), (0, 0, 0, 0))
    ox = (tw - new_w) // 2
    oy = (th - new_h) // 2
    canvas.paste(resized, (ox, oy))
    
    canvas.save(os.path.join(processed_dir, dst_name), "PNG")
    canvas.save(os.path.join(final_dir, dst_name), "PNG")
    
    opaque = sum(1 for px in canvas.get_flattened_data() if px[3] > 0)
    fill_pct = opaque / (tw * th) * 100
    verdict = "PASS" if fill_pct >= 50 else "REVISE"
    print(f"{verdict} {dst_name}: {new_w}x{new_h} → {tw}x{th} | {fill_pct:.0f}% fill")

print("\nDone — v5: width-fill + center-crop")