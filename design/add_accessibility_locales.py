from pathlib import Path
import json
strings={
'zh-TW':{
 'a_settings':'無障礙與顯示','a_preferencesHelp':'只調整這個瀏覽器的操作與顯示，不改日期、AP、支持度或存檔進度。',
 'a_contrast':'提高文字對比','a_contrastHelp':'使用黑底白字與清楚外框；陣營名稱及兵種文字仍會保留。',
 'a_largeText':'放大閱讀字級','a_largeTextHelp':'放大說明、選單與按鈕文字；可搭配瀏覽器縮放。',
 'a_vectorMap':'相容地圖','a_vectorMapHelp':'改用向量圖顯示，降低繪圖負擔。移動、活動與道路規則相同。',
 'a_reduceMotion':'減少動態演出','a_reduceMotionHelp':'保留靜態畫面與行動紀錄，停用介面動畫；聲音仍可獨立調整。',
 'a_skipLinks':'快速跳至','a_skipMain':'跳至主要內容','a_skipTeam':'跳至競選小隊','a_skipActions':'跳至現場行動','a_skipLocations':'跳至活動清單',
 'a_turnStatus':'第 {{day}} 天・{{phase}}。{{unit}} 剩餘 {{ap}} AP。',
 'a_mapKeyboard':'鍵盤移動預覽','a_mapKeyboardHelp':'用選單與方向鍵選擇可達格，再按預覽。預覽不扣 AP；前往現場行動確認後才移動。Tab 可離開地圖，或直接跳至活動清單。',
 'a_chooseCell':'選擇可達六角格','a_noReachable':'目前沒有可達格','a_currentCell':'隊員目前位置','a_previewCell':'預覽選定格路線','a_toConfirm':'前往現場行動確認','a_vectorMapActive':'相容地圖已啟用；移動與活動規則不變。',
 'a_unsupported':'這個瀏覽器缺少必要功能。請更新瀏覽器，並以遊戲啟動器提供的本機網址開啟。原有存檔會保留。',
 'a_feature_fetch':'本機資料讀取','a_feature_gzip':'壓縮地圖解碼','a_feature_integrity':'安全資料完整性檢查（需本機或 HTTPS 網址）','a_feature_dialog':'鍵盤可操作的對話框','a_feature_resize':'自適應版面配置'},
'en':{
 'a_settings':'Accessibility & display','a_preferencesHelp':'These browser preferences change presentation only. They do not change the day, AP, support or saved progress.',
 'a_contrast':'Higher text contrast','a_contrastHelp':'Use white text on black with clear borders. Faction names and role labels remain visible.',
 'a_largeText':'Larger reading text','a_largeTextHelp':'Enlarge descriptions, menus and buttons. Browser zoom can be used as well.',
 'a_vectorMap':'Compatible map','a_vectorMapHelp':'Use vector rendering to reduce graphics demands. Movement, activities and routing rules stay the same.',
 'a_reduceMotion':'Reduce motion','a_reduceMotionHelp':'Keep static scenes and action logs while stopping interface animations. Audio is controlled separately.',
 'a_skipLinks':'Skip to','a_skipMain':'Skip to main content','a_skipTeam':'Skip to campaign team','a_skipActions':'Skip to field actions','a_skipLocations':'Skip to activity list',
 'a_turnStatus':'Day {{day}}, {{phase}}. {{unit}} has {{ap}} AP remaining.',
 'a_mapKeyboard':'Keyboard movement preview','a_mapKeyboardHelp':'Use the menu and arrow keys to choose a reachable hex, then preview. Previewing costs no AP. Move to field actions to confirm movement. Tab leaves the map; the activity list is another route.',
 'a_chooseCell':'Choose a reachable hex','a_noReachable':'No reachable hexes are available','a_currentCell':'Current member position','a_previewCell':'Preview selected hex route','a_toConfirm':'Go to field actions to confirm','a_vectorMapActive':'Compatible map enabled. Movement and activity rules are unchanged.',
 'a_unsupported':'This browser is missing required features. Update your browser and open the local address provided by the game launcher. Your existing save is preserved.',
 'a_feature_fetch':'Local data loading','a_feature_gzip':'Compressed map decoding','a_feature_integrity':'Secure data integrity checks (requires localhost or HTTPS)','a_feature_dialog':'Keyboard-accessible dialogs','a_feature_resize':'Responsive layout'}}
for lang,values in strings.items():
 p=Path(f'src/locales/{lang}.json');data=json.loads(p.read_text(encoding='utf-8'));data.update(values);p.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
