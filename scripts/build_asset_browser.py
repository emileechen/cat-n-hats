"""Build a single self-contained HTML page for browsing every asset in art/.

Usage:
    python3 scripts/build_asset_browser.py            # writes build/asset-browser.html

Images are embedded as data URIs so the page works anywhere (including as a claude.ai artifact).
"""

import base64
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ART = ROOT / "art"
CATALOG = ROOT / "data" / "catalog"
HISTORY = ROOT / "data" / "history"

SETS = [  # folder, label, released in 2022, note
    ("starter", "Starter", True, "Pick one when you join. Never in the Mystery Box."),
    ("basic", "Basic", True, "Mystery Box. 6/12 → choice of a Basic colour + 50 💎 · 12/12 → ? + 200 💎"),
    ("animals", "Animal Hoods", True, "Mystery Box. 9/18 → Crowned Froggy + 50 💎 · complete → Unicorn + 200 💎"),
    ("april-fools-2022", "April Fools 2022", True, "Event set. Googly Eyes on 2022-04-01; personalized Jesters on 2022-06-23."),
    ("birds", "Birds", False, "Drawn in 2022, never released. Hummingbird, Barn Swallow, Peacock and Dove with Olive Crown were planned but not drawn."),
    ("food", "Food", False, "Drawn in 2022, never released. Spaghetti, Corn, Yam, Mini Broccoli Clips, Ice Cream and Taiyaki were planned."),
    ("fruit", "Fruit", False, "Strawberry drawn. Lime Slice, Lemon Slice, Cherry on Top and Watermelon were planned."),
    ("winter", "Winter", False, "Holiday 2022 string lights. Earmuffs were planned."),
]

UNRELEASED_NAMES = {
    "birds/secretary": "Secretary Bird", "birds/owl-greathorned": "Great Horned Owl", "birds/flamingo": "Flamingo",
    "birds/swan": "Swan", "birds/swan-black": "Black Swan", "birds/chickadee-black": "Black-capped Chickadee",
    "birds/chickadee-chestnut": "Chestnut-backed Chickadee", "birds/warbler-blackburnian": "Blackburnian Warbler",
    "birds/warbler-yellow": "Yellow-rumped Warbler", "birds/warbler-cerulean-m": "Cerulean Warbler (m)",
    "birds/warbler-cerulean-f": "Cerulean Warbler (f)", "food/friedegg": "Fried Egg", "food/pancakes": "Pancakes",
    "food/pancakes-cut": "Pancakes, Cut", "food/pancakes-fruit": "Pancakes, Fruit", "food/pancakes-ombre": "Pancakes, Ombre",
    "fruit/strawberry": "Strawberry", "winter/lights-multi": "String Lights, Multi", "winter/lights-warm": "String Lights, Warm",
    "april-fools-2022/jester-b": "Jester Hat B · Springacres", "april-fools-2022/jester-c": "Jester Hat C · Saturnalia",
    "april-fools-2022/jester-d": "Jester Hat D · XLostxDestinyX", "april-fools-2022/jester-e": "Jester Hat E · SeaCrest",
}
UNRELEASED_COLOURS = {
    "tabby-full-orange": "Tabby, Full Orange", "tabby-full-brown": "Tabby, Full Brown",
    "tabby-full-orange-dilute": "Tabby, Full Orange Dilute", "tabby-full-brown-dilute": "Tabby, Full Brown Dilute",
}
SOURCES = {
    "ahhh.psd": "Master file. Every cat colour (including unreleased tabbies and open-eye tests) and every hat, including the Jester variants, birds, food, holiday lights and prototypes.",
    "icon.psd": "19×23 icons for cats, Animal Hoods, Basic, Strawberry and Googly Eyes.",
    "mannequin.psd": "The grey mannequin cat.",
    "cats and hats.psd": "March 2022 UI mockup: player cards and the first froggy/bunny tests.",
    "animals.psd": "Animal Hoods set sheet (announcement image).",
    "birds.psd": "Birds set sheet (announcement image).",
}
PROMO_CAPTIONS = {
    "animals-set.png": "Animal Hoods set sheet", "animals-sheet.png": "Animal Hoods sheet (from PSD)",
    "birds-sheet.png": "Birds sheet (from PSD)", "aprilfools.png": "April Fools: Googly Eyes and an unreleased leafy hood",
    "calico.png": "Calico colours", "galaxy.png": "Galaxy colour", "galaxy2.png": "Galaxy, dressed up",
    "glass.png": "Glass colour", "jester.png": "Jester Hats", "meadow.png": "Meadow colour", "pancakes.png": "Pancakes",
    "pancakes-on-cats.png": "Pancakes on cats", "secretary.png": "Secretary Bird", "shopexclusive.png": "Shop Exclusive colours",
    "tabby.png": "Tabby colours",
}


def uri(path):
    return "data:image/png;base64," + base64.b64encode(path.read_bytes()).decode()


def maybe(path):
    return uri(path) if path.exists() else None


def build_data():
    hats_cat = {h["art"]: h for h in json.loads((CATALOG / "hats.json").read_text())}
    colours = json.loads((CATALOG / "cat_colours.json").read_text())
    prices = {s["item_id"]: s["cost_shards"] for s in json.loads((CATALOG / "shop.json").read_text())}
    players = json.loads((HISTORY / "players.json").read_text())

    sets, hats = [], []
    for folder, label, released, note in SETS:
        sets.append({"key": folder, "label": label, "released": released, "note": note})
        slugs = sorted({p.stem.removesuffix("_i").removesuffix("_m") for p in (ART / "hats" / folder).glob("*.png")})
        rows = []
        for slug in slugs:
            base = ART / "hats" / folder / slug
            c = hats_cat.get(f"hats/{folder}/{slug}")
            rows.append({
                "key": f"{folder}/{slug}", "set": folder, "slug": slug,
                "id": c["id"] if c else None,
                "name": c["name"] if c else UNRELEASED_NAMES.get(f"{folder}/{slug}", slug.replace("-", " ").title()),
                "reveal": c.get("display_name") if c else None,
                "desc": c.get("description") if c else None,
                "obtain": c["obtain"] if c else None,
                "released": bool(c),
                "layer": maybe(base.with_suffix(".png")),
                "icon": maybe(base.parent / f"{slug}_i.png"),
            })
        rows.sort(key=lambda r: (r["id"] is None, r["id"] or "", r["name"]))
        hats += rows

    cats = []
    for c in colours:
        slug = c["art"].removeprefix("cats/")
        cats.append({"key": slug, "id": c["id"], "name": c["name"], "set": c["set"], "desc": c["description"],
                     "price": prices.get(c["id"]), "released": True,
                     "sprite": uri(ART / "cats" / f"{slug}.png"), "icon": maybe(ART / "cats" / f"{slug}_i.png")})
    for slug, name in UNRELEASED_COLOURS.items():
        cats.append({"key": slug, "id": None, "name": name, "set": "Unreleased", "desc": None, "price": None,
                     "released": False, "sprite": uri(ART / "cats" / "unreleased" / f"{slug}.png"), "icon": None})

    legacy = []
    for tab, p in players.items():
        slug = tab.lower().replace(" ", "")
        portrait = ART / "legacy-2022" / "portraits" / f"{slug}.png"
        if not portrait.exists():
            continue
        outfits = sorted((ART / "legacy-2022" / "outfits").glob(f"{slug}-*.png"))
        dates = [o["date"] for o in p["outfits"]]
        legacy.append({"player": tab, "cat": p["cat_name"], "portrait": uri(portrait),
                       "outfits": [{"img": uri(o), "date": dates[i] if i < len(dates) else None} for i, o in enumerate(outfits)]})

    def files(folder, captions=None):
        return [{"name": f.name, "caption": (captions or {}).get(f.name, f.stem.replace("-", " ")), "img": uri(f)}
                for f in sorted((ART / folder).glob("*.png"))]

    return {
        "mannequin": uri(ART / "mannequin.png"),
        "sets": sets, "hats": hats, "cats": cats, "legacy": legacy,
        "promo": files("promo-2022", PROMO_CAPTIONS),
        "prototypes": files("extras/prototype-hats"),
        "variants": files("extras/cat-variants"),
        "silhouettes": files("extras/silhouettes"),
        "mockup": uri(ART / "extras" / "ui-mockup-2022-cards.png"),
        "sources": [{"name": f.name, "kb": round(f.stat().st_size / 1024), "about": SOURCES.get(f.name, "")}
                    for f in sorted((ART / "source").glob("*.psd"))],
    }


def main():
    data = build_data()
    template = (Path(__file__).parent / "asset_browser_template.html").read_text()
    html = template.replace("/*__DATA__*/null", json.dumps(data, ensure_ascii=False))
    out = ROOT / "build" / "asset-browser.html"
    out.parent.mkdir(exist_ok=True)
    out.write_text(html)
    print(f"Wrote {out.relative_to(ROOT)} ({out.stat().st_size // 1024} KB): "
          f"{len(data['hats'])} hats, {len(data['cats'])} colours, {len(data['legacy'])} founders")


if __name__ == "__main__":
    main()
