from pathlib import Path
import json
ROOT=Path(__file__).resolve().parents[1]
entries={
'g_title':('個人成長與狀態','Career & condition'),
'g_level':('等級 {{level}}','Lv. {{level}}'),
'g_xp':('經驗 {{xp}}／{{next}}','Experience {{xp}} / {{next}}'),
'g_max':('已達上限','MAX'),
'g_morale':('士氣','Morale'),
'g_health':('健康','Health'),
'g_dailyAP':('依目前狀態估算每日 AP：{{ap}}','Daily AP at current condition: {{ap}}'),
'g_explain':('經驗來自有效活動，每人每日最多 8；移動與休息不給經驗。升級不補當下 AP。士氣影響宣講，健康與疲勞影響翌日 AP；休息可恢復。','Earn experience through activities, up to 8 per member daily; moving and resting award none. Levels never refill current AP. Morale affects rallies; health and fatigue affect daily AP. Rest restores condition.'),
'g_levelUp':('成長突破！升至等級 {{level}}。','Level up! Reached level {{level}}.'),
'g_helper_medic':('街坊醫護','Street Medic'),
'g_helper_organizer':('動員協調員','Morale Organiser'),
'g_helper_logistic':('後勤接應員','Logistics Aide'),
'g_effect_medic':('為附近同隊恢復 22 健康，減少 1 疲勞。','Restore 22 health and remove 1 fatigue from a nearby ally.'),
'g_effect_organizer':('為附近同隊恢復 15 士氣。','Restore 15 morale to a nearby ally.'),
'g_effect_logistic':('為附近同隊補 2 AP，不超過目前每日上限。','Restore 2 AP to a nearby ally, within their daily cap.'),
'g_assist':('支援隊員','Support a member'),
'g_targetState':('健康 {{health}}／士氣 {{morale}}','Health {{health}} / morale {{morale}}'),
'g_assistHelp':('2 AP／2 物資；距離兩格內，每位受援者每日一次，三類支援共用上限。','2 AP / 2 supplies; within two hexes. Each recipient gets one support action per day, shared across all support types.'),
'g_roster':('隊伍編制 {{count}}／7','Roster {{count}} / 7'),
'g_recruitHelp':('主將可招募輔助角色，含主將在內的原有三人一併計數，最多七人。新隊員在本區基地附近報到，次晨才取得 AP。','The commander may recruit support characters, up to seven total including the original team. New members arrive near the district base and receive AP next morning.'),
'g_chooseHelper':('選擇支援職務','Choose support role'),
'g_recruit':('招募輔助角色','Recruit support member'),
'g_upkeep':('每兩名額外隊員讓每日晨間物資補給減少 1；七人滿編仍補給 6。','Every two extra members reduce morning supply income by 1; a full seven-member roster still receives 6.'),
'g_recruitLeader':('請選擇可行動的主將招募支援角色。','Select an available commander to recruit support.'),
'g_rosterFull':('本陣營已達七名隊員上限。','This faction has reached its seven-member limit.'),
'g_assistRange':('請選擇兩格內、同隊且可接受支援的其他隊員。','Choose another eligible ally within two hexes.'),
'g_assisted':('這位隊員今日已接受過支援。','This member has already received support today.'),
'g_noNeed':('這位隊員目前不需要這類支援。','This member does not currently need this support.'),
'c_action_recruit':('招募支援隊員','Recruit support'),
'c_action_assist':('執行隊友支援','Support an ally'),
'c_edition':('成長・士氣・七人編制 · v0.10.0','Growth · morale · seven-member rosters · v0.10.0'),
'c_footer':('選戰騎士團 · 首都篇 · v0.10.0','Campaign Knights · Capital Chapter · v0.10.0'),
}
for i,lang in enumerate(['zh-TW','en']):
 p=ROOT/'src/locales'/f'{lang}.json';d=json.loads(p.read_text('utf8'));d.update({k:v[i] for k,v in entries.items()});p.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n','utf8')
print(f'Updated {len(entries)} growth entries.')
exec((ROOT/'design/add_balance_locales.py').read_text(encoding='utf8'))
