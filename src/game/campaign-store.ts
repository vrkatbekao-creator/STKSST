import { create } from 'zustand';
import { initialCampaign,campaignCommand,endCampaignPhase,prioritizeWonder,chooseCommander } from './campaign.ts';
import type { CommanderId } from './campaign-tactics.ts';
import type { Command,Team } from './campaign.ts';
import { teams } from './campaign-teams.ts';
import { mapFor, allCells as cells,districts,nodeById } from './campaign-map.ts';
import { readSave,writeSave,SAVE_SLOTS,isSaveSlot } from './campaign-save.ts';
import type { Session,SavedCampaign,SaveError,StoragePort,SaveSlot } from './campaign-save.ts';
type LoadedSave=ReturnType<typeof readSave>;
export type SlotSummary={slot:SaveSlot;exists:boolean;error:SaveError|null;campaign:{team:Team;day:number;phase:'day'|'night';finished:boolean;savedAt:string}|null};
const summary=(slot:SaveSlot,out:LoadedSave):SlotSummary=>({slot,exists:out.exists,error:out.error,campaign:out.save?{team:out.save.session.game.playerTeam,day:out.save.session.game.day,phase:out.save.session.game.phase,finished:!!out.save.session.game.result,savedAt:out.save.savedAt}:null});
export type Store=Session&{saveSlot:SaveSlot;slots:SlotSummary[];chooseSlot:(slot:SaveSlot)=>void;started:boolean;error:string|null;saved:SavedCampaign|null;saveExists:boolean;saveError:SaveError|null;start:(overwrite?:boolean)=>void;reset:()=>void;faction:(team:Team)=>void;commander:(id:CommanderId)=>void;select:(id:string)=>void;focus:(id:string)=>void;viewCity:()=>void;dispatch:(cmd:Command)=>void;end:()=>void;priority:(id:string)=>void;save:()=>void;resume:()=>void;menu:()=>void};
const fresh=(team:Team='blue',movementProfile:'legacy-hex'|'streets-v2'='legacy-hex'):Session=>{const game=initialCampaign(Math.floor(Math.random()*0x100000000),team,movementProfile);const selected=`${team}1`;return {game,selected,districtId:cells.get(game.units.find(u=>u.id===selected)!.cellId)!.districtId,view:'city'};};
export function createCampaignStore(storage:StoragePort|null,movementProfile:'legacy-hex'|'streets-v2'='legacy-hex'){
 const loaded=readSave(storage);const initialSlots=SAVE_SLOTS.map(slot=>summary(slot,slot===1?loaded:readSave(storage,slot)));
 return create<Store>((set,get)=>{
  const persist=()=>{const {game,selected,districtId,view}=get();const slot=get().saveSlot,out=writeSave(storage,{game,selected,districtId,view},slot);if(out.save){set({saved:out.save,saveExists:true,saveError:null,slots:get().slots.map(s=>s.slot===slot?summary(slot,{...out,exists:true}):s)});}else set({saveError:out.error});return !!out.save;};
  return {
   ...fresh('blue',movementProfile),saveSlot:1,slots:initialSlots,started:false,error:null,saved:loaded.save,saveExists:loaded.exists,saveError:loaded.error,
   chooseSlot:slot=>{if(get().started||!isSaveSlot(slot))return;const out=readSave(storage,slot);set({saveSlot:slot,saved:out.save,saveExists:out.exists,saveError:out.error,error:null,slots:get().slots.map(s=>s.slot===slot?summary(slot,out):s)});},
   start:(overwrite=false)=>{if(get().started)return;const slot=get().saveSlot,out=readSave(storage,slot);set({saved:out.save,saveExists:out.exists,slots:get().slots.map(s=>s.slot===slot?summary(slot,out):s)});if(out.exists&&!overwrite){set({saveError:out.error,error:'s_confirmOverwrite'});return;}set({started:true,error:null});persist();},
   reset:()=>set({...fresh(get().game.playerTeam,movementProfile),started:false,error:null}),
   faction:team=>{const g=get().game;if(get().started||!teams.includes(team))return;const selected=`${team}1`;set({game:{...g,playerTeam:team},selected,districtId:cells.get(g.units.find(u=>u.id===selected)!.cellId)!.districtId,error:null});},
   commander:id=>{if(!get().started)set({game:chooseCommander(get().game,id),error:null});},
   select:id=>{const s=get(),u=s.game.units.find(u=>u.id===id&&u.team===s.game.playerTeam);if(u){set({selected:id,districtId:cells.get(u.cellId)!.districtId,error:null});if(s.started)persist();}},
   focus:id=>{if(districts.some(d=>d.id===id)){set({districtId:id,view:'street',error:null});if(get().started)persist();}},
   viewCity:()=>{set({view:'city',error:null});if(get().started)persist();},
   dispatch:cmd=>{if(!get().started)return;const out=campaignCommand(get().game,cmd);set({game:out.game,error:out.error??null});if(!out.error){if(cmd.type==='transport'||cmd.type==='move'){const unit=out.game.units.find(u=>u.id===cmd.unitId)!;set({districtId:cells.get(unit.cellId)!.districtId,view:'street'});}if(cmd.type==='canvassRoute')set({districtId:nodeById.get(cmd.nodeId)!.districtId,view:'street'});persist();}},
   end:()=>{if(!get().started||get().game.result)return;if(get().game.talk){set({error:'d_finishFirst'});return;}set({game:endCampaignPhase(get().game),error:null});persist();},
   priority:id=>{if(!get().started)return;set({game:prioritizeWonder(get().game,id)});persist();},
   save:()=>{if(get().started)persist();},
   resume:()=>{const slot=get().saveSlot,out=readSave(storage,slot);set({slots:get().slots.map(s=>s.slot===slot?summary(slot,out):s)});if(out.save)set({...structuredClone(out.save.session),saved:out.save,saveExists:true,saveError:null,started:true,error:null});else set({saved:null,saveExists:out.exists,saveError:out.error??'c_saveInvalid'});},
   menu:()=>{if(!get().started)return;if(persist())set({...fresh(get().game.playerTeam,movementProfile),started:false,error:null});},
  };
 });
}
function browserStorage(){try{return typeof localStorage==='undefined'?null:localStorage;}catch{return null;}}
export const useCampaign=createCampaignStore(browserStorage(),'streets-v2');
