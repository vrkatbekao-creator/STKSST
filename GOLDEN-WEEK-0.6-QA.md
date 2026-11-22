# v0.6.0 · 黃金周決戰更新驗收

本機驗收於 2026-11-21–22（Europe/Brussels）完成。規則及參考提交見 [實作契約](GOLDEN-WEEK-0.6-SPEC.md)。公開試玩可從 [GitHub Pages 入口](https://vrkatbekao-creator.github.io/STKSST/) 開啟，實際部署版號及來源提交見 [部署紀錄](https://vrkatbekao-creator.github.io/STKSST/RELEASE.json)。

## 自動驗證

| 項目 | 結果與證據 |
| --- | --- |
| `npm run check` | 通過；`.tools/golden-check.log` |
| `npm test` | 273 項通過，0 失敗；`.tools/golden-tests-release.log` |
| 最後邊界補測 | `tests/golden-week.test.mjs` 八項通過；`.tools/golden-focus-final.log` |
| `npm run build` | 通過；`.tools/golden-build-standard.log` |
| `npm run build:beta` | 通過；`.tools/golden-build-final.log` |
| Rust offline tests | 5 項通過；`.tools/golden-rust-test.log` |
| WASM 對照 | `node design/audit-golden-week.mjs` 通過；`.tools/golden-wasm-audit.json` |
| 圖資封包 | `npm run data:package` 通過；原 STR1 路網與 edge 順序不變，新增獨立粗格網包 |

本機 `.tools` 為忽略提交的驗收產物。測試原始碼與重跑指令則收錄於 repo。

八項新增回歸涵蓋 300 公尺格網／區界／場地定位、步行額度的零 AP 接續與日夜續用、應援令成功才扣除、上下車共用額度、新人首日與首夜維持 0 AP、夜間技能／後勤 AP 上限、100 公尺舊檔保留，以及帶既有路線的移動加拜訪仍須整筆驗證及失敗回復。既有 28 天純規則回歸保留民調封關與最終夜間開票規則。

WASM 實際比對晴天／雨天、新局／舊局的可達集合與正式移動結果；新局第二段移動在已購額度內為 0 AP。六組車行連接比較共用額度關閉／啟用，以及已步行 0／1,400／1,750 加權公尺的費用。另比對一組 AI 回合的完整結算狀態。這些結果不是完整 28 天 WASM 對局或低階硬體實測。

## 瀏覽器

使用已連線 Windows Chrome、本機 `http://127.0.0.1:4175/`。先重設測試 viewport，保留實際 CSS 尺寸與語言。測試未改玩家的其他來源網址存檔。

- 桌面已確認新標題、v0.6.0、比例尺、格網、1 AP 移動與 1 AP 掃街；準備議題為 0 AP、應援令由 2 減至 1；入夜 AP 由 13 增至 17。
- 最終格網的首頁顯示 300 公尺格，新局／續玩可讀取正確圖資；舊的本輪暫存格網 revision 會明確拒絕，並保留原資料及覆寫確認流程。
- 手機英文已驗證實際 320 × 740 CSS px 的角色浮窗，位於視窗內，長清單可捲動；繁中驗證 390 × 843 CSS px。頁面未水平溢出，公制比例尺可見。Chrome 的縮放影響 viewport 設定值，本輪以 DOM 實際 CSS 尺寸為紀錄。
- 手機 AP／物資／應援令調整為完整一列；從較長的手機首頁進入遊戲時回到 HUD 頂部。
- 手機中正區 → 台北 101：自動選車掃，報價 3 AP／1 物資，其中上下車步行 1 AP、車行 2 AP；確認後由 15 AP／36 物資變成 12 AP／35 物資。DOM 的 `data-vehicle-engine` 為 `wasm`；到站可開啟現場行動，已購步行餘額 483 公尺。
- 切換繁中仍為 12 AP／35 物資。準備議題耗 1 物資與一枚應援令，AP 不變；夜間補至 16 AP。再掃街扣 1 AP／1 物資，得到 15 AP／33 物資。保存並回首頁，再續玩仍為第 1 天夜間、15 AP／33 物資與一枚應援令，未重發夜間 AP。
- 桌面實際 1280 × 800 CSS px，頁面未水平溢出。新增的 HUD、格網、比例尺、角色旁現場行動及 1 AP 費用均可讀；該頁未記錄 console error。
- 真實路網夜間結算完成第 1 → 2 天，DOM `data-night-engine="wasm"`、`data-night-searches="17"`。翌晨主將 15 AP、物資 41、應援令 2，現場浮窗的已購步行餘額為 0 公尺；兩方 AI 已產生拜訪紀錄。這是一晚的功能驗證，沒有作為受控效能比較。
- 本機截圖：`.tools/golden-mobile-en-320.jpg`、`.tools/golden-mobile-zh-390-night.jpg`、`.tools/golden-desktop-zh.jpg`。

測試 viewport 已還原；保留本機試玩分頁供審查。

## 尚未涵蓋

實體 Android／iOS、Safari／Firefox、低階硬體實測、完整 28 天 WASM 對局及真人平衡仍待各自驗收。本輪不以 Chrome 尺寸模擬冒充實體手機或其他瀏覽器通過。一般建置仍有既有的大型 chunk 提示；本輪沒有重新拆分車網下載。
