# Election Knights: Taipei — Citywide Canvassing

**選舉騎士團 台北篇 全市掃街**

**v0.6.0 · Golden Week Showdown Update / 黃金周決戰更新**

A single-player 3D tactics game set across Taipei’s 12 districts. Lead one of three fictional factions through 28 days of neighborhood visits, campaign motorcades, community stages, policy presentations, and debates. Available in English, Traditional Chinese, Japanese, French, Dutch, and Simplified Chinese.

這是一款以台北 12 行政區為舞台的單機 3D 戰棋。帶領三個虛構陣營之一，在 28 天內步行拜訪、跨區車掃、經營社群舞台，並透過政見發表會及辯論爭取支持。支援繁體中文、英文、日語、法語、荷蘭語與簡體中文。

| Version / 版本 | How to play / 取得方式 |
| --- | --- |
| **v0.6.0 · Golden Week Showdown / 黃金周決戰更新** | [Play 3D / 試玩 3D](https://vrkatbekao-creator.github.io/STKSST/) |
| **v0.6.0 · current source / 目前原始碼** | [Rules and compatibility / 規則與相容性](GOLDEN-WEEK-0.6-SPEC.md) · [QA / 驗收](GOLDEN-WEEK-0.6-QA.md) |
| **v0.17.0 · 2D Legacy / 舊版** | [Play 2D Legacy / 試玩 2D 舊版](https://vrkatbekao-creator.github.io/STKSST/legacy/) |

Use the edition link on either preview to switch between 3D and 2D Legacy. Each edition uses its own browser saves. Start a new 3D campaign to use the 300 m grid and updated AP rules.

兩版都可從頁面上的版本連結切換，各自使用原有的瀏覽器存檔。在 3D 版開新局即可使用 300 公尺格網和新版 AP 規則。

[回報問題 / Report an issue](https://github.com/vrkatbekao-creator/STKSST/issues/new?template=bug_report.yml)

## v0.6 · Golden Week Showdown / 黃金周決戰

New campaigns use 300 m road hexes, 15 AP (19 for scouts), and +4 AP at night. Walking purchases a shared 1,800 m weighted-distance allowance per AP, including boarding and alighting. Outreach and visits cost 1 AP. Each faction gets two daily HQ orders for preparation, event responses or discounted recruitment. A metric scale bar shows map distance.

新局採用 300 公尺道路六角格，基礎 15 AP、機動隊員 19 AP，入夜補充 4 AP。步行每 AP 購買 1,800 公尺加權路程額度，剩餘距離可供接續步行與上下車共用。掃街與拜訪降為 1 AP；每陣營每日有兩枚總部應援令，用於議題準備、事件應變或招募折抵。地圖新增公制比例尺。

Existing saves retain their original grid, AP rules and history. Start a new campaign for the v0.6 rules. The requested product version **0.6.0** follows historical **0.18.0-beta.5**; save schemas are not renumbered. [Implementation and reference](GOLDEN-WEEK-0.6-SPEC.md)

舊存檔保留原格網、AP 規則與歷史；要使用完整 v0.6 規則，請開新局。產品版號依使用者指定從歷史 **0.18.0-beta.5** 改為 **0.6.0**，存檔格式不因此重編。

## Mobile 3D / 手機 3D

On narrow screens, tap a road to choose a route in a bottom sheet. The sheet shows the cost before you confirm. Tap a landmark for location details or tap a team member for field actions.

手機窄版可點道路，在底部面板選擇移動方式並確認費用。點地標可看地點資訊，點角色可開啟現場行動。

## 3D Beta 4

Walking and vehicle data load in parallel. While you wait, try the optional Taipei landmark quiz.

步行與車行資料會並行載入，等待時可選玩台北地標小問答。

- **地圖與移動 / Map and travel** — MapLibre 3D 地圖保留六角格、台北區界、道路、建物與衛星地表。點選地圖或活動點可查看步行、開車或車掃的 AP 和物資，點選己方角色或抵達後可在角色旁選擇現場行動。 Select a destination to review walking, driving, or motorcade costs. Select an allied unit, or arrive at a destination, to open actions beside the unit on the map.
- **尋路與兩方 AI / Routing and opposing AI** — Rust／WebAssembly 在背景處理道路尋路與夜間對手行動。Beta 改善車行尋路。七組對照快照的路線、費用及結算狀態一致。 Beta accelerates vehicle routing while preserving routes, costs, and outcomes in seven matched scenarios. [效能與驗收紀錄 / Benchmark and QA](BETA-REVIEW.md)
- **競選與存檔 / Campaign and saves** — 每隊最多七人，保有隊員技能、染色拜訪紀錄、治疏嶼（Governance Isle）及恰恰肥皂箱（Cha-Cha Soapbox）。第 2–14 天偶數日公布民調，第 15–28 天封關，最後一晚結算後開票。 Three browser-local save slots, teams of up to seven, and a polling blackout from day 15 until the final night concludes.

移動確認卡顯示實際費用，已購步行額度於次晨重置。新版與同一瀏覽器、同一網址的 3D Alpha／Beta 共用存檔，公開 2D 原型的瀏覽器存檔另存。

The confirmation card shows the actual cost; prepaid walking credit resets each morning. The 3D editions share saves on the same browser and URL. The public 2D prototype stores its saves separately.

## 本機建置 / Local build

```sh
npm ci
npm run build:beta
npm run preview -- --port 4173 --strictPort
```

開啟 [本機 Beta / Local Beta](http://127.0.0.1:4173/)。需要 Node.js、Rust 的 `wasm32-unknown-unknown` 目標、Python 的 NumPy／Pillow，以及已凍結的車網來源或封包。依 [Beta guide](BETA-REVIEW.md) 及 [車網重建步驟 / Vehicle network setup](ALPHA-REVIEW.md#開啟與存檔) 準備。Beta 已驗證本機建置及瀏覽器續玩，實體手機與完整 Beta 瀏覽器對局仍待驗收。

## 創作緣起 / Why I made this

這是在研究 A* 搜尋時，無聊之餘做出來的 side project。看到自己的學弟，以及同學的同學，竟然在同一場台北市長選戰中競爭，覺得既感慨又有趣，於是有感而作。歡迎取用、修改與改善，請記得標註原作者及本專案來源。

This started as a side project I put together for fun while studying A* search. Seeing a junior from my school and a classmate's classmate competing in the same Taipei mayoral election felt both surreal and thought-provoking, and inspired me to make this game. You're welcome to use, modify, and improve it; please credit the original author and link back to this project.

## 授權 / License

程式碼與文件採 [MIT 授權](LICENSE)。使用或修改時請保留版權與授權文字，並標註作者 `vrkatbekao-creator` 和 [本 repo](https://github.com/vrkatbekao-creator/STKSST)。第三方圖資與素材依各自原授權，詳見 [第三方授權 / Third-party notices](THIRD-PARTY-NOTICES.md)。

Code and documentation are released under the [MIT License](LICENSE). Please retain the copyright and license notice, credit `vrkatbekao-creator`, and link to this repository. Map data and third-party assets retain their original terms.

## 開發資料 / Development notes

[3D 介面與車掃 / 3D interface and motorcades](CAMPAIGN-3D-INTERFACE-SPEC.md) · [Alpha 對局驗收 / Alpha playthrough](ALPHA-REVIEW.md) · [道路移動 / Road movement](ROAD-MOVEMENT-SPEC.md) · [全市掃街 / Citywide outreach](CITY-OUTREACH-SPEC.md) · [建置筆記 / Build notes](GAME-BUILD-NOTES.md) · [靜態網站 / Static hosting](STATIC-HOSTING.md)

[v0.17.0 公開原型說明與歷史沿革 / Public prototype guide and version history](https://github.com/vrkatbekao-creator/STKSST/blob/fdc90d1dc394e681bb9a9b296679fd23edc5fbb8/README.md)
