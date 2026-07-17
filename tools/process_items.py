import os, struct
from PIL import Image
from rembg import remove, new_session

source = "/opt/data/BocaBurger/pokegatchi/art/source/003-items"
processed = "/opt/data/BocaBurger/pokegatchi/art/processed/003-items"
final = "/opt/data/BocaBurger/pokegatchi/art/final/items"
os.makedirs(processed, exist_ok=True)
os.makedirs(final, exist_ok=True)

session = new_session("u2netp")

def parse_size(fname):
    base = fname.replace('.png', '')
    parts = base.split('_')
    size_str = parts[-1]
    if size_str.isdigit():
        s = int(size_str)
        return (s, s)
    return None

files = sorted([f for f in os.listdir(source) if f.endswith('.png')])
results = []

for fname in files:
    target = parse_size(fname)
    if not target:
        results.append((fname, "SKIP", "no size"))
        continue
    
    tw, th = target
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
        
        scale = max((tw - 4) / cw, (th - 4) / ch)
        new_w = int(cw * scale)
        new_h = int(ch * scale)
        resized = cropped.resize((new_w, new_h), Image.LANCZOS)
        
        if new_w > tw - 4:
            cx = (new_w - (tw - 4)) // 2
            resized = resized.crop((cx, 0, cx + tw - 4, new_h))
            new_w = tw - 4
        if new_h > th - 4:
            cy = (new_h - (th - 4)) // 2
            resized = resized.crop((0, cy, new_w, cy + th - 4))
            new_h = th - 4
        
        canvas = Image.new("RGBA", (tw, th), (0, 0, 0, 0))
        ox = (tw - new_w) // 2
        oy = (th - new_h) // 2
        canvas.paste(resized, (ox, oy))
        
        canvas.save(os.path.join(processed, fname), "PNG")
        canvas.save(os.path.join(final, fname), "PNG")
        
        opaque = sum(1 for px in canvas.get_flattened_data() if px[3] > 0)
        fill_pct = opaque / (tw * th) * 100
        v = "PASS" if fill_pct >= 50 else "REVISE"
        results.append((fname, v, f"{fill_pct:.0f}%"))
        
    except Exception as e:
        results.append((fname, "FAIL", str(e)[:40]))

for name, v, detail in results:
    print(f"{v:<7} {name:<35} {detail}")
p = sum(1 for _, v, _ in results if v == "PASS")
r = sum(1 for _, v, _ in results if v == "REVISE")
print(f"\nPASS: {p} | REVISE: {r} | TOTAL: {len(results)}")