"""v0.5.3 district-specific illustrated streets. No real-road claims."""
from pathlib import Path
import json
ROOT=Path(__file__).resolve().parents[1]
entries={
'c_edition':('競選總部龐克 · v0.5.3','CAMPAIGN PUNK · v0.5.3'),
'c_footer':('選戰騎士團 · 首都篇 · v0.5.3','Campaign Knights · Capital Chapter · v0.5.3'),
'c_sceneCard':('本區街景特色','District streetscape'),
'c_sceneEdition':('街頭圖鑑 {{number}}／12','STREET ATLAS {{number}} / 12'),
'c_sceneSchematic':('街景與連線為風格化示意；所有通行與成本以六角格為準。','Illustrated scenery and street links; hexes determine access and costs.'),
'c_showStreetDetail':('顯示街景細節','Show street details'),
'c_mapReadingHelp':('六角形＝移動格；屋舍、植栽與灰色街景連線＝裝飾；圓形圖示＝活動點。','Hexagons are movement cells; buildings, planting and gray street links are scenery; round markers are activity locations.'),
'c_sceneTitle_6300100':('松山・燈火商街','Songshan · Lantern streets'),
'c_sceneBody_6300100':('夜市牌樓、條紋棚攤與沿街燈籠，描繪饒河街周邊的商街氣氛。','A market gateway, striped awnings and lanterns evoke the streets around Raohe Night Market.'),
'c_sceneTitle_6300200':('信義・垂直都會','Xinyi · Vertical city'),
'c_sceneBody_6300200':('以台北 101 的層疊輪廓搭配玻璃高樓、開放廣場與行道樹。','Taipei 101’s stepped silhouette, glass towers, open plazas and street trees.'),
'c_sceneTitle_6300300':('大安・林蔭生活','Daan · Under the canopy'),
'c_sceneBody_6300300':('大安森林公園的樹冠與步道，銜接低層屋舍、綠帶與休憩長椅。','Forest Park canopies and paths meet low-rise homes, planted verges and benches.'),
'c_sceneTitle_6300400':('中山・藝文街廓','Zhongshan · Art in the blocks'),
'c_sceneBody_6300400':('美術館的錯落量體、幾何雕塑與街角綠意，組成藝文街區。','The Fine Arts Museum’s offset volumes, geometric sculpture and planted corners.'),
'c_sceneTitle_6300500':('中正・紀念廣場','Zhongzheng · Civic squares'),
'c_sceneBody_6300500':('紀念堂屋頂、對稱柱廊與階梯廣場，保留開闊的公共空間感。','The Memorial Hall roof, symmetrical colonnades and stepped public squares.'),
'c_sceneTitle_6300600':('大同・河港騎樓','Datong · Port & arcades'),
'c_sceneBody_6300600':('大稻埕碼頭的船帆、水紋與磚色山牆，連起老街拱廊意象。','Wharf sails and ripples join brick gables and old-street arcades.'),
'c_sceneTitle_6300700':('萬華・廟埕老城','Wanhua · Temple courtyards'),
'c_sceneBody_6300700':('龍山寺的燕尾屋脊、燈籠與廟埕階梯，搭配老城低層街廓。','Lungshan Temple’s sweeping roofs, lanterns and courtyard steps among low-rise blocks.'),
'c_sceneTitle_6300800':('文山・綠丘茶徑','Wenshan · Green hills'),
'c_sceneBody_6300800':('動物園入口意象、丘陵等高紋、茶園植列與坡地小屋。','A zoo-inspired gateway, hill contours, tea planting and hillside cottages.'),
'c_sceneTitle_6300900':('南港・音樂稜線','Nangang · Music skyline'),
'c_sceneBody_6300900':('流行音樂中心的折面輪廓，延伸為金屬街廓與層次廣場。','The Music Center’s faceted profile inspires metal-clad blocks and layered plazas.'),
'c_sceneTitle_6301000':('內湖・山城科技','Neihu · Hills & glass'),
'c_sceneBody_6301000':('碧山巖的山寺輪廓，搭配玻璃辦公樓、綠坡與山城階線。','Bishanyan’s hilltop temple meets glass offices, green slopes and terraced contours.'),
'c_sceneTitle_6301100':('士林・青瓦庭園','Shilin · Palace gardens'),
'c_sceneBody_6301100':('故宮青瓦屋簷、對稱庭院與山麓植栽，形成庭園街景。','Palace Museum rooflines, symmetrical courtyards and foothill planting.'),
'c_sceneTitle_6301200':('北投・溫泉屋舍','Beitou · Steam & brick'),
'c_sceneBody_6301200':('溫泉博物館的磚牆、斜瓦屋頂與蒸氣線條，融入綠坡步道。','Hot Spring Museum brickwork, pitched roofs and steam curls amid green slopes.'),
'c_guide17':('12 區各有街景圖鑑與地標輪廓；顯示街景細節可開關屋舍、植栽及灰色示意連線。裝飾不會阻擋通行或改變 AP；可達範圍、青色實際路線及金色預覽仍以同一套六角格為準。','Each district has its own street atlas and landmark silhouette. Show street details toggles buildings, planting and gray illustrative links. Scenery does not block movement or change AP; reachable cells, cyan walks and gold previews use the same hex grid.'),
}
for i,lang in enumerate(['zh-TW','en']):
 p=ROOT/'src/locales'/f'{lang}.json';d=json.loads(p.read_text(encoding='utf8'));d.update({k:v[i] for k,v in entries.items()});p.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
print(f'Updated {len(entries)} district street entries.')

exec((ROOT/"design/add_real_road_locales.py").read_text(encoding="utf8"))
