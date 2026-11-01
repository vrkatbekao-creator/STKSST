# 相容性與無障礙待測矩陣

2026-11-01，v0.13。`PASS` 只表示該列限定範圍通過；`PENDING` 不可在公開測試公告中稱為支援承諾。參閱 ACCESSIBILITY-COMPAT-SPEC.md 與 artifacts/compatibility-v13.json。

| 範圍 | 狀態 | 證據／接續方式 |
| --- | --- | --- |
| Chrome 156／Windows：首頁及繁中白天街區 axe | PASS（限定場景） | home-zh.json、street-zh-day.json；保留 incomplete |
| Chrome：無障礙設定對話框 | PASS（限定場景） | settings-default.json、settings-high-contrast.json |
| Chrome：320 CSS px 英文、夜間、高對比、放大、相容圖 | PASS（限定場景） | night-high-contrast-320-en.json，無水平溢出 |
| Skip links、手冊進出、選格／預覽／移動 | PASS（限定步驟） | 本輪 UI 觀察；不是所有 Tab 路徑已測 |
| 獨立偏好、儲存不可用時偏好、必要功能檢查 | PASS（純測試） | tests/accessibility.test.mjs |
| 舊／新存檔、封關、AP、回合、道路及音訊規則 | PASS（純測試） | npm test；不是新增瀏覽器實測 |
| Chrome 實際 200%／400% 縮放 | PENDING | 頁面快捷鍵無效，原生視窗操作因網址政策中止 |
| 測試 viewport 還原 | PENDING | 最後設定 1280×900；工具中止後不可繼續 UI |
| 辯論逐題至完成／提前離場焦點、舞台／影音全部控制、七人、終局表格 | PENDING | 本版已修正部分焦點／名稱，但尚未完成 UI 複驗 |
| 自動 WebGL 失敗、儲存拒絕／額滿、損壞檔、缺 gzip／音訊 | PENDING（瀏覽器） | harness 支援下列故障模式；規則測試不能冒充 UI |
| IAB 本版回歸 | PENDING | v0.12 已測範圍僅作歷史 |
| Edge、Firefox、Safari／WebKit | PENDING | 未取得本版實測證據，不能由 Chrome 推定 |
| Windows 強制色彩／實際 OS 減少動畫 | PENDING | 已補 CSS；本輪只實測自訂高對比／減少動畫設定 |
| NVDA、Narrator、VoiceOver／TalkBack | PENDING | 未測真實輔助科技，axe 與 AX 標記不是替代認證 |
| 不同硬體、實體手機／平板、觸控與橫向、GPU／音訊輸出 | PENDING | 沒有最低配備支援承諾 |
| 真人對局平衡 | 使用者規劃公開測試 | 本輪不調整強弱，不代發邀請或發布平台 |

## 可重現的本機檢查

1. 以獨立 port 5187 啟動 Vite，瀏覽 `http://127.0.0.1:5187/design/compat-qa.html`；不要使用原遊玩存檔 origin。按「Run accessibility audit」或 F8；F8 可在 modal 內觸發。DOM 報告可人工複製保存，工具不傳送外站。
2. 在標準模式與四項偏好組合、zh-TW／en、白天／夜間重跑；記錄版本、實際 CSS 寬度、溢出、違規及 incomplete。圖像或符號的未定對比要人工檢查，不能刪除來湊零。
3. 使用 query `?mode=no-webgl`、`no-storage`、`storage-full`、`corrupt-save`、`no-gzip`、`no-audio` 分別重載測試；這些模式會改隔離 origin 的執行環境，corrupt-save 會寫入固定損壞測試字串。不得用於有正式進度的 origin。
4. 無 WebGL 要確認可看到有地形的 SVG、可選格／移動且 AP 相同。無儲存／額滿要確認留在遊戲且不丟現有進度；損壞檔要保留原字串。缺必要功能要有可讀的雙語說明且不初始化存檔；缺音訊不得阻擋遊玩。
5. 全鍵盤走完開局→選區→預覽→移動／掃街→存檔續玩→辯論回答／追問→回顧→七人支援→封關→第 28 天終局。確認焦點可見、可離開地圖、對話框無逃逸、關閉後回到合理位置；資訊不依賴音效、色相或動畫。
6. 另以實際瀏覽器縮放、OS 強制色彩、螢幕閱讀器與實機測試。記錄瀏覽器／OS 版本、裝置大類、RAM／GPU（若願意提供）、可重現操作與預期／實際結果；不需個人帳號、精確位置或私人資料。真人平衡建議另記陣營、主將、種子、天數與決策，避免把硬體問題當成數值問題。

## 發布界線

目前仍是本機單機原型。公開測試招募與發布由使用者決定，這份矩陣不代表已上線、不收集遙測、不新增雲端帳號或自動回報。修正前先保留原存檔字串；可及性／相容性與遊戲平衡分別回報。
