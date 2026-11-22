# v0.6.0 · 黃金周決戰更新 / Golden Week Showdown Update

User decisions confirmed on 2026-11-21: use 300 m road hexes and port the complete AP package. This release number deliberately follows the user's requested **0.6**, after the historical `0.18.0-beta.5`; it does not renumber save schemas.

## Reference and scope

Reference: [STKSSK at aacaca6](https://github.com/vrkatbekao-creator/STKSSK/tree/aacaca6a19dedb34768a2bcf6641a31d6e796f5c). Compare `campaign.ts`, `road-movement.ts`, `campaign-growth.ts`, `vehicle-cost.ts`, and `vehicle-leg-planner.ts` under `src/game/`. Its README describes some rules differently from its executable code. The user's explicit request for **general outreach at 1 AP** takes precedence over the reference's conditional 1 AP motorcade follow-up.

This update retains Taipei's own geography, characters and skills, 28 days, three factions, local three-slot storage, single campaign state, polling blackout and final-night reveal. It adds no account or network gameplay. Public 2D Legacy remains a separately frozen release.

## New campaign rules

| Rule | v0.6 new road campaigns |
| --- | --- |
| Base daily AP | Heavy/ranged 15; scout 19; existing level, morale, fatigue, health and volunteer modifiers still apply |
| Night | Add 4 AP once to each available unit on the day-to-night transition; retain unspent AP; same-day recruits keep 0 AP |
| Walking | Buy 1,800 **weighted** metres per AP; consume leftover credit before charging another AP |
| Shared credit | Per unit, shared by walking and both vehicle connections, across day/night; reset next morning |
| Curbside connection | Once walking credit has been activated, a connection below 300 weighted metres is free and leaves the pool unchanged |
| Outreach/visits | 1 AP, 1 material; existing two-contact daily ceiling, sector saturation, exploration and XP apply |
| Rest / assist / staffing | Rest 1 AP; assist 1 AP + 2 materials; staff 0 AP with existing volunteer/venue conditions |
| HQ orders | Two per faction per morning; preparation or event response costs 0 AP, recruitment costs 1 AP while an order remains |
| Order consumption | Implicitly consume one only after a successful eligible action; keep material costs and other eligibility checks |
| Recruitment | Preserve the seven-person cap and 0 AP through a helper's first night; save and validate `joinedDay` |
| Driving/motorcade | Existing prepaid 8 km / 4 km per AP and fuel accounting retained; boarding/alighting now share walking credit |

Walking is **prepaid, not initially free**. For spent distance `walked`, purchased credit `credit`, and added effort `added`, only `max(0, walked + added - max(walked, credit))` needs another purchase. Costs round once across the complete movement. Rain +25%, steps +50%, and unmitigated roadworks +50% retain the source graph's district classification. No per-edge rounding.

`apRules: 'golden-week'` on the campaign and its units identifies the new AP contract. Pure command validation, visit plans, contextual actions, AI, travel quotes and committed commands use the same costs. The UI shows remaining orders, purchased walking distance and the night bonus; all new copy is available in six languages.

## 300 m lattice and road mapping

`design/build-city-grid.mjs` builds `src/data/taipei-grid-300.json` from frozen Taipei data. Run `npm run data:grid` to rebuild and package it. The 300 m diameter means a **150 m vertex radius**, rather than 300 m between adjacent centers.

- 4,594 cells, including 4,157 with playable road anchors; 378 original and source-based venues remapped.
- Official district outlines classify cell centers. Every playable anchor lies inside its own hex. Venues choose a road anchor in their own district; maximum current snap distance is 223.1 m. A snap is a game interaction location, not a claim about a real entrance.
- District starting anchors remain at their district's landmark. Adjacent interaction approaches follow actual roads, within 450 m, preserving the previous one-hex rule at the new scale.
- All **234,577 source road nodes**, original compressed links and directed edge order remain intact. Coarse cells aggregate the original fine-cell membership. Neither rendering nor coarse adjacency invents road links, bridge crossings or shortcuts.
- The underlying walking revision and vehicle connectors remain unchanged. A separate grid revision hashes the coarse cell/anchor/venue mapping.
- A metric MapLibre scale bar and wider default view accompany the larger cells. Existing building, DSM and district layers retain their licenses and precision limitations.

The coarse mapping is a separate roughly 104 KB gzip package, loaded with the core metadata; district rendering packages and the full synchronous routing graph retain their existing loading contract.

## Rust/WASM and AI

The worker retains the source STR1/RMD1 graph and expands occupied coarse cells to their fine-cell members. Both engines block identical source edges. The adapter translates remaining game walking effort into the core's existing budget units, then derives campaign costs from returned effort at the active lattice's anchors. Core benchmark AP units must not be displayed as campaign AP.

Vehicle WASM receives a bounded origin-by-destination table of **combined** boarding/alighting AP. Independent connector AP rounding would double-charge shared credit and can select a worse route. Search dominance compares these combined costs as well as existing distance/effort criteria. `vehicle_walk_matrix_version()` identifies compatible binaries; old binaries cannot silently price new shared-credit trips. Returned routes still undergo TypeScript geometry, turn, resource and cost checks.

AI shares the active AP rules and walking credit. Its walking candidate search is bounded to two new AP at a time; it still executes all moves and visits through authoritative commands. Zero-AP continuation moves must compare destination IDs, not use AP as a movement boolean.

AI move-and-visit commands can reuse the selected search's ordered edges. The move revalidates every edge, occupancy and AP; the subsequent visit checks location, daily cap and resources. Any failure returns the entire original snapshot. This avoids a second full-budget search without bypassing command validation. Nighttime logistics support and tactical AP transfers retain the extra night allowance rather than accidentally clamping a unit back to its daytime AP.

## Saves and compatibility

Existing schema 1–6 saves remain read-only on load. Old 100 m campaigns retain their lattice, positions, historical ordered paths, 1.5 km walking cost, AP, resources, seed and old day/night behavior. They are **not forcibly relocated** or granted new orders/credit. Start a new campaign to use the full v0.6 rules.

New games use `streetGrid: 300`, map `taipei-street-hex-v3`, its independent grid revision and rules `0.6.0`. The schema-5 base envelope and schema-6 vehicle envelope retain their structural versions, with explicit rule/map discrimination. Older apps reject these new map/rule combinations. Historical v0.6 schema-2 saves remain distinct by schema and map ID.

Walking credit, unit rule markers and orders are validated and saved. Orders are limited to 0–2, distance must be finite and within purchased credit, and available AP is bounded by the active day/night rule. Three-slot keys, overwrite confirmation and atomic travel confirmation remain unchanged. Deployment is a separate action; changing source does not update GitHub Pages.

## 驗收 / Verification

See `GOLDEN-WEEK-0.6-QA.md` for actual results and pending device coverage. Required checks: `npm run check`, `npm test`, `npm run build`, `npm run build:beta`, offline Rust tests, and `node design/audit-golden-week.mjs` after compiling WASM. Do not interpret prior release screenshots or benchmarks as v0.6 acceptance.
