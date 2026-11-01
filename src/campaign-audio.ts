import {publicAsset} from './public-asset.ts';
import type { MediaEvent } from './campaign-media-event.ts';
import type { Team } from './game/campaign-teams.ts';
export type AudioSettings={enabled:boolean;music:number;effects:number;voice:number};
export const defaultAudio:AudioSettings={enabled:false,music:.28,effects:.6,voice:.65};
const key='capital-media-audio-v1';
export function loadAudioSettings():AudioSettings{try{const x=JSON.parse(localStorage.getItem(key)||'null');if(!x)return {...defaultAudio};return {enabled:false,music:level(x.music,defaultAudio.music),effects:level(x.effects,defaultAudio.effects),voice:level(x.voice,defaultAudio.voice)};}catch{return {...defaultAudio};}}
function level(x:unknown,fallback:number){return typeof x==='number'&&Number.isFinite(x)?Math.max(0,Math.min(1,x)):fallback;}
type Playing={source:AudioBufferSourceNode;gain:GainNode;channel:'music'|'effects'|'voice'};
export class CampaignAudio{
 private context:AudioContext|null=null;
 private master:DynamicsCompressorNode|null=null;
 private cache=new Map<string,Promise<AudioBuffer>>();
 private playing=new Set<Playing>();
 private replacements=new Map<Team,AudioBuffer>();
 private bgm:Playing|null=null;
 private serial=0;private ducked=false;private duckTimer:ReturnType<typeof setTimeout>|undefined;
 settings=loadAudioSettings();
 private onStatus:(key:string)=>void;
 constructor(onStatus:(key:string)=>void){this.onStatus=onStatus;}
 async enable(){try{this.context??=new AudioContext();if(!this.master){this.master=this.context.createDynamicsCompressor();this.master.threshold.value=-5;this.master.knee.value=6;this.master.ratio.value=8;this.master.attack.value=.003;this.master.release.value=.15;this.master.connect(this.context.destination);}await this.context.resume();if(this.context.state!=='running')throw Error();this.settings={...this.settings,enabled:true};this.onStatus('m_audioReady');await this.background();}catch{this.settings.enabled=false;this.onStatus('m_audioFailed');}}
 configure(patch:Partial<AudioSettings>){this.settings={...this.settings,...patch};try{localStorage.setItem(key,JSON.stringify(this.settings));}catch{/* Preferences are optional. */}if(!this.settings.enabled)this.stop();else{for(const p of this.playing)this.volume(p);void this.background();}}
 private volume(p:Playing){if(!this.context)return;const v=this.settings[p.channel]*(p.channel==='music'&&this.ducked ? .22 : 1);p.gain.gain.setTargetAtTime(v,this.context.currentTime,.04);}
 private async buffer(id:string){if(!this.context)throw Error();let task=this.cache.get(id);if(!task){task=fetch(publicAsset(`audio/${id}.mp3`)).then(r=>{if(!r.ok)throw Error();return r.arrayBuffer();}).then(data=>this.context!.decodeAudioData(data));this.cache.set(id,task);task.catch(()=>this.cache.delete(id));}return task;}
 private play(buffer:AudioBuffer,channel:Playing['channel'],loop=false,delay=0,limit=buffer.duration){if(!this.context||!this.settings.enabled||document.hidden)return null;const source=this.context.createBufferSource(),gain=this.context.createGain();source.buffer=buffer;source.loop=loop;source.connect(gain);gain.connect(this.master??this.context.destination);const p={source,gain,channel};this.playing.add(p);this.volume(p);source.onended=()=>{this.playing.delete(p);source.disconnect();gain.disconnect();if(this.bgm===p)this.bgm=null;};source.start(this.context.currentTime+delay);if(!loop){const end=this.context.currentTime+delay+Math.min(limit,buffer.duration);gain.gain.setValueAtTime(this.settings[channel],Math.max(this.context.currentTime+delay,end-.22));gain.gain.linearRampToValueAtTime(0,end);source.stop(end);}return p;}
 private halt(p:Playing){try{p.source.stop();}catch{/* Already ended. */}this.playing.delete(p);if(this.bgm===p)this.bgm=null;}
 stop(){this.serial++;clearTimeout(this.duckTimer);this.ducked=false;for(const p of [...this.playing])this.halt(p);}
 stopEffects(){this.serial++;clearTimeout(this.duckTimer);this.ducked=false;for(const p of [...this.playing])if(p!==this.bgm)this.halt(p);if(this.bgm)this.volume(this.bgm);if(this.settings.enabled)this.onStatus('m_audioReady');}
 async background(){if(!this.context||!this.settings.enabled||!this.settings.music||document.hidden||this.bgm)return;const serial=this.serial;try{const buffer=await this.buffer('bgm');if(serial===this.serial&&!this.bgm)this.bgm=this.play(buffer,'music',true);}catch{this.onStatus('m_audioFailed');}}
 async event(event:MediaEvent){if(!this.settings.enabled||document.hidden)return;this.stopEffects();const serial=this.serial;const ids=event.kind==='stage'?['horn',event.cue]:event.kind==='street'?['crowd','chant']:[event.cue];try{const buffers=await Promise.all(ids.map(id=>id.startsWith('theme-')&&this.replacements.has(event.team)?this.replacements.get(event.team)!:this.buffer(id)));if(serial!==this.serial)return;this.ducked=true;if(this.bgm)this.volume(this.bgm);buffers.forEach((b,i)=>this.play(b,event.kind==='street'&&i===1?'voice':'effects',false,event.kind==='stage'&&i===1 ? .8 : 0,event.kind==='stage'&&i===1?20:b.duration));this.onStatus('m_audioPlaying');this.duckTimer=setTimeout(()=>{this.ducked=false;if(this.bgm)this.volume(this.bgm);this.onStatus('m_audioReady');},event.kind==='stage'?21000:5500);}catch{this.onStatus('m_audioFailed');}}
 async audition(id:string,team?:Team){if(!this.settings.enabled)await this.enable();if(!this.settings.enabled)return;this.stopEffects();if(id==='bgm'){await this.background();return;}const serial=this.serial;try{const buffer=team&&this.replacements.has(team)?this.replacements.get(team)!:await this.buffer(id);if(serial!==this.serial)return;this.ducked=true;if(this.bgm)this.volume(this.bgm);this.play(buffer,id==='chant'?'voice':'effects',false,0,id.startsWith('theme-')?20:buffer.duration);this.onStatus('m_audioPlaying');this.duckTimer=setTimeout(()=>{this.ducked=false;if(this.bgm)this.volume(this.bgm);this.onStatus('m_audioReady');},Math.min(20,buffer.duration)*1000);}catch{this.onStatus('m_audioFailed');}}
 async replace(team:Team,file:File){if(file.size>20*1024*1024)throw Error('size');this.context??=new AudioContext();const buffer=await this.context.decodeAudioData(await file.arrayBuffer());if(buffer.duration<1||buffer.duration>600)throw Error('duration');this.stopEffects();this.replacements.set(team,buffer);return Math.min(buffer.duration,20);}
 clearReplacement(team:Team){this.stopEffects();this.replacements.delete(team);}
 async wake(){if(this.settings.enabled&&!document.hidden&&this.context){try{await this.context.resume();await this.background();}catch{this.onStatus('m_audioFailed');}}}
 dispose(){this.stop();this.master?.disconnect();this.master=null;void this.context?.close();this.context=null;this.cache.clear();this.replacements.clear();}
}
