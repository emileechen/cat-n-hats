"""Check the art/ folder against the naming rules and the catalogue, and optionally draw a test sheet.

Usage:
    python3 scripts/check_art.py                     # report only
    python3 scripts/check_art.py --sheet build/all-hats-on-all-cats.png

Rules (see art/README.md):
    art/cats/<slug>.png          60x68 cat coat
    art/hats/<set>/<slug>.png    60x68 hat layer
    art/hats/<set>/<slug>_m.png  60x68 hat on mannequin, only for hats that don't have a layer yet
    <slug>_i.png                 19x23 legacy 2022 icons; the rebuild doesn't use icons, but existing ones are still size-checked

Requires Pillow.
"""

import json
import re
import sys
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
ART = ROOT / "art"
SPRITE, ICON = (60, 68), (19, 23)
NAME = re.compile(r"[a-z0-9]+(-[a-z0-9]+)*(_[im])?\.png")


def scan(folder):
    """{slug: {"layer": Path, "icon": Path, "mannequin": Path}} for one folder of sprites."""
    out = {}
    for f in sorted(folder.glob("*.png")):
        stem = f.stem
        kind = {"_i": "icon", "_m": "mannequin"}.get(stem[-2:], "layer")
        slug = stem[:-2] if kind != "layer" else stem
        out.setdefault(slug, {})[kind] = f
    return out


def check_files(problems):
    for f in sorted(ART.rglob("*.png")):
        rel = f.relative_to(ART)
        if rel.parts[0] not in ("cats", "hats"):
            continue
        if not NAME.fullmatch(f.name):
            problems.append(f"bad file name: {rel}")
        im = Image.open(f)
        want = ICON if f.stem.endswith("_i") else SPRITE
        if im.size != want:
            problems.append(f"{rel} is {im.size[0]}x{im.size[1]}, expected {want[0]}x{want[1]}")
        if im.mode != "RGBA":
            problems.append(f"{rel} has no transparency (mode {im.mode})")


def main(sheet_path=None):
    problems = []
    check_files(problems)

    cats = scan(ART / "cats")
    hat_sets = {d.name: scan(d) for d in sorted((ART / "hats").iterdir()) if d.is_dir()}
    hats = {f"hats/{s}/{slug}": files for s, items in hat_sets.items() for slug, files in items.items()}

    catalog = json.loads((ROOT / "data/catalog/hats.json").read_text())
    colours = json.loads((ROOT / "data/catalog/cat_colours.json").read_text())
    in_catalog = {h["art"] for h in catalog} | {c["art"] for c in colours}

    for h in catalog:
        if h["art"] not in hats:
            problems.append(f"catalogue hat {h['id']} {h['name']}: no art at art/{h['art']}.png")
    for c in colours:
        if c["art"].removeprefix("cats/") not in cats:
            problems.append(f"catalogue colour {c['id']} {c['name']}: no art at art/{c['art']}.png")

    print("Hats by set:")
    for s, items in hat_sets.items():
        layers = sum("layer" in f for f in items.values())
        print(f"  {s:18} {len(items):3} hats  {layers:3} with layers")
    print(f"Cat coats: {len(cats)}")

    print("\nNeeds a separated hat layer (only the mannequin version exists):")
    for key, f in hats.items():
        if "layer" not in f:
            print(f"  {key}")
    print("\nArt not in the catalogue yet (unreleased):")
    unreleased = [k for k in hats if k not in in_catalog]
    print("  " + ", ".join(unreleased) if unreleased else "  none")

    print("\nProblems:" if problems else "\nNo problems found.")
    for p in problems:
        print(f"  {p}")

    if sheet_path:
        draw_sheet(Path(sheet_path), colours, hats)
    return 1 if problems else 0


def draw_sheet(path, colours, hats, zoom=2):
    """Every hat layer on every cat colour, in catalogue colour order."""
    cats = [(c["name"], Image.open(ART / f"{c['art']}.png").convert("RGBA")) for c in colours]
    rows = [(k, Image.open(f["layer"]).convert("RGBA")) for k, f in hats.items() if "layer" in f]
    cw, ch, label = SPRITE[0] * zoom, SPRITE[1] * zoom, 170
    sheet = Image.new("RGBA", (label + cw * len(cats), 30 + ch * len(rows)), (250, 248, 245, 255))
    draw = ImageDraw.Draw(sheet)
    for j, (name, _) in enumerate(cats):
        draw.text((label + j * cw + 4, 10), name[:18], fill=(60, 60, 60, 255))
    for i, (key, layer) in enumerate(rows):
        y = 30 + i * ch
        draw.text((6, y + ch // 2 - 6), key.removeprefix("hats/"), fill=(60, 60, 60, 255))
        for j, (_, cat) in enumerate(cats):
            cell = cat.copy()
            cell.alpha_composite(layer)
            sheet.alpha_composite(cell.resize((cw, ch), Image.NEAREST), (label + j * cw, y))
    path.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(path)
    print(f"\nWrote {path} ({len(rows)} hats x {len(cats)} colours)")


if __name__ == "__main__":
    args = sys.argv[1:]
    sys.exit(main(args[args.index("--sheet") + 1] if "--sheet" in args else None))
