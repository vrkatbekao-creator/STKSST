"""Build-only generic TTS crowd chant. Requires edge-tts==7.3.1 in .tools/audio-libs.
Only the printed chant text is sent to the voice service, never game/save/user data.
No politician's voice is cloned. Mandarin Taiwanese voices, not a native Hokkien recording.
"""
from pathlib import Path
import sys,asyncio,subprocess,json,hashlib
ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT/'.tools/audio-libs'))
import edge_tts
async def main():
 for i,voice in enumerate(['zh-TW-YunJheNeural','zh-TW-HsiaoChenNeural']):
  task=edge_tts.Communicate('凍蒜！凍蒜！加油！凍蒜！',voice,rate='+18%',pitch='+3Hz',connect_timeout=8,receive_timeout=12)
  await asyncio.wait_for(task.save(str(ROOT/f'.tools/chant-{i}.mp3')),timeout=25)
asyncio.run(main())
dst=ROOT/'public/audio/chant.mp3'
subprocess.run(['C:/ffmpeg/bin/ffmpeg.exe','-v','error','-y','-i',str(ROOT/'.tools/chant-0.mp3'),'-i',str(ROOT/'.tools/chant-1.mp3'),'-filter_complex','[0:a]volume=0.7,apad,atrim=0:5[a];[1:a]volume=0.55,adelay=80:all=1,apad,atrim=0:5[b];[a][b]amix=inputs=2:normalize=0,alimiter=limit=0.85,afade=t=out:st=4.7:d=0.3','-ar','44100','-ac','2','-b:a','160k',str(dst)],check=True)
p=ROOT/'public/audio/manifest.json';data=json.loads(p.read_text('utf8'));data['tracks']=[t for t in data['tracks'] if t['id']!='chant'];data['tracks'].append({'id':'chant','file':'/audio/chant.mp3','durationSeconds':5,'description':'Generic synthetic Mandarin cheer: 凍蒜、凍蒜、加油、凍蒜. Not native Hokkien or a field recording.','provenance':'Edge Read Aloud via edge-tts 7.3.1, zh-TW-YunJheNeural and zh-TW-HsiaoChenNeural; no cloned voice','sha256':hashlib.sha256(dst.read_bytes()).hexdigest()});p.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n','utf8')
print('Built generic synthetic chant.')
