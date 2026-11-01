"""Deterministic original scores. No campaign recordings, lyrics or melody samples.
Run: python design/audio/build_originals.py (NumPy + ffmpeg, build tools only).
"""
from pathlib import Path
import numpy as np
import subprocess, wave, json, hashlib
ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'public/audio'; OUT.mkdir(parents=True,exist_ok=True)
MASTERS=ROOT/'.tools/audio-masters'; MASTERS.mkdir(parents=True,exist_ok=True)
SR=44100
rng=np.random.default_rng(8082026)
def hz(m): return 440*2**((m-69)/12)
def tone(m,d,kind='lead'):
 t=np.arange(round(SR*d))/SR; f=hz(m); phase=2*np.pi*f*t
 if kind=='bass': s=np.sin(phase)+.18*np.sin(phase*2)
 elif kind=='keys': s=(np.sin(phase)+.4*np.sin(2*phase)+.18*np.sin(3*phase))*np.exp(-t*3)
 elif kind=='pad': s=np.sin(phase)+.25*np.sin(phase*2)+.12*np.sin(phase*3)
 else:
  # Soft harmonic lead, slight vibrato and stereo doubling are added in the mix.
  phase+=.016*np.sin(2*np.pi*5.5*t)
  s=np.sin(phase)+.35*np.sin(2*phase)+.13*np.sin(3*phase)
 env=np.minimum(t/.012,1)*np.minimum((d-t)/.055,1).clip(0,1)
 return s*env
def mix(a,s,start,amp=1,pan=0):
 i=round(start*SR); n=min(len(s),len(a)-i)
 if n<=0:return
 s=s[:n]*amp
 a[i:i+n,0]+=s*np.sqrt((1-pan)/2); a[i:i+n,1]+=s*np.sqrt((1+pan)/2)
def drum(kind):
 d={'kick':.22,'snare':.16,'hat':.045,'crash':.6}[kind];t=np.arange(round(d*SR))/SR
 if kind=='kick':return np.sin(2*np.pi*(48*t+55*.025*(1-np.exp(-t/.025))))*np.exp(-t*24)
 n=rng.normal(0,.5,len(t));n=np.concatenate([[0],np.diff(n)])
 if kind=='snare':return (n*.6+np.sin(2*np.pi*185*t)*.2)*np.exp(-t*28)
 return n*np.exp(-t*(90 if kind=='hat' else 9))*.35
manifest=[]
def save(name,a,desc):
 peak=np.max(np.abs(a)); a=a/max(1,peak/0.88)
 # Gentle limiting, 12ms head fade, 200ms tail; no clipped peaks.
 a=np.tanh(a*1.1)/np.tanh(1.1)*.86
 fade=min(len(a),int(.2*SR));a[-fade:]*=np.linspace(1,0,fade)[:,None];a[:530]*=np.linspace(0,1,530)[:,None]
 wav=MASTERS/f'{name}.wav'
 with wave.open(str(wav),'wb') as w:w.setnchannels(2);w.setsampwidth(2);w.setframerate(SR);w.writeframes((a*32767).astype('<i2').tobytes())
 dst=OUT/f'{name}.mp3'
 subprocess.run(['C:/ffmpeg/bin/ffmpeg.exe','-v','error','-y','-i',str(wav),'-codec:a','libmp3lame','-b:a','160k','-map_metadata','-1',str(dst)],check=True)
 manifest.append(dict(id=name,file=f'/audio/{name}.mp3',durationSeconds=round(len(a)/SR,3),description=desc,provenance='Original procedural composition; no campaign song samples',sha256=hashlib.sha256(dst.read_bytes()).hexdigest(),peak=round(float(np.max(np.abs(a))),4)))
def score(name,root,hook,style):
 beat=60/144; a=np.zeros((SR*20,2))
 # Twelve bars = exactly 20 seconds. Own hooks over common pop harmony.
 progression=[(0,'maj'),(7,'maj'),(9,'min'),(5,'maj')]*3
 for bar,(degree,quality) in enumerate(progression):
  start=bar*4*beat;chord=[root+degree,root+degree+(3 if quality=='min' else 4),root+degree+7]
  for j,note in enumerate(chord):mix(a,tone(note,4*beat,'pad'),start,.07,(-.5,0,.5)[j])
  for step in range(8):
   at=start+step*.5*beat
   mix(a,tone(chord[step%3]+12,.42*beat,'keys'),at,.1,(-.65 if step%2 else .65))
   mix(a,tone(root+degree-12,beat*.42,'bass'),at,.2)
   mix(a,drum('hat'),at,.13,.4)
   if step%2==0:mix(a,drum('kick'),at,.48)
   if step in (2,6):mix(a,drum('snare'),at,.36,-.12)
  phrase=hook[bar%len(hook)]
  for step,note in enumerate(phrase):
   if note is None:continue
   at=start+step*.5*beat
   kind='keys' if style=='piano' else 'lead'
   s=tone(root+12+note,beat*.44,kind)
   mix(a,s,at,.2 if style=='piano' else .15,-.12)
   mix(a,s,at+.115,.045,.5)
  if bar in (0,4,8):mix(a,drum('crash'),start,.18,-.4)
 save(name,a,f'Original 20-second anime-inspired {style} cue, 144 BPM, 12 bars')
score('theme-blue',62,[[0,4,7,9,7,4,2,4],[7,9,11,7,4,2,4,7],[9,7,4,2,0,2,4,7],[5,4,2,4,7,4,2,0]],'heroic pop')
score('theme-green',64,[[7,4,2,0,2,4,9,7],[4,7,11,9,7,4,2,4],[9,11,7,4,7,9,4,2],[5,9,7,4,2,4,2,0]],'ocean electro-pop')
score('theme-white',67,[[0,7,4,2,4,9,7,4],[2,4,7,11,9,7,4,2],[4,9,7,4,2,0,2,4],[5,4,9,7,4,2,7,0]],'piano')
# Cheerful neutral instrumental: no faction melody, a separate 40-second loop.
beat=.5;a=np.zeros((SR*40,2))
for bar in range(20):
 degree=[0,5,7,0][bar%4];base=60+degree;chord=[base,base+4,base+7]
 for step in range(8):
  at=(bar*4+step*.5)*beat
  mix(a,tone(chord[(step+bar)%3]+12,.2,'keys'),at,.15,.35 if step%2 else -.35)
  if step%2==0:mix(a,tone(base-12,.2,'bass'),at,.18);mix(a,drum('kick'),at,.25)
  if step in (2,6):mix(a,drum('snare'),at,.13)
  mix(a,drum('hat'),at,.08,.6)
save('bgm',a,'Original cheerful neutral campaign instrumental, 120 BPM, 40 seconds')
# Anime game SFX; pitched layers are synthesised from scratch.
for name,d in [('horn',1.8),('shield',.9),('signal',1.1),('slash',.55),('skill-jiang',1.6),('skill-shen',1.6),('skill-huang',1.6),('departure',1.3)]:
 a=np.zeros((round(SR*d),2));t=np.arange(len(a))/SR
 if name=='horn':
  for f in [138.59,207.65,277.18]:mix(a,(np.sin(2*np.pi*f*t)+.18*np.sin(4*np.pi*f*t))*np.sin(np.pi*t/d)**.4,0,.13)
 elif name in ('slash','departure'):
  noise=rng.normal(0,.15,len(t))*np.sin(np.pi*t/d)**2
  mix(a,noise,0,.7);mix(a,np.sin(2*np.pi*(150*t+240*t*t))*np.sin(np.pi*t/d)**2,0,.16)
 else:
  notes={'shield':[62,69,74],'signal':[76,81,88],'skill-jiang':[62,66,69,74],'skill-shen':[64,71,76,80],'skill-huang':[67,74,78,83]}[name]
  for j,n in enumerate(notes):mix(a,tone(n,min(.55,d-j*.13),'keys'),j*.13,.27,(-.4+j*.2))
  mix(a,rng.normal(0,.04,len(t))*np.exp(-t*6),0,.4)
 save(name,a,'Original synthesised game sound effect')
# Dense crowd bed: formant-filtered many-voice babble, cheers, claps, no cloned voice.
d=5;a=np.zeros((SR*d,2));t=np.arange(SR*d)/SR
for voice in range(32):
 f=rng.uniform(95,235); syllables=(.45+.55*np.sin(2*np.pi*rng.uniform(2,4)*t+voice)**2)
 env=(.5+.5*np.sin(2*np.pi*.4*t+voice))*syllables
 s=sum(np.sin(2*np.pi*f*h*t+voice)*np.exp(-((f*h-650)/530)**2)/h for h in range(1,16))
 mix(a,s*env,0,.022,rng.uniform(-.9,.9))
for at in np.arange(.15,4.8,.21):mix(a,drum('snare'),float(at),.07,float(rng.uniform(-.9,.9)))
save('crowd',a,'Original synthesised crowd babble and claps, not a field recording')
(OUT/'manifest.json').write_text(json.dumps({'version':1,'created':'2026-11-01','license':'Project-original audio. External campaign recordings are not included.','tracks':manifest},ensure_ascii=False,indent=2)+'\n','utf8')
print(f'Built {len(manifest)} original files in {OUT}')
