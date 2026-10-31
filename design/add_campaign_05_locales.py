"""v0.5 three fictional factions and browser-local continuation."""
from pathlib import Path
import json
ROOT=Path(__file__).resolve().parents[1]
entries={
'c_surpriseDuration':('虛構街頭事件 · 只影響今日 · 各陣營可回應一次','Fictional street event · Today only · One response per faction'),
'c_newsDesc_volunteers':('各陣營隊員今日額外獲得 1 AP；進入夜間不再補發。','Each member of every faction receives one extra AP today, issued only in the morning.'),
'c_contested':('多方爭奪中','Contested by multiple factions'),
'c_rumor_neck_and_neck':('{{area}}傳出領先陣營差距很小，勝負難料。','Reports from {{area}} suggest the front-runners are close; the outcome remains uncertain.'),
'c_eventHelp':('選擇預告議題並事先準備，活動當日參加可獲得較佳反應。各陣營每日限一次。','Prepare the announced topic for a stronger response on event day. Each faction may participate once per day.'),
'c_logStart':('競選開始。三方主將、宣講隊員與街頭志工已就位。','The campaign begins. All three factions’ commanders, speakers and street volunteers are ready.'),
'white':('白方','White team'),'c_flag_white':('白','W'),
'c_points':('藍方 {{blue}} 點 ／ 橙方 {{green}} 點 ／ 白方 {{white}} 點','Blue {{blue}} points / Orange {{green}} points / White {{white}} points'),
'c_edition':('競選總部龐克 · v0.5','CAMPAIGN PUNK · v0.5'),
'c_footer':('選戰騎士團 · 首都篇 · v0.5.0','Campaign Knights · Capital Chapter · v0.5.0'),
'c_chooseFaction':('先選擇陣營','CHOOSE YOUR FACTION'),
'c_defaultLeader':('預設主將：{{name}}','Default commander: {{name}}'),
'c_threeSides':('藍、橙、白三方各自競選；另外兩方由電腦操作。這些是虛構遊戲陣營，主將可另選。','Blue, Orange and White compete independently. The other two factions are computer-controlled. These are fictional game factions; choose your commander separately.'),
'c_playingFaction':('你操作：{{team}}','Your faction: {{team}}'),
'c_savedCampaign':('本機已有競選進度','A local campaign is saved'),
'c_saveSummary':('{{team}} · 第 {{day}} 天 · {{phase}}','{{team}} · Day {{day}} · {{phase}}'),
'c_savedTime':('保存時間：{{time}}','Saved: {{time}}'),
'c_continue':('繼續競選','Continue campaign'),
'c_finished':('已結算','Completed'),
'c_saveNow':('立即存檔','Save now'),'c_saveAndMenu':('存檔並回首頁','Save and return home'),
'c_autoSaved':('進度已存於此瀏覽器；每次成功行動與日夜切換後自動保存。','Progress is saved in this browser, automatically after each successful action and phase change.'),
'c_autoSaveHint':('開始後會自動保存。請使用相同瀏覽器及網址續玩，清除網站資料會移除存檔。','Progress saves automatically once started. Continue using the same browser and address; clearing site data removes the save.'),
'c_saveUnavailable':('本機存檔失敗，可能是瀏覽器禁止儲存或空間不足。仍可遊玩；請稍後按「立即存檔」重試。','Local saving failed: storage may be blocked or full. You can keep playing; try Save now again later.'),
'c_saveInvalid':('存檔內容損壞或不完整，無法安全續玩。原檔已保留；可選擇開始新局。','The save is damaged or incomplete and cannot be resumed safely. It has been preserved; you may start a new campaign.'),
'c_saveIncompatible':('這份存檔與目前版本不相容，無法續玩。原檔已保留；可選擇開始新局。','This save is incompatible with the current version. It has been preserved; you may start a new campaign.'),
'c_overwriteTitle':('開始新一局？','Start a new campaign?'),
'c_overwriteBody':('開始新局會覆寫此瀏覽器唯一的競選存檔。取消後仍可繼續原來的進度。','Starting a new campaign replaces this browser’s single campaign save. Cancel to keep and continue the saved campaign.'),
'c_confirmNew':('開始新局並覆寫','Start and replace save'),
'restartBody':('返回開局設定，重新選擇陣營與主將。已保存的進度仍可續玩，直到你確認開始新局才會覆寫。','Return to setup to choose your faction and commander. The saved campaign remains available until you confirm starting a new campaign.'),
'c_guide10':('開局先選藍、橙或白方，再選虛構主將。預設為將千秋、申博衍、黃若水；各方都有三類兵種，兩個對手每晚輪流先行。主將冷卻均為六天。','Choose Blue, Orange or White, then a fictional commander. Defaults are Jiang, Shen and Huang. Each faction has all three classes; the two opponents alternate who acts first each night. Commander cooldowns are six days.'),
'c_guide13':('民調比例包含三方。第 28 天最後夜間比較三方全市支持點，最高者勝；最高分並列則平手。封關仍只顯示前兩名差距的質性消息。','Poll shares include all three factions. After the final night of day 28, the highest citywide score wins; a tie for first is a draw. During blackout, only qualitative reports about the two front-runners appear.'),
'c_guide14':('每次成功行動與日夜切換後自動保存，也可立即存檔。回首頁或重新整理後選「繼續競選」。存檔限此瀏覽器及網址，清除網站資料會移除；新局需確認覆寫。','Successful actions and phase changes save automatically; Save now is also available. Choose Continue campaign after returning home or reloading. Saves belong to this browser and address and are removed by clearing site data. Replacing a save requires confirmation.'),
}
for i,lang in enumerate(['zh-TW','en']):
 p=ROOT/'src/locales'/f'{lang}.json';d=json.loads(p.read_text(encoding='utf8'));d.update({k:v[i] for k,v in entries.items()});p.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
print(f'Updated {len(entries)} v0.5 bilingual entries.')

exec((ROOT/"design/add_map_readability_locales.py").read_text(encoding="utf8"))
