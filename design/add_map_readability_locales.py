"""v0.5.1 readable hex layers and player-owned campaign progress."""
from pathlib import Path
import json
ROOT=Path(__file__).resolve().parents[1]
entries={
'c_nodeShort_wonder':('地標','Wonder'),'c_nodeShort_market':('市場','Market'),'c_nodeShort_transit':('路口','Stop'),'c_nodeShort_venue':('舞台','Stage'),'c_nodeShort_community':('街坊','Homes'),'c_nodeShort_waterfront':('河岸','River'),
'c_edition':('競選總部龐克 · v0.5.1','CAMPAIGN PUNK · v0.5.1'),
'c_footer':('選戰騎士團 · 首都篇 · v0.5.1','Campaign Knights · Capital Chapter · v0.5.1'),
'c_mapReadingHelp':('六角形＝移動格；建築、樹木＝地形圖示；圓形圖示＝可互動活動點。','Hexagons are movement cells; buildings and trees are terrain icons; round markers are activity locations.'),
'c_layerReach':('顯示可達範圍','Show reachable cells'),
'c_layerTrail':('顯示本局足跡','Show campaign footprints'),
'c_trailHelp':('足跡表示曾到達；✓ 才表示本局完成過活動。','Footprints mean you have arrived; a check means your faction has completed an activity.'),
'c_cellArrived':('本局已到達','Reached this campaign'),
'c_cellUnvisited':('尚無到達紀錄','No arrival recorded'),
'c_nodeCompleted':('本局已完成活動','Activity completed this campaign'),
'c_sweepProgress':('本區掃街進度','District canvassing progress'),
'c_completedCount':('本局完成 {{completed}}／{{total}} 點','{{completed}} / {{total}} locations completed'),
'c_progressHelp':('只顯示你方紀錄。足跡含部署、移動與接駁抵達；勾選代表本局在此辦過活動。次數為今日一般活動，隔天歸零，舞台場次另計。','Only your faction’s records appear. Footprints include deployment, movement and charter arrivals. Checks mark locations where you held an activity. Counts are today’s ordinary activities, reset each morning; stage sessions are counted separately.'),
'c_progressNone':('尚未活動 · 今日 0/2','No activity yet · Today 0/2'),
'c_progressArrived':('此格曾到達 · 尚未活動','Cell reached · No activity yet'),
'c_progressToday':('今日一般活動 {{count}}/2','Ordinary activities today {{count}}/2'),
'c_progressCapped':('今日已達上限 {{count}}/2','Today’s limit reached {{count}}/2'),
'c_progressPast':('本局已活動 · 今日一般活動 0/2','Activity recorded · Ordinary activities today 0/2'),
'c_legacyTrail':('這份舊存檔未保存早期路線；足跡從目前隊員位置繼續記錄，既有活動點紀錄保留。','This older save did not record earlier routes. Footprints continue from current positions; existing activity records are preserved.'),
'c_guide15':('街區只有一套對齊的六角格。淡藍色為當前隊員可達範圍，金線為待確認路線。足跡記錄你方本局到達過的格子；勾選記錄辦過活動的地點。今日一般活動兩次上限隔天歸零，累計紀錄與存檔保留。','The street map uses one aligned hex grid. Pale blue shows cells the selected member can reach; gold marks a pending route. Footprints record cells your faction reached; checks mark activity locations. The two-visit ordinary activity cap resets daily, while campaign progress remains saved.'),
}
for i,lang in enumerate(['zh-TW','en']):
 p=ROOT/'src/locales'/f'{lang}.json';d=json.loads(p.read_text(encoding='utf8'));d.update({k:v[i] for k,v in entries.items()});p.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
print(f'Updated {len(entries)} map readability entries.')

exec((ROOT/"design/add_street_workflow_locales.py").read_text(encoding="utf8"))
