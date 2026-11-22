import test from 'node:test';
import assert from 'node:assert/strict';
import {initialCampaign} from '../src/game/campaign.ts';
import {simulateVehicleItinerary} from '../src/game/campaign-vehicle-itinerary.ts';

const setup=()=>{const g=initialCampaign(17,'blue','streets-v2'),u=g.units.find(u=>u.id==='blue1');return {g,u};};
const leg=u=>({unitId:u.id,mode:'drive',cellId:u.cellId});
// Stub only the unfinished vehicle executor; activities use the real campaign command.
const arrive=game=>({game});
test('success applies real activities to a clone and leaves the original untouched',()=>{
 const {g,u}=setup(),before=structuredClone(g);
 const out=simulateVehicleItinerary(g,'blue',u.id,[{travel:leg(u),action:{type:'streetCanvass',unitId:u.id}}],arrive);
 assert.equal(out.error,undefined);assert.equal(out.game.units.find(x=>x.id===u.id).ap,u.ap-1);
 assert.equal(out.game.resources.blue.materials,g.resources.blue.materials-1);assert.deepEqual(g,before);
});
test('failure at a later stop rolls the entire itinerary back, even if executor mutates its clone',()=>{
 const {g,u}=setup(),before=structuredClone(g);let count=0;
 const executor=game=>{game.resources.blue.materials--;return ++count===2?{game,error:'c_errorRoute'}:{game};};
 const out=simulateVehicleItinerary(g,'blue',u.id,[{travel:leg(u)},{travel:leg(u)}],executor);
 assert.equal(out.error,'c_errorRoute');assert.equal(out.failedStop,1);assert.equal(out.game,g);assert.deepEqual(g,before);
});
test('rejects other units, oversized plans and already active dialogue without calling the executor',()=>{
 const {g,u}=setup();let calls=0;const executor=game=>{calls++;return {game};};
 assert.equal(simulateVehicleItinerary(g,'blue',u.id,Array(7).fill({travel:leg(u)}),executor).error,'c_errorRoute');
 assert.equal(simulateVehicleItinerary(g,'blue',u.id,[{travel:{...leg(u),unitId:'white1'}}],executor).error,'c_errorRoute');
 g.talk={};assert.equal(simulateVehicleItinerary(g,'blue',u.id,[{travel:leg(u)}],executor).error,'d_finishFirst');
 assert.equal(calls,0);
});
test('dialogue must be the final stop and remains pending for player answers',()=>{
 const {g,u}=setup();g.day=7;const before=structuredClone(g);
 const dialogue={travel:leg(u),action:{type:'talkStart',unitId:u.id,mode:'debate'}};
 const tooEarly=simulateVehicleItinerary(g,'blue',u.id,[dialogue,{travel:leg(u)}],arrive);
 assert.equal(tooEarly.error,'d_finishFirst');assert.equal(tooEarly.game,g);assert.deepEqual(g,before);
 const final=simulateVehicleItinerary(g,'blue',u.id,[dialogue],arrive);
 assert.equal(final.error,undefined);assert.ok(final.game.talk);assert.equal(g.talk,null);
});
