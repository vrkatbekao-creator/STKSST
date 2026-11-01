import test from 'node:test';
import assert from 'node:assert/strict';
import {createCampaignStore} from '../src/game/campaign-store.ts';
import {SAVE_KEY,SAVE_SLOTS,saveKey,readSave,writeSave,encodeSave} from '../src/game/campaign-save.ts';
import {initialCampaign,endCampaignPhase,intelligence} from '../src/game/campaign.ts';
import {cells} from '../src/game/campaign-map.ts';
const memory=()=>{const data=new Map(),writes=[];return {data,writes,getItem:k=>data.get(k)??null,setItem:(k,v)=>{writes.push(k);data.set(k,v);}};};
const session=g=>({game:g,selected:`${g.playerTeam}1`,districtId:cells.get(g.units.find(u=>u.id===`${g.playerTeam}1`).cellId).districtId,view:'street'});
test('legacy bytes appear in slot one without migration writes or new RNG',()=>{
 const storage=memory(),old=JSON.stringify(encodeSave(session(initialCampaign(555,'white'))));storage.data.set(SAVE_KEY,old);
 const store=createCampaignStore(storage);assert.equal(storage.writes.length,0);assert.equal(store.getState().slots.length,3);assert.equal(store.getState().slots[0].campaign.team,'white');assert.ok(store.getState().slots.slice(1).every(s=>!s.exists));store.getState().resume();assert.deepEqual(store.getState().game,JSON.parse(old).session.game);assert.equal(storage.data.get(SAVE_KEY),old);assert.equal(storage.writes.length,0);
});
test('three independent factions autosave, reload and resume without modifying their neighbours',()=>{
 const storage=memory(),store=createCampaignStore(storage),snapshots=[];
 for(const [index,team] of ['blue','green','white'].entries()){
  const slot=index+1;store.getState().chooseSlot(slot);store.getState().faction(team);store.getState().start();store.getState().dispatch({type:'rest',unitId:`${team}1`});store.getState().end();store.getState().menu();snapshots.push(storage.data.get(saveKey(slot)));
  snapshots.forEach((raw,i)=>assert.equal(storage.data.get(saveKey(i+1)),raw));
 }
 const loaded=createCampaignStore(storage);for(const slot of SAVE_SLOTS){loaded.getState().chooseSlot(slot);const expected=readSave(storage,slot).save.session;loaded.getState().resume();assert.equal(loaded.getState().saveSlot,slot);assert.deepEqual(loaded.getState().game,expected.game);assert.equal(loaded.getState().view,expected.view);loaded.getState().reset();}
 assert.deepEqual([...storage.data.keys()].sort(),SAVE_SLOTS.map(saveKey).sort());
});
test('occupied slots require explicit confirmation and in-play slot changes are rejected',()=>{
 const storage=memory(),store=createCampaignStore(storage);store.getState().start();store.getState().dispatch({type:'rest',unitId:'blue1'});const old=storage.data.get(SAVE_KEY);store.getState().reset();store.getState().faction('white');store.getState().start();assert.equal(store.getState().started,false);assert.equal(store.getState().error,'s_confirmOverwrite');assert.equal(storage.data.get(SAVE_KEY),old);
 store.getState().chooseSlot(2);assert.equal(storage.data.get(SAVE_KEY),old);store.getState().start();store.getState().chooseSlot(3);assert.equal(store.getState().saveSlot,2);store.getState().reset();store.getState().chooseSlot(1);store.getState().start(true);assert.equal(readSave(storage,1).save.session.game.playerTeam,'white');assert.ok(readSave(storage,2).save);assert.equal(readSave(storage,3).exists,false);
});
test('corrupt and empty slot files remain untouched while another slot remains playable',()=>{
 const storage=memory();storage.data.set(saveKey(1),'{broken');storage.data.set(saveKey(2),'');writeSave(storage,session(initialCampaign()),3);const before1=storage.data.get(saveKey(1)),before2=storage.data.get(saveKey(2));const store=createCampaignStore(storage);
 assert.equal(store.getState().slots[0].error,'c_saveInvalid');assert.equal(store.getState().slots[1].exists,true);store.getState().chooseSlot(2);store.getState().start();assert.equal(store.getState().started,false);store.getState().chooseSlot(3);store.getState().resume();assert.equal(store.getState().started,true);assert.equal(storage.data.get(saveKey(1)),before1);assert.equal(storage.data.get(saveKey(2)),before2);
});
test('quota failures preserve all three previous files and prevent an unsaved return home',()=>{
 const storage=memory();for(const slot of SAVE_SLOTS)writeSave(storage,session(initialCampaign(slot)),slot);const before=new Map(storage.data);const store=createCampaignStore(storage);store.getState().chooseSlot(2);store.getState().resume();storage.setItem=()=>{throw Error('quota');};store.getState().dispatch({type:'rest',unitId:'blue1'});assert.equal(store.getState().game.actions,1);assert.equal(store.getState().saveError,'c_saveUnavailable');store.getState().menu();assert.equal(store.getState().started,true);assert.deepEqual(storage.data,before);
});
test('invalid slot IDs cannot address or overwrite an existing slot',()=>{
 const storage=memory(),store=createCampaignStore(storage);store.getState().chooseSlot(4);assert.equal(store.getState().saveSlot,1);assert.throws(()=>saveKey(4));assert.equal(writeSave(storage,session(initialCampaign()),0).error,'c_saveUnavailable');assert.equal(storage.data.size,0);
});
test('slot three resumes blackout state exactly without publishing numbers or repeating settlement',()=>{
 let game=initialCampaign(8,'white');while(game.day<15)game=endCampaignPhase(game);const storage=memory();writeSave(storage,session(game),3);const store=createCampaignStore(storage);store.getState().chooseSlot(3);const writes=storage.writes.length;store.getState().resume();assert.deepEqual(store.getState().game,game);assert.equal(storage.writes.length,writes);assert.equal(intelligence(store.getState().game).kind,'rumor');assert.equal('support' in intelligence(store.getState().game),false);assert.equal(store.getState().game.history.length,14);
});
