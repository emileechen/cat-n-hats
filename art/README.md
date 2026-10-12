# Art

Pixel art by the game's creator. Organized 2026-10-09 from the full Drive folder. The untouched downloads are kept in `data/source/` (`art-full-drive-2026-10-09.zip`, `art-real-thing-2026-10-09.zip`).

## Layout

```
art/
  mannequin.png               faceless grey cat for previewing hats
  cats/                       released cat colours
    unreleased/               drawn but never released (4 more tabbies)
  hats/<set>/                 one folder per hat set
  source/                     the PSDs (ahhh.psd is the master file)
  legacy-2022/                the 2022 game's hand-made player art (Founder albums)
    portraits/<player>.png    120x136 closet portraits
    outfits/<player>-NNN.png  dated looks: 000 = joined, 001/002 = Fashion Shows
    signup-starter-pick.png   the 2022 sign-up graphic
  promo-2022/                 2022 announcement images (new colours, sets) and the set sheets
  extras/
    ui-mockup-2022-cards.png  2022 mockup of player cards (portrait, name, colour + hat icons)
    prototype-hats/           test hats from the PSD (clips, headband, hoods, tall pancakes…)
    cat-variants/             open-eyed White and Calico A experiments
    silhouettes/              dark hood silhouettes (bunny, froggy), maybe "not collected yet"
```

Hat sets:
- **Released in 2022:** `starter`, `basic`, `animals`, `april-fools-2022`
- **Drawn but not released yet:** `birds`, `food`, `fruit`, `winter`

## File rules

| File | Size | What it is |
|---|---|---|
| `cats/<slug>.png` | 60×68 | Cat colour sprite |
| `hats/<set>/<slug>.png` | 60×68 | **Hat layer:** hat pixels only, transparent everywhere else, in its wearing position on the shared canvas. The app stacks this on top of a cat. |
| `<slug>_i.png` | 19×23 | Icon for menus and inventory |
| `hats/<set>/<slug>_m.png` | 60×68 | Hat on the mannequin. Only for a hat that doesn't have a layer yet; the app generates these otherwise. |

- Slugs are lowercase words joined with hyphens, item first and then the variant: `partyhat-blue`, `warbler-cerulean-f`.
- The catalogue links to art by path. In `data/catalog/hats.json`, `"art": "hats/basic/partyhat-blue"` means `art/hats/basic/partyhat-blue.png`.
- Adding a set: make a new folder under `hats/`, export each hat as a layer plus an icon, then run the checker.

## Checking

```bash
python3 scripts/check_art.py --sheet build/all-hats-on-all-cats.png
```

The checker reports:
- wrong sizes or names
- catalogue items with no art
- hats missing a layer or icon
- drawn hats that aren't in the catalogue yet

With `--sheet` it also draws every hat layer on every cat colour. It needs Pillow.

## Cleanup done on 2026-10-09

- **Removed 54 mannequin previews (`_m`).** Each one matched its hat layer on `mannequin.png` pixel for pixel, so the app can regenerate them.
- **Removed 27 colour+hat-coded outfit renders** (e.g. `A03AB06.png`). Each was identical to a player outfit in `legacy-2022/outfits/`.
- **Left out older copies** found in the `hats/`, `img/`, top-level `outfits/` and loose top-level Drive folders. Every one was either identical to or an earlier version of a file kept here. They're still in the full-drive zip.
- **Exported from `ahhh.psd`:**
  - separated layers for Googly Eyes, Strawberry and five Jester Hats, each checked pixel for pixel against the 2022 mannequin image where one existed
  - the 4 unreleased tabbies, the prototype hats and the open-eyed variants
- **Jesters B–E are the personalized Jester Hats** from the June 2022 event. PSD layer names: B = Springacres, C = Saturnalia, D = XLostxDestinyX, E = SeaCrest. Jester A is the catalogue's Jester Hat (AD02).
- **Renamed:**
  - `barette-*` → `barrette-*`
  - `2022-aprilfools` → `april-fools-2022`
  - `2022-holiday` → `winter` (the name the 2023 sheet used)
  - `blackswan_i` → `swan-black_i`
  - `outfits-old` → `legacy-2022`
  - `*-big.png` portraits → `portraits/<player>.png`

## Known gaps (2026-10-09; run the checker for the current state)

**No icon yet:**
- Jesters A–E, both barrettes
- 8 birds (all except Swan, Black Swan and Flamingo)
- all food and winter hats
- Calico E–H, Glass, Meadow, Magma
