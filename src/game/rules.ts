import { level, startingUnits } from './level.ts';
import type { Position, Team, Unit } from './level.ts';
import { drawEvent } from './events.ts';
import type { FieldEvent } from './events.ts';
export type Log = { key: string; values?: Record<string,string|number> };
export type Game = { event:FieldEvent|null; seed:number; skillReadyDay:number; feedback:{id:number;key:string;values?:Record<string,string|number>;position?:Position}|null; revision:number; day:number; phase:'day'|'night'; units:Unit[]; result:'win'|'lose'|null; reason:'rout'|'deadline'|null; poll:Record<Team,number>; logs:Log[]; actions:number };
export type Command = {type:'move';id:string;to:Position} | {type:'attack';id:string;target:string} | {type:'guard'};
export const distance = (a:Position,b:Position) => Math.abs(a.x-b.x)+Math.abs(a.y-b.y);
export const at = (a:Position,b:Position) => a.x===b.x && a.y===b.y;
export const blocked = (p:Position) => level.obstacles.some(o=>at(o,p));
export const inBounds = (p:Position) => Number.isInteger(p.x)&&Number.isInteger(p.y)&&p.x>=0&&p.y>=0&&p.x<level.width&&p.y<level.height;
export const counters = {heavy:'ranged',ranged:'scout',scout:'heavy'} as const;
export const moveCost = (game:Game) => game.event?.id==='rain'?2:1;
export const apForDay = (game:Game,unit:Unit) => unit.maxAp+(game.event?.id==='volunteers'&&unit.team==='blue'?1:0);
export const guarded = (game:Game,unit:Unit) => (unit.guardedUntil??0)>=game.day;
export function damagePreview(game:Game,attacker:Unit,target:Unit) {
  const advantage=counters[attacker.role]===target.role;
  const base=attacker.damage+(game.event?.id==='spotlight'?5:0);
  const damage=guarded(game,target)?0:Math.floor(base*(advantage?1.5:1));
  return {damage,advantage,blocked:guarded(game,target),lethal:damage>=target.hp};
}
export function initialGame(seed=0x5eed): Game {
  const drawn=drawEvent(seed,1);
  const game:Game={day:1,phase:'day',units:startingUnits(),result:null,reason:null,poll:{blue:50,green:50},logs:[{key:'logEvent',values:{event:drawn.event.id}},{key:'logReady'}],actions:0,event:drawn.event,seed:drawn.seed,skillReadyDay:1,feedback:null,revision:0};
  return {...game,units:game.units.map(u=>({...u,ap:apForDay(game,u)}))};
}
function feedback(game:Game,key:string,values?:Record<string,string|number>,position?:Position):Game {
  return {...game,revision:game.revision+1,feedback:{id:game.revision+1,key,values,position}};
}
export function paths(game:Game, unit:Unit): Map<string,number> {
  const found=new Map<string,number>([[`${unit.x},${unit.y}`,0]]); const queue:Position[]=[unit];
  for(let i=0;i<queue.length;i++) { const p=queue[i]; const cost=found.get(`${p.x},${p.y}`)!;
    if(guarded(game,unit)||cost+moveCost(game)>unit.ap)continue;
    for(const [dx,dy] of [[0,-1],[1,0],[0,1],[-1,0]]) { const n={x:p.x+dx,y:p.y+dy};const key=`${n.x},${n.y}`;
      if(!inBounds(n)||blocked(n)||found.has(key)||game.units.some(u=>u.id!==unit.id&&at(u,n)))continue;
      found.set(key,cost+moveCost(game));queue.push(n);
    }
  } return found;
}
function log(game:Game, item:Log): Log[] { return [item,...game.logs].slice(0,30); }
function finish(game:Game): Game {
  if(!game.units.some(u=>u.team==='green'))return {...game,result:'win',reason:'rout'};
  if(!game.units.some(u=>u.team==='blue'))return {...game,result:'lose',reason:'rout'};
  return game;
}
export function command(game:Game, cmd:Command, team:Team='blue'): {game:Game;error?:string} {
  if(game.result)return {game,error:'errorFinished'};
  if(cmd.type==='guard') {
    const leader=game.units.find(u=>u.id==='b1');
    if(team!=='blue'||!leader)return {game,error:'errorLeader'};
    if(game.day<game.skillReadyDay)return {game,error:'errorCooldown'};
    if(leader.ap<2)return {game,error:'errorAp'};
    const next={...game,skillReadyDay:game.day+6,actions:game.actions+1,units:game.units.map(u=>u.id==='b1'?{...u,ap:u.ap-2,guardedUntil:game.day+2}:u),logs:log(game,{key:'logGuard'})};
    return {game:feedback(next,'logGuard',undefined,leader)};
  }
  const u=game.units.find(u=>u.id===cmd.id);
  if(!u||u.team!==team)return {game,error:'errorUnit'};
  if(cmd.type==='move') {
    if(guarded(game,u))return {game,error:'errorAnchored'};
    const cost=inBounds(cmd.to)?paths(game,u).get(`${cmd.to.x},${cmd.to.y}`):undefined;
    if(cost===undefined||cost===0)return {game,error:'errorMove'};
    return {game:feedback({...game,actions:game.actions+(team==='blue'?1:0),units:game.units.map(v=>v.id===u.id?{...v,...cmd.to,ap:v.ap-cost}:v),logs:log(game,{key:'logMove',values:{team:u.team,role:u.role,cost}})},'feedbackMove',{cost},cmd.to)};
  }
  const target=game.units.find(v=>v.id===cmd.target);
  if(!target||target.team===team||distance(u,target)>u.range)return {game,error:'errorRange'};
  if(u.ap<u.attackCost)return {game,error:'errorAp'};
  const preview=damagePreview(game,u,target);
  const killed=target.hp<=preview.damage;
  const key=preview.blocked?'logBlocked':killed?'logDefeat':preview.advantage?'logAdvantage':'logAttack';
  const values={team:u.team,role:u.role,damage:preview.damage};
  const next=finish({...game,actions:game.actions+(team==='blue'?1:0),units:game.units.map(v=>v.id===u.id?{...v,ap:v.ap-v.attackCost}:v.id===target.id?{...v,hp:Math.max(0,v.hp-preview.damage)}:v).filter(v=>v.hp>0),logs:log(game,{key,values})});
  return {game:feedback(next,key,values,target)};
}
export function enemyTurn(input:Game): Game {
  let game=input;
  for(const id of game.units.filter(u=>u.team==='green').map(u=>u.id)) {
    // Each iteration consumes at least one AP or stops, keeping the turn bounded.
    for(let step=0;step<10&&!game.result;step++) {
      const unit=game.units.find(u=>u.id===id);if(!unit||unit.ap<1)break;
      const targets=game.units.filter(u=>u.team==='blue').sort((a,b)=>distance(unit,a)-distance(unit,b)||a.hp-b.hp);
      if(!targets.length)break;
      const attackable=targets.filter(t=>distance(unit,t)<=unit.range).sort((a,b)=>damagePreview(game,unit,b).damage-damagePreview(game,unit,a).damage||a.hp-b.hp)[0];
      if(attackable&&unit.ap>=unit.attackCost) {game=command(game,{type:'attack',id,target:attackable.id},'green').game;continue;}
      if(attackable)break;
      const target=targets[0];const options=[...paths(game,unit)].filter(([,cost])=>cost>0).map(([key,cost])=>{const [x,y]=key.split(',').map(Number);return {x,y,cost};}).sort((a,b)=>distance(a,target)-distance(b,target)||a.cost-b.cost);
      const next=options[0];if(!next||distance(next,target)>=distance(unit,target))break;
      game=command(game,{type:'move',id,to:next},'green').game;
    }
  } return game;
}
export function endPhase(input:Game): Game {
  if(input.result)return input;
  if(input.phase==='day')return {...input,phase:'night',logs:log(input,{key:'logNight'})};
  let game=enemyTurn(input); if(game.result)return game;
  if(game.day>=level.maxDays)return {...game,result:'lose',reason:'deadline',logs:log(game,{key:'logDeadline'})};
  const day=game.day+1;
  // News arrives on odd days and lasts one day; both teams see the same conditions.
  const drawn=day%2===1?drawEvent(game.seed,day):null;
  game={...game,day,phase:'day',event:drawn?.event??null,seed:drawn?.seed??game.seed};
  game={...game,units:game.units.map(u=>({...u,ap:apForDay(game,u)}))};
  if(drawn)game={...game,logs:log(game,{key:'logEvent',values:{event:drawn.event.id}})};
  return feedback({...game,logs:log(game,{key:'logDay',values:{day:game.day}})},drawn?'logEvent':'logDay',drawn?{event:drawn.event.id}:{day:game.day});
}
