import test from 'node:test';
import assert from 'node:assert/strict';
import { initialCampaign,campaignCommand,endCampaignPhase,intelligence,nodeOwner,totals,campaignOutcome,rumorBand,splashTargets } from '../src/game/campaign.ts';
import { teams } from '../src/game/campaign-teams.ts';
import { districts,cells,nodes } from '../src/game/campaign-map.ts';
import { createCampaignStore } from '../src/game/campaign-store.ts';
import { SAVE_KEY,encodeSave,decodeSave,validSession,readSave,writeSave } from '../src/game/campaign-save.ts';
const session=game=>({game,selected:`${game.playerTeam}1`,districtId:cells.get(game.units.find(u=>u.id===`${game.playerTeam}1`).cellId).districtId,view:'street'});
const memory=()=>{const data=new Map();return {data,getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)};};
test('three factions have independent rosters, resources, commanders and nine distinct starts',()=>{
 const g=initialCampaign(9);assert.equal(g.units.length,9);assert.equal(new Set(g.units.map(u=>u.cellId)).size,9);
 assert.deepEqual(g.commanders,{blue:'jiang',green:'shen',white:'huang'});
 for(const t of teams){assert.equal(g.units.filter(u=>u.team===t).length,3);assert.equal(g.resources[t].materials,36);assert.equal(totals(g.support)[t],1200);}
 assert.notEqual(g.resources.blue,g.resources.white);assert.notEqual(g.activity[districts[0].id].blue,g.activity[districts[0].id].white);
});
test('each selected faction can act, owns its costs and rejects foreign units',()=>{
 for(const team of teams){const g=initialCampaign(5,team),unitId=`${team}1`;const out=campaignCommand(g,{type:'rest',unitId});assert.equal(out.error,undefined);assert.equal(out.game.units.find(u=>u.id===unitId).ap,g.units.find(u=>u.id===unitId).ap-2);const foreign=teams.find(t=>t!==team);assert.equal(campaignCommand(g,{type:'rest',unitId:`${foreign}1`}).error,'c_errorUnit');}
});
test('the two AI rivals act once each at night for every player faction, not on day-to-night',()=>{
 for(const team of teams){const g=initialCampaign(2,team),night=endCampaignPhase(g);assert.equal(night.actions,0);const next=endCampaignPhase(night);assert.equal(next.day,2);const acted=new Set(next.logs.filter(l=>l.key==='c_logAction').map(l=>l.values.team));assert.ok(!acted.has(team));for(const rival of teams.filter(t=>t!==team))assert.ok(acted.has(rival));}
});
test('contests, wins and ties compare all three factions including White',()=>{
 const g=initialCampaign(),n=nodes[0];g.nodeState[n.id].influence.white=5;assert.equal(nodeOwner(g,n.id),'white');g.nodeState[n.id].active.blue=true;g.nodeState[n.id].active.white=true;assert.equal(nodeOwner(g,n.id),'contested');
 assert.equal(campaignOutcome({blue:4,green:3,white:5}),'white');assert.equal(campaignOutcome({blue:5,green:5,white:3}),'draw');assert.equal(campaignOutcome({blue:2,green:5,white:5}),'draw');assert.equal(campaignOutcome({blue:2,green:3,white:5}),'white');
 for(const winner of teams){let h=initialCampaign();h.units=[];h.day=28;h.phase='night';h.support[districts[0].id][winner]+=1;assert.equal(endCampaignPhase(h).result,winner);}
});
test('White can lead the qualitative reports, and a tie for first names no leader',()=>{
 assert.deepEqual(rumorBand({blue:100,green:90,white:125}),{band:'clear_lead',leader:'white'});
 assert.deepEqual(rumorBand({blue:100,green:50,white:100}),{band:'neck_and_neck',leader:null});
});
test('an area broadcast can affect both rival factions without affecting its own faction',()=>{
 let g=initialCampaign(1);const c=[...cells.values()].find(c=>c.neighbors.length===6);const shooter=g.units.find(u=>u.id==='white2');
 g.units=[shooter,g.units[0],g.units[3],g.units.find(u=>u.id==='white3')];g.units.forEach((u,i)=>{u.cellId=i===0?c.id:c.neighbors[i-1];u.guardedUntil=0;});
 const preview=splashTargets(g,shooter,'blue1');assert.deepEqual(new Set(preview.map(p=>p.unit.team)),new Set(['blue','green']));
 const ally=g.units.find(u=>u.id==='white3').mobilization;const out=campaignCommand(g,{type:'broadcast',unitId:'white2',targetId:'blue1'},'white');assert.equal(out.error,undefined);assert.equal(out.game.units.find(u=>u.id==='white3').mobilization,ally);for(const p of preview)assert.equal(out.game.units.find(u=>u.id===p.unit.id).mobilization,p.unit.mobilization-p.power);
});
test('saving and loading every phase across a 28-day three-sided game preserves continuation and blackout',()=>{
 let g=initialCampaign(42,'white');for(let phase=0;phase<56;phase++){const s=session(g);assert.ok(validSession(s),`invalid day ${g.day} ${g.phase}`);const decoded=decodeSave(JSON.stringify(encodeSave(s)));assert.equal(decoded.error,null);assert.deepEqual(decoded.save.session,s);const direct=endCampaignPhase(g),restored=endCampaignPhase(decoded.save.session.game);assert.deepEqual(restored,direct);g=direct;if(decoded.save.session.game.day>=15&&!decoded.save.session.game.result){const intel=intelligence(decoded.save.session.game);assert.equal(intel.kind,'rumor');assert.equal('support' in intel,false);}}
 assert.ok(g.result);assert.equal(g.history.length,28);assert.equal(g.pollHistory.length,7);assert.ok(validSession(session(g)));assert.equal(intelligence(g).kind,'result');
});
test('save round-trip retains class abilities, stage staffing, event response, seed and AP',()=>{
 let g=initialCampaign(8,'white');g=campaignCommand(g,{type:'respond',unitId:'white1',choice:'mobilize'}).game;g=campaignCommand(g,{type:'brace',unitId:'white1'}).game;
 const n=nodes.find(n=>n.kind==='venue');g.units.find(u=>u.id==='white2').cellId=n.cellId;g.stages=[{nodeId:n.id,team:'white',brand:'island',openDay:3,staffed:true,lastEventDay:0}];g.resources.white.volunteers--;
 const restored=decodeSave(JSON.stringify(encodeSave(session(g))));assert.equal(restored.error,null);assert.deepEqual(restored.save.session.game,g);
});
test('corrupt, incompatible and structurally invalid saves are rejected without overwriting bytes',()=>{
 const storage=memory(),good=JSON.stringify(encodeSave(session(initialCampaign())));for(const raw of ['{broken',good.replace('"ap":14','"ap":13'),good.replace('"version":5','"version":99')]){storage.setItem(SAVE_KEY,raw);assert.equal(readSave(storage).save,null);assert.equal(storage.getItem(SAVE_KEY),raw);}
 for(const change of [s=>s.game.day=99,s=>s.game.units[0].cellId='missing',s=>delete s.game.support[districts[0].id].white,s=>s.selected='green1',s=>s.game.history.push({day:1,support:s.game.support})]){const s=session(initialCampaign());change(s);assert.equal(validSession(s),false);assert.throws(()=>encodeSave(s));}
 assert.equal(decodeSave(good.replace('"version":5','"version":2')).error,'c_saveIncompatible');
});
test('store startup offers continuation without silently starting or modifying the saved game',()=>{
 const storage=memory(),store=createCampaignStore(storage);const originalSeed=store.getState().game.seed;store.getState().faction('white');assert.equal(store.getState().game.seed,originalSeed);assert.equal(store.getState().selected,'white1');store.getState().commander('shen');store.getState().start();store.getState().dispatch({type:'rest',unitId:'white1'});store.getState().end();const before=structuredClone(session(store.getState().game));before.selected=store.getState().selected;before.districtId=store.getState().districtId;before.view=store.getState().view;
 const fresh=createCampaignStore(storage);assert.equal(fresh.getState().started,false);assert.ok(fresh.getState().saved);fresh.getState().resume();assert.equal(fresh.getState().started,true);assert.deepEqual(session(fresh.getState().game),{...before,view:'street'});assert.equal(fresh.getState().view,before.view);assert.equal(fresh.getState().game.commanders.white,'shen');
});
test('in-play faction and commander selection is locked; errors do not autosave or mutate game',()=>{
 const storage=memory(),store=createCampaignStore(storage);store.getState().faction('green');store.getState().start();const raw=storage.getItem(SAVE_KEY),game=store.getState().game;store.getState().faction('white');store.getState().commander('jiang');store.getState().select('blue1');store.getState().dispatch({type:'rest',unitId:'blue1'});assert.equal(store.getState().game,game);assert.equal(storage.getItem(SAVE_KEY),raw);assert.equal(store.getState().error,'c_errorUnit');
});
test('new-game setup preserves the old save until explicitly starting the new game',()=>{
 const storage=memory(),store=createCampaignStore(storage);store.getState().start();store.getState().dispatch({type:'rest',unitId:'blue1'});const raw=storage.getItem(SAVE_KEY);store.getState().reset();store.getState().faction('white');assert.equal(storage.getItem(SAVE_KEY),raw);store.getState().resume();assert.equal(store.getState().game.playerTeam,'blue');store.getState().reset();store.getState().faction('white');store.getState().start(true);assert.equal(readSave(storage).save.session.game.playerTeam,'white');
});
test('storage failure leaves the game playable, keeps the previous save and blocks lossy return home',()=>{
 const storage=memory(),store=createCampaignStore(storage);store.getState().start();const raw=storage.getItem(SAVE_KEY);storage.setItem=()=>{throw new Error('quota');};store.getState().dispatch({type:'rest',unitId:'blue1'});assert.equal(store.getState().game.actions,1);assert.equal(store.getState().saveError,'c_saveUnavailable');assert.equal(storage.getItem(SAVE_KEY),raw);store.getState().menu();assert.equal(store.getState().started,true);assert.equal(writeSave(null,session(initialCampaign())).error,'c_saveUnavailable');
});
test('a menu return, reload and resume never rerolls, restores AP or repeats settlement',()=>{
 const storage=memory(),store=createCampaignStore(storage);store.getState().start();store.getState().end();store.getState().end();const game=structuredClone(store.getState().game);store.getState().menu();assert.equal(store.getState().started,false);const fresh=createCampaignStore(storage);fresh.getState().resume();assert.deepEqual(fresh.getState().game,game);assert.equal(game.history.length,1);assert.equal(fresh.getState().game.history.length,1);
});
