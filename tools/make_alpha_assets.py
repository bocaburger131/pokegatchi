from PIL import Image
from pathlib import Path

ROOTS = [Path('assets/sprites/generated'), Path('assets/vfx/generated')]

def process(src: Path):
    try:
        im = Image.open(src).convert('RGBA')
    except Exception as e:
        return f'SKIP {src}: open failed ({e})'
    w,h = im.size
    px = im.load()
    corners = [px[0,0], px[w-1,0], px[0,h-1], px[w-1,h-1]]
    br = sum(c[0] for c in corners)//4
    bg = sum(c[1] for c in corners)//4
    bb = sum(c[2] for c in corners)//4
    tol = 26
    out = []
    changed = 0
    for y in range(h):
        for x in range(w):
            r,g,b,a = px[x,y]
            if abs(r-br)<=tol and abs(g-bg)<=tol and abs(b-bb)<=tol:
                if a != 0:
                    changed += 1
                out.append((r,g,b,0))
            else:
                out.append((r,g,b,255))
    im.putdata(out)
    dst = src.with_name(src.stem + '_alpha.png')
    im.save(dst)
    return f'OK {src} -> {dst} changed={changed}'

if __name__ == '__main__':
    for root in ROOTS:
        if not root.exists():
            print(f'MISS {root}')
            continue
        for p in sorted(root.glob('*.png')):
            if p.stem.endswith('_alpha') or p.stem.endswith('_transparent'):
                print(f'KEEP {p}')
                continue
            print(process(p))
