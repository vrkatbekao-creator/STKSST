import test from 'node:test';
import assert from 'node:assert/strict';
import {initialCampaign} from '../src/game/campaign.ts';
import {chooseAiVehicleStop} from '../src/game/campaign-vehicle-ai.ts';

test('AI preview ranking respects campaign resources, limits and immutability',()=>{
 const game=initialCampaign(17,'blue','streets-v2'),unit=game.units.find(u=>u.id==='blue1'),before=structuredClone(game);
 let calls=0;const preview=(_destination,reserve)=>{calls++;assert.equal(reserve.ap,1);assert.equal(reserve.materials,1);return {totalAp:2,materials:1};};
 const result=chooseAiVehicleStop(game,unit,preview,3);
 assert.ok(result);assert.equal(result.totalAp,3);assert.equal(result.materials,2);assert.ok(calls<=3);assert.deepEqual(game,before);
 assert.equal(chooseAiVehicleStop(game,unit,()=>({totalAp:100,materials:0})),null);
 assert.equal(chooseAiVehicleStop(game,unit,()=>({totalAp:0,materials:999})),null);
});
test('AI does not dispatch guarded units or while dialogue is active',()=>{
 const game=initialCampaign(17,'blue','streets-v2'),unit=game.units.find(u=>u.id==='blue1');let calls=0;
 unit.bracedUntil=game.day;assert.equal(chooseAiVehicleStop(game,unit,()=>{calls++;return null;}),null);
 unit.bracedUntil=0;game.talk={};assert.equal(chooseAiVehicleStop(game,unit,()=>{calls++;return null;}),null);assert.equal(calls,0);
});
