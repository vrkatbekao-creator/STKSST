import test from 'node:test';import assert from 'node:assert/strict';
import {initialCampaign,campaignCommand,endCampaignPhase,automatedFactionTurn,intelligence} from '../src/game/campaign.ts';
import {contacts,contactIds,initialContacts,contactCost} from '../src/game/campaign-contacts.ts';
import {career} from '../src/game/campaign-growth.ts';
import {encodeSave,decodeSave,validSession,SAVE_KEY,readSave} from '../src/game/campaign-save.ts';
import {createCampaignStore} from '../src/game/campaign-store.ts';
import {cells} from '../src/game/campaign-map.ts';
const session=g=>({game:g,selected:`${g.playerTeam}1`,districtId:cells.get(g.units.find(u=>u.id===`${g.playerTeam}1`).cellId).districtId,view:'street'});
const command=(g,npcId,choice='engage',team=g.playerTeam)=>campaignCommand(g,{type:'contact',unitId:`${team}1`,npcId,choice},team);
function unlocked(){let g=initialCampaign(71);while(g.day<15)g=endCampaignPhase(g);g.contacts=initialContacts();return g;}
function rehash(save){const {checksum:_,...data}=save;let h=2166136261;for(const c of JSON.stringify(data))h=Math.imul(h^c.charCodeAt(0),16777619);return JSON.stringify({...data,checksum:h>>>0});}
test('each contact unlocks at its fixed day and rejects malformed commands without changing state',()=>{
 for(const id of contactIds){const g=initialCampaign(4);g.day=contacts[id].day-1;const seed=g.seed;const out=command(g,id);assert.equal(out.error,'n_locked');assert.equal(out.game,g);assert.equal(g.seed,seed);g.day++;assert.equal(command(g,id,'unknown').error,'n_invalid');assert.equal(command(g,'unknown').error,'n_invalid');}
});
test('accepted contacts consume authoritative fees, cap XP and preserve support, RNG and old snapshots',()=>{
 for(const id of contactIds){const g=unlocked(),before=structuredClone(g),u=g.units[0];u.career.dailyXp=7;u.career.xpDay=g.day;const expected=structuredClone(g);const out=command(g,id);assert.equal(out.error,undefined);const n=out.game.units[0],effect=contacts[id],cost=contactCost(id,'engage');assert.equal(n.ap,u.ap-cost.ap);assert.equal(out.game.resources.blue.materials,g.resources.blue.materials-cost.materials+effect.supplies);assert.equal(n.career.health,u.career.health-effect.health);assert.equal(n.career.morale,Math.min(100,u.career.morale+effect.morale));assert.equal(n.career.xp,u.career.xp+1);assert.deepEqual(out.game.support,g.support);assert.equal(out.game.seed,g.seed);assert.deepEqual(g,expected);assert.equal(out.game.units.length,before.units.length);assert.equal(command(out.game,id).error,'n_answered');assert.equal(intelligence(out.game).kind,'rumor');assert.ok(validSession(session(out.game)));assert.deepEqual(decodeSave(JSON.stringify(encodeSave(session(out.game)))).save.session.game,out.game);}
});
test('declining is free, final and independent for each faction without creating recruited members',()=>{
 let g=unlocked();const count=g.units.length;for(const team of ['blue','green','white'])for(const id of contactIds){const before=structuredClone(g),out=command(g,id,'decline',team);assert.equal(out.error,undefined);g=out.game;assert.deepEqual(g.resources,before.resources);assert.deepEqual(g.units,before.units);assert.equal(g.contacts[id][team].choice,'decline');assert.equal(command(g,id,'engage',team).error,'n_answered');}assert.equal(g.units.length,count);
});
test('insufficient AP or materials and foreign actors cannot spend, claim rewards or save responses',()=>{
 let g=unlocked();g.units[0].ap=0;assert.equal(command(g,'merchant').game,g);assert.equal(command(g,'merchant').error,'c_errorAP');g.units[0].ap=14;g.resources.blue.materials=0;assert.equal(command(g,'red').error,'c_errorMaterials');assert.equal(g.contacts.red.blue,null);assert.equal(campaignCommand(g,{type:'contact',npcId:'red',choice:'decline',unitId:'white1'}).error,'c_errorUnit');
});
test('schema 3 upgrades only missing contact records and does not rewrite legacy slot bytes on load',()=>{
 const game=unlocked(),save=encodeSave(session(game));save.version=3;save.rules='0.10.0';delete save.session.game.contacts;const raw=rehash(save),data=new Map([[SAVE_KEY,raw]]),writes=[];const port={getItem:k=>data.get(k)??null,setItem:(k,v)=>{writes.push(k);data.set(k,v);}};
 const result=readSave(port);assert.equal(result.save.version,4);assert.deepEqual(result.save.session.game,{...save.session.game,contacts:initialContacts()});const store=createCampaignStore(port);store.getState().resume();assert.equal(writes.length,0);assert.equal(data.get(SAVE_KEY),raw);assert.equal(store.getState().game.seed,game.seed);assert.deepEqual(store.getState().game.units,game.units);
});
test('invalid contact records and a schema 4 envelope missing contacts are rejected',()=>{
 const game=unlocked();for(const mutate of [g=>g.contacts.red.blue={choice:'engage',day:5,unitId:'blue1'},g=>g.contacts.observer.blue={choice:'engage',day:29,unitId:'blue1'},g=>g.contacts.red.blue={choice:'engage',day:6,unitId:'white1'},g=>g.contacts.red.blue={choice:'retry',day:6,unitId:'blue1'},g=>g.contacts.extra={},g=>delete g.contacts.red.white]){const bad=structuredClone(game);mutate(bad);assert.equal(validSession(session(bad)),false);}
 const save=encodeSave(session(game));delete save.session.game.contacts;assert.equal(decodeSave(rehash(save)).error,'c_saveInvalid');
});
test('AI accepts eligible invitations through the same command and records one response',()=>{
 const game=unlocked();game.units.find(u=>u.id==='green1').ap=14;game.units.find(u=>u.id==='green1').career.morale=50;const result=automatedFactionTurn(game,'green');assert.equal(result.contacts.red.green.choice,'engage');assert.equal(result.contacts.red.blue,null);assert.ok(result.logs.some(l=>l.values.action==='contact'&&l.values.team==='green'));assert.equal(career(result.units.find(u=>u.id==='green1')).dailyXp<=8,true);
});
