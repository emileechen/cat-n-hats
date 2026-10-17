# Cats & Hats

A cozy pixel-art collection game where you collect more hats than cats. It originally ran by hand on the Secundi Discord in 2022 and is being rebuilt as a mobile-first web app.

## Play the playtest

**https://www.emileechen.com/cat-n-hats/**

This is the vertical-slice prototype, rebuilt and published automatically on every push to `main` (`.github/workflows/pages.yml`). Progress is saved in your browser only, so it won't follow you to another device, and clearing site data starts you over. TOOLS (top right) skips days and speeds things up for testing.

## What's here

| Path | What it is |
|---|---|
| `docs/GDD.md` | The game design document for the rebuild |
| `docs/gdd-v1-audit.md` | Why the earlier, agent-written GDD was replaced |
| `prototype/` | Vertical slice: adopt a cat, open the daily Mystery Hat Box, collect the Animal Hoods, dress your cat up |
| `art/` | All game art, organized; see `art/README.md` for the file rules |
| `data/catalog/` | Hats, cat coats, shop, milestones and planned content, extracted from the 2022 sheet |
| `data/history/` | The 2022 game's ledger, closets and Fashion Shows (reference only) |
| `data/source/` | Untouched originals: the 2022 and 2023 sheets, and the Drive art downloads |
| `scripts/` | Extraction, art checking, and page builders |

## Commands

The Python scripts need Pillow (`pip install pillow`); `extract_sheet.py` also needs `openpyxl`.

```bash
node --test prototype/game.test.js                 # game rule tests
python3 scripts/build_prototype.py                 # -> build/prototype.html and build/site/index.html
python3 scripts/build_asset_browser.py             # -> build/asset-browser.html
python3 scripts/check_art.py --sheet build/all-hats-on-all-cats.png
python3 scripts/extract_sheet.py data/source/cats-and-hats-sheet-2026-10-08.xlsx data
```

`build/` is generated and not committed.

## Credits

Game design and all art by the original creator of Cats & Hats. Cat personality lines were written by Silv and Spring, two 2022 players.
