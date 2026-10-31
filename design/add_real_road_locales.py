"""v0.5.4 offline real road geometry and street-name inspection."""
from pathlib import Path
import json
ROOT=Path(__file__).resolve().parents[1]
entries={
'c_edition':('競選總部龐克 · v0.5.4','CAMPAIGN PUNK · v0.5.4'),
'c_footer':('選戰騎士團 · 首都篇 · v0.5.4','Campaign Knights · Capital Chapter · v0.5.4'),
'c_sceneSchematic':('屋舍與植栽為遊戲示意；真實道路圖層另依 OSM 資料繪製。','Buildings and planting are game illustrations; real roads use a separate OSM layer.'),
'c_mapReadingHelp':('六角形＝移動格；屋舍、植栽＝裝飾；實際道路有路名與分類；圓形圖示＝活動點。','Hexagons are movement cells; buildings and planting are scenery; real roads have names and classes; round markers are activity locations.'),
'c_realRoadControls':('真實道路圖層操作','Real-road layer controls'),'c_realRoads':('真實道路 ／ OSM','REAL STREETS / OSM'),
'c_roadSnapshot':('圖資截至 {{date}} · 本區 {{count}} 段','Data as of {{date}} · {{count}} local segments'),
'c_roadsLoading':('正在讀取本機道路資料…','Loading local road data…'),
'c_roadsLoadFailed':('無法讀取本機道路資料。六角格行動仍可使用，可重試載入道路。','Local road data could not be read. Hex actions remain available; retry to load the streets.'),
'c_roadsRetry':('重試道路載入','Retry road loading'),
'c_showRealRoads':('顯示真實道路','Show real roads'),'c_showRoadNames':('顯示路名','Show street names'),
'c_roadFilter':('道路類別','Road class'),'c_roadsFilter_all':('所有道路','All roads'),'c_roadsFilter_arterial':('幹道與快速道路','Arterials & expressways'),'c_roadsFilter_local':('街道與巷道','Streets & alleys'),'c_roadsFilter_path':('步道與自行車道','Paths & cycleways'),
'c_realRoadHelp':('走向與路名來自真實道路資料；幾何線寬僅供辨識。移動與 AP 仍依 380 公尺六角格，不是逐街步行導航；圖上相交不代表平面連通。','Geometry and names come from real road data; line widths are illustrative. Movement and AP still use 380 m hexes, not street-by-street walking navigation. Crossings may be grade-separated.'),
'c_searchDistrictRoads':('搜尋並定位本區道路（{{count}} 個具名項目）','Find a local street ({{count}} named entries)'),
'c_roadQuery':('路名或編號','Street name or reference'),'c_roadQueryPlaceholder':('例如：信義、和平、巷、106','For example: 信義, 和平, 巷, 106'),
'c_roadNameFallback':('路名依來源原文顯示。本次來源未附英文路名；未自行翻譯。','Street names retain their source spelling. This extract has no English-name field; no translations are invented.'),
'c_roadSegments':('{{count}} 段幾何','Geometry segments: {{count}}'),
'c_roadClass_express':('快速道路／高速公路','Expressway / motorway'),'c_roadClass_arterial':('主要道路','Arterial road'),'c_roadClass_street':('一般街道','Local street'),'c_roadClass_alley':('巷道／服務道路','Alley / service road'),'c_roadClass_path':('步道／自行車道','Path / cycleway'),
'c_noRoadResults':('此類別沒有符合的路名；可更換關鍵字或道路類別。','No matching street names in this class. Change the query or road class.'),
'c_roadResultsLimited':('最多列出前 12 項，輸入路名可縮小範圍。','Showing the first 12 entries. Type a name to narrow the results.'),
'c_roadsInHex':('選定／置中格內的具名道路（{{count}} 項）','Named roads in the selected / centered hex ({{count}})'),
'c_roadHexHelp':('依真實線段與完整六角格相交查詢；有道路不表示該格能通行，也不代表曾走過。','Based on real lines intersecting the full hex. A road does not make the hex passable or count as a recorded visit.'),
'c_noNamedRoadsInHex':('此格沒有具名道路資料，可能仍有未命名小徑。','No named road is recorded in this hex; unnamed paths may still exist.'),
'c_locatedRoad':('定位道路（非移動預覽）','Located road (not a move preview)'),
'c_guide17':('12 區各有街景圖鑑與地標輪廓；顯示街景細節可開關屋舍及植栽。裝飾不會阻擋通行或改變 AP；可達範圍、青色實際路線及金色預覽仍以同一套六角格為準。','Each district has a street atlas and landmark silhouette. Show street details toggles buildings and planting. Scenery does not block movement or change AP; reachable cells, cyan walks and gold previews use the same hex grid.'),
'c_guide18':('真實道路圖層提供 OSM 街道幾何、原始路名、分類與搜尋定位，取代舊示意連線。淡紫色為定位道路，與金色移動預覽及青色足跡路線不同。橋梁、隧道及高架保留來源標記，但尚未變成逐街通行規則；快速道路不可據此當成步行路線。來源缺少步行權限與英文路名，不補造。','The real-road layer provides OSM geometry, original names, classes and street search, replacing illustrative links. Lavender highlights a located road; gold previews moves and cyan records walks. Bridge, tunnel and layer tags are retained, but do not define street-level movement yet. Expressways are not walking routes. Missing foot-access and English-name fields are not invented.'),
}
for i,lang in enumerate(['zh-TW','en']):
 p=ROOT/'src/locales'/f'{lang}.json';d=json.loads(p.read_text(encoding='utf8'));d.update({k:v[i] for k,v in entries.items()});p.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
print(f'Updated {len(entries)} real road entries.')

exec((ROOT/"design/add_road_movement_locales.py").read_text(encoding="utf8"))
