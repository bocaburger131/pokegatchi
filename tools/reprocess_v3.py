import os
from PIL import Image
from rembg import remove, new_session

source_dir = "/opt/data/BocaBurger/pokegatchi/art/source/001-ui-hud-buttons"
final_dir = "/opt/data/BocaBurger/pokegatchi/art/final/ui/hud"

# Use u2netp (lighter, less aggressive) instead of default u2net
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
    
    # Less aggressive bg removal with u2netp
    img_no_bg = remove(img, session=session, alpha_matting=True, 
                       alpha_matting_foreground_threshold=200,
                       alpha_matting_background_threshold=20)
    
    bbox = img_no_bg.getbbox()
    if bbox:
        cropped = img_no_bg.crop(bbox)
    else:
        cropped = img_no_bg
    
    # Minimal padding (1px)
    cw, ch = cropped.size
    pad = 2
    padded = Image.new("RGBA", (cw + pad*2, ch + pad*2), (0, 0, 0, 0))
    padded.paste(cropped, (pad, pad))
    
    # Resize — fit to width for pills, to bounding for dot
    if tw > th * 2:  # Wide asset like pills
        # Scale to fit width exactly, less crop loss
        scale = (tw - 4) / padded.width
        new_h = int(padded.height * scale)
        resized = padded.resize((tw - 4, new_h), Image.LANCZOS)
    else:
        padded.thumbnail((tw - 4, th - 4), Image.LANCZOS)
        resized = padded
    
    rw, rh = resized.size
    canvas = Image.new("RGBA", (tw, th), (0, 0, 0, 0))
    ox = (tw - rw) // 2
    oy = (th - rh) // 2
    canvas.paste(resized, (ox, oy))
    
    canvas.save(os.path.join(final_dir, dst_name), "PNG")
    
    opaque = sum(1 for px in canvas.get_flattened_data() if px[3] > 0)
    fill_pct = opaque / (tw * th) * 100
    print(f"{dst_name}: {rw}x{rh} in {tw}x{th} | {fill_pct:.0f}% fill | {opaque} opaque px")

print("\nDone — v3 with u2netp + alpha matting")