# GitHub Pages 公開原型

2026-11-02 發布契約。使用者授權將 STKSST 改為公開 Repo，程式碼與文件採 MIT，部署到 GitHub Pages 供外界測試。站點：https://vrkatbekao-creator.github.io/STKSST/ 。本輪設定與線上實測結果見 QA.md；下方 v0.15 記錄保留作歷史，不代表目前仍未配置。

## 建置與發布

- 目前使用 GitHub Pages 的 gh-pages 分支根目錄來源，配合 .nojekyll 發布預先建置的成品。現有 OAuth 憑證沒有 workflow scope，GitHub 拒絕新增自訂 Actions 工作流，因此未擴充憑證權限，改採官方支援的分支發布。
- Node.js 24（最低依 package.json），首次準備 npm ci。後續執行 npm run deploy:pages：check、test、build:pages、發布包檢查全部成功後才推送成品。僅更新 main 不會重建網站。
- design/publish-pages.mjs 只推送 gh-pages，保留既有發布歷史，不使用 force；若有競爭更新會拒絕而非覆寫。暫存發布工作目錄在已忽略的 .tools/。RELEASE.json 保存版本與來源提交。
- 來源與 MIT／署名修改先提交、推送 main，再執行部署命令。只將 dist 成品放入 gh-pages，入口與圖片、圖資、音訊都使用 /STKSST/。不將 design、src、tests、node_modules 或 .env 放入網站。
- MIT 原文在 LICENSE；建置自動輸出 LICENSE.txt、THIRD-PARTY-LICENSES.txt。PROJECT-CREDITS.txt 與第三方圖資告示隨站點發布，頁尾提供雙語作者／MIT 與問題回報連結。
- Repo 公開會讓來源與 Git 歷史可見；dist-only 是網站部署範圍，不表示公開 Repo 隱藏 design 或原始碼。公開前針對現有歷史檢查常見憑證格式，檢查不等於所有敏感資料的形式化證明。

## 外部測試

無須遊戲帳號，直接開啟站點。三槽只在各玩家自己的瀏覽器保存，本機 127.0.0.1 與 github.io 是不同來源，舊本機進度不會自動遷入。沒有多人後端、分析追蹤或雲端保存。回報問題使用 Repo 的雙語 Issue 表單；提交 Issue 需要 GitHub 帳號，遊玩不需要。

完整跨瀏覽器／硬體／真實輔助科技驗收仍未完成，真人平衡交由使用者公開測試。授權：THIRD-PARTY-NOTICES.md；GitHub Pages／MIT 官方依據見下方來源與 https://opensource.org/license/mit 。

# v0.15 單機版靜態託管建置（歷史）

查核日期：2026-11-01。這是遊戲建置文件；本輪只準備部署版，沒有建立公開網站或修改私人 Repo 權限。

## 選擇

本機單機網頁可用靜態 HTTPS 託管，不需要 Node 常駐服務、資料庫、帳號或 WebSocket。三個存檔由玩家瀏覽器保存，不是雲端同步。網址應固定，避免玩家因切換網域而看不到原進度。

若想保持原始碼私人並使用免費靜態託管，建議 GitHub 私人原始碼 Repo＋Cloudflare Pages。根目錄建置用 `npm ci`、`npm run build`，發布資料夾 `dist`；官方 React 設定亦為 build/dist。只發布輸出檔，不上傳 design/、原始 GIS 資料、測試報告或 .env。Pages 單檔上限 25 MiB，免費方案最多 20,000 個網站檔案；上線前依最新官方限制檢查。

## GitHub Pages

GitHub Pages 支援靜態 HTML/CSS/JS。免費帳號可從公開 Repo 發布；私人 Repo 需 Pro／Team／Enterprise 等相應方案。私人原始碼不等於公開網站需登入；正式發布前須確認 Pages 存取範圍。

兩種選擇：有適用方案則用既有私人 STKSST Repo 建置；免費帳號則保留私人原始碼，另建公開的發布 Repo，只上傳 dist 內容。後者 Repo 名稱不同時，必須用新名稱重建 base；不要把私人 Repo 改公開當成必要步驟。

建置機器使用符合 package.json 的 Node.js >=22.12.0；網站本身不需要 Node 服務。

目前專案站點預期路徑（尚未發布）：`https://vrkatbekao-creator.github.io/STKSST/`。

```powershell
npm ci
npm run check
npm test
npm run build:pages
npm run preview -- --base=/STKSST/ --port 5189 --strictPort
```

`build:pages` 等同 `vite build --base=/STKSST/`，產物在 dist。角色圖片、地圖資料、音樂與署名連結都必須使用 BASE_URL。根網域／Cloudflare Pages 則使用普通 `npm run build`；若發布 Repo 叫 STKSST-play，用 `npm run build -- --base=/STKSST-play/`。不要混用上一次輸出。

有權從私人 Repo 發布時，GitHub Settings → Pages 選 GitHub Actions，之後再配置使用正確 base 的建置／發布工作流。只發布 dist artifact；本輪未新增會在 push 時自動公開網站的工作流。免費帳號的公開 dist Repo 可使用來源分支根目錄發布，應保留 .nojekyll 避免 Jekyll 處理；不得把 dist 的上層專案根目錄整包上傳。

GitHub Pages 官方上限：網站大小 1GB，流量軟上限每月 100GB；下載量大時須觀察實際圖資請求，不以「靜態站」推論無限玩家數。Vite preview 僅供本機驗證，不是正式服務。正式網址使用 HTTPS，符合目前地圖 SHA-256 完整性檢查的 secure context 要求。

網站可下載的 JS 與素材本來就是玩家可取得的產物；dist 不應放金鑰或私人研究檔。此版沒有外部新聞爬取、雲端資料寫入或新增分析追蹤。

## 上線驗收

首頁、三槽摘要／覆寫／取消、重新整理續玩、雙語與窄版；街區道路、建物、角色圖片、音樂開啟與重試、圖資署名。所有素材必須從站點子目錄載入。確認 dist 未包含 .env、src、design、測試資料；監測 404／錯誤而不是只看首頁 HTTP 200。正式平台尚未實測，不把本機子目錄預覽當作已上線。

## 官方資料

- [GitHub Pages 類型與帳號資格](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages)
- [GitHub Pages 限制](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits)
- [Vite 靜態部署與 base](https://vite.dev/guide/static-deploy.html)
- [Cloudflare Pages React 建置](https://developers.cloudflare.com/pages/framework-guides/deploy-a-react-site/)
- [Cloudflare Pages 限制](https://developers.cloudflare.com/pages/platform/limits/)

本輪建置實測：80 個檔案，總計 47,323,501 bytes；最大單檔 10,321,721 bytes。詳 artifacts/save-slots-v15.json；限制僅按本次查核文件比較，不是流量負載承諾。
