import { create } from 'zustand';
import { initialGame, command, endPhase } from './rules.ts';
import type { Game } from './rules.ts';
import type { Position } from './level.ts';
type Store = { game:Game; started:boolean; selected:string|null; error:string|null; start:()=>void; select:(id:string)=>void; cell:(p:Position)=>void; guard:()=>void; end:()=>void; reset:()=>void };
export const useGame=create<Store>((set,get)=>({
  game:initialGame(Math.floor(Math.random()*0x100000000)),started:false,selected:null,error:null,
  start:()=>set({started:true}),
  reset:()=>set({game:initialGame(Math.floor(Math.random()*0x100000000)),selected:null,error:null,started:true}),
  select:(id)=>{if(get().game.units.some(u=>u.id===id&&u.team==='blue'))set({selected:id,error:null});},
  cell:(to)=>{const {game,selected}=get();if(game.result)return;const target=game.units.find(u=>u.x===to.x&&u.y===to.y);
    if(target?.team==='blue'){set({selected:target.id,error:null});return;}
    if(!selected){set({error:'errorSelect'});return;}
    const out=command(game,target?{type:'attack',id:selected,target:target.id}:{type:'move',id:selected,to});set({game:out.game,error:out.error??null});
  },
  guard:()=>{const out=command(get().game,{type:'guard'});set({game:out.game,error:out.error??null});},
  end:()=>{const game=endPhase(get().game);set({game,selected:null,error:null});},
}));
