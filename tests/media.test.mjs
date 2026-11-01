import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { mediaEvent,previewEvent } from '../src/campaign-media-event.ts';
import { initialCampaign,campaignCommand,endCampaignPhase,chooseCommander } from '../src/game/campaign.ts';
import { createCampaignStore } from '../src/game/campaign-store.ts';
const session=(game,started=true)=>({game,started});
test('media follows committed player actions and never fires on failures, load, selection or phase settlement',()=>{
 const memory=new Map(),store=createCampaignStore({getItem:k=>memory.get(k)??null,setItem:(k,v)=>memory.set(k,v)});let effects=[];
 const off=store.subscribe((next,previous)=>{const e=mediaEvent(previous,next);if(e)effects.push(e);});
 store.getState().start();store.getState().focus(store.getState().districtId);store.getState().dispatch({type:'skill',unitId:'green1'});assert.equal(effects.length,0);
 store.getState().dispatch({type:'skill',unitId:'blue1'});assert.equal(effects.length,1);assert.equal(effects[0].cue,'skill-jiang');
 store.getState().save();store.getState().menu();store.getState().resume();store.getState().priority('invalid');store.getState().end();store.getState().end();assert.equal(effects.length,1);off();
});
test('media does not read or expose support, and follows commander choice independently from faction',()=>{
 let g=chooseCommander(initialCampaign(8,'white'),'shen');const b=campaignCommand(g,{type:'skill',unitId:'white1'}).game;
 Object.defineProperty(g,'support',{get(){throw Error('support must remain private');}});Object.defineProperty(b,'support',{get(){throw Error('support must remain private');}});
 const e=mediaEvent(session(g),session(b));assert.deepEqual(e,{kind:'skill',team:'white',commander:'shen',action:'skill',cue:'skill-shen'});assert.equal('support' in e,false);
 assert.equal(mediaEvent(session(g,false),session(b)),null);
});
test('blackout and final result transitions do not become cinematics',()=>{
 const g=initialCampaign(12);g.day=15;const b=campaignCommand(g,{type:'brace',unitId:'blue1'}).game;
 assert.equal(mediaEvent(session(g),session(b)).kind,'skill');assert.equal(mediaEvent(session(g),session({...b,day:16})),null);assert.equal(mediaEvent(session(g),session({...b,result:'blue'})),null);
 assert.equal(mediaEvent(session(g),session(endCampaignPhase(g))),null);
});
test('all preview scenes contain only presentation metadata',()=>{
 for(const id of ['jiang','shen','huang'])for(const kind of ['street','stage','skill','departure']){
  const e=previewEvent(kind,id,'green');assert.deepEqual(Object.keys(e).sort(),['action','commander','cue','kind','team']);assert.equal(e.kind,kind);
 }
});
test('ordinary members use their own cartoon role in the cut-in',()=>{
 const g=initialCampaign(8);const b=campaignCommand(g,{type:'brace',unitId:'green2'},'green').game;
 const e=mediaEvent(session({...g,playerTeam:'green'}),session({...b,playerTeam:'green'}));
 assert.equal(e.actorRole,'heavy');assert.equal(e.action,'brace');assert.equal(e.cue,'shield');
});
test('bundled media hashes match manifest and faction themes have exact 20-second composition masters',()=>{
 const manifest=JSON.parse(readFileSync(new URL('../public/audio/manifest.json',import.meta.url)));
 assert.equal(manifest.tracks.filter(t=>t.id.startsWith('theme-')).length,3);
 for(const track of manifest.tracks){const data=readFileSync(new URL(`../public${track.file}`,import.meta.url));assert.equal(createHash('sha256').update(data).digest('hex'),track.sha256,track.id);if(track.id.startsWith('theme-'))assert.equal(track.durationSeconds,20);assert.ok(data.length>1000);}
 assert.ok(manifest.tracks.some(t=>t.id==='chant'));
});
