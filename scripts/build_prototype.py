"""Bundle the vertical-slice prototype into one self-contained page.

Usage:
    python3 scripts/build_prototype.py        # writes build/prototype.html and build/site/index.html

Inlines prototype/game.js and the hat and cat coat art (as data URIs) into prototype/app.html.
build/prototype.html is the body-only page for a claude.ai artifact (which supplies the document wrapper);
build/site/index.html is a complete document for static hosting such as GitHub Pages.
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


def build_data():
    hats = {}
    for h in json.loads((CATALOG / "hats.json").read_text()):
        if h["set"] not in ("Animals", "Basic"):
            continue
        display, short = REWARD_NAMES.get(h["id"], (h["display_name"], h["display_name"]))
        desc = (h["description"] or "").replace("🎁 Reward.", "").strip() or None
        hats[h["id"]] = {"id": h["id"], "name": h["name"], "display": display, "short": short, "desc": desc,
                         "layer": uri(ART / f"{h['art']}.png")}
    coats = {}
    for c in json.loads((CATALOG / "cat_colours.json").read_text()):
        coats[c["id"]] = {"id": c["id"], "name": c["name"], "desc": c["description"],
                          "sprite": uri(ART / f"{c['art']}.png")}
    lines = [l["text"] for l in json.loads((CATALOG / "planned.json").read_text())["cat_flavour_text_suggestions"]]
    # Placeholder special hats: the 2022 test hats from the master PSD, assigned by coat.
    specials = [("cap-red", "Red Cap"), ("clips", "Hair Clips"), ("hood", "Pink Hood"), ("bigger-hood", "Yellow Hood"),
                ("party-hat", "Red Party Hat"), ("headband", "Headband"), ("pancakes-tall", "Tall Pancakes")]
    for slug, name in specials:
        hats[f"SP-{slug}"] = {"id": f"SP-{slug}", "name": name, "display": name, "short": name,
                              "desc": "Placeholder: a 2022 test hat from the master PSD.", "special": True,
                              "layer": uri(ART / "extras" / "prototype-hats" / f"{slug}.png")}
    order = STARTERS + [c for c in coats if c not in STARTERS]
    special_by_coat = {coat: f"SP-{specials[i % len(specials)][0]}" for i, coat in enumerate(order)}
    locked = [{"name": "Birds", "layer": uri(ART / "hats/birds/flamingo.png")}]
    return {"hats": hats, "coats": coats, "starters": STARTERS, "lines": lines,
            "mannequin": uri(ART / "mannequin.png"), "lockedBoxes": locked, "specialByCoat": special_by_coat}


STANDALONE_HEAD = """<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="description" content="Cats & Hats: a cozy pixel-art game where you collect more hats than cats. Playtest build.">
<link rel="icon" type="image/png" href="{icon}">
<link rel="apple-touch-icon" href="{icon}">
<style>
  html {{ -webkit-text-size-adjust: 100%; }}
  body {{ margin: 0; }}
  :root {{ padding-top: env(safe-area-inset-top, 0px); padding-bottom: env(safe-area-inset-bottom, 0px); }}
  img {{ max-width: 100%; }}
  [hidden] {{ display: none !important; }}
</style>
"""


def main():
    page = (ROOT / "prototype" / "app.html").read_text()
    page = page.replace("/*__GAME__*/", (ROOT / "prototype" / "game.js").read_text())
    page = page.replace("/*__DATA__*/null", json.dumps(build_data(), ensure_ascii=False))
    out = ROOT / "build" / "prototype.html"
    out.parent.mkdir(exist_ok=True)
    out.write_text(page)
    print(f"Wrote {out.relative_to(ROOT)} ({out.stat().st_size // 1024} KB)")

    # The page's <title>, <link> and <style> stay in the body, which browsers accept.
    site = ROOT / "build" / "site" / "index.html"
    site.parent.mkdir(exist_ok=True)
    head = STANDALONE_HEAD.format(icon=uri(ART / "cats" / "orange.png"))
    site.write_text(head + "</head>\n<body>\n" + page + "\n</body>\n</html>\n")
    print(f"Wrote {site.relative_to(ROOT)} ({site.stat().st_size // 1024} KB)")


if __name__ == "__main__":
    main()
