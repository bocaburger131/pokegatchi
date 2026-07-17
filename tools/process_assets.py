import os, sys
from PIL import Image
from rembg import remove

source_dir = "/opt/data/BocaBurger/pokegatchi/art/source/001-ui-hud-buttons"
processed_dir = "/opt/data/BocaBurger/pokegatchi/art/processed/001-ui-hud-buttons"
os.makedirs(processed_dir, exist_ok=True)

def parse_target(filename):
    base = filename.replace('.png', '')
    parts = base.split('_')
    last = parts[-1]
    if 'x' in last:
        w, h = last.split('x')
        return (int(w), int(h))
    return None

results = []
files = sorted([f for f in os.listdir(source_dir) if f.endswith('.png')])

for i, filename in enumerate(files):
    target = parse_target(filename)
    if not target:
        results.append((filename, "SKIP", "no size in filename"))
        continue
    
    src = os.path.join(source_dir, filename)
    dst = os.path.join(processed_dir, filename)
    tw, th = target
    
    try:
        img = Image.open(src).convert("RGBA")
        
        # Remove background
        img_no_bg = remove(img)
        
        # Crop to content bounds
        bbox = img_no_bg.getbbox()
        if bbox:
            cropped = img_no_bg.crop(bbox)
        else:
            cropped = img_no_bg
        
        # Add 2px padding
        cw, ch = cropped.size
        padded = Image.new("RGBA", (cw + 4, ch + 4), (0, 0, 0, 0))
        padded.paste(cropped, (2, 2))
        
        # Resize to target, center on canvas
        padded.thumbnail((tw - 4, th - 4), Image.LANCZOS)
        pw, ph = padded.size
        
        canvas = Image.new("RGBA", (tw, th), (0, 0, 0, 0))
        offset_x = (tw - pw) // 2
        offset_y = (th - ph) // 2
        canvas.paste(padded, (offset_x, offset_y))
        canvas.save(dst, "PNG")
        
        alpha_pct = sum(1 for px in canvas.getdata() if px[3] > 0) / (tw * th) * 100
        status = f"OK ({pw}x{ph}>{tw}x{th}, {alpha_pct:.0f}% opaque)"
        results.append((filename, "PASS", status))
        print(f"[{i+1}/{len(files)}] {filename} -> PASS")
        
    except Exception as e:
        results.append((filename, "FAIL", str(e)))
        print(f"[{i+1}/{len(files)}] {filename} -> FAIL: {e}")

print(f"\n{'='*70}")
print(f"{'ASSET':<45} {'RESULT':<6} {'DETAILS'}")
print(f"{'='*70}")
for name, result, detail in results:
    print(f"{name:<45} {result:<6} {detail}")

passed = sum(1 for _, r, _ in results if r == "PASS")
failed = sum(1 for _, r, _ in results if r == "FAIL")
print(f"\nPASS: {passed} | FAIL: {failed} | TOTAL: {len(results)}")