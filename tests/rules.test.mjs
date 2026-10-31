import test from 'node:test';
import assert from 'node:assert/strict';
import { initialGame, command, endPhase, paths } from '../src/game/rules.ts';
import { level } from '../src/game/level.ts';
test('movement uses a real path and refuses obstacles and occupied tiles',()=>{
 const g=initialGame();const u=g.units[0];const moved=command(g,{type:'move',id:u.id,to:{x:2,y:2}});
 assert.equal(moved.game.units[0].ap,u.ap-1);assert.equal(g.units[0].x,1);
 assert.equal(command(g,{type:'move',id:u.id,to:{x:3,y:1}}).game,g);
 assert.equal(command(g,{type:'move',id:u.id,to:{x:0,y:3}}).game,g);
 assert.equal(command(g,{type:'move',id:u.id,to:{x:50,y:0}}).game,g);
 const altered={...g,units:[{...u,x:2,y:0,ap:4}]};assert.equal(paths(altered,altered.units[0]).get('4,0'),undefined);
});
test('AP carries into night and both teams recover next morning',()=>{
 let g=initialGame();g=command(g,{type:'move',id:'b1',to:{x:2,y:2}}).game;const ap=g.units[0].ap;
 g=endPhase(g);assert.equal(g.phase,'night');assert.equal(g.units[0].ap,ap);
 g=endPhase(g);assert.equal(g.day,2);assert.equal(g.phase,'day');assert.ok(g.units.every(u=>u.ap===u.maxAp));assert.ok(g.units.some(u=>u.team==='green'&&u.x<8));
});
test('range and AP checks, unit removal, victory and terminal guard',()=>{
 const base=initialGame();const b={...base.units[0],x:1,y:1,ap:5};const e={...base.units[3],x:2,y:1,hp:40};const g={...base,units:[b,e]};
 assert.equal(command({...g,units:[{...b,ap:1},e]},{type:'attack',id:b.id,target:e.id}).error,'errorAp');
 assert.equal(command({...g,units:[b,{...e,x:8}]},{type:'attack',id:b.id,target:e.id}).error,'errorRange');
 const out=command(g,{type:'attack',id:b.id,target:e.id}).game;assert.equal(out.result,'win');assert.equal(out.units.length,1);assert.equal(out.units[0].ap,3);assert.equal(endPhase(out),out);
});
test('the deadline is exactly the end of night 28',()=>{
 const base=initialGame();base.units.forEach(u=>{u.ap=0;u.maxAp=0;});
 let g={...base,day:27,phase:'night'};g=endPhase(g);assert.equal(g.day,28);assert.equal(g.result,null);
 g=endPhase(g);assert.equal(g.phase,'night');assert.equal(g.result,null);g=endPhase(g);assert.equal(g.result,'lose');assert.equal(g.reason,'deadline');assert.equal(g.day,level.maxDays);assert.equal(level.maxDays,28);
});
test('enemy can defeat the last player and stops immediately',()=>{
 const base=initialGame();const g={...base,phase:'night',units:[{...base.units[0],x:1,y:1,hp:1},{...base.units[3],x:2,y:1}]};const out=endPhase(g);assert.equal(out.result,'lose');assert.equal(out.reason,'rout');assert.ok(out.units.every(u=>u.team==='green'));
});
