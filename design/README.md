# 第三階段設計資料

需求與玩法見專案根目錄 PHASE-3-DESIGN.md。已確認以台北市 12 行政區進行全市掃街競選。

assets/ 保留官方行政區界原始資料、轉換後 GeoJSON 與來源紀錄。convert_districts.py 可重建簡化後的 WGS84 區界；地圖不是手繪行政區輪廓。

本次對話提供的互動概念圖可選擇行政區並配置治疏嶼／恰恰肥皂箱。已在瀏覽器檢查 12 個行政區輪廓、選區、兩種舞台配置、無腳本錯誤與窄螢幕無水平溢出。

此目錄目前是設計與參考資料，尚未接入 src/ 的 v0.2.0 遊戲規則。舞台圖釘是玩法示意位置，不代表實際活動場址；場地、人流與支持點也不是現實選舉資料。

Wonder 研究已加入每區 1 個代表地標的官方資料與真實代表點座標，見根目錄 WONDER-CATALOG.md。執行 python design/build_wonder_catalog.py 可從 research/attractions-source.zip 重建節點、GeoJSON 與來源摘錄；完整壓縮檔不納入版本追蹤，選用的摘錄保留來源 ID、時間與座標。
