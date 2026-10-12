"""Bundle the vertical-slice prototype into one self-contained page.

Usage:
    python3 scripts/build_prototype.py        # writes build/prototype.html

Inlines prototype/game.js and the Animal Hoods + cat coat art (as data URIs) into prototype/app.html.
"""

import base64
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ART = ROOT / "art"
CATALOG = ROOT / "data" / "catalog"
REWARD_NAMES = {"AC19": ("Crowned Froggy Hood", "Crowned Froggy"), "AC20": ("Unicorn Hood", "Unicorn")}
STARTERS = ["*A01", "*A02", "*A03", "*A04"]


def uri(path):
    return "data:image/png;base64," + base64.b64encode(path.read_bytes()).decode()


def maybe(path):
    return uri(path) if path.exists() else None


def build_data():
    hats = {}
    for h in json.loads((CATALOG / "hats.json").read_text()):
        if h["set"] != "Animals":
            continue
        display, short = REWARD_NAMES.get(h["id"], (h["display_name"], h["display_name"]))
        desc = (h["description"] or "").replace("🎁 Reward.", "").strip() or None
        hats[h["id"]] = {"id": h["id"], "name": h["name"], "display": display, "short": short, "desc": desc,
                         "layer": uri(ART / f"{h['art']}.png"), "icon": uri(ART / f"{h['art']}_i.png")}
    coats = {}
    for c in json.loads((CATALOG / "cat_colours.json").read_text()):
        coats[c["id"]] = {"id": c["id"], "name": c["name"], "desc": c["description"],
                          "sprite": uri(ART / f"{c['art']}.png"), "icon": maybe(ART / f"{c['art']}_i.png")}
    lines = [l["text"] for l in json.loads((CATALOG / "planned.json").read_text())["cat_flavour_text_suggestions"]]
    return {"hats": hats, "coats": coats, "starters": STARTERS, "lines": lines, "mannequin": uri(ART / "mannequin.png")}


def main():
    page = (ROOT / "prototype" / "app.html").read_text()
    page = page.replace("/*__GAME__*/", (ROOT / "prototype" / "game.js").read_text())
    page = page.replace("/*__DATA__*/null", json.dumps(build_data(), ensure_ascii=False))
    out = ROOT / "build" / "prototype.html"
    out.parent.mkdir(exist_ok=True)
    out.write_text(page)
    print(f"Wrote {out.relative_to(ROOT)} ({out.stat().st_size // 1024} KB)")


if __name__ == "__main__":
    main()
