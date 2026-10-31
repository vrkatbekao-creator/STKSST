import test from 'node:test';
import assert from 'node:assert/strict';
import { initialGame, command, damagePreview, endPhase, guarded, paths, apForDay } from '../src/game/rules.ts';
import { drawEvent } from '../src/game/events.ts';

test('all three class advantages add 50%, round down, and work for enemies too',()=>{
 const game={...initialGame(),event:null};
 for(const [a,b,expected] of [['heavy','ranged',60],['ranged','scout',45],['scout','heavy',52]]){
  const attacker=game.units.find(u=>u.role===a&&u.team==='green');const target=game.units.find(u=>u.role===b&&u.team==='blue');
  assert.equal(damagePreview(game,attacker,target).damage,expected);assert.equal(damagePreview(game,attacker,target).advantage,true);
  assert.equal(damagePreview(game,target,attacker).advantage,false);
 }
});

test('Capital Aegis costs AP, blocks damage and movement but allows attacks',()=>{
 const base={...initialGame(1),event:null};base.units=[{...base.units[0],x:1,y:1,ap:5},{...base.units[3],x:2,y:1,hp:120}];
 const guardedGame=command(base,{type:'guard'}).game;
 assert.equal(guardedGame.units[0].ap,3);assert.equal(guardedGame.units[0].guardedUntil,3);assert.equal(guardedGame.skillReadyDay,7);
 assert.equal(command(guardedGame,{type:'move',id:'b1',to:{x:0,y:1}}).error,'errorAnchored');
 assert.equal(command(guardedGame,{type:'guard'}).error,'errorCooldown');
 const attacked=command(guardedGame,{type:'attack',id:'g1',target:'b1'},'green').game;
 assert.equal(attacked.units[0].hp,120);assert.equal(attacked.units[1].ap,3);assert.equal(attacked.feedback.values.damage,0);
 const attack=command(attacked,{type:'attack',id:'b1',target:'g1'});assert.equal(attack.error,undefined);assert.equal(attack.game.units[1].hp,80);
});

test('shield lasts precisely 3 days; reuse is available precisely on day 7',()=>{
 let game=command(initialGame(1),{type:'guard'}).game;
 game={...game,units:game.units.map(u=>u.team==='green'?{...u,ap:0,maxAp:0}:u)};
 for(let day=1;day<=3;day++){
  assert.equal(game.day,day);assert.ok(guarded(game,game.units[0]));
  game=endPhase(game);assert.ok(guarded(game,game.units[0]));game=endPhase(game);
 }
 assert.equal(game.day,4);assert.equal(guarded(game,game.units[0]),false);assert.ok(paths(game,game.units[0]).size>1);
 while(game.day<6)game=endPhase(endPhase(game));
 assert.equal(command(game,{type:'guard'}).error,'errorCooldown');game=endPhase(endPhase(game));
 assert.equal(command(game,{type:'guard'}).error,undefined);
});

test('guard rejects a withdrawn leader, insufficient AP and terminal games',()=>{
 const g=initialGame();assert.equal(command({...g,units:g.units.filter(u=>u.id!=='b1')},{type:'guard'}).error,'errorLeader');
 assert.equal(command({...g,units:g.units.map(u=>({...u,ap:0}))},{type:'guard'}).error,'errorAp');
 assert.equal(command({...g,result:'win'},{type:'guard'}).error,'errorFinished');
});

test('event draws reproduce by seed and cover all three opening conditions',()=>{
 const ids=[0,1,2].map(seed=>drawEvent(seed,1).event.id);assert.equal(new Set(ids).size,3);
 assert.deepEqual(drawEvent(123,5),drawEvent(123,5));
 let g=initialGame(1);const seed=g.seed;const event=g.event;
 g=endPhase(g);assert.deepEqual(g.event,event);assert.equal(g.seed,seed);
 g={...g,units:g.units.map(u=>u.team==='green'?{...u,ap:0,maxAp:0}:u)};
 g=endPhase(g);assert.equal(g.day,2);assert.equal(g.event,null);assert.equal(g.seed,seed);
 g=endPhase(endPhase(g));assert.equal(g.day,3);assert.ok(g.event);assert.notEqual(g.seed,seed);
});

test('volunteer AP is allocated once and carries into night',()=>{
 const g=initialGame(1);assert.equal(g.event.id,'volunteers');assert.equal(g.units[0].ap,g.units[0].maxAp+1);
 const moved=command(g,{type:'move',id:'b1',to:{x:2,y:2}}).game;
 const night=endPhase(moved);assert.equal(night.units[0].ap,moved.units[0].ap);assert.equal(apForDay(g,g.units[3]),g.units[3].maxAp);
});

test('rain costs 2 AP per path tile and never permits an unaffordable route',()=>{
 const g=initialGame(0);assert.equal(g.event.id,'rain');
 const out=command(g,{type:'move',id:'b1',to:{x:2,y:2}});assert.equal(out.game.units[0].ap,g.units[0].ap-2);
 assert.equal(command(g,{type:'move',id:'b1',to:{x:4,y:2}}).error,'errorMove');
});

test('spotlight applies before the counter multiplier and shields override all damage',()=>{
 const g=initialGame(2);assert.equal(g.event.id,'spotlight');const attacker=g.units[0],target=g.units[4];
 assert.equal(damagePreview(g,attacker,target).damage,67);assert.equal(damagePreview(g,attacker,{...target,guardedUntil:3}).damage,0);
});
