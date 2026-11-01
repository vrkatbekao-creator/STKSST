# v0.7 逐棟建物與衛星地表實作契約

v0.12 建物改依行政區／跨界視窗讀取，完整輪廓、孔洞及屬性不變；DSM 仍共用原全市檔。載入與快取契約見 MAP-LOADING-SPEC.md。

完成日期：2026-11-01（Europe/Brussels）。承接 v0.6 道路戰術，保留 28 天、日夜共用 AP、三方、單一 Zustand、本機單機、100m 共用六角格、舞台品牌與封關規則。建物及高程是來源圖層／查詢，不複製或改寫道路通行、AP 或支持度；v0.5/v0.6 存檔保持相容。

## 使用者確認的來源變更

原先查核內政部 2026 年 20m DEM（航空攝影測量，data.gov.tw/dataset/178729）；官方索引可讀，但臺北及全臺下載檔均回傳 HTTP 403。403 沒有足夠證據判定是流量限制，不曾繞過存取限制。使用者明確選擇「改用公開 30m 衛星高程模型，清楚標示年份與地表模型限制」。因此本版使用 Copernicus GLO-30 DSM，沒有假稱取得內政部 2026 年 DEM，也沒有接入 1m/5m 受限資料。

公開來源已成功取得，沒有持續速度／流量限制，因此不需安排 03:33 接續排程。先前停止的單次排程保持停止。

## 逐棟建物

- OSM / Geofabrik taiwan-261029.osm.pbf，資料時間 2026-10-29T21:21:26Z，PBF SHA256 b7ff3500b40dfbb508f59a93026a950f16f9a9efa1dec63bb278b474823d3ffe。與 v0.6 道路使用相同快照。
- extract_taipei_buildings.py 使用來源 area/way/relation，保留多面及內環，依原始官方臺北 12 區輪廓裁切，投影至 EPSG:3826、原點 E300000/N2800000、螢幕 Y 反向。來源標記只保留 building/name/name:en/name:zh-Hant/height/building:levels/min_height/building:min_level/roof:shape，不保留屋主／住戶／門牌個資。
- 78,449 筆來源建物輪廓，283 棟包含中庭，合計 413 個內孔。OSM 覆蓋並非現實全棟清冊；未涵蓋處留白，不用虛構建物補齊。
- 高度可解析 6,107 筆，樓層 25,330 筆。公尺、ft/feet/' 依來源單位解析；不從樓層推定公尺高度，不從 DSM 與地面相減冒充建物高度。未知或無法解析保留 null。台北 101 來源 508m/101 層、北投溫泉博物館來源 2 層但高度未知，皆可在 UI 查回 OSM。
- 一般座標取整至 0.1m，最大捨入差 0.070628m，非來源測繪精度。13 筆在取整後會失真或塌縮的輪廓保留原始浮點座標，避免中庭或細邊消失；所有最終多面均通過幾何有效性稽核。
- 原始裁切快照 design/assets/taipei-buildings-source.json.gz；衍生資料 public/data/taipei-buildings-v1.json.gz，4,557,121 bytes，500m 空間索引、原始識別及來源雜湊隨附。修訂 076fcb533b3330ba1a6909c0646c7a6486c617ab853d4818879ac4265e1abfdb。
- 地圖每個來源建物使用一個獨立 SVG path，fill-rule=evenodd 保留孔洞；圖層不攔截六角格點選。不以建物輪廓另建碰撞規則，通行仍取決於 v0.6 來源路網。

## 衛星地表高程

- Copernicus GLO-30 Public / AWS，2021 公開版本。主量測 TanDEM-X 2011–2015，局部可能使用更早高程模型補洞；下載日期 2026-10-31 UTC。
- 來源為 DSM，含屋頂、設施及樹冠；不是移除建物植被的裸地 DTM，不是當代路面測高，亦沒有本遊戲重新實地測量。玩家在圖層、剖面、手冊與來源說明都可看到限制。
- 使用 N24E121 與 N25E121 兩個公開 GeoTIFF，原生約 30m（1 弧秒），WGS84 / EGM2008。完整 URL、雜湊、原始 bounds/pixel size 保存在 design/assets/taipei-surface-source-metadata.json；沒有帳號或線上服務依賴。
- Rasterio 雙線性重投影為 EPSG:3826 的 30m 網格，原始官方區界遮罩。705×929 網格、298,380 個有效像元，外側 NoData 保留；來源衍生地表約 -1.0754–1110.4740m。
- 浮點來源裁切保留於 design/assets/taipei-copdem-30m.tif。展示資料量化至 0.1m，最大差約 0.05005m（含浮點誤差），小數位不代表實際測繪精度。bilinear 查詢依像元中心及四鄰值計算；有缺值即回傳未知，未補零或補造地形。
- public/data/taipei-surface-v1.json.gz 共 914,492 bytes，含量化網格、來源與 50m 地表等高線。修訂 6d0904555baab9d7e84cbdc3529fba8ab021becc100bde9ef7cf87a2f68e9111。hillshade PNG 及等高線均由同一來源網格生成；缺值不跨接等高線。
- 路線剖面沿引擎回傳的實際道路幾何取樣，顯示地表範圍；缺值斷線。DSM 可能含屋頂與樹冠，因此不推算路面爬升成本、不修改 AP。

## UI 與相容性

逐棟建物與衛星地表預設開啟，50m 等高線可開關。各區圖鑑插畫保留，但主地圖風格插畫預設關閉，有獨立「風格插畫示意」開關，避免混淆來源輪廓。

選格後建物查詢以真實多面與六角格交集計算，完整保留孔洞。清單最多列 12 筆，地圖繪製全部可見來源特徵；選建物以粉色框標示，顯示名稱、OSM 連結、高度／樓層的來源標記及孔洞數。缺英文名稱保留來源原名。

高程查詢位於選定格的道路錨點，無錨點時使用格心；單位仍在權威道路錨點。道路金色預覽、青色成功步行、地標、陣營與選取維持原層級。圖層開關、來源查詢與語言切換不改 AP、日期、種子、事件、支持度、日誌或存檔格式。唯一 Store 不存第二份遊戲規則；非同步快取只保存不可變圖資。

兩份圖資均在街區首次開啟時從本機 gzip 載入並驗證，載入失敗會顯示雙語訊息與重試，遊戲及道路仍可用。沒有外部圖磚或即時高程 API。畫布／SVG 維持同容器尺寸。所有新增玩家文案、錯誤、標記及剖面 aria 說明均提供 zh-TW/en。

v0.7 沒有改 campaign.ts 遊戲數值與道路修訂；新存檔仍為 schema 2/rules 0.6.0，舊 schema 1 保留粗格規則。遊戲版本號與存檔規則版本刻意分開。

## 建置、授權與驗證

建置工具新增 rasterio==1.5.2、Pillow==13.0.0，列於 design/requirements-map.txt，沒有新增 npm 執行依賴。

extract_taipei_buildings.py → build_taipei_buildings.py；高程 build_taipei_surface.py 可由原始兩張圖幅重建，或 --from-subset 從 Git 保留的裁切 GeoTIFF 及雜湊重建，兩種路徑產出相同修訂；validate_landscape.py 做全量唯讀稽核。下載來源圖幅的步驟與 metadata URL 隨文件保留。詞彙鏈最後執行 add_landscape_locales.py。

建物資料依 ODbL；衛星資料依 Copernicus DEM licence，保留修改衍生告示，見 public/data/LANDSCAPE-DATA-LICENSE.txt。地圖同時提供 OSM 與 Copernicus 歸屬，完整告示與衍生資料可由來源區展開查閱。

型別、109 項測試、正式建置、來源幾何／高程全量稽核，以及十二區、桌面、375px 窄版、雙語、日夜、圖層開關、來源查詢與存檔續玩驗證，詳見 QA.md 與 artifacts/landscape-*。

仍有限制：OSM 未完整涵蓋全部建物，高度及樓層多數缺值；不是逐棟立面照片或寫實 3D 模型。衛星資料年代較早、含表面覆蓋物，無現實導航或當代路面精度保證。路網主 bundle 仍偏大（gzip 約 10.75MB）；本輪圖資另加約 5.47MB gzip 與陰影圖，只在街區讀入，尚未分區串流。測試不等同低階實體手機效能驗證。
