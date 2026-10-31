# 專案工作規則

- 目前階段為第三階段 v0.7.0，先讀 PHASE-3-SPEC.md、PHASE-3-PUNK.md、PHASE-3-SESSION.md、MAP-READABILITY.md、STREET-WORKFLOW.md、DISTRICT-STREETSCAPES.md 、REAL-ROADS.md 、ROAD-MOVEMENT-SPEC.md 與 LANDSCAPE-SPEC.md；衝突時以最新使用者指示及該實作契約為準。第一、二階段規格保留作為歷史與回歸紀錄。
- 第三階段設計背景見 PHASE-3-DESIGN.md：使用者已選定台北市 12 行政區、全市掃街競選，以及治疏嶼（綠橙色）／恰恰肥皂箱（藍白色）的設立與經營。該文件保留設計提案；實作範圍及限制以 PHASE-3-SPEC.md 為準，真實道路底圖與來源拓樸逐街通行第一版已接入，使用者改選的 30m 衛星地表（DSM）已接入，裸地／路面實測及音效尚未完成；本機單槽存檔／續玩已完成。
- 回合上限固定 28，保留日夜共用 AP、單一 Zustand 遊戲狀態及本機單機架構。
- 第三階段地圖依 MAP-HEX-SPEC.md：保留 12 區官方輪廓及各區特色，街區使用共用六角格；六方向移動、距離、尋路、AI 與命中判定需一起轉換。已接入官方區界、河道、橋梁及共用六角格；新局採共用 100 公尺道路格，舊局保留 380 公尺規則；成本及相容性見 ROAD-MOVEMENT-SPEC.md。
- 第三階段情報規則見 INTELLIGENCE-SYSTEM.md：第 2、4、6、8、10、12、14 天公布民調，第 15–28 天封關並改用不含數字的小道消息。此規則已啟用；只有第 28 天最後夜間結算後才解封數字與歷史。
- 目前權威競選規則為 src/game/campaign.ts，唯一啟用的 Store 為 campaign-store.ts。遊戲規則修改集中在 src/game/；React 與 PixiJS 不各自維護戰鬥數據。
- 所有玩家可見文案、錯誤、日誌與畫布標記皆提供 zh-TW 與 en；日誌保存鍵與參數，切換語言不得改變遊戲或重新抽選事件。
- 企劃維護規則與資料契約，引擎負責純規則與畫布，介面負責操作與呈現，國際化維護術語與資源，QA 驗證行為並回報可重現問題。分工時先約定檔案與介面，避免同時覆寫相同檔案。
- 遊戲規則改動需執行 npm run check、npm test、npm run build，並對新增互動進行適當的瀏覽器驗證。
- 不新增雲端帳號、真實新聞擷取或線上系統，除非使用者另行要求。

- v0.4 戰術由 campaign-tactics.ts 與 campaign-events.ts 提供純規則，仍由 campaign.ts 命令統一驗證；介面不得複製傷害或成本公式。形象色證據與未核實限制見 COLOR-RESEARCH-2026-10-31.md，internal green ID 目前玩家顯示為橙方，舞台品牌色不變。

- v0.5 競選為 blue／green（顯示橙方）／white 三方，各三名隊員；playerTeam 決定玩家，其餘兩方每晚輪換先後執行 AI。歷史方格原型仍是兩方，不能混用 Team 型別。存檔由 campaign-save.ts 驗證，campaign-store.ts 統一自動保存／還原，續玩不得重抽種子、重發資源或重跑結算。

- v0.5.1 的累計足跡與活動勾選由 campaign-progress.ts／campaign.ts 更新，不與每日 visits 混用；舊存檔以 partial 標記不完整路徑，不能捏造過去足跡。Pixi canvas 必須與 SVG 共用容器尺寸，autoDensity 的固定 inline 寬高不可重新造成格線錯位。

- v0.5.2 活動規劃由 campaign-plans.ts 使用權威尋路與成本；canvassRoute 由 campaign.ts 組合既有移動／掃街，失敗須整筆回復，Store 只保存成功結果一次。今日步行使用 trail.walks 的實際有序路徑，不由足跡集合連線，也不將接駁畫成步行。

- v0.5.3 各區街景由 district-streets.ts／DistrictStreets.tsx 提供純呈現，格子依實際 districtId 選語彙。灰色連線不是真實路網、不可新增通行或成本；裝飾須在活動點與足跡下方且不接收點選。唯一一般格線仍由 Pixi 繪製。

- v0.5.4 真實道路依 REAL-ROADS.md，road-map.ts／RealRoads.tsx 只呈現與查詢 OSM 資料。原隨機街景連線已移除。道路底圖不能直接修改既有通行邊、AP 或 AI；來源缺少英文路名與步行權限，不得補造。來源與衍生道路資料保留 ODbL 標示，遊戲執行只讀本機壓縮快照。


v0.6 道路戰術：新局 100 公尺共用格、來源節點路由、加權距離 AP、真實道路預覽與歷史、三方 AI 及 schema 2 存檔，詳見 [ROAD-MOVEMENT-SPEC.md](ROAD-MOVEMENT-SPEC.md)。舊局維持 380 公尺規則；前述舊版地圖數量與成本保留作為歷史。未核實的普通道路步行權限採明示遊戲假設。


v0.7 逐棟建物與衛星地表依 LANDSCAPE-SPEC.md：建物採 OSM 來源輪廓，不補造未知高度；高程依使用者明確改選的 GLO-30 DSM（主量測 2011–2015、2021 公開快照），不是裸地或路面實測，不修改 AP。舊規則與存檔保留相容。
