# Cats & Hats — Game Design Document (v2)

*Draft, 2026-10-08. Replaces the v1 GDD; see `gdd-v1-audit.md` for why.*

This is a design for **rebuilding Cats & Hats from scratch as a mobile-first app**. The 2022 Google Sheet is used as a reference for what the game was and as evidence of what worked. It is not something to port or repair. Content data pulled from the sheet is in `data/catalog/`.

**Legend**

| Tag | Meaning |
|---|---|
| **[Played]** | Happened in the 2022 game. There's evidence in the ledger. |
| **[Designed]** | Written down in 2022 but never went live |
| **[Proposed]** | A suggestion for the rebuild; yours to accept or change |
| **[Decide]** | Needs your call. All of these are collected in §11. |

---

## 1. The game

Cats & Hats is a cozy collection game where **you collect more hats than cats**. You have one cat. Every day you open a Mystery Hat Box and get a random hat. Hats come in themed sets, and filling half or all of a set earns rewards. Cat colours work like paintbrushes that never run out. You dress your cat in a colour and a hat and show off the look at the weekly Fashion Show. Spare hats can be traded with other players or turned into Shards (💎) for the shop.

**Tone:** playful, pun-forward ("CATalog", "No pidgeons included", a cat named Copurrnicus), low-pressure, and drawn in pixel art.

## 2. What the 2022 run tells us

The original ran on the Secundi Discord from **2022-03-17 to 2022-07-12** with 13 players. One admin ran everything by hand in a Google Sheet.

| | |
|---|---|
| Mystery boxes opened | 185, but only on **21 distinct days** (the admin rolled them in batches) |
| Box activity by month | Mar **119** → Apr **20** → May **0** → Jun–Jul **46** |
| Trades | 11, all one hat for one hat |
| Fashion Shows | 2 (12 and 9 entrants), then stopped |
| Events | 2: April Fools Googly Eyes, then a **personalized Jester Hat** for each of the 7 active players in June |
| Milestone rewards | 11; two of them arrived **86 and 91 days late** |
| Shards | **991 earned, 0 spent** (shop and disenchanting never went live) |

**What this means for the design**

1. **Automation is the point of the rebuild.** The manual workload limited the game: boxes were batched, rewards came late, and 10 of 14 closets drifted out of sync with the ledger. Routine play needs no admin.
2. **The first three weeks worked.** With a daily box, a weekly show and trading, all 13 players opened boxes in March, and 12 entered the first Fashion Show. The drop-off coincided with the Fashion Show stopping after two runs. **The weekly event must run itself.**
3. **Shards had nowhere to go.** Players sat on balances up to 140 💎 with nothing to buy. **The shop and disenchanting must ship at launch.**
4. **Milestones drove the economy** (550 of 991 💎). With a uniform draw over 30 hats, a halfway milestone takes about **20 boxes**. A full set takes about **90–105 boxes** (3+ months of daily play), and nobody got there. **Keep halfway rewards generous and give players a way to close out a set** (§5.2, §5.7).
5. **The social layer did a lot of work.** Trades were matched up in Discord, two players wrote flavour text, and everyone dressed up. **The app has to replace that matchmaking**: show duplicates and wishlists, and make offers easy.

## 3. Platform

**Recommendation: a mobile-first web app that can be installed to the home screen (a PWA).** **[Proposed]**

- **One link reaches everyone.** It works on iPhone, Android and desktop. An iOS-only app would exclude anyone in the community who isn't on an iPhone.
- **No App Store review or developer fee.** A new hat set is a content update that ships the same day.
- **Push notifications work.** Since iOS 16.4, a web app added to the home screen can send them ("your box is ready", "Fashion Show closes tonight"). Android and desktop have supported this for years.
- **Nothing here needs native APIs.** 60×68 pixel art renders crisply on the web.
- **It can still reach the App Store later.** If you want a listing, the same app can be wrapped (e.g. with Capacitor) without a rewrite.

Native iOS would be the better choice only if App Store discovery is the main way you'll find players, or if iOS-only features (a home-screen widget of your cat, say) are must-haves at launch.

**Audience and launch (decided 2026-10-08):** launch to the Secundi group first, but build it so anyone can pick it up and play.

- **Phase 1, Secundi:** share an invite link in #cats-n-hats and run it for a few weeks to shake out bugs and tune the economy.
- **Phase 2, public:** remove the invite gate. Nothing in the game should assume you came from Discord.

What "open to anyone" changes **[Proposed]**:
- **Sign-in:** Discord (one tap for Secundi players), plus Google and Apple for everyone else, with an email magic link as a fallback. No passwords.
- **Onboarding teaches the game.** The 2022 rules lived in the sheet's Intro tab and in Discord chat, so they now need a short in-app intro: what boxes, sets, colours and shards are.
- **Discord is optional.** A webhook can still post box pulls and show results to #cats-n-hats, but the game works fully without it.
- **Light moderation:** cat names and player names are visible to strangers, so they need a word filter, a report button, and an admin "hide/rename". Show entries are just a colour and a hat, so they carry little risk.
- **Alt accounts matter** once it's public (§5.6).

**Stack** **[Proposed]**, to settle at build time: a TypeScript web framework (SvelteKit or Next.js) plus Supabase, which covers Postgres, Discord OAuth, image storage and scheduled jobs for daily resets and weekly shows.

## 4. Core loop and concepts

- **Daily:** open your box → reveal → the hat lands on your cat → set progress ticks up → maybe a milestone
- **Weekly:** a Fashion Show theme drops → put together a look → enter → get rewarded → browse the gallery
- **Ongoing:** fill sets, trade duplicates, disenchant extras, buy colours

| Concept | What it is | |
|---|---|---|
| **Cat** | One per player. You name it. | [Played] |
| **Colour** | A paintbrush that repaints your cat. It's never used up, and you can switch freely. | [Played] |
| **Hat** | The collectible. Duplicates stack. | [Played] |
| **Set** | A themed group of hats with a halfway reward and a completion reward. Colours also come in sets, but those have no milestones. | [Played] |
| **Look** | One colour plus one hat. Your current look is how your cat appears everywhere. | [Played] |
| **Closet** | Your cat, colours, hats, shards and album of past looks | [Played] |
| **Shards 💎** | The only currency. Earned only; there is no real-money purchase. | [Played] |

Keep the original names wherever they're charming: **Closet**, **Mystery Hat Box**, **Hat Brochure** (set pages), **CATalog** (colour pages).

## 5. Systems

### 5.1 Joining and your cat

**Original [Played]:** players filled out a form to pick a starter colour (Black, White, Grey, Orange) and a starter hat (Navy Cap, Maroon Beret, Orange Bucket Hat, Black Top Hat), then named their cat. The admin hand-drew a portrait and a first-look image.

**Rebuild [Proposed]:**
1. Sign in → pick a colour → pick a starter hat → name your cat. The preview renders live as you choose.
2. **Open your first box right away** as the last onboarding step, so the core payoff lands in the first minute.
3. Give the cat a random personality line from the 25 player-written ones in `data/catalog/planned.json` ("If I fits, I sits", "BATHS ARE EVIL"). Let players reroll it.
4. Starter hats never appear in the box **[Played]**. The three you didn't pick can only be obtained by trading.

### 5.2 Daily Mystery Hat Box

**Original [Played]:** one box per day. The hat was a **uniform draw over all 30 pool hats** (12 Basic + 18 Animals), confirmed by the 40/60 split in the ledger. Each box also gave **0, 1 or 2 💎 with equal odds**. The reveal line read "…reaches into the box and pulls out……… a Pink Bunny Hood!"

**Rebuild:**
- One box per day with a visible countdown. The reset is a **single global time**, not each player's local midnight, which would let people change timezones to get extra boxes. Which timezone? **[Decide]**
- Reveal: the box wobbles, the reveal line appears, and the hat drops onto your cat. Keep the original reveal lines and their friendlier display names ("Black Baseball Cap" rather than "Cap, Black"); they're in `hats.json` as `display_name`. **[Played]**
- Bonus shards: keep 0/1/2. **[Played]**
- **Missed days [Decide].** In 2022, a missed day was simply lost. Option: unopened boxes **bank up to 2**, so a weekend away doesn't cost anything. This fits the cozy tone and works against the April drop-off. **[Proposed]**
- **Duplicates [Decide].** A uniform draw means a long tail at the end of a set. Options:
  - (a) keep it pure, as played;
  - (b) a pity rule: after 3 duplicates in a row, the next box is guaranteed to be a hat you don't have;
  - (c) handle it in the economy: duplicates disenchant into 💎, and 💎 buys a specific missing hat (§5.7).

  **Recommendation: (c), with (b) as an option.**
- **The pool grows as sets are added**, which slows down every set. Options: keep it uniform; give a new set extra weight during its launch window; or rotate a "featured set". **[Decide]**

### 5.3 Sets and milestones

**Original [Played]:** each set had a 50% reward and a 100% reward. A reward is never given twice, even if you trade away hats and collect them again.

| Set | Halfway | Complete |
|---|---|---|
| Basic (12) | 6 hats → **choice of a Basic colour + 50 💎** [Played ×5] | 12 hats → **"?" + 200 💎** [Designed; reward never decided] |
| Animal Hoods (18) | 9 hats → **Crowned Froggy + 50 💎** [Played ×6] | 19 hats → **Unicorn + 200 💎** [Designed] |

**Rebuild:**
- Rewards are checked and granted **instantly and automatically**, with a celebration screen. They're permanent once earned. **[Played rule, automated]**
- **Only box hats count toward a set.** Reward hats don't. That makes Animal Hoods complete at **18**. (The 2022 brochure said 19, which only works if the Crowned Froggy counts.) **[Decide]**
- **Basic completion reward [Decide].** One suggestion: the planned "colour point" Basic colour, which was on the 2022 To Do list. It would be the only way to get it.
- Set pages show every hat, owned or not, the same as the 2022 brochure. A "surprise mode" that hides unowned hats as silhouettes could be a setting. **[Proposed]**

### 5.4 Dress-up and the album

**Original [Played]:** each closet showed a current look plus a dated history of looks (joining day, then each Fashion Show). The admin drew every one by hand.

**Rebuild [Proposed]:**
- **Dressing room:** pick any colour and hat you own, preview instantly, and save as your current look. Looks are layered on the fly (§7), so no hand-made art is needed.
- **Album:** an automatic snapshot of your look when you join, at each Fashion Show entry, and at each milestone. This replaces the hand-drawn `-000`/`-001`/`-002` history.
- **One hat at a time** at launch. **[Played]** Several existing and planned items sit on the face rather than the head: Googly Eyes, Face Mask, and the planned Glasses, Sunglasses and Headphones. A second "face" slot later would let players combine them. **[Decide]**

### 5.5 Fashion Show (weekly)

**Original [Played]:** the theme was "Whatever strikes your fancy!" Players submitted a colour and a hat, and every entrant got their **choice of a Basic colour + 10 💎**. It ran twice, then stopped.

**Rebuild [Proposed]:**
- **Runs itself:** a theme is announced → entries are open for a set window → the gallery is revealed. Themes come from a pre-written queue the admin can edit (e.g. "Animal Hoods only", "Monochrome", "Party time", "Wear your rarest hat").
- **Reward:** every entrant gets 10 💎. **[Played]** The "choose a Basic colour" reward runs out once someone owns all 12. Options: a rotating reward pool, or 💎 only after that point. **[Decide]**
- **Judging [Decide].** 2022 rewarded taking part, with no judging. Suggestion: hearts on gallery entries for fun, with **no competitive rewards** at launch, so it stays cozy rather than a popularity contest.
- The gallery stays up as an archive. Each entry also goes into the player's album.

### 5.6 Trading

**Original [Played]:** 11 trades, all one hat for one hat. Players arranged them in Discord and the admin logged them.

**Rebuild [Proposed]:**
- **Offer flow:** choose a player → pick hats from your duplicates → pick hats from theirs → send. They accept or decline. The swap happens all at once, and offers expire after **3 days**. **[Decide: expiry]**
- **Matchmaking:** each closet shows **Duplicates** (spare hats) and a **Wishlist** (sets you're working on), plus a "who has what I need" view. This replaces the matchmaking the Discord channel used to do.
- **Hats only** at launch, as played; no shards in trades. That avoids a shard market and makes it harder for one person to funnel resources between accounts. Allow several hats for several hats? **[Decide]**
- **What can be traded [Decide].** Suggestion: everything except milestone reward hats, which stay as proof you earned them.
- **Alt accounts.** Because the game is public, a second account could feed its daily hats to a main account. Add light limits **[Proposed]**: trading unlocks after 7 days of play, and a cap on trades per day. Tune these during the Secundi phase.

### 5.7 Shards: sources and sinks

| Source | Amount | |
|---|---|---|
| Box bonus | 0 / 1 / 2 (avg 1/day) | [Played] |
| Fashion Show entry | 10 | [Played] |
| Halfway milestone | 50 | [Played] |
| Completion milestone | 200 | [Designed] |
| Disenchanting a duplicate | **2** suggested | [Decide] |
| Admin/helper grants | ad hoc (10–20 in 2022) | [Played] |

| Sink | Price | |
|---|---|---|
| Basic tabby colours | 25 | [Designed] |
| Shop Exclusive colours (Galaxy, Glass, Meadow, Magma) | 200 | [Designed] |
| **A specific missing hat** from a set you've already half-filled | ~30 suggested | [Proposed] |
| Shop Exclusive hats (an empty placeholder category in 2022) | TBD | [Proposed] |

**Pace check.** A player who opens every box and enters every show earns about **17 💎/week**, plus 50 per halfway milestone and some disenchant income. That's a Basic colour every week or two, and a Shop Exclusive in roughly two to three months. The "buy a missing hat" sink is what makes finishing a set achievable without endless duplicates.

### 5.8 Disenchanting

**Original [Designed]:** "Disenchant your unwanted Hats for some shards." The value was never set, and nobody used it.

**Rebuild [Proposed]:** **duplicates only**, meaning you can never disenchant your last copy of a hat. Include a "disenchant all duplicates" button that keeps one of each. Value **[Decide]**, with 2 💎 as the suggestion.

### 5.9 Shop

**Original [Designed]:** four Basic tabbies at 25 💎 and four Shop Exclusives at 200 💎 (the other eight Basic colours, the Calicos, were reward-only). The tab was marked "!WIP!" and never opened.

**Rebuild [Proposed]:** live at launch with those prices as the starting point. Add missing-hat purchases (§5.7). Later: rotating stock and Shop Exclusive hats.

### 5.10 Events

**Original [Played]:** April Fools 2022 gave Googly Eyes to every active player. In June 2022, each of the 7 active players got **their own Jester Hat**. The PSD has Jester A plus four named variants, for Springacres, Saturnalia, Destiny and SeaCrest. Event hats form their own dated set ("April Fools 2022").

**Rebuild [Proposed]:** seasonal event sets. You claim the item by opening the app during the event window, or through a special event box. Planned themes map onto them naturally: Costume → Halloween, Winter → Earmuffs, April Fools. Should event hats come back in later years? **[Decide]** (Suggestion: the dated set stays unique; a new year gets a new set.)

## 6. Content

### 6.1 What exists (and has art)

All of this is in `data/catalog/` with names, flavour text, reveal names and image links.

| Set | Count | How you get them | IDs |
|---|---|---|---|
| Starter hats | 4 | Pick one when you join | AA01–AA04 |
| Basic hats | 12 | Mystery Box | AB01–AB12 |
| Animal Hoods | 18 + 2 rewards | Box; Crowned Froggy (AC19) and Unicorn (AC20) are milestone rewards | AC01–AC20 |
| April Fools 2022 | 2 | Event | AD01–AD02 |
| Starter colours | 4 | Pick one when you join | \*A01–\*A04 |
| Basic colours | 12 (Tabby ×4, Calico A–H) | Milestone/show choice; tabbies also in the shop | \*B01–\*B12 |
| Shop Exclusive colours | 4 (Galaxy, Glass, Meadow, Magma) | Shop, 200 💎 | \*C01–\*C04 |

**Gaps to fill before launch:**
- No flavour text for 9 Basic hats (AB03–AB09, AB11, AB12) or for Calico E–H
- No icons for AB11, AB12, AD02, Calico E–H, Glass, Meadow or Magma
- No reveal names for the starter hats, AC19, AC20 or AD02

**Is this enough for launch?** Probably. By the pace math in §2, 30 box hats take a daily player 3+ months to finish. Have the first new set ready about 6–8 weeks after launch. **[Decide]**

### 6.2 Planned content

Sources: the main sheet's **Planning** tab (To Do list, one column per set idea) and its **Hats** tab (unreleased rows). Also a second, January 2023 sheet in the same Drive folder, **`catsnhats`**, which reworked the closet system and listed Birds and Winter hats in order. "Drawn" means finished art exists in Drive (`cats n hats/real thing/`).

| Set | Drawn | Ideas not drawn yet |
|---|---|---|
| **Birds** ("finish birds hat collection" was on the To Do list) | **11:** Secretary Bird, Great Horned Owl, Flamingo, Swan, Black Swan, Chestnut-backed Chickadee, Black-capped Chickadee, Blackburnian Warbler, Yellow(-rumped) Warbler, Cerulean Warbler (m), Cerulean Warbler (f). The 2023 sheet leaves slot #4 blank. | Hummingbird, Barn Swallow, Peacock, Dove with Olive Crown |
| **Food** ("finish food hat collection" was on the To Do list) | **5:** Fried Egg, Pancakes, Pancakes Cut (listed as "Eaten" in the sheet), Pancakes Fruit, Pancakes Ombre | Spaghetti, Corn, Yam, Mini Broccoli Clips, Ice Cream, Taiyaki?; "Sunny Side Up" is probably the Fried Egg |
| **Winter** (the 2023 sheet's name for the 2022 holiday art) | **2:** String Lights Multi, String Lights Warm | Earmuffs |
| Fruit | **1:** Strawberry (on mannequin and icon only; no separated layer in the folder) | Lime Slice, Lemon Slice, Cherry on Top, Watermelon |
| Water Animals | — | Axolotl, Crab, Shark, Fish, Fish Eating Head |
| Costume | — | Witch, Halo, Horns, Masquerade, Flame, Knight's Helm |
| Streetwear | — | Headphones, Headband, Straw Hat, Glasses, Sunglasses, Headband (listed twice) |
| Cottagecore | — | Flower Petal Hat, Flower Crown |
| Animals pt 2 | — | Pastel Pink Raccoon |
| Drinks | — | Tea Bag Tag |
| Wigs | — | (name only) |
| Colours | — | Colour point (Basic) |

**Other notes from the Planning tab**
- **To Do:** "basic cat colours: colour point / fashion show / finish birds hat collection / finish food hat collection / which hat collection is up next?"
- **Uncategorized** and **shard shop** were set up as columns but left empty.
- **Flavour text:** 25 cat personality lines from Silv and Spring, used in §5.1.
- **The 2023 sheet rewrote some flavour text,** e.g. Orange Tabby "Very clever. Can open wet food cans." instead of "Never stops meowing.", and "Fluffy pink bunny ears." Pick whichever version you prefer when writing the catalogue. **[Decide]**

**First new set:** Birds. 11 are already drawn, and finishing the 4 planned ones would bring it to 15, near Animal Hoods' 18. **Winter** (string lights + earmuffs) is a ready-made seasonal event. **[Decide]**

## 7. Art and rendering

**The art is in this project: `art/`**, organized 2026-10-09 from your Drive export. File rules, layout and known gaps are in `art/README.md`. `scripts/check_art.py` validates it and draws a test sheet.

**What exists**
- Pixel art on a shared **60×68 canvas**, so every cat and hat lines up. Icons are 19×23. 2022 portraits were 2× scale.
- **20 cat colours** (plus 4 unreleased tabbies) and **61 hat layers**: hat pixels only, transparent elsewhere, already in wearing position. The 2022 sheet published mannequin previews instead, but each of those is simply a layer on `art/mannequin.png`.
- **Verified:** every hat layer was stacked on every cat colour (`build/all-hats-on-all-cats.png`). Faces show through hoods correctly, and no hat needs offsets.
- In 2022 every look was composited by hand. The app layers cat + hat automatically.

**Rendering:** draw the cat, then the hat on top. Scale at whole-number multiples (×2, ×3, ×4) with nearest-neighbour filtering so the pixels stay crisp. Face items like Googly Eyes simply cover the eyes, as they did in the 2022 art.

**Ears behind hoods [Decide].** On a few hoods (bunny, flamingo, both swans) the cat's own ears peek out from behind. The 2022 mannequin previews look the same, so it may be intended; it's just more visible on coloured cats. If you'd rather hide them, add an optional per-hat mask that blanks those cat pixels.

**Gaps** (details in `art/README.md`):
- Icons for 29 items

**Who draws: you.** You drew all the original art and will draw new sets, so new content moves at the pace of your drawing time. The pipeline should keep everything else out of the way: export a layer and icon per hat → upload in the admin page → fill in names and flavour text → schedule the set. No code changes.

**Unreleased art already exists:** 11 Birds, 5 Food, 2 Winter string lights, a Strawberry, 4 extra tabby colours and a few prototype hats (see §6.2 and `art/README.md`). The PSD sources, including the master file `ahhh.psd`, are in `art/source/`.

**A 2022 UI mockup exists:** `art/extras/ui-mockup-2022-cards.png` shows player cards with a framed portrait, a name, and colour + hat icons. It's a natural starting point for the app's card design.

## 8. App structure (mobile-first) **[Proposed]**

Bottom tab bar:

| Tab | Contents |
|---|---|
| **Home** | Your cat in its current look, large. Box button with countdown. Shard balance. Alerts (trade offers, show open, milestone earned). |
| **Collection** | Hat Brochure (one page per set, owned/unowned, progress toward 50%/100%) and CATalog (colours) |
| **Dress Up** | Dressing room and album |
| **Show** | This week's theme and your entry; gallery; past shows |
| **Trade & Shop** | Offers in and out; browse others' duplicates; shop; disenchant |

Plus player profiles (cat, look, completion, duplicates, wishlist) and a desktop-friendly **admin page**: add sets, hats, colours and art; queue themes and events; grant items; view the ledger.

## 9. Founders (2022 players)

**Decided 2026-10-08:** 2022 players start fresh like everyone else and get an **exclusive Founder item** that nobody else can ever obtain. Old collections are not imported; the 2022 data stays in `data/history/` for reference.

**[Proposed]**
- **Colour or hat? [Decide]** A **colour** is the better showcase: it appears in every look whatever hat you wear, so it reads as "Founder" in every Fashion Show and on every profile. A hat would take up the only hat slot.
- **Untradeable**, and never sold or re-released.
- **There's a precedent for making them personal.** In June 2022 you drew a personalized Jester Hat for individual players. Founder items could follow that: one shared Founder colour, or a small personal touch per player.
- **Claiming:** the sheet only has server nicknames, not Discord accounts, so founders can't be matched automatically. The admin page generates 13 one-time **Founder codes**, which you DM out. Redeeming a code grants the item, works with any sign-in method, and pre-fills the 2022 cat name (editable).
- **2022 memories:** on redeeming, the player's hand-drawn 2022 outfit images also go into their album.

The 13 players and their cats: Aralie (Sylvie), Ember (Niko), Luv007 (Jumanji), Pinkshadow (Sophy), Ryuukokoro (Magic), Saturnalia (Puff), SeaCrest (Nia), Silvanon (Grant), Springacres (Copurrnicus), Sunshine Warrior (Pam), Wildfilly94 (Edward), XLostxDestinyX (Belle), YLO (Adriaan). Laviee's closet (Noodle) has no ledger activity.

## 10. Data model sketch **[Proposed]**

**Ledger-first:** every change is an append-only entry, and inventories and balances are calculated from it. The 2022 sheet's `Records` tab already worked this way. What drifted were the hand-maintained closets, so the rebuild keeps the ledger and derives everything else from it.

- `player`: Discord id, display name, joined date, optional link to a 2022 tab
- `cat`: one per player; name, personality line, current look (colour id, hat id)
- `set`: name, kind (hat or colour), status (draft / live / retired), whether it's in the box pool
- `item`: hats and colours; id, set, name, display name, flavour text, how it's obtained, art keys, tradeable flag
- `milestone`: set, threshold, rewards
- `ledger_entry`: player, time, source (starter / box / trade / show / event / milestone / shop / disenchant / admin), item and quantity change, shard change, reference to the record that caused it
- `box_open`: player, game-day (unique per player per day), item, shards
- `milestone_claim`: player, milestone (unique per player per milestone)
- `trade` and `trade_line`: from, to, items each way, status, expiry
- `fashion_show` and `show_entry`: theme, open/close times, reward; player, look snapshot, hearts
- `album_entry`: player, look snapshot, occasion, date
- `shop_listing`: item, price, availability window

Each box open, trade, disenchant, purchase and milestone check runs as a single all-or-nothing transaction.

## 11. Decisions needed

Ordered by how much they shape the build. My recommendation is in parentheses.

1. **Platform:** web app/PWA vs native iOS *(PWA)*
2. ~~**Audience**~~ **Decided:** launch to Secundi first, open to anyone after (§3)
3. ~~**Art**~~ **Decided:** hats are separated in the source files, and you draw all new art (§7)
4. ~~**2022 players**~~ **Decided:** fresh start plus an exclusive Founder item. Still open: colour or hat *(colour)*
5. **Box rules:** reset time and timezone; banking missed boxes; duplicate handling *(fixed global reset; bank up to 2; buy-a-missing-hat sink)*
6. **Set completion:** Animal Hoods at 18 or 19; the Basic completion reward *(18; colour point)*
7. **Fashion Show:** length of the entry window; reward after Basic colours run out; hearts/judging *(weekly; 💎 plus a rotating pool; hearts with no prizes)*
8. **Trading:** several-for-several; expiry; whether reward hats are tradeable *(yes; 3 days; no)*
9. **Economy numbers:** disenchant value, shop prices, missing-hat price *(2 / 25 & 200 / ~30)*
10. **Look slots:** one hat, or head + face *(one hat at launch)*
11. **Launch content and first new set** *(the existing 38 hats; Birds 6–8 weeks after launch)*
12. **Event hats:** limited to the year, or returning *(limited)*

---

### Appendix: where the data came from

| Sheet tab | Extracted to |
|---|---|
| Hats | `data/catalog/hats.json` (released) and `planned.json` (unreleased rows) |
| Cats | `data/catalog/cat_colours.json` |
| Shop | `data/catalog/shop.json` |
| Hat Brochure (milestone text) | `data/catalog/milestones.json` |
| Planning (To Do, set ideas, flavour text) | `data/catalog/planned.json` |
| Records | `data/history/ledger.csv` |
| Player closets | `data/history/players.json` |
| Fashion Show | `data/history/fashion_shows.json` |

Also consulted, but not extracted: the January 2023 rework sheet `catsnhats` (`1hh143Wlq0jl6zRAfPlzfv4YTZzMMGhqEQaKpoJ7W2mY`), and the art folders in the same Drive folder.

Regenerate with `python3 scripts/extract_sheet.py data/source/cats-and-hats-sheet-2026-10-08.xlsx data` (needs `openpyxl`).
