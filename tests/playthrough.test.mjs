import test from 'node:test';
import assert from 'node:assert/strict';
import { initialGame, command, endPhase } from '../src/game/rules.ts';

// Different opening events change the route, so keep an actual legal playthrough
// for each of the three event draws, including real enemy turns and the shield.
const campaigns = [
 { seed:0, days:4, turns:[
  [['guard'],['move','b2',3,3],['attack','b2','g3'],['move','b3',4,4],['attack','b3','g3'],['attack','b3','g3']],
  [['attack','b2','g2'],['attack','b2','g2'],['move','b3',5,2],['attack','b3','g2']],
  [['attack','b3','g1'],['attack','b3','g1'],['attack','b3','g1']]
 ]},
 { seed:1, days:5, turns:[
  [['guard'],['attack','b2','g3'],['attack','b2','g3'],['move','b2',0,2],['move','b3',2,2],['attack','b3','g1'],['attack','b3','g1']],
  [['attack','b2','g1'],['move','b2',2,1]],
  [['attack','b2','g2'],['attack','b2','g2']],
  [['move','b1',3,2],['attack','b1','g2']]
 ]},
 { seed:2, days:5, turns:[
  [['guard'],['attack','b2','g3'],['attack','b2','g3'],['move','b2',0,2],['move','b3',2,2],['attack','b3','g1'],['attack','b3','g1']],
  [['attack','b2','g1']],
  [['move','b2',2,1],['attack','b2','g2']],
  [['attack','b2','g2'],['attack','b2','g2']]
 ]}
];
for(const campaign of campaigns)test(`complete a legal campaign from opening event seed ${campaign.seed}`,()=>{
 let game=endPhase(endPhase(initialGame(campaign.seed)));
 for(const turn of campaign.turns){
  for(const [type,id,a,b] of turn){
   const cmd=type==='guard'?{type}:type==='move'?{type,id,to:{x:a,y:b}}:{type,id,target:a};
   const out=command(game,cmd);assert.equal(out.error,undefined,JSON.stringify(cmd));game=out.game;
  }
  if(!game.result)game=endPhase(endPhase(game));
 }
 assert.equal(game.result,'win');assert.equal(game.day,campaign.days);assert.ok(game.units.every(u=>u.team==='blue'));
});
