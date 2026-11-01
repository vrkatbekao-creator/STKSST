"""Decode shipped MP3s; verify duration, finite samples, headroom and manifest hashes."""
from pathlib import Path
import subprocess,json,hashlib
import numpy as np
ROOT=Path(__file__).resolve().parents[2]
data=json.loads((ROOT/'public/audio/manifest.json').read_text('utf8'));rows=[]
for item in data['tracks']:
 p=ROOT/'public'/item['file'].lstrip('/');assert hashlib.sha256(p.read_bytes()).hexdigest()==item['sha256']
 raw=subprocess.run(['C:/ffmpeg/bin/ffmpeg.exe','-v','error','-i',str(p),'-f','f32le','-ac','2','-ar','44100','pipe:1'],capture_output=True,check=True).stdout
 a=np.frombuffer(raw,dtype='<f4');assert np.isfinite(a).all();duration=len(a)/2/44100;peak=float(np.max(np.abs(a)));rms=float(np.sqrt(np.mean(a*a)));assert peak<1 and rms>.001
 if item['id'].startswith('theme-'):assert duration==20
 rows.append({'id':item['id'],'decodedSeconds':round(duration,6),'peakDbFS':round(float(20*np.log10(peak)),2),'rmsDbFS':round(float(20*np.log10(rms)),2),'sha256Matches':True,'finiteSamples':True})
out=ROOT/'artifacts/media-audio-audit.json';out.write_text(json.dumps({'date':'2026-11-01','timezone':'Europe/Brussels','checks':'Technical decode/levels only; not a subjective listening review','tracks':rows},indent=2)+'\n','utf8');print(f'Audited {len(rows)} files; all three decoded themes are exactly 20 seconds.')
