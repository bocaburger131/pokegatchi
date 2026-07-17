import os
from PIL import Image
from rembg import remove, new_session

source = "/opt/data/BocaBurger/pokegatchi/art/source/004-pets"
processed = "/opt/data/BocaBurger/pokegatchi/art/processed/004-pets"
final = "/opt/data/BocaBurger/pokegatchi/art/final/pets"
os.makedirs(processed, exist_ok=True)
os.makedirs(final, exist_ok=True)

session = new_session("u2netp")

files = sorted([f for f in os.listdir(source) if f.endswith('.png')])
results = []

for fname in files:
    # Parse: pet_{species}_{state}_128.png -> (128, 128)
    parts = fname.replace('.png', '').split('_')
    size_str = parts[-1]
    if not size_str.isdigit():
        results.append((fname, "SKIP", "no size"))
        continue
    tw = th = int(size_str)
    
    src_path = os.path.join(source, fname)
    try:
        img = Image.open(src_path).convert("RGBA")
        img_no_bg = remove(img, session=session, alpha_matting=True,
                           alpha_matting_foreground_threshold=200,
                           alpha_matting_background_threshold=20)
        
        bbox = img_no_bg.getbbox()
        if not bbox:
            results.append((fname, "REJECT", "empty"))
            continue
        
        cropped = img_no_bg.crop(bbox)
        cw, ch = cropped.size
        
        scale = max((tw - 8) / cw, (th - 8) / ch)
        nw, nh = int(cw * scale), int(ch * scale)
        resized = cropped.resize((nw, nh), Image.LANCZOS)
        
        if nw > tw - 8:
            cx = (nw - (tw - 8)) // 2
            resized = resized.crop((cx, 0, cx + tw - 8, nh))
            nw = tw - 8
        if nh > th - 8:
            cy = (nh - (th - 8)) // 2
            resized = resized.crop((0, cy, nw, cy + th - 8))
            nh = th - 8
        
        canvas = Image.new("RGBA", (tw, th), (0, 0, 0, 0))
        ox, oy = (tw - nw) // 2, (th - nh) // 2
        canvas.paste(resized, (ox, oy))
        
        canvas.save(os.path.join(processed, fname), "PNG")
        canvas.save(os.path.join(final, fname), "PNG")
        
        opaque = sum(1 for px in canvas.get_flattened_data() if px[3] > 0)
        fill_pct = opaque / (tw * th) * 100
        v = "PASS" if fill_pct >= 50 else "REVISE"
        results.append((fname, v, f"{fill_pct:.0f}%"))
    except Exception as e:
        results.append((fname, "FAIL", str(e)[:40]))

species_counts = {}
for name, v, detail in results:
    sp = name.split('_')[1]
    species_counts[sp] = species_counts.get(sp, 0) + 1
    print(f"{v:<7} {name:<40} {detail}")

p = sum(1 for _, v, _ in results if v == "PASS")
r = sum(1 for _, v, _ in results if v == "REVISE")
print(f"\nPASS: {p} | REVISE: {r} | TOTAL: {len(results)}")
for sp, cnt in sorted(species_counts.items()):
    print(f"  {sp}: {cnt}")