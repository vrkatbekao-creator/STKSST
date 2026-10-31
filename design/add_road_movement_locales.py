from pathlib import Path
import json
ROOT=Path(__file__).resolve().parents[1]
entries={
'c_footer':('選戰騎士團 · 首都篇 · v0.6.0','Campaign Knights · Capital Chapter · v0.6.0'),
'c_roadMapAttribution':('道路依來源拓樸；地景與一般活動點為遊戲配置。圖資：','Routes follow source topology; scenery and ordinary stops are game designs. Sources:'),
'c_edition':('逐街掃街戰術 · v0.6.0','Street campaign tactics · v0.6.0'),
'c_factHex':('100 公尺道路六角格','100 m road hexes'),
'c_streetProfile':('道路戰術｜100 公尺格徑・來源道路尋路','Road tactics | 100 m hex diameter · source road routing'),
'c_legacyProfile':('舊局模式｜380 公尺格徑・保留原有規則與位置','Legacy campaign | 380 m hex diameter · original rules and positions'),
'c_roadRouteDetails':('實際道路距離 {{metres}} 公尺','Road distance: {{metres}} m'),
'c_unnamedRoute':('未命名道路','Unnamed road'),
'c_assumedWalk':('部分路段未標示步行權限，依遊戲政策推定通行。','Some sections have no foot-access tag and are assumed walkable by game policy.'),
'c_roadMapReading':('一套 100 公尺格徑六角格；棋子固定在格內道路錨點。金線是道路預覽，青線是實際步行，建物是區域風格示意。','One 100 m hex grid; units use fixed road anchors. Gold previews road routes, cyan records walks. Buildings illustrate district character.'),
'c_streetRoadHelp':('新局沿來源道路節點尋路，線條交叉不自動連通。高速／快速道路及明示禁止通行路段不開放。普通道路缺步行標記時採遊戲推定，非現實導航；舊局沿用原格網。','New campaigns follow source road nodes; crossing lines do not automatically connect. Expressways and explicitly restricted sections are excluded. Ordinary roads with missing foot tags use a game assumption. This is not real-world navigation. Legacy campaigns retain their grid.'),
'c_roadCostTerrain':('僅呈現地景','Visual terrain only'),
'c_roadAPHelp':('道路 AP＝整條路線加權距離÷100 向上取整，移動至少 1 AP。階梯、雨天及未應變的施工各增加一倍該路段權重；坡地插畫不加費。河道僅走來源路網，接駁另計。','Road AP = total weighted metres / 100, rounded up; any move costs at least 1 AP. Stairs, rain and unadapted roadworks each add one to the affected section’s multiplier. Illustrated slopes add no cost. Water crossings require source road connections; charter travel is separate.'),
'c_roadRain':('雨天讓道路路段的 AP 距離權重加 1；日夜共用 AP。','Rain adds one to the road AP distance multiplier; day and night share AP.'),
'c_roadWorks':('虛構事件：本區道路路段的 AP 距離權重加 1。應變可解除本隊加費。','Fictional event: road sections in this district gain one AP distance multiplier. Adapt to remove your faction’s penalty.'),
'c_guide3':('新局使用格徑 100 公尺道路六角格：選空格預覽真實道路，再確認移動。AP 依整條加權道路距離每 100 公尺向上取整；階梯、雨天、未應變的施工各增加一倍路段權重。舊局保留 380 公尺格網與原地形成本。','New campaigns use 100 m road hexes. Select an empty hex to preview a road route, then confirm. AP rounds the full weighted route up per 100 m; stairs, rain and unadapted roadworks each add one section multiplier. Legacy campaigns retain 380 m hexes and original terrain costs.'),
'c_guide18':('真實道路底圖提供原始路名、分類與搜尋。淡紫色定位道路，不代表可步行；金色預覽及青色紀錄才是遊戲尋路。橋梁、隧道與高架依 OSM 節點引用連通，沒有來源連接的交叉不變成路口。缺英文路名時保留原名。','The road basemap provides source names, classes and search. Lavender locates a road and does not establish walkability; gold previews and cyan records game routes. Bridges, tunnels and overpasses follow OSM node references. Geometric crossings do not create junctions. Missing English names fall back to the original name.'),
'c_guide19':('新局採道路模式，舊存檔保留原位置、AP 與歷史，不自動升級地圖。新版存檔保存路網修訂，版本不符會拒絕讀取。這是離線戰術模型，未標示步行權限的普通道路依遊戲政策推定，非實測導航或現實通行保證。','New campaigns use road mode. Legacy saves preserve positions, AP and history without map migration. New saves record a road revision and reject mismatches. This offline tactics model assumes access on ordinary roads with missing foot tags; it is not surveyed navigation or a guarantee of real access.'),
}
for i,lang in enumerate(['zh-TW','en']):
 p=ROOT/'src/locales'/f'{lang}.json';d=json.loads(p.read_text('utf8'));d.update({k:v[i] for k,v in entries.items()});p.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n','utf8')
print(f'Updated {len(entries)} road movement entries.')

exec((ROOT/"design/add_landscape_locales.py").read_text(encoding="utf8"))
