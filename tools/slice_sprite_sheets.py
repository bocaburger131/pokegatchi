from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]

TARGETS = [
    (ROOT / 'assets/sprites/generated/squirtle_skin_v1_alpha.png', 3, 2),
    (ROOT / 'assets/sprites/generated/pikachu_skin_v1_alpha.png', 3, 2),
    (ROOT / 'assets/sprites/generated/eevee_skin_v2_compact_alpha.png', 3, 2),
    (ROOT / 'assets/vfx/generated/catch_success_set_a_alpha.png', 3, 2),
    (ROOT / 'assets/vfx/generated/catch_fail_set_a_alpha.png', 3, 2),
    (ROOT / 'assets/vfx/generated/pokestop_spin_outcomes_set_a_alpha.png', 3, 2),
]


def trim_alpha(img: Image.Image, threshold: int = 8, pad: int = 18) -> Image.Image:
    rgba = img.convert('RGBA')
    a = rgba.split()[-1]
    bbox = a.point(lambda v: 255 if v > threshold else 0).getbbox()
    if not bbox:
        return rgba
    cropped = rgba.crop(bbox)
    out = Image.new('RGBA', (cropped.width + pad * 2, cropped.height + pad * 2), (0, 0, 0, 0))
    out.paste(cropped, (pad, pad), cropped)
    return out


def slice_sheet(path: Path, cols: int, rows: int) -> list[Path]:
    im = Image.open(path).convert('RGBA')
    w, h = im.size
    cw, ch = w // cols, h // rows

    out_dir = path.parent / path.stem
    out_dir.mkdir(parents=True, exist_ok=True)

    outs = []
    idx = 1
    for r in range(rows):
        for c in range(cols):
            box = (c * cw, r * ch, (c + 1) * cw, (r + 1) * ch)
            frame = im.crop(box)
            frame = trim_alpha(frame)
            out_path = out_dir / f'{path.stem}_f{idx:02d}.png'
            frame.save(out_path)
            outs.append(out_path)
            idx += 1
    return outs


def main():
    for path, cols, rows in TARGETS:
        if not path.exists():
            print(f'SKIP missing: {path}')
            continue
        outs = slice_sheet(path, cols, rows)
        print(path)
        for p in outs:
            print('  ->', p.relative_to(ROOT))


if __name__ == '__main__':
    main()
