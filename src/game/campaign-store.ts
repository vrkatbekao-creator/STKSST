import { create } from 'zustand';
import { initialCampaign,campaignCommand,endCampaignPhase,prioritizeWonder,chooseCommander } from './campaign.ts';
import type { CommanderId } from './campaign-tactics.ts';
import type { Command,Team } from './campaign.ts';
import { teams } from './campaign-teams.ts';
import { mapFor, allCells as cells,districts,nodeById } from './campaign-map.ts';
import { readSave,writeSave } from './campaign-save.ts';
import type { Session,SavedCampaign,SaveError,StoragePort } from './campaign-save.ts';
export type Store=Session&{started:boolean;error:string|null;saved:SavedCampaign|null;saveExists:boolean;saveError:SaveError|null;start:()=>void;reset:()=>void;faction:(team:Team)=>void;commander:(id:CommanderId)=>void;select:(id:string)=>void;focus:(id:string)=>void;viewCity:()=>void;dispatch:(cmd:Command)=>void;end:()=>void;priority:(id:string)=>void;save:()=>void;resume:()=>void;menu:()=>void};
const fresh=(team:Team='blue',movementProfile:'legacy-hex'|'streets-v2'='legacy-hex'):Session=>{const game=initialCampaign(Math.floor(Math.random()*0x100000000),team,movementProfile);const selected=`${team}1`;return {game,selected,districtId:cells.get(game.units.find(u=>u.id===selected)!.cellId)!.districtId,view:'city'};};
export function createCampaignStore(storage:StoragePort|null,movementProfile:'legacy-hex'|'streets-v2'='legacy-hex'){
 const loaded=readSave(storage);
 return create<Store>((set,get)=>{
  const persist=()=>{const {game,selected,districtId,view}=get();const out=writeSave(storage,{game,selected,districtId,view});set(out.save?{saved:out.save,saveExists:true,saveError:null}:{saveError:out.error});return !!out.save;};
  return {
   ...fresh('blue',movementProfile),started:false,error:null,saved:loaded.save,saveExists:loaded.exists,saveError:loaded.error,
   start:()=>{if(!get().started){set({started:true,error:null});persist();}},
   reset:()=>set({...fresh(get().game.playerTeam,movementProfile),started:false,error:null}),
   faction:team=>{const g=get().game;if(get().started||!teams.includes(team))return;const selected=`${team}1`;set({game:{...g,playerTeam:team},selected,districtId:cells.get(g.units.find(u=>u.id===selected)!.cellId)!.districtId,error:null});},
   commander:id=>{if(!get().started)set({game:chooseCommander(get().game,id),error:null});},
   select:id=>{const s=get(),u=s.game.units.find(u=>u.id===id&&u.team===s.game.playerTeam);if(u){set({selected:id,districtId:cells.get(u.cellId)!.districtId,error:null});if(s.started)persist();}},
   focus:id=>{if(districts.some(d=>d.id===id)){set({districtId:id,view:'street',error:null});if(get().started)persist();}},
   viewCity:()=>{set({view:'city',error:null});if(get().started)persist();},
   dispatch:cmd=>{if(!get().started)return;const out=campaignCommand(get().game,cmd);set({game:out.game,error:out.error??null});if(!out.error){if(cmd.type==='transport'||cmd.type==='move'){const unit=out.game.units.find(u=>u.id===cmd.unitId)!;set({districtId:cells.get(unit.cellId)!.districtId,view:'street'});}if(cmd.type==='canvassRoute')set({districtId:nodeById.get(cmd.nodeId)!.districtId,view:'street'});persist();}},
   end:()=>{if(!get().started||get().game.result)return;set({game:endCampaignPhase(get().game),error:null});persist();},
   priority:id=>{if(!get().started)return;set({game:prioritizeWonder(get().game,id)});persist();},
   save:()=>{if(get().started)persist();},
   resume:()=>{const out=readSave(storage);if(out.save)set({...structuredClone(out.save.session),saved:out.save,saveExists:true,saveError:null,started:true,error:null});else set({saved:null,saveExists:out.exists,saveError:out.error??'c_saveInvalid'});},
   menu:()=>{if(persist())set({...fresh(get().game.playerTeam,movementProfile),started:false,error:null});},
  };
 });
}
function browserStorage(){try{return typeof localStorage==='undefined'?null:localStorage;}catch{return null;}}
export const useCampaign=createCampaignStore(browserStorage(),'streets-v2');
