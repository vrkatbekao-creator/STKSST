/** Schema-6 codec prototype. Not yet connected to campaign-store or normal save slots. */
import type {Campaign,Team} from './campaign.ts';
import type {Session,SaveError} from './campaign-save.ts';
import {decodeSave,encodeSave,validSession} from './campaign-save.ts';
import {teams} from './campaign-teams.ts';
import {initialVehicleState} from './campaign-vehicle-state.ts';
import type {CampaignVehicleState} from './campaign-vehicle-state.ts';
import {validVehicleJournal} from './vehicle-journal.ts';
import type {VehicleJournalContext} from './vehicle-journal.ts';
import {validMotorcadeLedger} from './campaign-motorcade.ts';

export type VehicleSession=Omit<Session,'game'>&{game:Campaign&{vehicle:CampaignVehicleState}};
export type VehicleSaveContext={revision:string;journalContext:(game:Campaign,team:Team)=>VehicleJournalContext;
 /** Must replay trusted geometry before accepting any motorcade history/exposure. */
 verifyExposure?:(game:Campaign,team:Team,state:CampaignVehicleState['teams'][Team])=>boolean};
const object=(v:unknown):v is Record<string,any>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const checksum=(s:string)=>{let h=2166136261;for(let i=0;i<s.length;i++)h=Math.imul(h^s.charCodeAt(i),16777619);return h>>>0;};

function baseSession(session:VehicleSession):Session{const {vehicle:_,...game}=session.game;return {...session,game};}
function validState(g:Campaign,state:unknown,ctx:VehicleSaveContext):state is CampaignVehicleState{
 if(!object(state)||Object.keys(state).sort().join(',')!=='activationDay,revision,teams'||state.revision!==ctx.revision||!object(state.teams)||
  Object.keys(state.teams).sort().join(',')!=='blue,green,white')return false;
 const day=state.activationDay;
 if(g.movementProfile!=='streets-v2'?day!==null:day===null?g.day!==28:!Number.isInteger(day)||day<1||day>Math.min(28,g.day+1))return false;
 for(const team of teams){const data=state.teams[team],units=g.units.filter(u=>u.team===team).map(u=>u.id),journalCtx=ctx.journalContext(g,team);
  if(journalCtx.revision!==ctx.revision||journalCtx.day!==g.day||journalCtx.phase!==g.phase||journalCtx.team!==team||
   JSON.stringify([...journalCtx.unitIds].sort())!==JSON.stringify([...units].sort())||
   !object(data)||Object.keys(data).sort().join(',')!=='exposure,history,journal'||!object(data.history)||
   Object.keys(data.history).sort().join(',')!=='baseline,events'||!Array.isArray(data.history.events)||data.history.events.length>100000||
   !(data.history.baseline===null||object(data.history.baseline))||!validVehicleJournal(data.journal,journalCtx)||
   !validMotorcadeLedger(data.exposure,g.day,team,units))return false;
  if(data.journal.journeys.some((j:any)=>day===null||j.day<day))return false;
  const active=day!==null&&g.day>=day;
  if(active?data.history.baseline===null:data.history.baseline!==null||data.history.events.length>0)return false;
  const requiresReplay=active||data.journal.journeys.some((j:any)=>j.mode==='motorcade')||Object.keys(data.exposure.covered).length>0||Object.keys(data.exposure.heat).length>0;
  if(requiresReplay&&(!ctx.verifyExposure||!ctx.verifyExposure({...g,vehicle:state as CampaignVehicleState},team,data as CampaignVehicleState['teams'][Team])))return false;
 }
 return true;
}

export function encodeVehicleSave(session:VehicleSession,ctx:VehicleSaveContext,savedAt=new Date().toISOString()){
 const base=baseSession(session);
 if(!validSession(base)||!validState(base.game,session.game.vehicle,ctx)||!Number.isFinite(Date.parse(savedAt)))throw Error('c_saveInvalid');
 const old=encodeSave(base,savedAt);
 const data={version:6,rules:session.game.apRules==='golden-week'?'0.6.0':'0.18.0',map:old.map,...(old.mapRevision?{mapRevision:old.mapRevision}:{}),
  ...(old.placeRevision?{placeRevision:old.placeRevision}:{}),vehicleRevision:ctx.revision,savedAt,session:structuredClone(session)};
 return {...data,checksum:checksum(JSON.stringify(data))};
}

/** Read-only migration: never writes storage, reissues AP, or reconstructs vehicle history. */
export function decodeVehicleSave(raw:string,ctx:VehicleSaveContext):{session:VehicleSession|null;error:SaveError|null;migrated:boolean}{
 try{
  if(raw.length>4_000_000)return {session:null,error:'c_saveInvalid',migrated:false};
  const data=JSON.parse(raw);if(!object(data))return {session:null,error:'c_saveInvalid',migrated:false};
  if(data.version!==6){const old=decodeSave(raw);if(!old.save)return {session:null,error:old.error,migrated:false};
   const base=old.save.session,{vehicle:_,...game}=base.game as Campaign&{vehicle?:unknown};
   return {session:{...base,game:{...game,vehicle:initialVehicleState(game,ctx.revision,'migrated')}},error:null,migrated:true};}
  if(data.rules!==(data.session?.game?.apRules==='golden-week'?'0.6.0':'0.18.0')||data.vehicleRevision!==ctx.revision)return {session:null,error:'c_saveIncompatible',migrated:false};
  const {checksum:stored,...body}=data;
  if(!Number.isInteger(stored)||stored<0||stored>0xffffffff||checksum(JSON.stringify(body))!==stored||
   typeof data.savedAt!=='string'||!Number.isFinite(Date.parse(data.savedAt))||!object(data.session)||!object(data.session.game))return {session:null,error:'c_saveInvalid',migrated:false};
  const session=data.session as VehicleSession,base=baseSession(session);
  if(!validSession(base)||!validState(base.game,session.game.vehicle,ctx))return {session:null,error:'c_saveInvalid',migrated:false};
  const expected=encodeSave(base,data.savedAt);
  const expectedKeys=['version','rules','map','vehicleRevision','savedAt','session','checksum',...(expected.mapRevision?['mapRevision','placeRevision']:[])].sort();
  if(JSON.stringify(Object.keys(data).sort())!==JSON.stringify(expectedKeys))return {session:null,error:'c_saveInvalid',migrated:false};
  if(data.map!==expected.map||data.mapRevision!==expected.mapRevision||data.placeRevision!==expected.placeRevision)return {session:null,error:'c_saveIncompatible',migrated:false};
  return {session:structuredClone(session),error:null,migrated:false};
 }catch{return {session:null,error:'c_saveInvalid',migrated:false};}
}
