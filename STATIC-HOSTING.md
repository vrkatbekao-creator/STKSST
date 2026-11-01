# 單機版靜態託管建置

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
