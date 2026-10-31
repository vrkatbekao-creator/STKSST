# 台北行政區幾何來源

- 提供機關：臺北市政府民政局。
- 資料集：[臺北市區界圖](https://data.gov.tw/dataset/121199)。
- 原始下載：[官方 SHP 壓縮檔](https://data.taipei/api/dataset/1601ef3a-c253-4988-b047-943d9e786143/resource/d8b7eb29-136f-49fc-b14b-3489d3656122/download)。
- 資料頁資源名稱：臺北市區界圖_20220915；擷取日期：2026-10-30。資料頁詮釋資料更新日期不等同區界測製日期。
- 授權：[政府資料開放授權條款第 1 版](https://data.gov.tw/license)。原始檔保留於同目錄，轉換結果屬衍生資料。
- 轉換：依檔內 PRJ 的 TWD97 / TM2 中央經線 121°，使用 pyproj 轉為 WGS84；使用約 25 公尺容差簡化輪廓，以利互動概念圖顯示。簡化後區界不是測量用途圖資，未作為實際街道或場地定位依據。
- 重建：`python design/convert_districts.py`，需在專案 `.tools/map-libs` 安裝 pyshp、pyproj。

舞台配置及掃街節點為遊戲設計示意，並非實際活動設立地點。

## 第三階段可玩地圖的補充來源

- [臺北市河流](https://data.gov.tw/dataset/143899)：市府水利工程處的河流多邊形 KML，原始檔為 taipei-rivers-source.kml；[官方下載](https://data.taipei/api/dataset/9b854e09-b44e-4e02-ae5a-47b860fdba20/resource/d343ddc1-8425-43c6-9b45-5c2294d2229e/download)。依檔內 WGS84 座標轉為 EPSG:3826。政府資料開放授權條款第 1 版。
- [臺北市橋梁資訊](https://data.taipei/dataset/detail?id=866a9982-0a63-421f-b120-9144fc6ce732)：市府工務局新工處 JSON，原始檔為 taipei-bridges-source.json；[官方下載](https://data.taipei/api/frontstage/tpeod/dataset/resource.download?rid=68d6c971-d077-4578-a52e-e42db765f861)。使用起訖經緯度、跨河欄位、原始 ID 及名稱；資料頁檔案更新時間為 2025-12-16，與 2026-09-22 詮釋資料更新時間分開記錄。資料頁授權標示公開並連結政府資料開放授權條款。
- 以上皆於 2026-10-30（Europe/Brussels）下載；原始檔 SHA-256 記錄於 src/data/taipei-map.json 的 sources。只在建置時使用，遊戲執行不擷取即時資料。

`design/build_campaign_map.py` 從原始 SHP、河道與橋梁建置 src/data/taipei-map.json；以原始區界判定唯一格心歸屬，檢查區域面積重疊、相鄰格邊互惠、節點連通及地標吸附距離。來源水系阻擋的邊需有橋梁通道才能通行；橋梁以線段及遊戲尺度容差表達，非實測路面。地形裝飾、坡地成本與一般活動節點為合成設計，不宣稱是真實路網或高程。

Wonder 來源及經緯度詳見 WONDER-CATALOG.md。行政區圖、河道、橋梁與原始地標座標保留來源語意，另存遊戲格位及虛構活動場地。

繪圖程式使用 [D3 v7.9.0](https://cdn.jsdelivr.net/npm/d3@7.9.0/dist/d3.min.js)，保留原始著作權標頭，授權文件保存於 D3-LICENSE.txt。概念圖嵌入固定版本程式及區界資料，執行時不向地圖或選舉 API 請求資料。
