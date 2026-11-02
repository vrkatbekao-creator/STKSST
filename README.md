# 選戰騎士團：首都篇

**目前版本 / Current version：v0.17.0 · 公開測試原型 / Public prototype**

前置修正 v0.16.1（歷史）：降低道路移動 AP，每 200 公尺加權路程 1 AP，雨天增加 25% 負擔，階梯／未應變施工各增加 50%。玩家與 AI 共用，既有進度從下一次移動起適用、不回補已耗 AP；存檔及歷史保留。/ Road movement now costs 1 AP per 200 weighted metres, with lighter weather and obstacle penalties. The same rules apply to players and AI; existing saves keep spent AP and history. 詳見 [ROAD-MOVEMENT-SPEC.md](ROAD-MOVEMENT-SPEC.md)。

## 全市掃街 v0.17 / Citywide outreach

可在任何可步行道路格原地掃街；318 個官方來源場地含 47 個市場、41 個攤販集中場群與 230 個捷運出入口群，各區數量不固定。清單可搜尋、依類型篩選並分批顯示，重要 Wonder 與舞台保留。新街區／行政區有首次接觸收益，同片街區短期重複接觸會飽和，鼓勵全市擴張。步行維持每 200 加權公尺 1 AP；道路局區域接駁 3 AP，指定場地接駁 4 AP，皆花 4 物資並共用每人每日一次。

Canvass any walkable road cell and explore 318 public-source facility groups, with search and type filters. First contact in new neighborhoods or districts earns bonuses; repeated local contact becomes saturated. District and place transfers help the team reach the whole city. Saves upgrade without refunding spent AP or replaying rewards. Facility names without source-provided English retain their original proper names.

地圖綠底是地景，淺色輪廓是建物，白色圓點是活動場地，藍色表示可達、金色表示選取／預覽路線；不是勢力範圍。陣營看角色外圈。/ Map fills show terrain, buildings, places and reachability, not faction territory.

規則與資料界線：[CITY-OUTREACH-SPEC.md](CITY-OUTREACH-SPEC.md)。來源採固定快照，不是即時人流、完整市場清冊或競選許可。南門市場的舊位置已依官方現址／交通說明另列更正；原始資料仍保留。

## 公開測試 / Public prototype

[開始遊玩 / Play](https://vrkatbekao-creator.github.io/STKSST/) · [回報問題 / Report an issue](https://github.com/vrkatbekao-creator/STKSST/issues/new?template=bug_report.yml)

目前為可玩的原型，歡迎回報操作、顯示與平衡意見。三個存檔保存在自己的瀏覽器；清除網站資料會移除，本機版進度不會自動移至線上版。

This is a playable prototype. Feedback on gameplay, display issues and balance is welcome. Three save slots are stored in your browser; clearing site data removes them. Saves from the local version do not transfer automatically to the hosted site.

## 授權 / Licence

本專案程式碼與文件採 [MIT 授權](LICENSE)。歡迎取用、修改、散布及改善，請保留版權與授權文字，並標註作者 `vrkatbekao-creator` 及本專案來源。第三方圖資與素材依其原授權，詳見 [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md)。

Project code and documentation are available under the [MIT License](LICENSE). Use, modify, distribute and improve them while retaining the copyright and licence notice; please credit `vrkatbekao-creator` and link to this repository. Third-party data and assets retain their original terms; see [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md).

## 創作緣起 / Why I made this

這是在研究 A* 搜尋時，無聊之餘做出來的 side project。看到自己的學弟，以及同學的同學，竟然在同一場台北市長選戰中競爭，覺得既感慨又有趣，於是有感而作。歡迎取用、修改與改善，請記得標註原作者及本專案來源。

This started as a side project I put together for fun while studying A* search. Seeing a junior from my school and a classmate's classmate competing in the same Taipei mayoral election felt both surreal and thought-provoking, and inspired me to make this game. You're welcome to use, modify, and improve it; please credit the original author and link back to this project.

專案來源 / Project source: [vrkatbekao-creator/STKSST](https://github.com/vrkatbekao-creator/STKSST)

## 角色與中立來客 v0.16（歷史）

三方各六種隊員立繪已接入，醫護／動員／後勤可在招募預覽、戰術面板與影音圖鑑查看；白方瘋狂小草、橙方小水滴、藍方藍鷹斥候。新增三種逐步解鎖的中立接觸事件與保存，規格見 [CHARACTERS-CONTACTS-SPEC.md](CHARACTERS-CONTACTS-SPEC.md)。初稿逐項核對與尚未完成的使魔／召喚兵／疲憊差分／日曆 AP 見 [ORIGINAL-SPEC-AUDIT.md](ORIGINAL-SPEC-AUDIT.md)。

## 三槽單機版 v0.15（歷史）

首頁可選三個獨立存檔，遊玩中只保存目前槽位；原單槽自動以存檔 1 顯示，不改寫舊進度。規格見 [SAVE-SLOTS-SPEC.md](SAVE-SLOTS-SPEC.md)。根目錄靜態站使用 npm run build；GitHub Pages 的 STKSST 子目錄使用 npm run build:pages，npm run deploy:pages 會先檢查／測試／建置，再將成品推至 gh-pages 發布分支。僅推送 main 不會重建網站。設定見 [STATIC-HOSTING.md](STATIC-HOSTING.md)。

## 玩家介面清理 v0.14（歷史）

建置與製作註記見 [GAME-BUILD-NOTES.md](GAME-BUILD-NOTES.md)，包含圖資、角色與音樂來源、遷移及驗收限制；這些內容不再放入玩家操作說明。地圖顯示與鍵盤選格可按需展開，AP、效果與條件仍保留。規則、AI、圖資與存檔格式未變。

## 專案概覽

React + PixiJS 雙語本機競選戰棋 **v0.17.0**。台北 12 行政區、共用六角格、藍／橙／白三方、初始各三人、最多七人小隊與 28 天日夜競選。

v0.13 新增無障礙顯示偏好、鍵盤選格預覽、快速跳至區域、對話框焦點管理與可讀對比修正。141 項測試通過，五個已保存場景 axe 違規 0；仍有人工判讀與完整跨裝置流程待驗。Windows 電腦操作工具因無法可靠判定 Chrome 網址而中止，不能宣稱完整相容或 WCAG 認證。範圍見 ACCESSIBILITY-COMPAT-SPEC.md、COMPATIBILITY-TEST-MATRIX.md；真人平衡由使用者規劃公開測試。

v0.12 將路網移出 JavaScript，採無損二進位核心、道路／建物分區載入與有界快取。最大 JS 檔約 313KB，常駐路網資料同機量測降低約 37%；仍需完整全市核心，不宣稱所有低階裝置都順暢。規格及限制見 MAP-LOADING-SPEC.md、artifacts/map-performance.json。更動固定圖資後執行 `npm run data:package` 再測試／建置。

v0.10 加入獨立經驗／等級、士氣／健康、醫護／動員／後勤支援與每隊最多七人；schema 3 可讀舊存檔，詳見 GROWTH-SPEC.md。

v0.11 依大量完整對局調整擴編補給與 AI 招募／支援／技能時機，改善狀態複製，保留小隊策略。方法與結果見 BALANCE-SPEC.md、BALANCE-RESULTS.md；相容性範圍有明確限制，不宣稱所有硬體或瀏覽器皆通過。

v0.9 加入逐題辯論／舞台居民問答、對手攻防與政論連線，可中途存檔續接；詳見 DIALOGUE-SPEC.md。

v0.8 加入三位卡通主將、三種兵種美術、競選載具出發、舞台／暗房多層演出、三首原創 20 秒動漫風陣營曲、背景樂與音效。首頁／指揮所按「美術／影音」可試播及調整音量，聲音預設關閉。原創曲可本機替換為已授權音檔，不上傳、不改存檔；沒有收錄官方歌曲 remix。規格及研究日期見 [MEDIA-SPEC.md](MEDIA-SPEC.md)、[MEDIA-SOURCES.md](MEDIA-SOURCES.md)。

v0.7 已加入 78,449 筆 OSM 逐棟建物輪廓與 30m Copernicus 衛星地表（DSM），可查來源高度／樓層、地表高程、50m 等高線及路線剖面。主量測 2011–2015、2021 快照；含屋頂與樹冠，不是裸地／路面測高，不改 AP。完整契約及來源見 LANDSCAPE-SPEC.md。

v0.6 新局採 100 公尺共用六角格與 OSM 來源節點道路尋路，預覽／執行／AI 共用加權距離 AP；金色為待確認道路，青色為實際步行。舊存檔保留 380 公尺規則，詳見 ROAD-MOVEMENT-SPEC.md。

以下為既有版本沿革。v0.4 新增三名虛構主將、重裝駐守、遠程範圍宣講、刺客朝向／背襲及六種十月驚奇。新聞棚視覺採藍黃與暖橘，研究證據見 COLOR-RESEARCH-2026-10-31.md；實作差異見 PHASE-3-PUNK.md。

本版先選陣營與主將，再展開三方競選。加入自動存檔、立即存檔及首頁續玩，契約見 PHASE-3-SESSION.md。

v0.5.1 修正底圖／點選格線縮放錯位，加入本局足跡、活動完成勾選及今日次數清單。經過與辦活動分開標記，隔天仍保留累計紀錄；舊存檔早期未記錄的路線會明示不完整。詳見 MAP-READABILITY.md。

v0.5.4 已接入 OSM 真實道路底圖、路名搜尋定位與道路分類，取代舊灰色示意連線；資料截至 2026-10-29，離線本機使用。當時移動依 380 公尺六角格；後續 v0.6 已接入逐街規則。來源、ODbL 授權及精度限制見 REAL-ROADS.md。

v0.5.3 已加入 12 區專屬街景第一版：十二種地標輪廓、街屋／騎樓／住宅混搭、日夜窗光、各區雙語圖鑑與街景開關。街景和灰色連線為遊戲示意，詳見 DISTRICT-STREETSCAPES.md。

v0.5.2 加入活動點總成本、未完成／可執行篩選與「前往並掃街」。青色實線記錄目前隊員的今日步行，金色虛線為預覽；地形圖例會依天氣及應變顯示成本。詳見 STREET-WORKFLOW.md。

## 啟動

Windows 可雙擊 `StartGame.cmd`，啟動器會檢查環境、準備缺少的套件，伺服器就緒後自動開啟瀏覽器。遊玩時保留該視窗，結束按 Ctrl+C。一般遊玩使用 http://127.0.0.1:5173/。

無障礙檢查可雙擊 `StartAccessibilityTest.cmd`，自動開啟 http://127.0.0.1:5187/design/compat-qa.html ，測試進度與一般遊玩分開。第一次操作請看 [LOCAL-TEST-GUIDE.md](LOCAL-TEST-GUIDE.md)，不用先設定 Codex 的瀏覽器工具。

```sh
npm ci
npm run dev
```

已安裝套件的工作目錄可直接 `npm run dev`。每次成功行動後自動存檔；重新整理後可在首頁按「繼續競選」。語言偏好會保留。StartGame.cmd 固定使用 http://127.0.0.1:5173，請用同一瀏覽器與網址續玩。

存檔保存在此瀏覽器的三個獨立進度槽；清除網站資料會移除。開始新局前可選槽，覆寫既有存檔需確認；目前沒有檔案匯出或跨裝置同步。

## 遊玩

1. 全市總覽選行政區，切換街區戰棋。選隊員，再點六角格預覽與確認路線；也可由節點清單選地點並前往。
2. 在節點或道路可達的近鄰錨點掃街、拜訪或完成主題活動。同節點一般活動每日兩次，第二次反應減弱。
3. 在場地設立治疏嶼（綠橙色）或恰恰肥皂箱（藍白色），完工後派員，主動舉辦每日場次。
4. 控制並駐守 Wonder，達成地方條件爭取日終加成。可調整優先順序，每隊每日最多結算三個。
5. 第 7／21 天政見發表，第 14／27 天辯論，事前準備預告議題。白天切晚上保留 AP；夜間結束由對手行動並結算。
6. 第 2、4、6、8、10、12、14 天公布前一晚民調；第 15–28 天封關，只提供質性小道消息。第 28 天最後夜間結算後比較全市總支持點，同分平手，並解封實際分數與歷史。

隨時切換繁體中文／English，不影響日期、AP、種子、日誌或局勢。三方與續玩規則見 PHASE-3-SESSION.md，基礎規則見 PHASE-3-SPEC.md，遊戲內亦有競選手冊。

## 地理與範圍

官方行政區輪廓、河道、橋梁及 12 個 Wonder 代表點已接入。新局 41,336 個細格（28,835 個道路錨點）、318 個來源場地加 12 個 Wonder、12 個舞台場地；一般道路皆可掃街。原 60 個節點 ID 仍保留以相容舊進度，舊局 2,859 個粗格。真實圖資與遊戲配置分層，資料來源及授權見 design/assets/SOURCES.md。

街廓插畫與一般活動點是遊戲配置，沒有路面實測高程。新局使用來源道路拓樸與長度，普通道路缺少步行權限標記時採明示的遊戲假設；沒有現實導航保證。支持點、人流皆為合成資料。已有本機存檔與本機音效，尚無帳號或線上功能；平衡與更細街景仍可持續調整。

## 驗證與開發

```sh
npm run check
npm test
npm run build
npm run preview
```

建置位於 `dist/`。Node.js 開發環境為 24.14.1，套件版本固定於 package-lock.json。

目前實作契約：PHASE-3-SPEC.md、PHASE-3-PUNK.md 及 PHASE-3-SESSION.md。設計背景：PHASE-3-DESIGN.md。地圖契約：MAP-HEX-SPEC.md。情報規則：INTELLIGENCE-SYSTEM.md。Wonder 來源：WONDER-CATALOG.md。驗證紀錄：QA.md。

第一、二階段的方格規格與原始程式保留為歷史及回歸測試，現有入口不啟用第二份戰鬥 Store。


v0.6 道路戰術：新局 100 公尺共用格、來源節點路由、加權距離 AP、真實道路預覽與歷史、三方 AI 及 schema 2 存檔，詳見 [ROAD-MOVEMENT-SPEC.md](ROAD-MOVEMENT-SPEC.md)。舊局維持 380 公尺規則；前述舊版地圖數量與成本保留作為歷史。未核實的普通道路步行權限採明示遊戲假設。


v0.7 逐棟建物與衛星地表依 LANDSCAPE-SPEC.md：建物採 OSM 來源輪廓，不補造未知高度；高程依使用者明確改選的 GLO-30 DSM（主量測 2011–2015、2021 公開快照），不是裸地或路面實測，不修改 AP。舊規則與存檔保留相容。
