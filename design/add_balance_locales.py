from pathlib import Path
import json
ROOT=Path(__file__).resolve().parents[1]
entries={'c_edition':('平衡調整・相容性驗證 · v0.11.0','Balance pass · compatibility checks · v0.11.0'),'c_footer':('選戰騎士團 · 首都篇 · v0.11.0','Campaign Knights · Capital Chapter · v0.11.0')}
for i,lang in enumerate(['zh-TW','en']):
 p=ROOT/'src/locales'/f'{lang}.json';d=json.loads(p.read_text('utf8'));d.update({k:v[i] for k,v in entries.items()});p.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n','utf8')
print('Updated balance version labels.')
