"""Apply the player/build documentation boundary after historical copy generators.

This changes presentation resources only. The original copy is archived outside
the runtime bundle for build documentation; never re-add it to the player guide.
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
removed = '''c_mapAttribution c_roadMapAttribution c_sourceBoundaries c_sourceRivers c_sourceBridges
c_pollNote c_rumorNote c_journalNote c_mapReadingHelp c_roadMapReading
c_realRoadHelp c_streetRoadHelp c_roadHexHelp c_roadNameFallback c_roadSnapshot c_assumedWalk
c_landscapeDates c_surfaceModelNote c_surfaceDatum c_buildingCoverage c_buildingSourceId
c_buildingCourtyards c_buildingSourceNote c_surfaceSourceNote c_geoSources c_geoLicence
c_sceneEdition c_sceneSchematic
m_reference_jiang m_reference_shen m_reference_huang m_vehicleNote_jiang m_vehicleNote_shen m_vehicleNote_huang
m_previewNote m_voiceNote m_credits m_sources m_sourceOcean m_sourceBlue m_sourceOrange m_sourceWhite
d_fictional c_progressHelp c_planBudgetHelp g_explain c_edition c_trailHelp'''.split()
removed += [f'c_sceneBody_{n}' for n in range(6300100,6301201,100)]
copy = {
 'p_credits': ('圖資署名','Map credits'),
 'p_mapDisplay': ('地圖顯示','Map display'),
 'c_footer': ('選戰騎士團 · 首都篇 · v0.15.0','Campaign Knights · Capital Edition · v0.15.0'),
 'c_gameValues': ('角色與事件皆為虛構','Fictional characters and events'),
 'c_threeSides': ('選擇你的陣營，與另外兩方競逐台北。','Choose your faction and compete with two rivals for Taipei.'),
 'c_streetProfile': ('街道地圖','Street map'),
 'c_legacyProfile': ('經典地圖','Classic map'),
 'c_autoSaved': ('已自動存檔。','Progress saved.'),
 'c_autoSaveHint': ('開始競選後自動存檔。','Progress saves automatically once the campaign begins.'),
 'c_realRoads': ('街道與路名','Streets & names'),
 'c_mapStamp': ('台北市 · 12 行政區','Taipei · 12 districts'),
 'c_mapCaption': ('挑選行政區，部署你的下一步。','Choose a district and plan your next move.'),
 'c_noTodayWalk': ('目前隊員今日尚未步行。','This member has not walked today.'),
 'c_todayWalkCount': ('今日步行 {{count}} 段；編號表示順序。','{{count}} walks today; numbers show their order.'),
 'c_showStyleScenery': ('街景插畫','Scenery artwork'),
 'c_roadAPHelp': ('移動 AP 依路線加權距離每 100 公尺向上取整，至少 1 AP；階梯、雨天及未應變的施工增加成本。以預覽為準。','Movement AP rounds weighted route distance up per 100 metres, with a minimum of 1 AP. Stairs, rain and unaddressed construction increase the cost. Check the preview.'),
 'c_sourceLandscape': ('地景圖層','Landscape layers'),
 'c_surfaceAtAnchor': ('地表參考高度','Surface reference height'),
 'c_surfaceProfile': ('沿途地表','Surface along route'),
 'c_surfaceProfileHelp': ('地景參考，不影響移動成本。','For landscape reference; does not affect movement cost.'),
 'c_surfaceProfileGaps': ('缺少資料處留白；不影響移動成本。','Gaps indicate missing data; movement cost is unaffected.'),
 'c_buildingsInCell': ('本格建物（{{count}} 棟）','Buildings in this hex ({{count}})'),
 'c_buildingsInCell_one': ('本格建物（{{count}} 棟）','Buildings in this hex ({{count}})'),
 'c_buildingsInCell_other': ('本格建物（{{count}} 棟）','Buildings in this hex ({{count}})'),
 'c_buildingHeight': ('高度','Height'),
 'c_buildingLevels': ('樓層','Floors'),
 'c_buildingUnknown': ('未標示','Not listed'),
 'c_buildingsLimited': ('顯示前 12 棟。','Showing the first 12 buildings.'),
 'c_buildingsLoading': ('正在載入建物…','Loading buildings…'),
 'c_surfaceLoading': ('正在載入地景…','Loading landscape…'),
 'a_preferencesHelp': ('依你的閱讀與操作需求調整顯示。','Adjust the display to suit your reading and control preferences.'),
 'a_vectorMapHelp': ('畫面較慢時使用，保留地圖操作。','Use when drawing is slow; map controls remain available.'),
 'a_vectorMapActive': ('相容地圖已啟用。','Compatibility map enabled.'),
 'a_mapKeyboardHelp': ('選擇可達格並預覽，再到現場行動確認。Tab 可離開選單。','Choose a reachable hex and preview, then confirm in Field actions. Tab leaves the selector.'),
 'm_open': ('影音設定','Audio & visuals'),
 'm_intro': ('調整音量與演出，或試聽各陣營主題曲。','Adjust sound and visuals, or listen to the faction themes.'),
 'm_original': ('內建原創曲','Built-in original'),
 'm_importNote': ('音檔上限 20 MB，長度 1–600 秒；播放前 20 秒。重新整理後需重新選檔。','Audio files: up to 20 MB, 1–600 seconds long. The first 20 seconds play; select the file again after reloading.'),
 'm_trackNote_blue': ('明亮旋律與熱血節拍。','Bright melodies and energetic beats.'),
 'm_trackNote_green': ('波浪琶音與輕快電氣流行。','Flowing arpeggios and upbeat electropop.'),
 'm_trackNote_white': ('鋼琴與清亮合成器。','Piano and bright synths.'),
}
guide = [
 ('競選共 28 天，日夜共用 AP。最後一夜結算後，全市支持點最高的陣營獲勝；並列則平手。','Campaign for 28 days, sharing AP between day and night. After the final night, the highest citywide support wins; equal leaders draw.'),
 ('先選陣營與主將，再展開競選。其他兩方會在每晚行動。','Choose a faction and commander before starting. The other two factions act each night.'),
 ('選擇隊員與目的格，查看金色路線及 AP 成本，再確認移動。雨天、地形與事件可能增加成本。','Select a member and destination, review the gold route and AP cost, then confirm. Rain, terrain and events may increase the cost.'),
 ('掃街與拜訪通常花 2 AP、1 物資。同一活動點每天最多兩次，第二次效果較少。','Outreach and visits normally cost 2 AP and 1 material. Each location allows two visits per day, with a smaller second reward.'),
 ('疲勞會降低隔日 AP。休整可恢復動員力、士氣與健康；留意隊員狀態。','Fatigue reduces next-day AP. Rest restores mobilization, morale and health; watch your team’s condition.'),
 ('跨區接駁每人每日一次，花 6 AP、4 物資並增加疲勞。在地區選單選好目的區再出發。','Each member can transfer districts once daily for 6 AP and 4 materials, gaining fatigue. Choose the destination district before departing.'),
 ('設立治疏嶼或恰恰肥皂箱，完工後派駐志工並主動辦場。每座舞台每日一場。','Build 治疏嶼 or Cha-Cha Soapbox, assign a volunteer after completion, then host an event. Each stage allows one event per day.'),
 ('Wonder 加成需要穩定控制、隊員駐守及當日在該區活動。可調整優先順序，每天最多結算三個。','Wonder bonuses require uncontested control, a guarding member and activity in the district that day. Set priorities; at most three pay out daily.'),
 ('鐵票樁腳剋鍵盤側翼、側翼剋狂熱小草、小草剋樁腳。動員力耗盡的隊員翌日返回基地。','Heavy beats ranged, ranged beats scout, and scout beats heavy. Exhausted members return to base the next day.'),
 ('重裝可駐守、遠程可範圍宣講、刺客可繞背。技能先查看成本、範圍與冷卻，再選擇目標。','Heavy units can guard, ranged units affect an area, and scouts can flank. Check costs, range and cooldowns before choosing a target.'),
 ('準備活動議題，參加政見發表、辯論或舞台問答；逐題選擇回答，留意追問與資源成本。','Prepare topics for forums, debates and stage Q&A. Choose each answer and watch for follow-ups and resource costs.'),
 ('奇數日可能出現十月驚奇。查看當日影響，再選擇應變或繼續原有行程。','October surprises may occur on odd days. Review their effects, then respond or continue your plans.'),
 ('有效行動可獲得獨立經驗，每人每日最多 8 點；移動與休整不給經驗，升級不會補滿 AP。','Effective actions earn separate XP, capped at 8 per member daily. Movement and rest grant none; leveling does not refill AP.'),
 ('每隊最多七人，可招募醫護、動員或後勤角色。新隊員當日沒有 AP，翌晨開始行動。','Each faction can have seven members, including medic, organizer and logistics helpers. Recruits receive their first AP the next morning.'),
 ('輔助角色可在兩格內支援健康、士氣或 AP；每位受援者每日接受一次。擴編也會增加補給負擔。','Helpers support health, morale or AP within two hexes; each recipient can receive support once daily. Larger teams also use more supplies.'),
 ('足跡代表走過，勾選代表已辦活動；隔天仍保留累計紀錄。青色箭線與編號顯示今日步行順序。','Footprints mark visited hexes; checks mark completed activities. Cumulative marks persist. Cyan arrows and numbers show today’s walking order.'),
 ('首頁可選三個存檔，各自保存進度；遊玩中自動保存至目前槽位，也可立即存檔。以相同瀏覽器與網址續玩；清除網站資料會移除存檔。','Choose one of three save slots on the home screen. Play saves to the active slot automatically, or save manually. Resume in the same browser and address; clearing site data removes saves.'),
 ('第 2–14 天逢偶數日公布民調；第 15–28 天封關，只提供小道消息。最後一夜後才揭露結果與歷史數字。','Polls appear on even days from day 2 to 14. Days 15–28 provide rumors only. Results and historical figures unlock after the final night.'),
 ('可展開鍵盤移動預覽，從選單選格；Tab 切換控制，Enter 或空白鍵啟動，Escape 關閉對話框。','Expand Keyboard movement preview to choose a hex. Tab moves between controls, Enter or Space activates them, and Escape closes dialogs.'),
 ('影音設定可開啟聲音、試聽曲目與調整演出；無障礙與顯示可放大文字、提高對比或減少動態。','Audio & visuals enables sound, track previews and presentation settings. Accessibility & display offers larger text, contrast and reduced motion.'),
]
copy.update({f'c_guide{i}': pair for i,pair in enumerate(guide,1)})
archive_path = ROOT/'design/build-copy-archive.json'
archive = json.loads(archive_path.read_text(encoding='utf-8')) if archive_path.exists() else {}
for index,language in enumerate(['zh-TW','en']):
 path=ROOT/f'src/locales/{language}.json'
 data=json.loads(path.read_text(encoding='utf-8'))
 original=archive.setdefault(language,{})
 for key in removed+list(copy):
  if key in data and key not in original:original[key]=data[key]
 for key in removed:data.pop(key,None)
 for key,pair in copy.items():data[key]=pair[index]
 path.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
archive_path.write_text(json.dumps(archive,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
