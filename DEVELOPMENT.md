# 開發環境

目前為第三階段 v0.5.0，實作契約見 PHASE-3-SPEC.md；DATA-CONTRACT.md 保留原方格版本紀錄。

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
