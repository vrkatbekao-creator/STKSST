import test from 'node:test';
import assert from 'node:assert/strict';
import { CampaignAudio,loadAudioSettings } from '../src/campaign-audio.ts';
test('audio is gesture-gated, bounded, interruptible, hidden-tab safe and imports stay in memory',async()=>{
 const original={AudioContext:globalThis.AudioContext,fetch:globalThis.fetch,document:globalThis.document,localStorage:globalThis.localStorage};
 const sources=[],writes=[],statuses=[];let hidden=false;
 const parameter=()=>({value:0,setTargetAtTime(){},setValueAtTime(){},linearRampToValueAtTime(){}});
 class Context{
  state='running';currentTime=10;destination={};
  resume(){return Promise.resolve();}close(){return Promise.resolve();}
  decodeAudioData(){return Promise.resolve({duration:25});}
  createDynamicsCompressor(){return {threshold:parameter(),knee:parameter(),ratio:parameter(),attack:parameter(),release:parameter(),connect(){},disconnect(){}};}
  createGain(){return {gain:parameter(),connect(){},disconnect(){}};}
  createBufferSource(){const s={loop:false,stops:[],connect(){},disconnect(){},start(at){this.startAt=at;},stop(at=10){this.stops.push(at);}};sources.push(s);return s;}
 }
 globalThis.AudioContext=Context;globalThis.document={get hidden(){return hidden;}};globalThis.localStorage={getItem:()=>null,setItem:(...v)=>writes.push(v)};
 globalThis.fetch=async()=>({ok:true,arrayBuffer:async()=>new ArrayBuffer(8)});
 const audio=new CampaignAudio(x=>statuses.push(x));
 try{
  await audio.event({kind:'street',cue:'street',team:'blue',commander:'jiang',action:'canvass'});assert.equal(sources.length,0);
  await audio.enable();assert.equal(sources.length,1);assert.equal(sources[0].loop,true);
  await audio.event({kind:'stage',cue:'theme-blue',team:'blue',commander:'jiang',action:'stageEvent'});
  assert.equal(sources.length,3);assert.equal(sources[2].startAt,10.8);assert.equal(sources[2].stops[0],30.8);assert.equal(statuses.at(-1),'m_audioPlaying');
  audio.stopEffects();assert.equal(sources[1].stops.at(-1),10);assert.equal(sources[2].stops.at(-1),10);assert.equal(sources[0].stops.length,0);
  hidden=true;await audio.audition('shield');assert.equal(sources.length,3);hidden=false;
  const file={size:500,arrayBuffer:async()=>new ArrayBuffer(8)};assert.equal(await audio.replace('white',file),20);assert.equal(writes.length,0);
  await audio.audition('theme-white','white');assert.equal(sources.at(-1).stops[0],30);
  await assert.rejects(audio.replace('white',{size:21*1024*1024}));
  audio.configure({enabled:false});assert.ok(sources.every(s=>s.stops.at(-1)===10));assert.equal(writes.length,1);
  assert.equal(loadAudioSettings().enabled,false);
 }finally{audio.dispose();Object.assign(globalThis,original);}
});
test('stopping pending loading prevents a late background source from starting',async()=>{
 const original={AudioContext:globalThis.AudioContext,fetch:globalThis.fetch,document:globalThis.document,localStorage:globalThis.localStorage};let resolve,started=0;
 globalThis.document={hidden:false};globalThis.localStorage={getItem:()=>null};
 globalThis.AudioContext=class{
  state='running';currentTime=0;destination={};resume(){return Promise.resolve();}close(){return Promise.resolve();}
  createDynamicsCompressor(){const p={value:0};return {threshold:p,knee:p,ratio:p,attack:p,release:p,connect(){},disconnect(){}};}
  decodeAudioData(){return Promise.resolve({duration:40});}createBufferSource(){started++;}
 };
 globalThis.fetch=()=>new Promise(r=>resolve=r);const audio=new CampaignAudio(()=>{});
 try{const pending=audio.enable();await new Promise(r=>setImmediate(r));audio.stop();resolve({ok:true,arrayBuffer:async()=>new ArrayBuffer(8)});await pending;assert.equal(started,0);}finally{audio.dispose();Object.assign(globalThis,original);}
});
