# Audit of the v1 GDD

**Audited:** `cats_and_hats_GDD.html` (the agent-written "Game Design Document — For Discord Bot Re-implementation")
**Against:** the live Google Sheet *Cats & Hats 🐱🎩👒* (`1vgHGQh1POQMkItVnws1B9kj8dm9FnthYDHu1exY45Nc`), exported 2026-10-08 and snapshotted at `data/source/cats-and-hats-sheet-2026-10-08.xlsx`. Every cell, formula and image link in all 27 tabs was read. All extracted data is in `data/`.

## Verdict

The v1 GDD is a decent summary of the **public-facing tabs** (Intro, Hat Brochure, Planning). It is **not reliable as a spec**, for three reasons:

1. **It skipped the backend tabs.** It never read `Records` (the 280-row transaction ledger), `Cats` (all 20 cat colours), `Shop` (prices) or the player closets in any detail. As a result it lists as "open questions" several things the sheet already answers, and it misdescribes what several tabs are.
2. **It mixes invention with extraction and doesn't say which is which.** Rarity tiers, 24-hour trade expiry, a Monday–Sunday show schedule and "chance of hat or colour" rewards all appear as if they came from the sheet. None of them did.
3. **It targets a Discord bot**, which is no longer the plan. About a third of the document (slash commands, embeds, admin commands) doesn't carry over.

Parts of it were evidently built from screenshots. It says Animals Pt. 2 had "additional hats cut off in planning screenshot", but the sheet has only one item in that column.

**Recommendation:** don't patch v1. Replace it with `docs/GDD.md`, which is rebuilt from the sheet and marks each item as played, designed, proposed or undecided.

---

## Factual errors

| # | v1 says | The sheet actually shows | Where |
|---|---|---|---|
| 1 | `CATalog` tab = "alternate hat catalogue view" | It's the **cat colour** catalogue (the pun is the point): 20 colours across Starter, Basic and Shop Exclusive | `CATalog`, `Cats` |
| 2 | `Records` = "game-wide records / leaderboard" | It's the **transaction ledger**: 280 rows from 2022-03-17 to 2022-07-12 (date, user, source, item in, item out, shards in, shards out). Every closet's shard balance is a `QUERY` formula over it. | `Records`, closet cell `N3` |
| 3 | `All The Hats` = "aggregate hat ownership view across all players" | A 6-row test log (Laviee/Test, 2022-03-11) feeding a prototype auto-closet in the `test` tab | `All The Hats`, `test` |
| 4 | 14 player closets | 13 players plus **Laviee**, who has no ledger entries. Laviee's closet looks like the template/test closet (`User Template` is a copy of it). | player tabs |
| 5 | AC10 and AC12 have no flavour text | AC10 = 🐻🎀, AC12 = 🐻‍❄️🎀 | `Hats!D27`, `D29` |
| 6 | AC19/AC20 "do not count toward milestone thresholds", yet Animals 100% = 19 hats | These contradict each other. Only 18 Animals hats are in the box pool, so 19 is reachable only if AC19 (the 50% reward) counts. Unresolved in the source. | `Hat Brochure!E28` |
| 7 | Fashion Show runs weekly; the bot posts on Mondays; reward is "base shards + chance of hat or colour (table TBD)" | It ran **twice**: Sun 2022-03-27 (12 entrants) and Mon 2022-04-04 (9 entrants). Theme both times: "Whatever strikes your fancy!" **Every entrant** got their choice of a Basic cat colour plus 10 shards. | `Fashion Show!F3:F17`, `Records` |
| 8 | Shard Shop item list and prices "to be determined" | Priced in `Shop`: 4 Basic tabby colours at **25 💎**, 4 Shop Exclusive colours (Galaxy, Glass, Meadow, Magma) at **200 💎**. Never opened to players. | `Shop`, `!WIP! - Shard Shop` |
| 9 | Shard sources: box, disenchant, milestone, fashion show | Actual sources were box (186 💎), fashion show (210), set reward (550) and **Assistant** (45, paid to helpers). Disenchanting never happened: there are no "Shards −" entries anywhere. | `Records` |
| 10 | Daily box with a midnight cooldown | In practice the admin rolled boxes in batches: 185 boxes on 21 days over four months | `Records` |
| 11 | Mystery-box bonus shards: "probability and range TBD" | Each box gave **0, 1 or 2 shards**, roughly evenly (60 / 64 / 61 out of 185) | `Records` |
| 12 | Animals Pt. 2: "1+ hats … additional hats cut off in planning screenshot" | Exactly one item: "pastel pink racoon" | `Planning!L5` |
| 13 | Food has 7 planned hats | Planning lists 7, and the `Hats` tab adds **Fried Egg, Pancakes, Pancakes Fruit, Pancakes Eaten, Pancakes Ombre**. "Fried Egg" and "Sunny Side Up" are probably the same hat. | `Hats!A41:B45` |
| 14 | Fruit has 4 planned hats | 5: the `Hats` tab adds **Strawberry** | `Hats!A47` |
| 15 | Hat ID first letter "A = game series / generation" | Presented as fact, but it's a guess. v1 also never mentions that cat colours have their own IDs (`*A01`–`*C04`). | — |
| 16 | "Each hat has an associated cat-wearing-hat illustration" | Each hat has a 60×68 image of the hat **on a faceless grey mannequin cat**, plus a 19×23 icon. Player outfits were **composited by hand** per player per event. All art is hosted on postimg.cc. | `Hats!F:G`, closet outfit images |

## Major omissions

These are things a rebuild needs that v1 doesn't mention at all.

- **The ledger is the real database.** Balances are computed from it, and it records the full history of every box, trade, reward and event. Anything built from the sheet should start here.
- **Each player has one named cat.** Puff, Sylvie, Niko, Jumanji, Sophy, Magic, Nia, Grant, Copurrnicus, Pam, Edward, Belle, Adriaan (and Noodle on Laviee's closet). This is what "collect more hats than cats" literally means: **one cat, many colours, many hats**. v1's data model has no cat at all, only a "starter colour".
- **Portraits and outfit history.** Each closet has a 2× portrait (`<name>-big.png`), a current outfit (colour + hat), and a dated outfit history (`-000` at join, `-001` and `-002` at each Fashion Show). This is the core "dress up" fantasy.
- **Box reveal text and friendlier display names.** The `Hats` tab holds the line each box pull posted ("reaches into the box and pulls out......... a Pink Bunny Hood!"). Those lines use nicer names than the catalogue ("Black Baseball Cap" rather than "Cap, Black"). Column J numbers the 30 pool hats 1–30, which suggests a 1–30 roll. The observed split matches a uniform draw (40% Basic, exactly 12/30).
- **The full cat colour catalogue**, with flavour text: Starter ×4, Basic ×12 (Tabby ×4, Calico A–H), Shop Exclusive ×4.
- **The Birds set**, the *most* developed planned set: 14 birds named in `Hats` (Flamingo, Swan, Black Swan, Secretary, Great Horned Owl, two Chickadees, three Warblers incl. male/female Cerulean, Hummingbird, Barn Swallow, Peacock), "dove with olive crown" in Planning, and "finish birds hat collection" on the To Do list.
- **The To Do list:** "basic cat colours: colour point / fashion show / finish birds hat collection / finish food hat collection / which hat collection is up next?"
- **Player-written flavour text.** 25 cat-description lines from "Silv" and "Spring" (Silvanon and Springacres) in `Planning!E2`/`J2`. The two "Assistant" shard payments to these same players were probably thanks for this (inferred).
- **Events that happened:** April Fools 2022-04-01 gave Googly Eyes (AD01) to the 7 active players. On 2022-06-23 the same 7 got **personalized Jester Hats** (ledger IDs AD02–AD08). The master PSD has Jester A plus variants named for Springacres, Saturnalia ("sat"), XLostxDestinyX ("destiny") and SeaCrest ("sea").
- **A "Shop Exclusive" hat category**, with an empty placeholder row at `Hats!A40`.
- **Activity history and what it says about design** (see the GDD, §2).

## Presented as fact, actually invented

These may be good ideas, but none come from the sheet. In v2 they're labelled **[Proposed]** or turned into **[Decide]** items.

- Rarity tiers and per-rarity disenchant values (the sheet has no rarity; the intro says disenchanting grants "# shards", a placeholder)
- 24-hour trade expiry; Accept/Decline flow
- Fashion Show opening Monday 00:00 and closing Sunday 23:59, keyed by ISO week
- Fashion Show reward "base shards + chance of hat or colour"
- "Configurable chance of bonus shards" (the real rule was a flat 0/1/2)
- The admin command set; the `source` enum; `is_released` flags
- A recommended release order for planned sets (reasonable, but it omits Birds)

## v1's open questions, revisited

| v1 # | Question | Status |
|---|---|---|
| 1 | Disenchant value per rarity | **Still open.** There's no rarity, and the value was never set. Nobody ever disenchanted. |
| 2 | Box bonus shard odds | **Answered:** 0 / 1 / 2 shards, about ⅓ each |
| 3 | Basic 100% reward ("?") | **Still open.** Never decided; the best anyone reached was 10/12. |
| 4 | Which colours the Basic paintbrush offers | **Answered:** `*B01`–`*B12` |
| 5 | Shop items and prices | **Answered (draft):** 25 💎 Basic tabbies, 200 💎 Shop Exclusives |
| 6 | Fashion Show rewards | **Answered:** choice of Basic colour + 10 💎 for every entrant |
| 7 | Other colours | **Answered:** Starter ×4, Shop Exclusive ×4. "Colour point" was planned for Basic. |
| 8 | 1:1 trades or shards too? | **As played:** always one hat for one hat (11 trades). The app rule is still open. |
| 9 | Can reward-only hats be traded? | **Open.** Never came up. |
| 10 | Shard cap or streaks | **Open.** Nothing in the source. |
| 11 | Records/leaderboard metrics | **Wrong premise.** Records is the ledger. |
| 12 | Event hats tradeable? | **Open.** |
| 13 | Daily reset timezone | **Open for the app.** The original was batched by hand. |
| 14 | Trade expiry | **Open for the app.** |
| 15 | Streetwear has two Headbands | **Confirmed:** "Headband" and "headband". Still open. |
| 16 | Fruit has only 4 | Actually 5. Still thin. |
| 16b | Drinks has only Tea Bag Tag | Confirmed |
| 17 | Wigs has no hats | Confirmed |
| 18 | Winter has only Earmuffs | Confirmed |

## What v1 got right (keep)

- Premise and tone; cat colours as infinite-use paintbrushes; milestones never re-award after trading (all from the Intro tab)
- Released hat IDs, names, sets and most flavour text
- Milestone thresholds and reward text exactly as printed in the brochure
- Planning-tab contents for the columns it saw, including the duplicate Headband
- Engineering advice: atomic box/trade/reward writes, an append-only shard ledger, milestone claims as idempotency keys. The original sheet already worked ledger-first, so this direction is right.

---

## A note on the old sheet's data

The rebuild starts fresh, so none of this needs fixing. It's recorded for two reasons:

- **It shows why the rebuild has to automate.** Replaying the ledger against the closets found 10 of 14 closets out of sync. There were typos (an `AB18` that doesn't exist), closets with only one Jester slot when seven players each got their own Jester, a lowercase name that left one player's balance 19 💎 short, and milestone rewards that two players received **86 and 91 days late** because every check was done by hand.
- **It only matters if you choose to import 2022 players.** The cleaned ledger (`data/history/ledger.csv`) and per-closet comparisons (`data/history/players.json`) are there if you decide to. See GDD §9.
