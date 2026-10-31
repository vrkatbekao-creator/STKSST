"""v0.5.2 outreach planning, daily walks and live terrain costs."""
from pathlib import Path
import json
ROOT=Path(__file__).resolve().parents[1]
entries={
'c_moveToNode':('前往可互動位置（{{cost}} AP）','Approach activity location ({{cost}} AP)'),
'c_edition':('競選總部龐克 · v0.5.2','CAMPAIGN PUNK · v0.5.2'),'c_footer':('選戰騎士團 · 首都篇 · v0.5.2','Campaign Knights · Capital Chapter · v0.5.2'),
'c_planOverview':('目前 {{ap}} AP，可選 {{count}} 個掃街點','{{ap}} AP remaining · Canvassing options: {{count}}'),
'c_planBudgetHelp':('依目前隊員與你方資源估算，一次執行一點；執行後會重新計算其他選項。','Estimates use the selected member and your resources. Choose one location at a time; other options update after each action.'),
'c_filterLocations':('篩選活動點','Filter activity locations'),'c_filter_all':('全部','All'),'c_filter_unfinished':('本局未完成','Unfinished'),'c_filter_available':('現在可掃街','Available now'),
'c_noMatchingLocations':('沒有符合條件的活動點；可切換篩選或隊員。','No locations match. Change the filter or selected member.'),
'c_plan_here':('可在此掃街：{{ap}} AP／{{materials}} 物資','Canvass here: {{ap}} AP / {{materials}} material'),
'c_plan_travel':('移動 {{move}} AP＋掃街 {{ap}} AP，合計 {{total}} AP／{{materials}} 物資','Move {{move}} AP + canvass {{ap}} AP: {{total}} AP / {{materials}} material total'),
'c_plan_ap':('到達加掃街需 {{total}} AP，目前 AP 不足。','Reaching this location and canvassing needs {{total}} AP; not enough AP remains.'),
'c_plan_materials':('掃街需要 {{materials}} 物資，現有物資不足。','Canvassing needs {{materials}} material; supplies are insufficient.'),
'c_plan_capped':('今日一般活動已達上限，明天可再安排。','Today’s ordinary activity limit is reached. Return tomorrow.'),
'c_plan_blocked':('超出目前可達範圍，請調整隊員、位置或跨區接駁。','Outside the current reachable area. Change member, position or use a charter.'),
'c_plan_locked':('目前處於駐守狀態，今天不能移動前往。','This member is holding position and cannot move there today.'),
'c_plan_unavailable':('這名隊員目前不能行動。','This member is currently unavailable.'),'c_plan_ended':('本局已結算。','This campaign has ended.'),'c_plan_invalid':('無法規劃此活動點。','This location cannot be planned.'),
'c_previewNodeRoute':('預覽路線','Preview route'),'c_moveAndCanvass':('前往並掃街','Move & canvass'),'c_canvassHere':('在此掃街','Canvass here'),'c_action_canvassRoute':('前往並掃街','Move and canvass'),
'c_todayWalk':('目前隊員今日路線','Selected member’s route today'),'c_showTodayWalk':('顯示今日路線','Show today’s route'),
'c_todayWalkCount':('目前隊員今日記錄 {{count}} 段步行；編號表示執行順序。','Walks recorded for this member today: {{count}}. Numbers show their order.'),
'c_noTodayWalk':('目前隊員今天尚無步行路線紀錄。部署、接駁及更新前的路線不會自動連線。','No walks recorded for this member today. Deployment, charters and routes from earlier versions are not joined.'),
'c_trailHelp':('足跡＝本局抵達；青色實線＝目前隊員今日實際步行；金色虛線＝待確認預覽；✓＝已完成活動。','Footprints: campaign arrivals. Solid cyan: this member’s walks today. Dashed gold: pending preview. Check: completed activity.'),
'c_terrainKey':('查看本區地形與移動成本','District terrain & movement costs'),'c_terrainAP':('進入每格 {{cost}} AP','{{cost}} AP per entered hex'),'c_waterBlocked':('不可直接進入','No direct entry'),
'c_terrainCostHelp':('依本區、你方應變與今日天氣計算。水域不可直接進入，跨河須經可通行橋梁；預覽路線另計實際經過各格的成本。','Costs reflect this district, your adaptation and today’s weather. Water requires a passable bridge crossing. Route previews sum the actual costs of each entered hex.'),
'c_guide16':('活動清單會計算移動加掃街的總 AP 與物資，前往並掃街會保留掃街所需資源；資源或人流不足時整筆不執行。青色實線記錄選定隊員今日每段實際步行，編號表示先後；接駁不偽裝成步行。','The location list shows combined movement and canvassing costs. Move & canvass reserves the required resources; if resources or the visit limit prevent it, nothing is spent. Solid cyan lines show the selected member’s actual walks today in numbered order. Charters are not shown as walks.'),
}
for i,lang in enumerate(['zh-TW','en']):
 p=ROOT/'src/locales'/f'{lang}.json';d=json.loads(p.read_text(encoding='utf8'));d.update({k:v[i] for k,v in entries.items()});p.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
print(f'Updated {len(entries)} street workflow entries.')

exec((ROOT/"design/add_district_street_locales.py").read_text(encoding="utf8"))
