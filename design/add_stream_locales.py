import json
from pathlib import Path
strings={
 'zh-TW':{'p_bootLoading':'正在準備競選地圖。首次啟動請稍候。','p_bootFailed':'地圖暫時無法載入。請確認遊戲伺服器仍在運作，再重試；原有存檔會保留。','p_retry':'重新載入'},
 'en':{'p_bootLoading':'Preparing your campaign map. The first launch may take a moment.','p_bootFailed':'The map could not load. Check that the game server is still running, then retry. Your existing save is preserved.','p_retry':'Retry loading'}}
for lang,values in strings.items():
 p=Path(f'src/locales/{lang}.json');data=json.loads(p.read_text(encoding='utf-8'));data.update(values);p.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
