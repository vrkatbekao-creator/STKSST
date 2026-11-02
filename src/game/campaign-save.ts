import {initialContacts,validContacts} from './campaign-contacts.ts';
import type { Campaign } from './campaign.ts';
import { campaignOutcome } from './campaign-teams.ts';
import { teams } from './campaign-teams.ts';
import { routingEdges,roadWalkCells,mapFor,streetSource,cells,districts,nodes,wonders } from './campaign-map.ts';
import { legacyTrail } from './campaign-progress.ts';
import { surpriseIds } from './campaign-events.ts';
import { validTalk } from './campaign-dialogue.ts';
import { career,capacity,levelFor,helperTypes,helperRole } from './campaign-growth.ts';
export const SAVE_KEY='capital-tactics-campaign-save';
export const SAVE_SLOTS=[1,2,3] as const;
export type SaveSlot=typeof SAVE_SLOTS[number];
export const isSaveSlot=(slot:unknown):slot is SaveSlot=>SAVE_SLOTS.includes(slot as SaveSlot);
// Slot one retains the original key and bytes, including legacy saves.
export function saveKey(slot:SaveSlot=1){if(!isSaveSlot(slot))throw new Error('save-slot');return slot===1?SAVE_KEY:`${SAVE_KEY}-${slot}`;}
export const SAVE_VERSION=4;
export type Session={game:Campaign;selected:string;districtId:string;view:'city'|'street'};
export type SavedCampaign={version:1|2|3|4;rules:'0.5.0'|'0.6.0'|'0.10.0'|'0.16.0';map:'taipei-hex-v1'|'taipei-street-hex-v2';mapRevision?:string;savedAt:string;session:Session;checksum:number};
export type SaveError='c_saveUnavailable'|'c_saveInvalid'|'c_saveIncompatible';
export type StoragePort={getItem:(key:string)=>string|null;setItem:(key:string,value:string)=>void};
type Obj=Record<string,any>;
const obj=(v:unknown):v is Obj=>!!v&&typeof v==='object'&&!Array.isArray(v);
const num=(v:unknown,min=0,max=1e9)=>typeof v==='number'&&Number.isFinite(v)&&v>=min&&v<=max;
const integer=(v:unknown,min=0,max=1e9)=>num(v,min,max)&&Number.isInteger(v);
const oneOf=(v:unknown,list:readonly unknown[])=>list.includes(v);
const teamValues=(v:unknown,valid:(value:any)=>boolean):boolean=>obj(v)&&teams.every(t=>valid(v[t]));
const areaIds=districts.map(d=>d.id),nodeIds=nodes.map(n=>n.id),wonderIds=wonders.map(w=>w.id);
const exactKeys=(v:unknown,keys:string[])=>obj(v)&&Object.keys(v).length===keys.length&&keys.every(k=>Object.hasOwn(v,k));
const list=(v:unknown,valid:(value:any)=>boolean,max=100)=>Array.isArray(v)&&v.length<=max&&v.every(valid);
const uniqueList=(v:unknown,keys:string[])=>list(v,x=>typeof x==='string'&&keys.includes(x),keys.length)&&new Set(v as string[]).size===(v as string[]).length;
const support=(v:unknown)=>exactKeys(v,areaIds)&&areaIds.every(id=>teamValues((v as Obj)[id],n=>num(n)));
const snapshot=(v:any)=>obj(v)&&integer(v.releasedDay,2,28)&&integer(v.asOfDay,1,27)&&v.asOfDay===v.releasedDay-1&&support(v.support);
const log=(v:any)=>obj(v)&&oneOf(v.key,['c_logStart','c_logAction','c_logSurge','c_logWonder','c_logSettlement','c_logNight','c_logFinal','c_logPoll','c_breaking','c_exclusive'])&&obj(v.values)&&Object.keys(v.values).length<=12&&Object.values(v.values).every(x=>typeof x==='string'&&x.length<=200||num(x,-1e9));
const checksum=(s:string)=>{let hash=2166136261;for(let i=0;i<s.length;i++)hash=Math.imul(hash^s.charCodeAt(i),16777619);return hash>>>0;};
export function validSession(value:unknown):value is Session{
 if(!obj(value)||!obj(value.game))return false;
 const g=value.game;
 if(g.movementProfile!==undefined&&!oneOf(g.movementProfile,['legacy-hex','streets-v2']))return false;
 const {cells}=mapFor(g);
 if(!oneOf(g.playerTeam,teams)||!integer(g.day,1,28)||!oneOf(g.phase,['day','night'])||!integer(g.seed,0,0xffffffff)||!oneOf(g.news,['rain','market','volunteers','clear'])||!integer(g.actions))return false;
 if(!teamValues(g.commanders,x=>oneOf(x,['jiang','shen','huang']))||!teamValues(g.resources,x=>obj(x)&&num(x.materials)&&integer(x.volunteers,0,6))||!support(g.support))return false;
 if(!Array.isArray(g.units)||g.units.length<9||g.units.length>21||new Set(g.units.map((u:any)=>u?.id)).size!==g.units.length)return false;
 for(const team of teams){const roster=g.units.filter((u:any)=>obj(u)&&u.team===team);if(roster.length<3||roster.length>7||!['heavy','ranged','scout'].every(role=>roster.some((u:any)=>u.role===role&&typeof u.id==='string'&&Number(u.id.slice(-1))<=3)))return false;for(let i=1;i<=roster.length;i++)if(!roster.some((u:any)=>u.id===`${team}${i}`))return false;}
 for(const u of g.units){if(!obj(u)||typeof u.id!=='string'||!oneOf(u.team,teams)||!new RegExp(`^${u.team}[1-7]$`).test(u.id)||!oneOf(u.role,['heavy','ranged','scout']))return false;const index=Number(u.id.slice(-1));if(index>3? !oneOf(u.helper,helperTypes)||helperRole[u.helper as keyof typeof helperRole]!==u.role : u.helper!==undefined)return false;
 if(u.career!==undefined){const c=u.career;if(!obj(c)||!integer(c.xp,0,999)||!integer(c.level,1,5)||c.level!==levelFor(c.xp)||!integer(c.health,0,100)||!integer(c.morale,0,100)||!integer(c.xpDay,0,g.day)||!integer(c.dailyXp,0,8)||!integer(c.assistedDay,0,g.day))return false;}
 if(!cells.has(u.cellId)||g.movementProfile!=='streets-v2'&&cells.get(u.cellId)!.terrain==='water'||cells.get(u.cellId)!.walkable===false||!integer(u.maxAp,14,20)||u.maxAp!==capacity(u as Campaign['units'][number])||!integer(u.ap,0,u.maxAp+2)||!integer(u.mobilization,0,10)||!integer(u.fatigue,0,10)||!integer(u.facing,0,5)||!['withdrawUntil','guardedUntil','skillReadyDay','transportDay','bracedUntil','confusedUntil'].every(k=>integer(u[k],0,34)))return false;}
 const occupied=g.units.filter((u:any)=>u.mobilization>0&&u.withdrawUntil<=g.day&&career(u).health>0).map((u:any)=>u.cellId);if(new Set(occupied).size!==occupied.length)return false;
 if(!exactKeys(g.nodeState,nodeIds)||!nodeIds.every(id=>{const n=g.nodeState[id];return obj(n)&&teamValues(n.influence,x=>num(x))&&teamValues(n.visits,x=>integer(x,0,2))&&teamValues(n.active,x=>typeof x==='boolean');}))return false;
 if(!exactKeys(g.activity,areaIds)||!areaIds.every(id=>teamValues(g.activity[id],a=>obj(a)&&uniqueList(a.nodes,nodeIds)&&list(a.kinds,x=>typeof x==='string'&&x.length<80,100)&&typeof a.rested==='boolean'&&typeof a.afterRest==='boolean')))return false;
 if(!list(g.stages,s=>obj(s)&&nodeIds.includes(s.nodeId)&&nodes.find(n=>n.id===s.nodeId)?.kind==='venue'&&oneOf(s.team,teams)&&oneOf(s.brand,['island','soapbox'])&&integer(s.openDay,1,30)&&typeof s.staffed==='boolean'&&integer(s.lastEventDay,0,g.day),12)||new Set(g.stages.map((s:any)=>s.nodeId)).size!==g.stages.length)return false;
 if(!teamValues(g.wonderPriority,x=>uniqueList(x,wonderIds)&&x.length===wonderIds.length)||!teamValues(g.prepared,x=>x===null||obj(x)&&oneOf(x.topic,['housing','transport','environment'])&&integer(x.day,1,g.day))||!teamValues(g.eventDone,x=>integer(x,0,g.day)))return false;
 if(g.surprise!==null&&(!obj(g.surprise)||g.day%2!==1||!oneOf(g.surprise.id,surpriseIds)||!areaIds.includes(g.surprise.districtId)||!teamValues(g.surprise.responses,x=>oneOf(x,[null,'adapt','mobilize']))))return false;
 if(!list(g.talkZones,z=>obj(z)&&cells.has(z.cellId)&&integer(z.untilDay,1,29),30)||!list(g.surges,s=>obj(s)&&cells.has(s.cellId)&&oneOf(s.team,teams)&&s.day===g.day,3))return false;
 const releaseDays=[2,4,6,8,10,12,14].filter(d=>d<=g.day);
 if(!list(g.pollHistory,snapshot,7)||g.pollHistory.length!==releaseDays.length||!g.pollHistory.every((s:any,i:number)=>s.releasedDay===releaseDays[i]))return false;
 if(g.day===1?g.poll!==null:!snapshot(g.poll)||JSON.stringify(g.poll)!==JSON.stringify(g.pollHistory.at(-1)))return false;
 if(g.day<15?g.rumor!==null:!snapshot(g.rumor)||g.rumor.releasedDay!==g.day)return false;
 if(!list(g.history,h=>obj(h)&&integer(h.day,1,28)&&support(h.support),28)||!g.history.every((h:any,i:number)=>h.day===i+1))return false;
 if(g.result===null){if(g.history.length!==g.day-1)return false;}else{if(!oneOf(g.result,[...teams,'draw'])||g.day!==28||g.phase!=='night'||g.history.length!==28)return false;const scores=Object.values(g.support as Campaign['support']).reduce((a,s)=>{for(const t of teams)a[t]+=s[t];return a;},{blue:0,green:0,white:0});if(campaignOutcome(scores)!==g.result)return false;}
 if(g.trail!==undefined&&!teamValues(g.trail,t=>obj(t)&&list(t.arrivedCells,id=>typeof id==='string'&&cells.has(id),cells.size)&&new Set(t.arrivedCells).size===t.arrivedCells.length&&uniqueList(t.completedNodes,nodeIds)&&typeof t.partial==='boolean'))return false;
 if(g.trail)for(const team of teams){const walks=g.trail[team].walks;if(walks!==undefined&&!list(walks,w=>{
  if(!obj(w)||!g.units.some((u:any)=>u.id===w.unitId&&u.team===team)||!integer(w.day,1,g.day)||!oneOf(w.phase,['day','night'])||!(w.day<g.day||g.phase==='night'||w.phase==='day')||!list(w.cells,id=>typeof id==='string'&&cells.has(id),1000)||w.cells.length<2)return false;
  if(g.movementProfile!=='streets-v2')return w.edgeIds===undefined&&w.cells.length<=60&&new Set(w.cells).size===w.cells.length&&w.cells.every((id:string,i:number)=>i===0||cells.get(w.cells[i-1])!.neighbors.includes(id));
  if(!list(w.edgeIds,id=>integer(id,0,routingEdges.length-1),10000)||!w.edgeIds.length)return false;
  const edges=w.edgeIds.map((id:number)=>routingEdges[id]);
  return edges.every((e:any,i:number)=>i===0||edges[i-1].to===e.from)&&cells.get(w.cells[0])!.roadNode===edges[0].from&&cells.get(w.cells.at(-1))!.roadNode===edges.at(-1).to&&JSON.stringify(roadWalkCells(w.edgeIds))===JSON.stringify(w.cells);
 },4200))return false;}
 if(g.talk!==undefined&&g.talk!==null&&!validTalk(g.talk,g as Campaign))return false;
 if(g.talkReports!==undefined&&!list(g.talkReports,r=>validTalk(r,g as Campaign,true),12))return false;
 if(g.contacts!==undefined&&!validContacts(g.contacts,g as Campaign))return false;
 if(!list(g.logs,log,100)||(g.flash!==null&&!log(g.flash)))return false;
 if(!g.units.some((u:any)=>u.id===value.selected&&u.team===g.playerTeam)||!areaIds.includes(value.districtId)||!oneOf(value.view,['city','street']))return false;
 return true;
}
export function encodeSave(session:Session,savedAt=new Date().toISOString()):SavedCampaign{
 if(!validSession(session))throw new Error('c_saveInvalid');
 if(!session.game.trail)session={...session,game:{...session.game,trail:legacyTrail(session.game)}};
 if(!session.game.contacts)session={...session,game:{...session.game,contacts:initialContacts()}};
 const street=session.game.movementProfile==='streets-v2';
 const data:Omit<SavedCampaign,'checksum'>={version:4,rules:'0.16.0',map:street?'taipei-street-hex-v2':'taipei-hex-v1',...(street?{mapRevision:streetSource.revision}:{}),savedAt,session:structuredClone(session)};
 return {...data,checksum:checksum(JSON.stringify(data))};
}
export function decodeSave(raw:string):{save:SavedCampaign|null;error:SaveError|null}{
 try{if(raw.length>4_000_000)return {save:null,error:'c_saveInvalid'};const v=JSON.parse(raw);if(!obj(v))return {save:null,error:'c_saveInvalid'};
 const street=v.session?.game?.movementProfile==='streets-v2';
 const modern=v.version===4||v.version===3;
 if(modern?(v.rules!==(v.version===4?'0.16.0':'0.10.0')||v.map!==(street?'taipei-street-hex-v2':'taipei-hex-v1')||street&&v.mapRevision!==streetSource.revision):street?(v.version!==2||v.rules!=='0.6.0'||v.map!=='taipei-street-hex-v2'||v.mapRevision!==streetSource.revision):(v.version!==1||v.rules!=='0.5.0'||v.map!=='taipei-hex-v1'))return {save:null,error:'c_saveIncompatible'};
 if(v.version===4&&!v.session?.game?.contacts)return {save:null,error:'c_saveInvalid'};
 const {checksum:hash,...data}=v;if(!integer(hash,0,0xffffffff)||checksum(JSON.stringify(data))!==hash||typeof v.savedAt!=='string'||!Number.isFinite(Date.parse(v.savedAt))||!validSession(v.session))return {save:null,error:'c_saveInvalid'};
 return {save:encodeSave(v.session,v.savedAt),error:null};}catch{return {save:null,error:'c_saveInvalid'};}
}
export function readSave(storage:StoragePort|null,slot:SaveSlot=1){try{if(!storage)return {save:null,error:'c_saveUnavailable' as SaveError,exists:false};const raw=storage.getItem(saveKey(slot));return raw!==null?{...decodeSave(raw),exists:true}:{save:null,error:null,exists:false};}catch{return {save:null,error:'c_saveUnavailable' as SaveError,exists:false};}}
export function writeSave(storage:StoragePort|null,session:Session,slot:SaveSlot=1){try{if(!storage)throw new Error();const save=encodeSave(session);storage.setItem(saveKey(slot),JSON.stringify(save));return {save,error:null};}catch{return {save:null,error:'c_saveUnavailable' as SaveError};}}
