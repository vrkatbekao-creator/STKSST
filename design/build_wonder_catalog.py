"""Build the researched Wonder data. Bonuses are authored game-design proposals."""
import hashlib
import json
from pathlib import Path
import zipfile

ROOT = Path(__file__).resolve().parents[1]
DATASET_URL = 'https://data.gov.tw/dataset/7777'
DOWNLOAD_URL = 'https://media.taiwan.net.tw/XMLReleaseAll_public/v2.0/Zh_tw/Attraction-json.zip'
ZIP = ROOT / 'design/research/attractions-source.zip'
with zipfile.ZipFile(ZIP) as archive:
    snapshot = json.loads(archive.read('AttractionList.json').decode('utf-8-sig'))
official = {row['AttractionID']: row for row in snapshot['Attractions']}
district_geo = json.loads((ROOT / 'design/assets/taipei-districts.geojson').read_text(encoding='utf-8'))
district_ids = {f['properties']['name']:f['properties']['id'] for f in district_geo['features']}
district_en = dict(zip(['北投區','士林區','內湖區','南港區','松山區','信義區','大安區','中山區','大同區','萬華區','中正區','文山區'], ['Beitou District','Shilin District','Neihu District','Nangang District','Songshan District','Xinyi District','Daan District','Zhongshan District','Datong District','Wanhua District','Zhongzheng District','Wenshan District']))

# English labels are working UI names pending the localization pass.
# District, official record suffix, game ID, English label, address,
# corroborating primary URL, bonus trigger, effect labels, setting labels.
selections = [
 ('北投區','000033','beitou_hot_spring_museum','Beitou Hot Spring Museum','臺北市北投區中山路2號','https://culture.gov.taipei/cp.aspx?n=680DE22A4F00B25F','rest_then_outreach','溫泉街巡訪','Hot Spring Walk','休整後完成周邊掃街，額外 +2 支持點。','Complete nearby canvassing after a rest action for +2 extra support points.','紅磚浴場、溫泉街與綠蔭。','Red-brick bathhouse, hot spring streets and greenery.'),
 ('士林區','000019','national_palace_museum','National Palace Museum','臺北市士林區至善路二段221號','https://www.npm.gov.tw/','policy_forum','文博交流','Cultural Exchange','完成政策問答活動，額外 +2 支持點。','Complete a policy Q&A activity for +2 extra support points.','文博園區與山麓地景。','Museum grounds and foothill scenery.'),
 ('內湖區','000067','bishanyan_temple','Bishanyan Kaizhang Shengwang Temple','臺北市內湖區碧山路24號','https://www.taiwan.net.tw/m1.aspx?id=36833&sno=0001090','connected_route','山城連線','Hillside Route','當日走訪兩個不同的相連街區節點，額外 +2 支持點。','Visit two different linked neighborhood nodes that day for +2 extra support points.','山城廟宇與眺望台北的視野。','Hillside temple and views across Taipei.'),
 ('南港區','002201','taipei_music_center','Taipei Music Center','臺北市南港區市民大道八段99號','https://www.tmc.taipei/tw/venue-transportation','community_stage_event','音樂聚場','Music Gathering','在本區任一已駐點社群舞台完成活動，額外 +2 支持點。','Complete an event at either staffed community stage in this district for +2 extra support points.','展演建築與流行音樂文化。','Performance architecture and pop music culture.'),
 ('松山區','001538','raohe_night_market','Raohe Street Night Market','臺北市松山區饒河街（八德路四段至撫遠街一帶）','https://www.tcma.gov.taipei/News_Content.aspx?n=FAC14AD2DE4E01A4&s=0CFD6ED2C96E9CC4&sms=32F7BA052C5CA548','night_canvassing','夜市人潮','Night Market Route','晚上完成周邊掃街，額外 +2 支持點。','Complete nearby canvassing at night for +2 extra support points.','夜市招牌、攤位與巷口人流。','Night-market signs, stalls and street entrances.'),
 ('信義區','000217','taipei_101','Taipei 101','臺北市信義區信義路五段7號','https://www.travel.taipei/zh-tw/attraction/details/217','livestream','城市焦點','City Spotlight','在周邊節點完成直播宣傳行動，額外 +2 支持點。','Complete a livestream outreach action at a nearby node for +2 extra support points.','摩天樓天際線與信義商圈。','Skyscraper skyline and Xinyi shopping streets.'),
 ('大安區','000190','daan_forest_park','Daan Forest Park','臺北市大安區新生南路二段1號','https://www.travel.taipei/zh-tw/attraction/details/190','day_canvassing','綠蔭走訪','Park Walk','白天完成周邊掃街，額外 +2 支持點。','Complete nearby canvassing by day for +2 extra support points.','都市綠地、步道與公園生活。','Urban greenery, footpaths and park life.'),
 ('中山區','000030','taipei_fine_arts_museum','Taipei Fine Arts Museum','臺北市中山區中山北路三段181號','https://www.tfam.museum/Common/editor.aspx?ddlLang=zh-tw&id=230','culture_exchange','藝文串聯','Arts Connection','完成文化交流主題活動，額外 +2 支持點。','Complete an arts-and-culture activity for +2 extra support points.','現代美術館及周邊藝文空間。','Modern art museum and nearby cultural spaces.'),
 ('大同區','000001','dadaocheng_wharf','Dadaocheng Wharf','臺北市大同區大稻埕碼頭','https://www.travel.taipei/zh-tw/attraction/details/1','market_to_wharf_route','河岸商街','Riverside Connection','當日完成市場與河岸兩類節點的連線走訪，額外 +2 支持點。','Visit linked market and riverside nodes that day for +2 extra support points.','淡水河岸碼頭與大稻埕街區。','Tamsui River waterfront and Dadaocheng streets.'),
 ('萬華區','000068','lungshan_temple','Lungshan Temple','臺北市萬華區廣州街211號','https://www.travel.taipei/zh-tw/attraction/details/68','neighborhood_visit','艋舺街坊','Monga Neighborhood','完成地方服務或街坊拜訪行動，額外 +2 支持點。','Complete a neighborhood visit or local-service action for +2 extra support points.','古蹟廟宇與艋舺老街生活。','Historic temple and Monga neighborhood streets.'),
 ('中正區','000023','chiang_kai_shek_memorial_hall','Chiang Kai-shek Memorial Hall','臺北市中正區中山南路21號','https://www.travel.taipei/zh-tw/attraction/details/23','scheduled_policy_presentation','城市議壇','City Forum','參與已排程的政見發表會，額外 +2 支持點（計入本區）。','Participate in a scheduled policy presentation for +2 extra support points in this district.','紀念園區、廣場與兩廳院地景。','Memorial grounds, plazas and performing-arts landmarks.'),
 ('文山區',None,'taipei_zoo','Taipei Zoo','臺北市文山區新光路二段30號','https://www.zoo.gov.taipei/News_Content.aspx?n=9F0E68F3EC5B5751&s=01BD7568D718DAED&sms=F3B2EF982C0582B3','environment_activity','生態共學','Ecology Exchange','完成環境或保育主題活動，額外 +2 支持點。','Complete an environment or conservation activity for +2 extra support points.','動物保育園區與文山山麓。','Wildlife conservation grounds and Wenshan foothills.'),
]

catalog = {
 'schemaVersion':1,'status':'implemented_v0.3.0_balance_draft','researchedOn':'2026-10-30','researchTimezone':'Europe/Brussels',
 'coordinateSystem':'EPSG:4326','pointSemantics':'Representative landmark location, not an entrance, venue permit or stage placement.',
 'balanceStatus':'draft_game_values_not_real_political_effects',
 'supportVisibilityPolicy':'campaign-intelligence-policy.json',
 'sourceDataset':{'url':DATASET_URL,'downloadUrl':DOWNLOAD_URL,'snapshotUpdateTime':snapshot['UpdateTime'],'archiveSha256':hashlib.sha256(ZIP.read_bytes()).hexdigest(),'license':'https://data.gov.tw/license'},
 'bonusRules':{'supportUnit':'synthetic_support_points','baseBonus':2,'conditionalBonus':2,'maxPerWonderPerDay':4,'maxRewardedWondersPerTeamPerDay':3,'maxPerTeamPerDay':12,'settlement':'day_end','baseActionAP':2,'requires':['uncontested_control_at_settlement','staffed','eligible_action_completed_in_district'],'contestedBonus':0,'canChangeOwner':True,'stacking':'additive_no_recursive_multipliers','factionSymmetric':True,'stageBrands':['治疏嶼','恰恰肥皂箱']},
 'wonders':[]
}
extract=[]
for district,suffix,slug,en,address,url,trigger,effect_zh,effect_en,body_zh,body_en,setting_zh,setting_en in selections:
    if suffix:
        source=official['Attraction_379000000A_'+suffix]
        assert source['PostalAddress']['CityCode']=='63000' and source['PostalAddress']['Town']==district
        name=source['AttractionName'];lon,lat=source['PositionLon'],source['PositionLat']
        location_source={'type':'official_dataset','sourceUrl':DATASET_URL,'sourceRecordId':source['AttractionID'],'updatedAt':source['UpdateTime']}
        extract.append({k:source[k] for k in ['AttractionID','AttractionName','PositionLat','PositionLon','PostalAddress','UpdateTime']})
    else:
        name='臺北市立動物園'
        lat=24+59/60+56/3600;lon=121+34/60+52/3600
        location_source={'type':'official_venue_page','sourceUrl':url,'sourceCoordinateText':'+24° 59′ 56″, +121° 34′ 52″','conversion':'DMS to decimal degrees; no geocoding estimate'}
    catalog['wonders'].append({
      'id':'wonder_'+slug,'districtId':district_ids[district],'districtName':{'zh-TW':district,'en':district_en[district]},'nodeType':'wonder',
      'name':{'zh-TW':name,'en':en},'englishNameStatus':'working_ui_label_pending_localization_review',
      'address':{'zh-TW':address},'addressSourceUrl':url,
      'geography':{'type':'Point','coordinates':[round(lon,7),round(lat,7)],'precision':'representative_point','source':location_source},
      'setting':{'zh-TW':setting_zh,'en':setting_en},
      'gameplay':{'baseBonus':2,'conditionalBonus':2,'conditionId':trigger,'effectName':{'zh-TW':effect_zh,'en':effect_en},'conditionDescription':{'zh-TW':body_zh,'en':body_en},'bonusScope':'own_district','factionRestriction':None,'siteEndorsementAssumed':False,'physicalStagePlacement':'separate_fictional_nearby_node'},
      'sources':[{'url':DATASET_URL,'supports':'official coordinates, record identity and district'} if suffix else {'url':url,'supports':'official coordinates and address'},{'url':url,'supports':'address and landmark identity'}],
    })
assert len(catalog['wonders'])==12 and len({w['districtId'] for w in catalog['wonders']})==12
out=ROOT/'src/data';out.mkdir(exist_ok=True)
(out/'taipei-wonders.json').write_text(json.dumps(catalog,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
(ROOT/'design/research/wonder-source-extract.json').write_text(json.dumps({'dataset':catalog['sourceDataset'],'records':extract},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
features=[{'type':'Feature','id':w['id'],'properties':{'id':w['id'],'districtId':w['districtId'],'name_zh':w['name']['zh-TW'],'name_en':w['name']['en'],'status':catalog['status']},'geometry':{'type':'Point','coordinates':w['geography']['coordinates']}} for w in catalog['wonders']]
(ROOT/'design/assets/taipei-wonders.geojson').write_text(json.dumps({'type':'FeatureCollection','features':features},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('Built 12 Wonder nodes, 12 map points and 11 official source excerpts; zoo uses official venue coordinates.')
