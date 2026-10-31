# 開發環境

目前為第三階段 v0.5.4，實作契約見 PHASE-3-SPEC.md；DATA-CONTRACT.md 保留原方格版本紀錄。

## 套件用途

- React / React DOM：操作介面。
- PixiJS：戰棋畫布與互動呈現。
- Zustand：單一遊戲狀態來源。
- i18next / react-i18next：繁體中文及英文資源與切換。
- Vite / React plugin：本地開發與打包。
- TypeScript / React types：資料契約與型別檢查。
- Tailwind CSS / Vite plugin：介面樣式。

套件以精確版本及 package-lock.json 固定。現有開發機為 Node.js 24.14.1；重建環境使用 `npm ci`。

使用 `npm run dev` 啟動本機預覽，`npm run check` 檢查型別，`npm test` 驗證規則與雙語資源；正式建置使用 `npm run build`。

如果 npm 回報 `getaddrinfo ENOTFOUND registry.npmjs.org`，應檢查執行環境的網路權限及 DNS；這項錯誤本身不代表套件不相容。

地圖重建：`python design/build_campaign_map.py`。僅建置工具需 pyshp、pyproj、shapely（及其 numpy 相依），安裝於專案 `.tools/map-libs`；遊戲執行不需 Python 或新的 npm 套件。雙語新增文案可由 `python design/add_campaign_locales.py` 重建。

地圖建置工具版本固定於 design/requirements-map.txt；本次使用 Python 3.14。需重建圖資時可用 `python -m pip install --target .tools/map-libs -r design/requirements-map.txt`，不需要全域安裝。

v0.4 雙語詞彙由 design/add_campaign_punk_locales.py 維護，主詞彙建置程式會一併執行，避免重建覆蓋兵種、陣營與版本名稱。沒有新增 npm 執行套件。

v0.5 規格見 PHASE-3-SESSION.md。design/add_campaign_05_locales.py 由 v0.4 詞彙產生器接續執行。campaign-teams.ts 使用三方競選型別，歷史 level.ts 的兩方型別不變。campaign-save.ts 可注入 StoragePort，單元測試可模擬損壞、版本不相容及配額失敗，不必修改使用者瀏覽器資料。

v0.5.1 地圖修正見 MAP-READABILITY.md。design/add_map_readability_locales.py 接續於 v0.5 詞彙建置；只繪製一套一般格線，canvas 的 CSS 百分比須覆蓋 Pixi autoDensity 的固定 inline 尺寸。

v0.5.2 規格見 STREET-WORKFLOW.md。design/add_street_workflow_locales.py 接續於地圖詞彙建置。campaign-plans.ts 提供純規則規劃；組合命令必須留在 campaign.ts 驗證，React 不能自行扣資源或依序提交兩筆無回復機制的動作。

v0.5.3 規格見 DISTRICT-STREETSCAPES.md。district-streets.ts 只包含呈現配置，DistrictStreets.tsx 提供共用 SVG 街景、圖鑑及地標輪廓。design/add_district_street_locales.py 接續 v0.5.2 詞彙產生器；未新增套件或修改 taipei-hex-v1 圖資。

v0.5.4 真實道路規格見 REAL-ROADS.md。fetch_taipei_roads.py 下載或讀取快取；build_taipei_roads.py 從保留的來源重建 public/data/taipei-roads-v1.json.gz，validate_taipei_roads.py 為唯讀幾何稽核；使用既有 map-libs。road-map.ts 不得加入遊戲成本或通行規則。詞彙產生器最後執行 add_real_road_locales.py。壓縮道路以本機檔一次載入，沒有在線圖磚或 API 依賴。


v0.6 道路移動依 ROAD-MOVEMENT-SPEC.md。pyosmium==4.3.2 是 build-only 依賴，使用 .tools/map-libs；沒有新增 npm 執行依賴。固定日期 PBF → extract_walk_network.py → build_street_tactics.py → validate_street_tactics.py。可從保留的來源抽取重建，不必重新下載 PBF。建置快取檢查來源／政策／原始區界／舊地景資料及演算法版本指紋。大型 JSON 由 .js/.d.ts 邊界載入；請勿讓 TypeScript 直接推導 38 MB JSON 的全部型別。npm test 限制同時兩個 worker，避免每個測試檔各自載入完整路網造成高記憶體尖峰。詞彙鏈最後執行 add_road_movement_locales.py。

campaign-map.ts 保留 legacy exports 作舊檔／回歸相容；產品畫面必須用 mapFor(game) 選 active profile。initialCampaign/createCampaignStore 的程式呼叫預設 legacy，UI 唯一 store 明確以 streets-v2 建新局；resume 使用存檔 profile。road-movement.ts 搜尋完整壓縮路網，campaign.ts 驗證命令，campaign-plans.ts 共用 routeFromMovement，progress 保存 edgeIds；不得改為只連鄰格中心。存檔修訂與資料幾何綁定，任何圖資變動都要重驗／規劃相容策略。


v0.7 見 LANDSCAPE-SPEC.md。建物來源萃取採 pyosmium areas，保留 relation 內孔；build_taipei_buildings.py 驗證幾何，13 筆需保留原始精度。build_taipei_surface.py 支援兩張 AWS 原始圖幅或 --from-subset 的 Git 裁切來源，兩種重建路徑已核對相同修訂。採 rasterio 1.5.2 與 Pillow 13.0.0（build-only），無新增 npm 執行依賴。來源確認與下載 hash 在 design/assets/taipei-surface-source-metadata.json，量測／資料發布／下載日期不可混用。

building-map.ts／surface-map.ts 僅純圖資查詢；useGeoData.ts 為經驗證的本機 gzip 快取，不另建 Store。MeasuredLandscape.tsx 呈現逐棟、多面孔洞與地表。不得以 DSM 屋頂／樹冠起伏改寫 AP 或稱作實測道路爬升。詞彙鏈最後由 add_landscape_locales.py 覆寫最新說明。validate_landscape.py 全量比對 78,449 建物與 298,380 像元。
